// Run with: npm run build; node --test tests/registration-otp.test.js
// These tests exercise real services with in-memory records and mocked SMTP,
// plus one real Nodemailer roundtrip into a loopback-only in-memory SMTP sink.
// They never connect to a database, load .env, or deliver external email.
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const net = require('node:net');
const { once } = require('node:events');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const OtpVerification = require('../dist/models/OtpVerification').default;
const User = require('../dist/models/User').default;
const Application = require('../dist/models/Application').default;
const { sendOtpEmail } = require('../dist/services/emailService');
const { sendOtp, verifyOtp, isEmailVerified } = require('../dist/services/otpService');
const { sendOtpHandler, verifyOtpHandler } = require('../dist/controllers/authController');

const email = 'learner@example.test';
const envKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SERVICE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_PASSWORD'];
const original = {
  createTransport: nodemailer.createTransport,
  findOne: OtpVerification.findOne,
  findOneAndUpdate: OtpVerification.findOneAndUpdate,
  userFindOne: User.findOne,
  applicationFindOne: Application.findOne,
  consoleError: console.error,
};
let envBefore;
let record;
let deliveries;
let writes;
let transportOptions;
let deliveryError;
let rejected;

const storedRecord = (values = {}) => ({
  email,
  otp_hash: '',
  expires_at: new Date(Date.now() + 600000),
  attempts: 0,
  verified: false,
  last_sent_at: new Date(Date.now() - 61000),
  save: async function () { writes += 1; return this; },
  ...values,
});

beforeEach(() => {
  envBefore = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_USER: 'sender@example.test',
    SMTP_PASS: 'test-only-password',
  });
  delete process.env.SMTP_SERVICE;
  delete process.env.SMTP_PASSWORD;
  record = null;
  deliveries = [];
  writes = 0;
  deliveryError = null;
  rejected = false;
  transportOptions = null;
  nodemailer.createTransport = (options) => {
    transportOptions = options;
    return {
      sendMail: async (mail) => {
        deliveries.push(mail);
        if (deliveryError) throw deliveryError;
        return { accepted: rejected ? [] : [mail.to], rejected: rejected ? [mail.to] : [] };
      },
    };
  };
  OtpVerification.findOne = async (query) => {
    if (!record || query.email !== record.email || (query.verified && !record.verified)) return null;
    return record;
  };
  OtpVerification.findOneAndUpdate = async (_query, values) => {
    writes += 1;
    record = storedRecord(values);
    return record;
  };
  User.findOne = async () => null;
  Application.findOne = async () => null;
  console.error = () => {};
});

afterEach(() => {
  for (const key of envKeys) {
    if (envBefore[key] === undefined) delete process.env[key];
    else process.env[key] = envBefore[key];
  }
  nodemailer.createTransport = original.createTransport;
  OtpVerification.findOne = original.findOne;
  OtpVerification.findOneAndUpdate = original.findOneAndUpdate;
  User.findOne = original.userFindOne;
  Application.findOne = original.applicationFindOne;
  console.error = original.consoleError;
});

test('honors explicit Gmail SMTP host and STARTTLS port instead of a service preset', async () => {
  await sendOtpEmail({ to: email, otp: '123456' });
  assert.equal(transportOptions.host, 'smtp.gmail.com');
  assert.equal(transportOptions.port, 587);
  assert.equal(transportOptions.secure, false);
  assert.equal(transportOptions.service, undefined);
});

test('successful delivery stores a hashed code, enforces cooldown, and verifies email', async () => {
  const result = await sendOtp(' LEARNER@EXAMPLE.TEST ');
  assert.equal(result.success, true);
  assert.equal(result.cooldownRemaining, 60);
  assert.equal('devOtp' in result, false);
  assert.equal(deliveries[0].to, email);
  const code = deliveries[0].text.match(/\b\d{6}\b/)[0];
  assert.notEqual(record.otp_hash, code);
  assert.equal(await bcrypt.compare(code, record.otp_hash), true);
  assert.equal(await isEmailVerified(email), false);
  const cooldown = await sendOtp(email);
  assert.equal(cooldown.success, false);
  assert.ok(cooldown.cooldownRemaining > 0);
  assert.equal(deliveries.length, 1);
  assert.equal((await verifyOtp(email, code)).verified, true);
  assert.equal(record.otp_hash, '');
  assert.equal(await isEmailVerified(email), true);
});

test('SMTP failure is a failure with no code, record, or resend cooldown', async () => {
  deliveryError = Object.assign(new Error('mock connection timeout'), { code: 'ETIMEDOUT' });
  const failure = await sendOtp(email);
  assert.equal(failure.success, false);
  assert.equal(failure.code, 'EMAIL_DELIVERY_UNAVAILABLE');
  assert.equal('devOtp' in failure, false);
  assert.equal(record, null);
  assert.equal(writes, 0);
  deliveryError = null;
  assert.equal((await sendOtp(email)).success, true);
  assert.equal(deliveries.length, 2);
});

test('failed resend preserves the previously delivered code and verification state', async () => {
  record = storedRecord({ otp_hash: await bcrypt.hash('123456', 4) });
  const previous = record;
  deliveryError = Object.assign(new Error('mock rejected authentication'), { code: 'EAUTH' });
  assert.equal((await sendOtp(email)).success, false);
  assert.equal(record, previous);
  assert.equal(writes, 0);
  assert.equal((await verifyOtp(email, '123456')).verified, true);
});

test('missing SMTP configuration cannot simulate a verified email', async () => {
  delete process.env.SMTP_PASS;
  const result = await sendOtp(email);
  assert.equal(result.success, false);
  assert.equal(deliveries.length, 0);
  assert.equal(record, null);
});

test('provider rejection cannot be reported as a successful delivery', async () => {
  rejected = true;
  const result = await sendOtp(email);
  assert.equal(result.success, false);
  assert.equal(record, null);
});

test('a successful resend invalidates the previous code', async () => {
  record = storedRecord({ otp_hash: await bcrypt.hash('000000', 4) });
  assert.equal((await sendOtp(email)).success, true);
  assert.equal((await verifyOtp(email, '000000')).success, false);
  const newCode = deliveries[0].text.match(/\b\d{6}\b/)[0];
  assert.equal((await verifyOtp(email, newCode)).verified, true);
});

test('wrong codes are rejected and stop after five attempts', async () => {
  record = storedRecord({ otp_hash: await bcrypt.hash('123456', 4) });
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await verifyOtp(email, '000000')).success, false);
  }
  assert.match((await verifyOtp(email, '123456')).message, /Too many attempts/);
  assert.equal(record.verified, false);
});

test('expired codes and expired verification sessions remain locked', async () => {
  record = storedRecord({ expires_at: new Date(Date.now() - 1000), otp_hash: await bcrypt.hash('123456', 4) });
  assert.match((await verifyOtp(email, '123456')).message, /expired/);
  record.verified = true;
  record.verified_at = new Date(Date.now() - 2 * 60 * 60 * 1000 - 1000);
  assert.equal((await verifyOtp(email, '123456')).success, false);
  assert.equal(await isEmailVerified(email), false);
});

test('malformed email and code inputs are rejected before database queries', async () => {
  OtpVerification.findOne = async () => { throw new Error('Unexpected database lookup'); };
  for (const value of [undefined, null, {}, [], 123456, '', 'invalid']) {
    assert.equal((await sendOtp(value)).success, false);
    assert.equal((await verifyOtp(value, '123456')).success, false);
  }
  assert.equal((await verifyOtp(email, {})).success, false);
  assert.equal((await verifyOtp(email, 'abc123')).success, false);
});

test('send handler returns HTTP 503 for delivery failure without opening the next step', async () => {
  deliveryError = Object.assign(new Error('mock connection timeout'), { code: 'ETIMEDOUT' });
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await sendOtpHandler({ body: { email } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.success, false);
  assert.equal(record, null);
});

test('registration controllers complete a roundtrip through real Nodemailer and a loopback SMTP sink', { timeout: 10000 }, async () => {
  // This sink accepts messages into memory only; it has no outbound mail logic.
  const messages = [];
  const sockets = new Set();
  const smtp = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.setEncoding('utf8');
    socket.write('220 loopback.test ESMTP\r\n');
    let buffer = '';
    let data = null;
    socket.on('data', (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        if (data) {
          if (line === '.') {
            messages.push(data.join('\r\n'));
            data = null;
            socket.write('250 Message accepted into local test memory\r\n');
          } else {
            data.push(line.replace(/^\.\./, '.'));
          }
        } else if (/^EHLO /i.test(line)) {
          socket.write('250-loopback.test\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n');
        } else if (/^AUTH PLAIN /i.test(line)) {
          socket.write('235 Authentication accepted for local test\r\n');
        } else if (/^(MAIL FROM:|RCPT TO:|RSET|NOOP)/i.test(line)) {
          socket.write('250 OK\r\n');
        } else if (/^DATA$/i.test(line)) {
          data = [];
          socket.write('354 End with a single dot\r\n');
        } else if (/^QUIT$/i.test(line)) {
          socket.end('221 Goodbye\r\n');
        } else {
          socket.write('500 Unsupported test SMTP command\r\n');
        }
      }
    });
  });
  smtp.listen(0, '127.0.0.1');
  await once(smtp, 'listening');
  try {
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(smtp.address().port);
    nodemailer.createTransport = original.createTransport;
    const response = () => ({
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    });

    const sendResponse = response();
    await sendOtpHandler({ body: { email } }, sendResponse);
    assert.equal(sendResponse.statusCode, 200);
    assert.equal(sendResponse.body.success, true);
    assert.equal('devOtp' in sendResponse.body, false);
    assert.equal(messages.length, 1);
    const code = messages[0].match(/^Subject: Twintec Verification Code: (\d{6})$/m)?.[1];
    assert.ok(code, 'The local SMTP sink received the actual emailed code');
    assert.equal(await bcrypt.compare(code, record.otp_hash), true);
    assert.equal(await isEmailVerified(email), false);

    const verifyResponse = response();
    await verifyOtpHandler({ body: { email, otp: code } }, verifyResponse);
    assert.equal(verifyResponse.statusCode, 200);
    assert.equal(verifyResponse.body.verified, true);
    assert.equal(await isEmailVerified(email), true);
    assert.equal(record.otp_hash, '');
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve, reject) => smtp.close((error) => error ? reject(error) : resolve()));
  }
});
