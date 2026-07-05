const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/twintec_lms';

// Define IUser Schema matching models/User
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  is_active: Boolean,
  nic: String,
  desired_course: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function checkDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected successfully.');

    const users = await User.find({});
    console.log(`Total users in DB: ${users.length}`);
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}) [Role: ${u.role}] [Active: ${u.is_active}]`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error connecting to DB or querying:', err.message);
    process.exit(1);
  }
}

checkDatabase();
