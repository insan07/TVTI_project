// Usage: node set-user.js <newEmail> <password> <role> [fromEmail]
// Updates the user with <newEmail> if it exists; otherwise renames [fromEmail]
// (or the first user with <role>) to <newEmail>. Sets the password and activates the account.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const [email, password, role, fromEmail] = process.argv.slice(2);
if (!email || !password || !role) {
  console.log('Usage: node set-user.js <newEmail> <password> <role> [fromEmail]');
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.collection('users');
  const password_hash = await bcrypt.hash(password, 10);

  const target =
    (await users.findOne({ email })) ||
    (fromEmail && (await users.findOne({ email: fromEmail }))) ||
    (await users.findOne({ role }));
  if (!target) {
    console.log(`No ${role} user found`);
    process.exit(1);
  }
  await users.updateOne(
    { _id: target._id },
    { $set: { email, password_hash, role, is_active: true, is_approved: true, must_change_password: false } }
  );
  console.log(`Updated ${role} ${target._id}: ${target.email} -> ${email}`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
