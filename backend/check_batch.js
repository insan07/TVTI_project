const mongoose = require('mongoose');
require('dotenv').config();

const Batch = mongoose.model('Batch', new mongoose.Schema({}, { strict: false }), 'batches');
const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }), 'courses');

async function checkBatch() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const course = await Course.findOne({ title: { $regex: /Mobile Phone Repairing/i } });
    if (course) {
       console.log('Course ID:', course._id);
       const batches = await Batch.find({ course_id: course._id });
       console.log('Batches:', JSON.stringify(batches, null, 2));
    } else {
       console.log('Course not found');
    }
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.connection.close();
  }
}

checkBatch();
