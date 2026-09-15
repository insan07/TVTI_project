import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Connected');
  
  const User = (await import('./src/models/User')).default;
  const Enrollment = (await import('./src/models/Enrollment')).default;
  const Batch = (await import('./src/models/Batch')).default;
  
  const user = await User.findOne({ index_number: '26T0006' });
  if (!user) {
    console.log('User not found');
    process.exit(0);
  }
  console.log('User:', user.name, user.email);
  
  const enrollments = await Enrollment.find({ student_id: user._id, status: 'active' });
  console.log('Enrollments:', enrollments.length);
  
  for (const e of enrollments) {
    const batch = await Batch.findById(e.batch_id).populate('instructor_ids', 'name email');
    console.log('Batch:', batch?.name, 'Instructors:', batch?.instructor_ids);
  }
  
  process.exit(0);
};

run().catch(console.error);
