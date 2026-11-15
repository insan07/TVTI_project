// Local integration tests: isolated MongoDB, loopback HTTP, and mocked email only.
const assert = require('node:assert/strict');
const { test, before, beforeEach, after } = require('node:test');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const User = require('../dist/models/User').default;
const Application = require('../dist/models/Application').default;
const Batch = require('../dist/models/Batch').default;
const Otp = require('../dist/models/OtpVerification').default;
const CertificateOtp = require('../dist/models/CertificateOtpVerification').default;
const email = require('../dist/services/emailService');
const { generateSessionToken } = require('../dist/config/auth');
const { isAllowedOrigin } = require('../dist/config/cors');
const { forgotPassword, verifyResetOtp, resetPassword } = require('../dist/controllers/authController');
const { verifyPasswordChange } = require('../dist/services/passwordChange');
const originals = { reset: email.sendPasswordResetOtpEmail, certificate: email.sendCertificateVerificationOtpEmail };
const secret = process.env.JWT_SECRET;
let database, server, base, student, admin, instructor, sent;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const call = async (url, user, body, method = body ? 'POST' : 'GET') => {
  const res = await fetch(base + url, { method, headers: { ...(user ? { Authorization: `Bearer ${typeof user === 'string' ? user : generateSessionToken(user)}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json().catch(() => null) };
};

before(async () => {
  database = await MongoMemoryServer.create({ instance: { spawn: { windowsHide: true } } });
  await mongoose.connect(database.getUri('isolated_security_review'));
  const app = express(); app.use(express.json());
  for (const [route, file] of [['auth', 'auth'], ['applications', 'applications'], ['users', 'userRoutes'], ['certificates', 'certificateRoutes'], ['notifications', 'notifications'], ['instructors', 'instructors'], ['admin', 'admin'], ['announcements', 'announcements']]) {
    app.use('/api/' + route, require('../dist/routes/' + file).default);
  }
  app.use((err, _req, res, _next) => res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: err.message }));
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 120000 });
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
  const hash = await bcrypt.hash('Old-password123', 10);
  [student, admin, instructor] = await User.create(['student', 'admin', 'instructor'].map(role => ({ name: role, email: `${role}@example.test`, role, password_hash: hash })));
  sent = [];
  email.sendPasswordResetOtpEmail = async options => { sent.push(options); return { success: true }; };
  email.sendCertificateVerificationOtpEmail = async options => { sent.push(options); return { success: true }; };
});
after(async () => {
  Object.assign(email, { sendPasswordResetOtpEmail: originals.reset, sendCertificateVerificationOtpEmail: originals.certificate });
  process.env.JWT_SECRET = secret;
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); if (database) await database.stop();
});

test('application records require an authenticated administrator and the debug route is absent', async () => {
  await Application.create({ full_name: 'Private applicant', email: 'applicant@example.test', phone: '0700000000', course_id: new mongoose.Types.ObjectId() });
  assert.equal((await call('/api/applications')).status, 401);
  assert.equal((await call('/api/applications', student)).status, 403);
  const result = await call('/api/applications', admin);
  assert.equal(result.status, 200); assert.equal(result.body.length, 1);
  assert.equal((await call('/api/auth/debug-batch')).status, 404);
});

test('JWT verification rejects the fallback secret and unexpected algorithms', async () => {
  const invalid = jwt.sign({ id: String(student._id) }, 'secret');
  assert.equal((await call('/api/users/me', invalid)).status, 401);
  const alternate = jwt.sign({ id: String(student._id) }, secret, { algorithm: 'HS384' });
  assert.equal((await call('/api/users/me', alternate)).status, 401);
  delete process.env.JWT_SECRET;
  try { assert.equal((await call('/api/users/me', invalid)).status, 401); }
  finally { process.env.JWT_SECRET = secret; }
});

test('first-login restrictions cannot be bypassed with a whitelisted path in a query string', async () => {
  await User.updateOne({ _id: student._id }, { must_change_password: true });
  assert.equal((await call('/api/notifications/my?bypass=/users/me', student)).status, 403);
  assert.equal((await call('/api/users/me', student)).status, 200);
});

test('password changes revoke older sessions and return a working replacement session', async () => {
  const token = generateSessionToken(student);
  const verified = await verifyPasswordChange(student._id, { method: 'password', currentPassword: 'Old-password123' });
  const changed = await call('/api/users/change-password', token, { verificationToken: verified.verificationToken, newPassword: 'New-password456', confirmPassword: 'New-password456' }, 'PUT');
  assert.equal(changed.status, 200); assert(changed.body.token);
  assert.equal((await call('/api/users/me', token)).status, 401);
  assert.equal((await call('/api/users/me', changed.body.token)).status, 200);
});

test('recovery hashes and tokens are excluded from normal account queries and profile responses', async () => {
  await User.updateOne({ _id: student._id }, { passwordResetOtpHash: 'private-otp', passwordResetTokenHash: 'private-token', passwordResetCredentialHash: 'private-credential' });
  const ordinary = await User.findById(student._id);
  assert.equal(ordinary.passwordResetTokenHash, undefined);
  const profile = await call('/api/users/me', student);
  assert.equal(profile.status, 200);
  for (const field of ['password_hash', 'passwordResetOtpHash', 'passwordResetTokenHash', 'passwordResetCredentialHash']) assert.equal(profile.body[field], undefined);
});

test('forgotten-password delivery fails closed and failed delivery does not store a challenge', async () => {
  email.sendPasswordResetOtpEmail = async () => ({ success: true, simulated: true });
  const res = response(); await forgotPassword({ body: { email: student.email } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal((await User.findById(student._id).select('+passwordResetOtpHash')).passwordResetOtpHash, undefined);
});

test('forgotten-password cooldown and five-attempt limit prevent resend and brute-force abuse', async () => {
  await forgotPassword({ body: { email: student.email } }, response());
  await forgotPassword({ body: { email: student.email } }, response()); assert.equal(sent.length, 1);
  for (let i = 0; i < 5; i++) {
    const res = response(); await verifyResetOtp({ body: { email: student.email, otp: '000000' } }, res); assert.equal(res.statusCode, 400);
  }
  const correct = response(); await verifyResetOtp({ body: { email: student.email, otp: sent[0].otp } }, correct);
  assert.equal(correct.statusCode, 400); assert.match(correct.body.message, /Too many/);
});

test('reset tokens are single-use, bound to the previous credentials, and revoke old sessions', async () => {
  const oldToken = generateSessionToken(student);
  await forgotPassword({ body: { email: student.email } }, response());
  const verified = response(); await verifyResetOtp({ body: { email: student.email, otp: sent[0].otp } }, verified);
  assert.equal(verified.statusCode, 200);
  const replay = response(); await verifyResetOtp({ body: { email: student.email, otp: sent[0].otp } }, replay); assert.equal(replay.statusCode, 400);
  const changed = response(); await resetPassword({ body: { resetToken: verified.body.resetToken, newPassword: 'Updated-password456' } }, changed);
  assert.equal(changed.statusCode, 200);
  const again = response(); await resetPassword({ body: { resetToken: verified.body.resetToken, newPassword: 'Another-password789' } }, again); assert.equal(again.statusCode, 400);
  assert.equal((await call('/api/users/me', oldToken)).status, 401);
});

test('malformed recovery inputs are rejected without a database cast error', async () => {
  for (const [handler, body] of [[forgotPassword, { email: { $ne: null } }], [verifyResetOtp, { email: student.email, otp: { $ne: null } }], [resetPassword, { resetToken: 'not-an-id.token', newPassword: 'x' }]]) {
    const res = response(); await handler({ body }, res); assert.equal(res.statusCode, 400);
  }
});

test('certificate verification never returns a simulated OTP or a shared verified-email session', async () => {
  email.sendCertificateVerificationOtpEmail = async () => ({ success: true, simulated: true });
  const failed = await call('/api/certificates/request-otp', null, { query: student.email });
  assert.equal(failed.status, 503); assert.equal(failed.body.devOtp, undefined); assert.equal(await CertificateOtp.countDocuments(), 0);
  await Otp.create({ email: student.email, verified: true, verified_at: new Date(), expires_at: new Date(Date.now() + 600000) });
  const bypass = await call('/api/certificates/verify-otp', null, { query: student.email, otp: '123456' });
  assert.equal(bypass.status, 400);
});

test('certificate codes are single-use and cannot mark admissions email as verified', async () => {
  const requested = await call('/api/certificates/request-otp', null, { query: student.email });
  assert.equal(requested.status, 200); assert.equal(requested.body.devOtp, undefined);
  const body = { query: student.email, otp: sent[0].otp };
  assert.equal((await call('/api/certificates/verify-otp', null, body)).status, 200);
  assert.equal((await call('/api/certificates/verify-otp', null, body)).status, 400);
  assert.equal(await Otp.countDocuments(), 0);
});

test('instructors cannot list another batch topics or broadcast to arbitrary recipients', async () => {
  const batch = await Batch.create({ name: 'Other batch', course_id: new mongoose.Types.ObjectId(), capacity: 30, start_date: new Date(), end_date: new Date(), instructor_ids: [admin._id] });
  assert.equal((await call(`/api/instructors/batches/${batch._id}/topics`, instructor)).status, 403);
  assert.equal((await call('/api/notifications/send', instructor, { userIds: [String(admin._id)], title: 'Unauthorized', message: 'Unauthorized' })).status, 403);
  assert.equal((await call('/api/announcements', instructor, { batch_id: String(batch._id), title: 'Unauthorized', message: 'Unauthorized' })).status, 403);
});

test('profile uploads reject documents, mismatched file signatures, and oversized images', async () => {
  for (const [name, mime, bytes, status] of [['file.pdf', 'application/pdf', '%PDF-1.4', 400], ['image.png', 'image/png', 'not a png', 400], ['large.png', 'image/png', Buffer.alloc(5 * 1024 * 1024 + 1), 413]]) {
    const form = new FormData(); form.append('profile_photo', new Blob([bytes], { type: mime }), name);
    const result = await fetch(base + '/api/users/profile', { method: 'PUT', headers: { Authorization: 'Bearer ' + generateSessionToken(student) }, body: form });
    assert.equal(result.status, status); await result.text();
  }
});

test('production CORS accepts trusted domains and explicit previews, rejecting wildcards', () => {
  const previous = { mode: process.env.NODE_ENV, origins: process.env.CORS_ORIGINS };
  process.env.NODE_ENV = 'production'; process.env.CORS_ORIGINS = 'https://tvti-preview.vercel.app,*';
  try {
    assert(isAllowedOrigin('https://lms.twintec.edu.lk'));
    assert(isAllowedOrigin('https://tvti-preview.vercel.app'));
    assert.equal(isAllowedOrigin('https://attacker.vercel.app'), false);
    assert.equal(isAllowedOrigin('http://localhost:8081'), false);
    assert.equal(isAllowedOrigin('https://twintec.edu.lk.attacker.test'), false);
  } finally {
    for (const [key, value] of [['NODE_ENV', previous.mode], ['CORS_ORIGINS', previous.origins]]) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
