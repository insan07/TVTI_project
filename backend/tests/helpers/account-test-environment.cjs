// No production database, credentials, SMTP or push notifications in account tests.
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config = () => ({ parsed: {} });
for (const key of Object.keys(process.env)) if (/^(SMTP_|MAIL_|CLOUDINARY_|FIREBASE_|MONGO_URI|GOOGLE_APPLICATION_CREDENTIALS)/.test(key)) delete process.env[key];
process.env.JWT_SECRET = 'isolated-account-test-secret';
const localBinary = path.resolve(__dirname, '../../../mobile/.expo/test-mongodb/mongod.exe');
// Optional local binary; otherwise mongodb-memory-server uses its normal cache.
if (!process.env.MONGOMS_SYSTEM_BINARY && fs.existsSync(localBinary)) {
  process.env.MONGOMS_SYSTEM_BINARY = localBinary;
  process.env.MONGOMS_SYSTEM_BINARY_VERSION_CHECK = 'false';
}
