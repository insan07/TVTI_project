import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tvti_db');
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Batch = mongoose.model('Batch', new mongoose.Schema({}, { strict: false }));
  const Enrollment = mongoose.model('Enrollment', new mongoose.Schema({}, { strict: false }));

  const students = await User.find({ role: 'student' }).lean();
  console.log('STUDENTS:', students.map(s => ({ _id: s._id, name: s.name })));

  const inst = await User.find({ role: 'instructor' }).lean();
  console.log('INSTRUCTORS:', inst.map(i => ({ _id: i._id, name: i.name })));

  const batches = await Batch.find({}).lean();
  console.log('BATCHES:', batches.map(b => ({ _id: b._id, course_id: b.course_id, instructor_ids: b.instructor_ids })));

  const enrollments = await Enrollment.find({}).lean();
  console.log('ENROLLMENTS:', enrollments.map(e => ({ _id: e._id, student: e.student_id, batch: e.batch_id, status: e.status })));

  process.exit(0);
};

run().catch(console.error);
