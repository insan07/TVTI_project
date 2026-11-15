const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryReplSet } = require('mongodb-memory-server-core');
const User = require('../dist/models/User').default;
const PaymentSlip = require('../dist/models/PaymentSlip').default;
const Challenge = require('../dist/models/PasswordChangeChallenge').default;
const email = require('../dist/services/emailService');
const notifications = require('../dist/services/notificationService');
const users = require('../dist/controllers/userController');
const auth = require('../dist/controllers/authController');
const payments = require('../dist/controllers/paymentController');
const credentials = require('../dist/services/accountCredentials');
const { summarizePayment } = require('../dist/utils/paymentSummary');
let replica, user, sent, notices;
const originals = { otp: email.sendPasswordChangeOtpEmail, raw: email.sendRawEmail, notify: notifications.sendNotification };
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const call = async (handler, body = {}, extra = {}) => { const res = response(); await handler({ user: { _id: user._id }, body, ...extra }, res); return res; };
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger', spawn: { windowsHide: true } } });
  await mongoose.connect(replica.getUri('password_payment_tests'));
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
}, { timeout: 120000 });
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
  sent = []; notices = [];
  email.sendPasswordChangeOtpEmail = async options => { sent.push(options); return { success: true }; };
  email.sendRawEmail = async (...args) => { notices.push(args); return { success: true }; };
  notifications.sendNotification = async options => { notices.push(options); return []; };
  user = await User.create({ name: 'Student', email: 'student@test.invalid', role: 'student', password_hash: await bcrypt.hash('CurrentPassword1!', 10), payment_info: { total_fee: 1000, amount_paid: 0 } });
});
after(async () => {
  email.sendPasswordChangeOtpEmail = originals.otp; email.sendRawEmail = originals.raw; notifications.sendNotification = originals.notify;
  await mongoose.disconnect(); if (replica) await replica.stop();
});
const requestCode = () => call(users.sendPasswordChangeOtp, { currentPassword: 'CurrentPassword1!' });
const change = async (otp, newPassword = 'NewPassword2!') => {
  const verified = await call(users.verifyPasswordChangeIdentity, { method: 'otp', otp });
  if (verified.statusCode !== 200) return verified;
  return call(users.changePassword, { verificationToken: verified.body.verificationToken, newPassword, confirmPassword: newPassword });
};

test('email password verification requires a delivered OTP; code is hashed, single-use and omitted from responses', async () => {
  assert.equal((await change('123456')).statusCode, 400);
  assert.equal((await call(users.verifyPasswordChangeIdentity, { method: 'password', currentPassword: 'wrong' })).statusCode, 400); assert.equal(sent.length, 0);
  const issued = await requestCode(); assert.equal(issued.statusCode, 200); assert.equal(sent[0].to, user.email); assert(!JSON.stringify(issued.body).includes(sent[0].otp));
  const stored = await Challenge.findById(user._id); assert.notEqual(stored.otp_hash, sent[0].otp); assert(await bcrypt.compare(sent[0].otp, stored.otp_hash));
  const changed = await change(sent[0].otp); assert.equal(changed.statusCode, 200);
  const saved = await User.findById(user._id); assert(await bcrypt.compare('NewPassword2!', saved.password_hash)); assert.equal(await Challenge.countDocuments(), 0);
  assert.equal((await call(users.changePassword, { currentPassword: 'NewPassword2!', newPassword: 'AnotherPassword3!', otp: sent[0].otp })).statusCode, 400);
});
test('resend cooldown, expired codes and five failed attempts are enforced', async () => {
  await requestCode(); assert.equal((await requestCode()).statusCode, 429); assert.equal(sent.length, 1);
  for (let i = 0; i < 5; i++) assert.equal((await change('000000')).statusCode, 400);
  assert.equal((await change(sent[0].otp)).statusCode, 400);
  await Challenge.updateOne({ _id: user._id }, { attempts: 0, expires_at: new Date(Date.now() - 1000) });
  assert.equal((await change(sent[0].otp)).statusCode, 400); assert(await bcrypt.compare('CurrentPassword1!', (await User.findById(user._id)).password_hash));
});
test('email failure does not issue a usable OTP or report success', async () => {
  email.sendPasswordChangeOtpEmail = async () => ({ success: false });
  assert.equal((await requestCode()).statusCode, 503); assert.equal(await Challenge.countDocuments(), 0);
});
test('concurrent password changes consume the code only once', async () => {
  await requestCode(); const results = await Promise.all([change(sent[0].otp), change(sent[0].otp, 'ThirdPassword3!')]);
  assert.equal(results.filter(result => result.statusCode === 200).length, 1);
});
test('temporary credential regeneration invalidates an earlier password-change challenge', async () => {
  await requestCode(); await credentials.regenerateAccountCredentials(String(user._id));
  assert.equal((await change(sent[0].otp)).statusCode, 403);
});
test('first login also requires OTP and cannot be used as a password-change bypass after setup', async () => {
  await User.updateOne({ _id: user._id }, { must_change_password: true, temp_password_expires_at: new Date(Date.now() + 600000) });
  assert.equal((await call(auth.forceChangePassword, { newPassword: 'NewPassword2!' })).statusCode, 400);
  assert.equal((await call(users.sendPasswordChangeOtp)).statusCode, 200);
  const result = await call(auth.forceChangePassword, { newPassword: 'NewPassword2!', otp: sent[0].otp, newEmail: 'unverified@test.invalid' });
  assert.equal(result.statusCode, 200); assert.equal(result.body.user.email, user.email); assert.equal(result.body.user.must_change_password, false);
  assert.equal((await call(auth.forceChangePassword, { newPassword: 'AnotherPassword3!', otp: sent[0].otp })).statusCode, 400);
});
test('all payment reads show overpayments as credit and preserve pending receipts separately', async () => {
  const paid = await call(payments.recordManualPayment, { amount: 1200, payment_method: 'physical_cash' }, { params: { studentId: String(user._id) } });
  assert.equal(paid.statusCode, 201); assert.equal(paid.body.summary.remaining_balance, 0); assert.equal(paid.body.summary.credit_balance, 200);
  assert.equal(paid.body.summary.payment_status, 'overpaid'); assert(JSON.stringify(notices).includes('200.00'));
  const upload = await call(payments.uploadPaymentSlip, { amount: 150, payment_method: 'bank_transfer', slip_url: 'fixture.png' });
  assert.equal(upload.statusCode, 201); assert.equal(upload.body.summary.credit_balance, 200); assert.equal(upload.body.summary.pending_amount, 150);
  const profile = await call(users.getMe); const mine = await call(payments.getMyPaymentSlips); const dossier = await call(payments.getStudentPaymentDossier, {}, { params: { studentId: String(user._id) } });
  const list = await call(payments.getAdminPaymentList);
  for (const summary of [profile.body.payment_summary, mine.body.summary, dossier.body.summary, list.body[0]]) {
    assert.equal(summary.total_fee, 1000); assert.equal(summary.amount_paid, 1200); assert.equal(summary.remaining_balance, 0); assert.equal(summary.credit_balance, 200); assert.equal(summary.pending_amount, 150);
  }
});
test('receipt approval credits an overpayment once and rejected evidence does not change the balance', async () => {
  const upload = await call(payments.uploadPaymentSlip, { amount: 1200, slip_url: 'fixture.png' });
  const params = { slipId: String(upload.body.slip._id) };
  const reviews = await Promise.all([call(payments.verifyPaymentSlip, {}, { params }), call(payments.verifyPaymentSlip, {}, { params })]);
  assert.deepEqual(reviews.map(result => result.statusCode).sort(), [200, 409]);
  assert.equal((await User.findById(user._id)).payment_info.amount_paid, 1200);
  const second = await call(payments.uploadPaymentSlip, { amount: 100, slip_url: 'second.png' });
  const rejected = await call(payments.rejectPaymentSlip, { reason: 'Incorrect receipt' }, { params: { slipId: String(second.body.slip._id) } });
  assert.equal(rejected.statusCode, 200); assert.equal(rejected.body.summary.credit_balance, 200);
});
test('zero fees, waived fees, stale paid status and decimal payments remain mathematically correct', async () => {
  assert.equal(summarizePayment({ total_fee: 0, amount_paid: 0 }).payment_status, 'paid');
  assert.equal(summarizePayment({ total_fee: 1000, amount_paid: 100, payment_status: 'waived' }).remaining_balance, 0);
  assert.equal(summarizePayment({ total_fee: 1000, amount_paid: 100, payment_status: 'paid' }).remaining_balance, 900);
  await User.updateOne({ _id: user._id }, { 'payment_info.total_fee': 0.3 });
  for (const amount of [0.1, 0.2]) assert.equal((await call(payments.recordManualPayment, { amount }, { params: { studentId: String(user._id) } })).statusCode, 201);
  const mine = await call(payments.getMyPaymentSlips); assert.equal(mine.body.summary.amount_paid, 0.3); assert.equal(mine.body.summary.remaining_balance, 0);
  for (const amount of [-1, 0, 'abc', 1.234]) assert.equal((await call(payments.uploadPaymentSlip, { amount, slip_url: 'fixture.png' })).statusCode, 400);
});
test('uploaded receipt buffers are stored and notification failure does not lose the submitted receipt', async () => {
  notifications.sendNotification = async () => { throw new Error('Unavailable'); };
  const upload = await call(payments.uploadPaymentSlip, { amount: 100 }, { file: { buffer: Buffer.from('%PDF-1.4\nreceipt'), originalname: 'receipt.pdf', mimetype: 'application/pdf', size: 16 } });
  assert.equal(upload.statusCode, 201); assert.equal(upload.body.notification_sent, false); assert.match(upload.body.slip.slip_url, /^\/api\/files\/[a-f0-9]{24}$/);
  assert.equal(upload.body.slip.receipt_mime_type, 'application/pdf');
  assert.equal(await mongoose.connection.db.collection('uploads.files').countDocuments({ _id: new mongoose.Types.ObjectId(upload.body.slip.slip_url.split('/').pop()) }), 1);
  assert.equal((await User.findById(user._id)).payment_info.amount_paid, 0);
});
