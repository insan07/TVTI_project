const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryReplSet } = require('mongodb-memory-server-core');
const User = require('../dist/models/User').default;
const Application = require('../dist/models/Application').default;
const Sequence = require('../dist/models/AccountSequence').default;
const accounts = require('../dist/services/accountCredentials');
const { withAccountCredentialLock } = require('../dist/services/accountCredentialLock');
const { practicalMutation } = require('../dist/services/practicalScheduling');
const identifiers = require('../dist/utils/admissionIdentifiers');
const { renderCredentialEmail } = require('../dist/utils/credentialEmail');
const admin = require('../dist/controllers/adminController');
const email = require('../dist/services/emailService');
const notifications = require('../dist/services/notificationService');
const { login } = require('../dist/controllers/authController');
const { searchStudentForVerification } = require('../dist/controllers/certificateController');
const originals = { account: email.sendAccountCredentialsEmail, student: email.sendApprovalEmail, notify: notifications.sendNotification };
let replica, sent;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const instructor = (name = 'One') => ({ name: `Instructor ${name}`, email: `${name}@test.invalid`, nic: `TEST-${name}`, phone: '0700000000' });

before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger', spawn: { windowsHide: true } } });
  await mongoose.connect(replica.getUri('isolated_account_credentials'));
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
}, { timeout: 120000 });
after(async () => {
  Object.assign(email, { sendAccountCredentialsEmail: originals.account, sendApprovalEmail: originals.student });
  notifications.sendNotification = originals.notify;
  await mongoose.disconnect(); if (replica) await replica.stop();
});
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
  sent = [];
  email.sendAccountCredentialsEmail = async options => { sent.push(options); return { success: true }; };
  email.sendApprovalEmail = async options => { sent.push(options); return { success: true }; };
  notifications.sendNotification = async () => [];
});

test('instructor creation emails exactly the committed number, password and expiry and those credentials log in', async () => {
  const res = response(); await admin.createInstructor({ body: instructor('FIRST') }, res);
  assert.equal(res.statusCode, 201); assert.equal(res.body.email_sent, true); assert.equal(sent.length, 1);
  const user = await User.findById(res.body._id);
  assert.match(user.registration_number, /^\d{2}I\d{4,}$/);
  assert.equal(user.registration_number, user.index_number);
  assert.equal(sent[0].role, 'instructor'); assert.equal(sent[0].to, 'first@test.invalid');
  assert.equal(sent[0].registrationNumber, res.body.credentials.registration_number);
  assert.equal(sent[0].temporaryPassword, res.body.credentials.temp_password);
  assert(await bcrypt.compare(sent[0].temporaryPassword, user.password_hash));
  assert.equal(new Date(sent[0].expiresAt).getTime(), user.temp_password_expires_at.getTime());
  const loggedIn = response(); await login({ body: { email: user.registration_number, password: sent[0].temporaryPassword } }, loggedIn);
  assert.equal(loggedIn.statusCode, 200); assert.equal(loggedIn.body.must_change_password, true);
  assert.equal(loggedIn.body.registration_number, user.registration_number);
});

test('instructor numbers are sequential under concurrent creation and never reused after deletion', async () => {
  const results = await Promise.all(['A', 'B', 'C'].map(name => accounts.createInstructorAccount(instructor(name))));
  const numbers = results.map(result => Number(result.credentials.registration_number.match(/I(\d+)$/)[1])).sort((a, b) => a - b);
  assert.deepEqual(numbers, [1, 2, 3]);
  await User.deleteMany({ role: 'instructor' });
  const next = await accounts.createInstructorAccount(instructor('D'));
  assert.match(next.credentials.registration_number, /I0004$/);
});

test('student and instructor sequences advance past existing records and remain independent', async () => {
  const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric' });
  const prefix = `${year.slice(-2)}T`;
  await User.create({ name: 'Legacy', email: 'legacy@test.invalid', role: 'student', password_hash: 'fixture', registration_number: `TVTI-${year}-00100`, index_number: `${year.slice(-2)}T0050` });
  await User.create({ name: 'Imported account', email: 'account@test.invalid', role: 'student', password_hash: 'fixture', registration_number: `${prefix}0080` });
  await Application.create({ full_name: 'Imported', email: 'imported@test.invalid', phone: '0', course_id: new mongoose.Types.ObjectId(), registration_number: `${prefix}0120` });
  await Application.create({ full_name: 'Reserved index', email: 'reserved@test.invalid', phone: '0', course_id: new mongoose.Types.ObjectId(), generated_index_number: `${prefix}0130` });
  const numbers = await practicalMutation(async session => ({ registration: await identifiers.generateUniqueRegistrationNumber(session), index: await identifiers.generateUniqueIndexNumber(session) }));
  assert.equal(numbers.registration, `${prefix}0131`); assert.equal(numbers.index, `${prefix}0132`);
  const teacher = await accounts.createInstructorAccount(instructor()); assert.match(teacher.credentials.registration_number, /I0001$/);
  await User.deleteMany({}); await Application.deleteMany({});
  assert.equal(await practicalMutation(session => identifiers.generateUniqueRegistrationNumber(session)), `${prefix}0133`);
});

test('student numbering switches to the new year at midnight in Sri Lanka with an independent yearly counter', async () => {
  const allocate = date => practicalMutation(session => identifiers.generateUniqueRegistrationNumber(session, new Date(date)));
  assert.equal(await allocate('2026-12-31T18:29:59Z'), '26T0001');
  assert.equal(await allocate('2026-12-31T18:29:59Z'), '26T0002');
  assert.equal(await allocate('2026-12-31T18:30:00Z'), '27T0001');
  assert.equal(await allocate('2027-01-01T00:00:00Z'), '27T0002');
});

test('student numbering retains the old index counter after records are deleted', async () => {
  const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric' }).slice(-2);
  await Sequence.create({ _id: `student-index:${year}`, value: 42 });
  const identity = await practicalMutation(session => identifiers.resolveStudentIdentifiers(null, null, session));
  assert.deepEqual(identity, { registration_number: `${year}T0043`, index_number: `${year}T0043` });
});

test('student credential email and login use the same YYT registration recovered from the existing index', async () => {
  const user = await User.create({ name: 'Student', email: 'student@test.invalid', role: 'student', index_number: '26T0007', password_hash: 'old' });
  const res = response(); await admin.resendUserCredentials({ params: { id: String(user._id) } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.email_sent, true);
  assert.equal(res.body.credentials.registration_number, '26T0007');
  assert.equal(res.body.credentials.index_number, '26T0007');
  assert.equal(sent[0].registrationNumber, '26T0007');
  assert.equal(sent[0].temporaryPassword, res.body.credentials.temp_password);
  const loggedIn = response(); await login({ body: { email: '26T0007', password: sent[0].temporaryPassword } }, loggedIn);
  assert.equal(loggedIn.statusCode, 200); assert.equal(loggedIn.body.registration_number, '26T0007');
});

test('resending instructors preserves official registration and hashes exactly the emailed replacement password', async () => {
  const first = await accounts.createInstructorAccount(instructor());
  const res = response(); await admin.resendUserCredentials({ params: { id: String(first.user._id) } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.email_sent, true);
  const user = await User.findById(first.user._id);
  assert.equal(res.body.credentials.registration_number, first.credentials.registration_number);
  assert.equal(sent[0].registrationNumber, user.registration_number); assert.equal(sent[0].role, 'instructor');
  assert.equal(sent[0].temporaryPassword, res.body.credentials.temp_password);
  assert(await bcrypt.compare(sent[0].temporaryPassword, user.password_hash));
  assert.equal(await bcrypt.compare(first.credentials.temp_password, user.password_hash), false);
});

test('legacy instructor aliases stay valid and missing official instructor numbers never use the student series', async () => {
  const user = await User.create({ name: 'Legacy instructor', email: 'legacy@test.invalid', nic: 'legacy', role: 'instructor', index_number: '26T0099', password_hash: 'old' });
  const result = await accounts.regenerateAccountCredentials(String(user._id));
  assert.equal(result.user.index_number, '26T0099'); assert.match(result.user.registration_number, /^\d{2}I/);
  const again = await accounts.regenerateAccountCredentials(String(user._id));
  assert.equal(again.user.registration_number, result.user.registration_number);
});

test('resend recovers the existing approved student registration and synchronizes the account and application', async () => {
  const user = await User.create({ name: 'Student', email: 'student@test.invalid', role: 'student', index_number: '26T0007', password_hash: 'old' });
  const app = await Application.create({ full_name: 'Student', email: user.email, phone: '0', course_id: new mongoose.Types.ObjectId(), status: 'approved', registration_number: 'TVTI-2025-00121' });
  const res = response(); await admin.resendUserCredentials({ params: { id: String(user._id) } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.credentials.registration_number, app.registration_number);
  assert.equal(sent[0].registrationNumber, app.registration_number);
  assert.equal((await Application.findById(app._id)).generated_index_number, '26T0007');
});

test('a simultaneous credential request returns 409 before changing the password or sending another email', async () => {
  const first = await accounts.createInstructorAccount(instructor());
  let enter, release;
  const entered = new Promise(resolve => { enter = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const running = withAccountCredentialLock(first.user.email, async () => { enter(); await gate; });
  await entered;
  try {
    const res = response(); await admin.resendUserCredentials({ params: { id: String(first.user._id) } }, res);
    assert.equal(res.statusCode, 409); assert.equal(sent.length, 0);
    assert.equal((await User.findById(first.user._id)).password_hash, first.user.password_hash);
  } finally { release(); await running; }
  await withAccountCredentialLock(first.user.email.toUpperCase(), async () => {});
});

test('instructor creation keeps its password protected until the credentials email finishes', async () => {
  let enter, release;
  const entered = new Promise(resolve => { enter = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  email.sendAccountCredentialsEmail = async options => { sent.push(options); enter(); await gate; return { success: true }; };
  const created = response();
  const creating = admin.createInstructor({ body: instructor() }, created);
  await entered;
  try {
    const user = await User.findOne({ email: 'one@test.invalid' });
    const reset = response(); await admin.resendUserCredentials({ params: { id: String(user._id) } }, reset);
    assert.equal(reset.statusCode, 409); assert.equal(sent.length, 1);
  } finally { release(); await creating; }
  const saved = await User.findById(created.body._id);
  assert.equal(created.statusCode, 201); assert.equal(created.body.email_sent, true);
  assert(await bcrypt.compare(sent[0].temporaryPassword, saved.password_hash));
  assert.equal(created.body.credentials.temp_password, sent[0].temporaryPassword);
});

test('SMTP failure or simulated delivery reports email_sent false while preserving a usable created account', async () => {
  for (const [name, outcome] of [['Failure', { success: false }], ['Simulated', { success: true, simulated: true }]]) {
    email.sendAccountCredentialsEmail = async () => outcome;
    const res = response(); await admin.createInstructor({ body: instructor(name) }, res);
    assert.equal(res.statusCode, 201); assert.equal(res.body.email_sent, false); assert(res.body.email_error);
    const user = await User.findById(res.body._id); assert(await bcrypt.compare(res.body.credentials.temp_password, user.password_hash));
    assert.equal(user.credential_email_sent, false);
  }
});

test('notification failure cannot turn a saved and emailed instructor account into a failed creation', async () => {
  notifications.sendNotification = async () => { throw new Error('Unavailable'); };
  const res = response(); await admin.createInstructor({ body: instructor() }, res);
  assert.equal(res.statusCode, 201); assert.equal(res.body.email_sent, true); assert.equal(await User.countDocuments(), 1);
});

test('official credentials email is role-aware, escapes HTML, and keeps the same identity in text and HTML', async () => {
  const options = { to: 'teacher@test.invalid', name: '<Teacher & Co>', role: 'instructor', registrationNumber: '26I0001', temporaryPassword: 'TVTI@secret_123456789', expiresAt: '2026-11-21T00:00:00Z' };
  const mail = renderCredentialEmail(options);
  assert.match(mail.subject, /Instructor/); assert.doesNotMatch(mail.html, /<Teacher/); assert.match(mail.html, /&lt;Teacher &amp; Co&gt;/);
  for (const value of [options.registrationNumber, options.temporaryPassword, options.to]) { assert(mail.text.includes(value)); assert(mail.html.includes(value)); }
  assert.match(mail.text, /first login/); assert.match(mail.text, /previous temporary passwords no longer work/);
  assert.equal((await originals.account(options)).success, false); // no SMTP configured in this isolated suite
});

test('verification accepts the emailed official registration and keeps legacy indexes as aliases', async () => {
  const student = await User.create({ name: 'Student', email: 'student@test.invalid', role: 'student', password_hash: 'fixture', registration_number: 'TVTI-2026-00021', index_number: '26T0021' });
  for (const query of [student.registration_number, student.index_number, student.email]) {
    const res = response(); await searchStudentForVerification({ body: { query }, query: {} }, res);
    assert.equal(res.statusCode, 200); assert.equal(res.body.found, true);
    assert.equal(res.body.student.registration_number, student.registration_number);
    assert.equal(res.body.student.index_number, student.index_number);
  }
  const falseMatch = response(); await searchStudentForVerification({ body: { query: 'student@testXinvalid' }, query: {} }, falseMatch);
  assert.equal(falseMatch.body.found, false);
});
