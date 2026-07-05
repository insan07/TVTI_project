const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/twintec_lms';

// Define Course Schema matching models/Course
const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  duration_weeks: Number,
  fee: Number,
  is_active: Boolean
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);

async function checkCourses() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected successfully.');

    const courses = await Course.find({});
    console.log(`Total courses in DB: ${courses.length}`);
    courses.forEach(c => {
      console.log(`- ${c.title} [Active: ${c.is_active}] [_id: ${c._id}]`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error connecting to DB or querying:', err.message);
    process.exit(1);
  }
}

checkCourses();
