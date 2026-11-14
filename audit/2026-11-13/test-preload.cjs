// Audit-only compatibility shim for Nodemailer 10's named/default exports.
// Prevents loading real credentials or opening external SMTP connections.
const path = require('node:path'), { createRequire } = require('node:module');
const backend = createRequire(path.resolve(__dirname, '../../backend/package.json'));
backend('dotenv').config = () => ({ parsed: {} });
for (const key of Object.keys(process.env)) if (/^(SMTP_|MAIL_|CLOUDINARY_|FIREBASE_)/.test(key)) delete process.env[key];
const mail = backend('nodemailer');
if (mail.default && mail.default !== mail) {
  const original = mail.default.createTransport;
  mail.default.createTransport = function auditTransport(options, ...args) {
    if (!['localhost', '127.0.0.1', '::1'].includes(options?.host)) throw new Error('Audit blocked non-loopback SMTP');
    return original.call(this, options, ...args);
  };
  Object.defineProperty(mail, 'createTransport', { configurable: true, enumerable: true,
    get() { return mail.default.createTransport; }, set(value) { mail.default.createTransport = value; } });
}
