// Local-only audit harness. Uses disposable MongoDB and synthetic identities.
// Run after backend build: node audit/2026-11-13/run-audit.cjs [--serve]
const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const backend = createRequire(path.join(root, 'backend/package.json'));
const dotenv = backend('dotenv');
dotenv.config = () => ({ parsed: {} }); // Never read real .env or credentials.
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'disposable-local-audit-only';
process.env.MONGOMS_SYSTEM_BINARY = 'C:/Program Files/MongoDB/Server/8.0/bin/mongod.exe';
process.env.MONGOMS_SYSTEM_BINARY_VERSION_CHECK = 'false';
for (const key of Object.keys(process.env)) {
  if (/^(SMTP_|MAIL_|CLOUDINARY_|FIREBASE_|GOOGLE_APPLICATION_CREDENTIALS)/.test(key)) delete process.env[key];
}
const sandbox = path.join(__dirname, 'sandbox');
fs.mkdirSync(sandbox, { recursive: true });
process.chdir(sandbox);
const mongoose = backend('mongoose');
const bcrypt = backend('bcryptjs');
const jwt = backend('jsonwebtoken');
const express = backend('express');
const { MongoMemoryReplSet } = backend('mongodb-memory-server-core');
const dist = name => backend(path.join(root, 'backend/dist', name));
const model = name => dist('models/' + name).default;
const User = model('User'), Course = model('Course'), Batch = model('Batch');
const Enrollment = model('Enrollment'), Application = model('Application');
const Video = model('Video'), Result = model('Result'), Otp = model('OtpVerification');
const Slip = model('PaymentSlip'), Announcement = model('Announcement');
const mail = dist('services/emailService');
let capturedOtp = null, notificationFails = false;
for (const key of Object.keys(mail)) if (typeof mail[key] === 'function') {
  mail[key] = async opts => { if (opts?.otp) capturedOtp = opts.otp; return { success: true }; };
}
dist('services/notificationService').sendNotification = async () => {
  if (notificationFails) throw new Error('Local audit notification outage');
  return [];
};
const records = [];
function record(id, name, expected, actual, issue, details = {}) {
  const item = { id, name, expected, actual, outcome: issue ? 'ISSUE' : 'PASS', details };
  records.push(item);
  fs.writeFileSync(path.join(__dirname, 'api-results.json'), JSON.stringify(records, null, 2));
  console.log(`${item.outcome} ${id} ${name}: ${JSON.stringify(actual)}`);
}
let replica, server, web;
async function main() {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger', spawn: { windowsHide: true } } });
  process.env.MONGO_URI = replica.getUri('tvti_disposable_audit');
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User, Course, Batch, Enrollment, Application, Video, Result, Otp, Slip, Announcement].map(m => m.init()));
  const hash = await bcrypt.hash('AuditTest!123', 10);
  const [admin, teacher, otherTeacher, student, otherStudent, forced, inactive] = await User.create([
    ['Audit Admin', 'admin', 'admin'], ['Audit Teacher', 'teacher', 'instructor'], ['Other Teacher', 'otherteacher', 'instructor'],
    ['Audit Student', 'student', 'student'], ['Other Student', 'otherstudent', 'student'], ['Temporary Student', 'temporary', 'student'], ['Inactive Student', 'inactive', 'student'],
  ].map(([name, email, role]) => ({ name, email: `${email}@audit.invalid`, password_hash: hash, role, is_active: email !== 'inactive',
    must_change_password: email === 'temporary', nic: `SYNTHETIC-${email}`, index_number: `AUDIT-${email.toUpperCase()}`, registration_number: `AUDIT-${email.toUpperCase()}`,
    phone: '0700000000', payment_info: { total_fee: 10000, amount_paid: 1000, payment_status: 'partially_paid' } })));
  const [course, otherCourse] = await Course.create(['Electrical Safety', 'Plumbing'].map(title => ({ title, description: 'Synthetic audit fixture', fee: 10000, duration_weeks: 12, is_active: true })));
  const [batch, otherBatch] = await Batch.create([
    { name: 'Audit Electrical A', course_id: course._id, instructor_ids: [teacher._id] },
    { name: 'Audit Plumbing B', course_id: otherCourse._id, instructor_ids: [otherTeacher._id] },
  ].map(x => ({ ...x, start_date: new Date('2026-01-01'), end_date: new Date('2099-12-31'), capacity: 20, status: 'active', schedule_json: { days: ['Monday', 'Wednesday'], time: '09:00 - 12:00' } })));
  await Enrollment.create({ student_id: student._id, batch_id: batch._id, status: 'active' });
  await Enrollment.create({ student_id: otherStudent._id, batch_id: otherBatch._id, status: 'active' });
  await Application.create({ full_name: 'Synthetic Applicant', email: 'applicant@audit.invalid', phone: '0700000000', nic_number: 'SYNTHETIC-APPLICANT', address: 'Synthetic test address', guardian: { name: 'Synthetic Guardian', phone: '0700000000' }, payment_slip: 'data:image/png;base64,VEVTVA==', student_photo: 'data:image/png;base64,VEVTVA==', course_id: course._id, terms_accepted: true });
  const video = await Video.create({ instructor_id: teacher._id, batch_id: batch._id, title: 'Audit Lesson', topic: 'Safety', cloudinary_url: 'https://www.youtube.com/embed/abcdefghijk', content_type: 'video' });
  const otherVideo = await Video.create({ instructor_id: otherTeacher._id, batch_id: otherBatch._id, title: 'Private Plumbing Topic', topic: 'Private topic', cloudinary_url: 'https://www.youtube.com/embed/lmnopqrstuv', content_type: 'video' });
  await Announcement.create({ posted_by: teacher._id, batch_id: batch._id, title: 'Audit notice', message: 'Synthetic local notice' });
  await model('Notification').create({ user_id: student._id, title: 'Audit notification', message: 'Synthetic notification', type: 'announcement', is_read: false });
  const app = dist('server').default;
  server = await new Promise(resolve => { const s = app.listen(5000, '127.0.0.1', () => resolve(s)); });
  const ui = express(); ui.use(express.static(path.join(root, 'mobile/dist'))); ui.use((req, res) => res.sendFile(path.join(root, 'mobile/dist/index.html')));
  web = await new Promise(resolve => { const s = ui.listen(8086, '127.0.0.1', () => resolve(s)); });
  const tokens = new Map();
  const token = actor => tokens.get(String(actor._id)) || jwt.sign({ id: String(actor._id) }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const req = async (url, options = {}, actor) => {
    const headers = { ...options.headers };
    if (actor) headers.Authorization = `Bearer ${token(actor)}`;
    if (options.body && !(options.body instanceof FormData)) { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(options.body); }
    const response = await fetch('http://localhost:5000/api' + url, { ...options, headers });
    const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, data, headers: response.headers };
  };
  for (const actor of [admin, teacher, student]) {
    const r = await req('/auth/login', { method: 'POST', body: { email: actor.email, password: 'AuditTest!123' } });
    tokens.set(String(actor._id), r.data.token);
    record('FLOW-login-' + actor.role, 'Login ' + actor.role, 200, r.status, r.status !== 200);
  }
  for (const [id, url, actor, expected] of [
    ['anonymous-admin', '/admin/users', null, 401], ['student-admin', '/admin/users', student, 403],
    ['teacher-admin', '/admin/users', teacher, 403], ['inactive', '/users/me', inactive, 401],
    ['student-home', '/students/home', student, 200], ['student-batches', '/students/batches', student, 200],
    ['student-schedule', '/students/my-schedule', student, 200], ['student-results', '/students/my-results', student, 200],
    ['student-slips', '/students/payments/my-slips', student, 200], ['student-announcements', '/students/announcements', student, 200],
    ['student-uploads', `/students/batches/${batch._id}/videos`, student, 200], ['other-batch', `/students/batches/${otherBatch._id}/videos`, student, 403],
    ['other-video', `/students/videos/${otherVideo._id}/stream-url`, student, 403],
    ['teacher-batches', '/instructors/my-batches', teacher, 200], ['teacher-students', '/instructors/my-students', teacher, 200],
    ['teacher-home', '/instructors/dashboard-stats', teacher, 200], ['teacher-uploads', '/instructors/videos', teacher, 200],
    ['admin-stats', '/admin/stats', admin, 200], ['admin-courses', '/admin/courses', admin, 200], ['admin-batches', '/admin/batches', admin, 200],
    ['admin-payments', '/admin/payments', admin, 200], ['notifications', '/notifications/my', student, 200], ['notification-count', '/notifications/unread-count', student, 200],
  ]) {
    const r = await req(url, {}, actor); record('FLOW-' + id, url, expected, r.status, r.status !== expected);
  }
  let r = await req('/applications');
  record('SEC-01', 'Anonymous applications disclosure', '401 or 403', r.status, r.status === 200, { fields: Object.keys(r.data[0] || {}), records: r.data.length });
  r = await req('/auth/debug-batch'); record('SEC-02', 'Anonymous batch debug data', '404 or authentication', r.status, r.status === 200, { records: r.data.length });
  r = await req(`/instructors/batches/${otherBatch._id}/topics`, {}, teacher);
  record('SEC-03', 'Instructor topics from unassigned batch', '403', { status: r.status, topics: r.data }, r.status === 200);
  r = await req('/announcements', { method: 'POST', body: { batch_id: String(otherBatch._id), title: 'Cross-batch audit', message: 'Unassigned teacher' } }, teacher);
  record('SEC-04', 'Instructor posts to unassigned batch', '403', r.status, r.status === 201);
  r = await req(`/instructors/videos/${video._id}`, { method: 'PUT', body: { batch_id: String(otherBatch._id), title: 'Moved without permission' } }, teacher);
  record('SEC-05', 'Video update bypasses batch assignment', '403', { status: r.status, moved: String(r.data.batch_id) === String(otherBatch._id) }, r.status === 200);
  await Video.updateOne({ _id: video._id }, { batch_id: batch._id, title: 'Audit Lesson' });
  r = await req('/students/home', {}, forced); const denied = r.status;
  r = await req('/students/home?next=/users/me', {}, forced);
  record('SEC-06', 'Query bypass of mandatory password change', '403 for both', { normal: denied, withQuery: r.status }, denied === 403 && r.status === 200);
  r = await req('/users/force-change-password', { method: 'PUT', body: { newPassword: 'ChangedWithoutCurrent!123' } }, student);
  const changed = await User.findById(student._id);
  record('SEC-07', 'Force-change endpoint usable by ordinary users without current password', 'Reject when must_change_password=false', { status: r.status, passwordChanged: await bcrypt.compare('ChangedWithoutCurrent!123', changed.password_hash) }, r.status === 200);
  r = await req('/users/change-password', { method: 'PUT', body: { currentPassword: 'ChangedWithoutCurrent!123', newPassword: 'x' } }, student);
  record('SEC-08', 'One-character password accepted', '400', r.status, r.status === 200);
  r = await req('/users/me', {}, student);
  record('SEC-09', 'JWT remains valid after password change', 'Old token invalidated', r.status, r.status === 200);
  await User.updateOne({ _id: student._id }, { password_hash: hash });
  const form = new FormData(); form.append('amount', '1200'); form.append('payment_method', 'bank_transfer');
  form.append('slip_file', new Blob([Buffer.from([137,80,78,71,13,10,26,10])], { type: 'image/png' }), 'synthetic-slip.png');
  r = await req('/students/payments/upload-slip', { method: 'POST', body: form }, student);
  const filePath = r.data?.slip?.slip_url;
  const uploaded = filePath ? await fetch('http://localhost:5000' + filePath) : null;
  record('FUNC-01', 'Payment slip upload retains image', '201 with retrievable file', { status: r.status, slip_url: filePath, fetchStatus: uploaded?.status }, r.status === 201 && uploaded?.status !== 200);
  const privateFile = await dist('services/fileStorage').saveBufferToGridFS(Buffer.from('%PDF-1.4\nSynthetic private notes'), 'audit-private.pdf', 'application/pdf');
  r = await req('/files/' + privateFile);
  record('SEC-10', 'Raw lesson file accessible without auth', '401 or 403', { status: r.status, content: String(r.data).slice(0, 50) }, r.status === 200);
  await Otp.create({ email: student.email, otp_hash: await bcrypt.hash('123456', 4), expires_at: new Date(Date.now() + 600000), attempts: 0, verified: false });
  r = await req('/certificates/verify-otp', { method: 'POST', body: { query: student.email, otp: '123456' } });
  record('FUNC-02', 'Transcript with no results', 'No fabricated grade', { status: r.status, marks: r.data.certifications?.[0]?.average_marks, grade: r.data.certifications?.[0]?.grade }, r.data.certifications?.[0]?.average_marks === 85);
  await Otp.create({ email: forced.email, otp_hash: await bcrypt.hash('123456', 4), expires_at: new Date(Date.now() + 600000), attempts: 0, verified: false });
  r = await req('/certificates/verify-otp', { method: 'POST', body: { query: forced.email, otp: '123456' } });
  record('FUNC-03', 'Certificate for student with no enrollment', 'No certifications', { status: r.status, certification: r.data.certifications?.[0] }, r.data.certifications?.[0]?.average_marks === 88);
  r = await req('/certificates/search', { method: 'POST', body: { query: '.*' } });
  record('SEC-11', 'Certificate lookup treats query as regex', 'No match', { status: r.status, found: r.data.found }, r.data.found === true);
  for (const marks of [-1, 101]) {
    r = await req('/admin/results', { method: 'POST', body: { student_id: String(student._id), batch_id: String(batch._id), assessment_name: 'Out-of-range audit', marks } }, admin);
    record('FUNC-04-' + marks, 'Out-of-range result marks', '400', { status: r.status, marks: r.data.marks, grade: r.data.grade }, r.status === 201);
  }
  r = await req('/admin/results', { method: 'POST', body: { student_id: String(otherStudent._id), batch_id: String(batch._id), assessment_name: 'Wrong enrollment audit', marks: 80 } }, admin);
  record('FUNC-05', 'Result for non-enrolled student', '400 or 403', r.status, r.status === 201);
  r = await req('/auth/forgot-password', { method: 'POST', body: { email: student.email } });
  const resetOtp = capturedOtp;
  let attempts = [];
  for (let i = 0; i < 7; i++) attempts.push((await req('/auth/verify-reset-otp', { method: 'POST', body: { email: student.email, otp: '000000' } })).status);
  r = await req('/auth/verify-reset-otp', { method: 'POST', body: { email: student.email, otp: resetOtp } });
  record('SEC-12', 'Password reset OTP attempts are uncapped', 'Lock after bounded failures', { attempts, correctCodeAfter7Failures: r.status }, r.status === 200);
  if (r.data.resetToken) {
    r = await req('/auth/reset-password', { method: 'POST', body: { resetToken: r.data.resetToken, newPassword: 'y' } });
    record('SEC-13', 'Password reset accepts one-character password', '400', r.status, r.status === 200);
  }
  await User.updateOne({ _id: student._id }, { password_hash: hash });
  r = await req('/auth/forgot-password', { method: 'POST', body: { email: student.email } });
  r = await req('/users/me', {}, student);
  record('SEC-14', 'Profile serializes reset verifier', 'No password reset hashes', { status: r.status, hasOtpHash: !!r.data.passwordResetOtpHash, hasOtpExpiry: !!r.data.passwordResetOtpExpiresAt }, !!r.data.passwordResetOtpHash);
  r = await req('/auth/resend-reset-otp', { method: 'POST', body: { email: student.email } });
  const resend2 = await req('/auth/resend-reset-otp', { method: 'POST', body: { email: student.email } });
  record('SEC-15', 'Reset resend has no server cooldown', '429 for immediate resend', [r.status, resend2.status], r.status === 200 && resend2.status === 200);
  await User.updateOne({ _id: student._id }, { passwordResetOtpHash: null, passwordResetOtpExpiresAt: null });
  notificationFails = true;
  const countBefore = await Announcement.countDocuments();
  r = await req('/announcements', { method: 'POST', body: { batch_id: String(batch._id), title: 'Notification outage audit', message: 'Should save once' } }, teacher);
  record('FUNC-06', 'Announcement reports failure after saving', '201 with notification warning', { status: r.status, saved: await Announcement.countDocuments() > countBefore }, r.status === 500 && await Announcement.countDocuments() > countBefore);
  const slipBefore = await Slip.countDocuments();
  r = await req('/students/payments/upload-slip', { method: 'POST', body: { amount: 500, slip_url: '/uploads/synthetic-only.png' } }, student);
  record('FUNC-07', 'Payment slip reports failure after saving', '201 with notification warning', { status: r.status, saved: await Slip.countDocuments() > slipBefore }, r.status === 500 && await Slip.countDocuments() > slipBefore);
  notificationFails = false;
  await User.updateOne({ _id: student._id }, { password_hash: hash });
  console.log('Audit complete:', records.length, 'checks;', records.filter(r => r.outcome === 'ISSUE').length, 'issue observations.');
  if (process.argv.includes('--serve')) {
    console.log('LOCAL_UI_READY http://localhost:8086 — synthetic accounts admin/teacher/student@audit.invalid / AuditTest!123');
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  for (const s of [web, server]) if (s) { s.closeAllConnections(); await new Promise(resolve => s.close(resolve)); }
  await mongoose.disconnect(); if (replica) await replica.stop();
});
