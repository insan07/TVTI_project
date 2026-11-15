// Run after npm run build with --require ./tests/helpers/account-test-environment.cjs.
// Uses an isolated local MongoDB and mocked mail; never sends real email.
const assert = require('node:assert/strict');
const { test, before, beforeEach, after } = require('node:test');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const User = require('../dist/models/User').default;
const Challenge = require('../dist/models/PasswordChangeChallenge').default;
const Verification = require('../dist/models/PasswordChangeVerification').default;
const email = require('../dist/services/emailService');
const { requestPasswordChangeOtp, verifyPasswordChange, changeAccountPassword } = require('../dist/services/passwordChange');
const { changePassword, verifyPasswordChangeIdentity } = require('../dist/controllers/userController');
const originalSend = email.sendPasswordChangeOtpEmail;
let database, user, deliveries;
const oldPassword = 'Old-secret123';
const newPassword = 'New-secret456';
const payload = verificationToken => ({ verificationToken, newPassword, confirmPassword: newPassword });
const verifyPassword = () => verifyPasswordChange(user._id, { method: 'password', currentPassword: oldPassword });
const reject = (work, status, message) => assert.rejects(work, error => error.status === status && message.test(error.message));
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

before(async () => {
  database = await MongoMemoryServer.create({ instance: { spawn: { windowsHide: true } } });
  await mongoose.connect(database.getUri('isolated_password_change'));
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
}, { timeout: 120000 });
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
  user = await User.create({ name: 'Profile user', email: 'profile@example.test', role: 'student', password_hash: await bcrypt.hash(oldPassword, 10) });
  deliveries = [];
  email.sendPasswordChangeOtpEmail = async mail => { deliveries.push(mail); return { success: true }; };
});
after(async () => {
  email.sendPasswordChangeOtpEmail = originalSend;
  await mongoose.disconnect(); if (database) await database.stop();
});

test('current password verification permits a change without email and cannot be replayed', async () => {
  const verified = await verifyPassword();
  assert.match(verified.verificationToken, /^[a-f0-9]{64}$/);
  assert.notEqual((await Verification.findById(user._id)).token_hash, verified.verificationToken);
  const updated = await changeAccountPassword(user._id, payload(verified.verificationToken));
  assert(await bcrypt.compare(newPassword, updated.password_hash));
  assert.equal(await bcrypt.compare(oldPassword, updated.password_hash), false);
  assert.equal(deliveries.length, 0);
  assert.equal(await Verification.countDocuments(), 0);
  await reject(() => changeAccountPassword(user._id, payload(verified.verificationToken)), 410, /verify again/);
});

test('incorrect current password does not issue authorization', async () => {
  await reject(() => verifyPasswordChange(user._id, { method: 'password', currentPassword: 'wrong' }), 400, /Incorrect current password/);
  assert.equal(await Verification.countDocuments(), 0);
});

test('forgotten current password uses only the OTP mailed to the registered account', async () => {
  await requestPasswordChangeOtp(user._id);
  assert.equal(deliveries[0].to, user.email);
  assert.match(deliveries[0].otp, /^\d{6}$/);
  const verified = await verifyPasswordChange(user._id, { method: 'otp', otp: deliveries[0].otp, email: 'attacker@example.test' });
  assert.equal(await Challenge.countDocuments(), 0);
  await reject(() => verifyPasswordChange(user._id, { method: 'otp', otp: deliveries[0].otp }), 400, /expired or unavailable/);
  const updated = await changeAccountPassword(user._id, payload(verified.verificationToken));
  assert(await bcrypt.compare(newPassword, updated.password_hash));
});

test('a new password cannot bypass verification with a raw OTP or current password', async () => {
  await requestPasswordChangeOtp(user._id);
  for (const body of [{}, { currentPassword: oldPassword }, { otp: deliveries[0].otp }]) {
    await reject(() => changeAccountPassword(user._id, { newPassword, confirmPassword: newPassword, ...body }), 410, /Verify your current password/);
  }
  assert(await bcrypt.compare(oldPassword, (await User.findById(user._id)).password_hash));
});

test('five incorrect OTP attempts lock that code even when the correct code follows', async () => {
  await requestPasswordChangeOtp(user._id);
  const wrong = deliveries[0].otp === '000000' ? '000001' : '000000';
  for (let attempt = 1; attempt <= 5; attempt++) {
    await reject(() => verifyPasswordChange(user._id, { method: 'otp', otp: wrong }), 400, attempt === 5 ? /Too many incorrect attempts/ : /Incorrect verification code/);
  }
  await reject(() => verifyPasswordChange(user._id, { method: 'otp', otp: deliveries[0].otp }), 400, /expired or unavailable/);
  assert.equal(await Verification.countDocuments(), 0);
});

test('expired OTPs and expired verification sessions cannot authorize a change', async () => {
  await requestPasswordChangeOtp(user._id);
  await Challenge.updateOne({ _id: user._id }, { expires_at: new Date(Date.now() - 1000) });
  await reject(() => verifyPasswordChange(user._id, { method: 'otp', otp: deliveries[0].otp }), 400, /expired or unavailable/);
  const verified = await verifyPassword();
  await Verification.updateOne({ _id: user._id }, { expires_at: new Date(Date.now() - 1000) });
  await reject(() => changeAccountPassword(user._id, payload(verified.verificationToken)), 410, /expired or unavailable/);
});

test('authorization is bound to the account, email and existing password', async () => {
  const verified = await verifyPassword();
  const other = await User.create({ name: 'Other', email: 'other@example.test', role: 'admin', password_hash: user.password_hash });
  await reject(() => changeAccountPassword(other._id, payload(verified.verificationToken)), 410, /expired or unavailable/);
  await User.updateOne({ _id: user._id }, { email: 'changed@example.test' });
  await reject(() => changeAccountPassword(user._id, payload(verified.verificationToken)), 410, /expired or unavailable/);
  await User.updateOne({ _id: user._id }, { email: user.email, password_hash: await bcrypt.hash('Externally-changed', 10) });
  await reject(() => changeAccountPassword(user._id, payload(verified.verificationToken)), 410, /expired or unavailable/);
});

test('new password confirmation and password rules are enforced without consuming a valid session', async () => {
  const { verificationToken } = await verifyPassword();
  for (const confirmPassword of [undefined, '', 'mismatch']) {
    await reject(() => changeAccountPassword(user._id, { ...payload(verificationToken), confirmPassword }), 400, /do not match/);
  }
  for (const password of ['short', 'x'.repeat(73)]) {
    await reject(() => changeAccountPassword(user._id, { verificationToken, newPassword: password, confirmPassword: password }), 400, /6 and 72/);
  }
  await reject(() => changeAccountPassword(user._id, { verificationToken, newPassword: oldPassword, confirmPassword: oldPassword }), 400, /different from your current/);
  await changeAccountPassword(user._id, payload(verificationToken));
});

test('OTP resend cooldown and failed delivery preserve the previously delivered code', async () => {
  await requestPasswordChangeOtp(user._id);
  const original = await Challenge.findById(user._id);
  await reject(() => requestPasswordChangeOtp(user._id), 429, /wait 60 seconds/);
  assert.equal(deliveries.length, 1);
  await Challenge.updateOne({ _id: user._id }, { sent_at: new Date(Date.now() - 61000) });
  email.sendPasswordChangeOtpEmail = async () => ({ success: false });
  await reject(() => requestPasswordChangeOtp(user._id), 503, /could not be delivered/);
  assert.equal((await Challenge.findById(user._id)).otp_hash, original.otp_hash);
  await verifyPasswordChange(user._id, { method: 'otp', otp: deliveries[0].otp });
});

test('a newly requested email code invalidates a previous verification session', async () => {
  const { verificationToken } = await verifyPassword();
  await requestPasswordChangeOtp(user._id);
  await reject(() => changeAccountPassword(user._id, payload(verificationToken)), 410, /expired or unavailable/);
});

test('deactivated accounts cannot request codes, verify, or finish an authorized change', async () => {
  const { verificationToken } = await verifyPassword();
  await User.updateOne({ _id: user._id }, { is_active: false });
  for (const work of [() => requestPasswordChangeOtp(user._id), verifyPassword, () => changeAccountPassword(user._id, payload(verificationToken))]) {
    await reject(work, 404, /Active account not found/);
  }
});

test('first-login still requires an email OTP and rejects the profile verification path', async () => {
  await User.updateOne({ _id: user._id }, { must_change_password: true, temp_password_expires_at: new Date(Date.now() + 600000) });
  await reject(verifyPassword, 403, /first-login/);
  await reject(() => changeAccountPassword(user._id, { newPassword }), 400, /do not match/);
  await reject(() => changeAccountPassword(user._id, { newPassword }, true), 400, /six-digit/);
  await requestPasswordChangeOtp(user._id);
  const updated = await changeAccountPassword(user._id, { newPassword, otp: deliveries[0].otp }, true);
  assert.equal(updated.must_change_password, false);
  assert.equal(updated.temp_password_expires_at, undefined);
  assert(await bcrypt.compare(newPassword, updated.password_hash));
});

test('profile controllers return verification and change errors to the client', async () => {
  const failure = response();
  await verifyPasswordChangeIdentity({ user, body: { method: 'password', currentPassword: 'wrong' } }, failure);
  assert.equal(failure.statusCode, 400);
  const verified = response();
  await verifyPasswordChangeIdentity({ user, body: { method: 'password', currentPassword: oldPassword } }, verified);
  assert.equal(verified.statusCode, 200);
  const mismatch = response();
  await changePassword({ user, body: { ...payload(verified.body.verificationToken), confirmPassword: 'different' } }, mismatch);
  assert.equal(mismatch.statusCode, 400);
  const success = response();
  await changePassword({ user, body: payload(verified.body.verificationToken) }, success);
  assert.equal(success.statusCode, 200);
});
