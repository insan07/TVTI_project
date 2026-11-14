// Additional local HTTP and mail-service probes. Never loads production .env.
const fs = require('node:fs'), path = require('node:path'), { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..'), backend = createRequire(path.join(root, 'backend/package.json'));
backend('dotenv').config = () => ({ parsed: {} });
for (const key of Object.keys(process.env)) if (/^(SMTP_|MAIL_)/.test(key)) delete process.env[key];
async function main() {
  const rows = [];
  const req = async (route, body, token) => {
    const r = await fetch('http://localhost:5000/api' + route, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json() };
  };
  let r = await req('/certificates/verify-otp', { query: 'temporary@audit.invalid', otp: '000000' });
  rows.push({ id: 'SEC-16', name: 'Wrong code accepted after prior certificate verification', expected: 400, actual: { status: r.status, verified: r.data.verified, exposedNic: !!r.data.student?.nic_number }, outcome: r.status === 200 ? 'ISSUE' : 'PASS' });
  const mail = backend(path.join(root, 'backend/dist/services/emailService'));
  const originalLog = console.log; let logs = [];
  console.log = (...args) => logs.push(args.join(' '));
  const result = await mail.sendPasswordResetOtpEmail({ to: 'nobody@audit.invalid', otp: '123456' });
  const certResult = await mail.sendCertificateVerificationOtpEmail({ to: 'nobody@audit.invalid', otp: '123456', studentName: 'Synthetic Student', indexNumber: 'AUDIT' });
  console.log = originalLog;
  rows.push({ id: 'FUNC-08', name: 'Missing mail config returns simulated OTP delivery success', expected: 'Explicit failure; no raw OTP log', actual: { reset: result, certificate: certResult, rawOtpLogged: logs.some(line => line.includes('123456')) }, outcome: 'ISSUE' });
  const login = await req('/auth/login', { email: 'admin@audit.invalid', password: 'AuditTest!123' });
  r = await req('/admin/activities', null, login.data.token);
  rows.push({ id: 'UI-03', name: 'Admin application activity has applicant name', expected: 'Synthetic Applicant', actual: r.data, outcome: JSON.stringify(r.data).includes('undefined') ? 'ISSUE' : 'PASS' });
  const module = backend('nodemailer');
  const named = module.createTransport, marker = () => {};
  module.createTransport = marker;
  const defaultSeesNamedMock = module.default?.createTransport === marker;
  module.createTransport = named;
  rows.push({ id: 'TEST-02', name: 'Nodemailer test mock targets same transport as compiled service', expected: 'Default sees named export mock', actual: { defaultSeesNamedMock }, outcome: defaultSeesNamedMock ? 'PASS' : 'ISSUE' });
  const studentLogin = await req('/auth/login', { email: 'student@audit.invalid', password: 'AuditTest!123' });
  r = await req('/notifications/my', null, studentLogin.data.token);
  const apiPath = path.join(__dirname, 'api-results.json');
  const apiRows = JSON.parse(fs.readFileSync(apiPath));
  const notification = apiRows.find(row => row.id === 'FLOW-notifications');
  Object.assign(notification, { name: '/notifications/my', actual: r.status, outcome: r.status === 200 ? 'PASS' : 'ISSUE', details: { note: 'Corrected audit URL: mobile uses /notifications/my; bare /notifications is not an app route.' } });
  fs.writeFileSync(apiPath, JSON.stringify(apiRows, null, 2));
  const setPassword = async password => fetch('http://localhost:5000/api/users/force-change-password', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentLogin.data.token}` }, body: JSON.stringify({ newPassword: password }) });
  await setPassword(' SpaceAudit123! ');
  const exact = await req('/auth/login', { email: 'student@audit.invalid', password: ' SpaceAudit123! ' });
  const trimmed = await req('/auth/login', { email: 'student@audit.invalid', password: 'SpaceAudit123!' });
  rows.push({ id: 'FUNC-09', name: 'Login trims a password which profile/reset preserves', expected: 'Password can be used unchanged', actual: { exactStatus: exact.status, uiTrimmedStatus: trimmed.status }, outcome: exact.status === 200 && trimmed.status === 401 ? 'ISSUE' : 'PASS' });
  await setPassword('AuditTest!123');
  fs.writeFileSync(path.join(__dirname, 'extra-results.json'), JSON.stringify(rows, null, 2));
  for (const row of rows) console.log(row.id, row.name, row.outcome, row.id === 'UI-03' ? JSON.stringify(row.actual).match(/.{0,25}undefined.{0,50}/g) : JSON.stringify(row.actual));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
