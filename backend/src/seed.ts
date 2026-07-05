import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from './models/User';
import Course from './models/Course';
import Batch from './models/Batch';
import Enrollment from './models/Enrollment';
import PracticeSlot from './models/PracticeSlot';
import SlotBooking from './models/SlotBooking';
import Video from './models/Video';
import Announcement from './models/Announcement';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/twintec_lms';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});
    await Batch.deleteMany({});
    await Enrollment.deleteMany({});
    await PracticeSlot.deleteMany({});
    await SlotBooking.deleteMany({});
    await Video.deleteMany({});
    await Announcement.deleteMany({});
    console.log('Cleared existing data.');

    // 1. Create Users
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@twintec.com',
      password_hash: passwordHash,
      role: 'admin',
      is_approved: true,
      is_active: true,
      phone: '0771234567'
    });

    const instructor1 = await User.create({
      name: 'John Instructor',
      email: 'instructor@twintec.com',
      password_hash: passwordHash,
      role: 'instructor',
      is_approved: true,
      is_active: true,
      phone: '0772345678'
    });

    const instructor2 = await User.create({
      name: 'Jane Instructor',
      email: 'instructor2@twintec.com',
      password_hash: passwordHash,
      role: 'instructor',
      is_approved: true,
      is_active: true,
      phone: '0773456789'
    });

    const student1 = await User.create({
      name: 'Alice Student',
      email: 'student1@twintec.com',
      password_hash: passwordHash,
      role: 'student',
      is_approved: true,
      is_active: true,
      phone: '0774567890'
    });

    const student2 = await User.create({
      name: 'Bob Student',
      email: 'student2@twintec.com',
      password_hash: passwordHash,
      role: 'student',
      is_approved: true,
      is_active: true,
      phone: '0775678901'
    });

    console.log('Users created.');

    // 2. Create Courses
    const course1 = await Course.create({
      title: 'Automotive Mechanics (NVQ Level 4)',
      description: 'Learn the fundamentals of modern automotive repair and maintenance.',
      duration_weeks: 24,
      fee: 45000,
      is_active: true
    });

    const course2 = await Course.create({
      title: 'Electrical Installation',
      description: 'Comprehensive guide to domestic and commercial electrical systems.',
      duration_weeks: 16,
      fee: 30000,
      is_active: true
    });

    const course3 = await Course.create({
      title: 'Plumbing & Pipefitting',
      description: 'Master the installation and maintenance of plumbing systems.',
      duration_weeks: 12,
      fee: 25000,
      is_active: true
    });
    
    console.log('Courses created.');

    // 3. Create Batches
    const batch1 = await Batch.create({
      name: 'Auto-Batch-2026-A',
      course_id: course1._id,
      start_date: new Date(),
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 6)),
      instructor_ids: [instructor1._id, instructor2._id],
      capacity: 20,
      status: 'active'
    });

    const batch2 = await Batch.create({
      name: 'Elec-Batch-2026-B',
      course_id: course2._id,
      start_date: new Date(),
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 4)),
      instructor_ids: [instructor1._id],
      capacity: 20,
      status: 'active'
    });

    const batch3 = await Batch.create({
      name: 'Auto-Batch-2026-B',
      course_id: course1._id,
      start_date: new Date(),
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 6)),
      instructor_ids: [instructor2._id],
      capacity: 30,
      status: 'active'
    });

    const batch4 = await Batch.create({
      name: 'Elec-Batch-2026-C',
      course_id: course2._id,
      start_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 5)),
      instructor_ids: [instructor1._id, instructor2._id],
      capacity: 15,
      status: 'active'
    });

    const batch5 = await Batch.create({
      name: 'Plumb-Batch-2026-A',
      course_id: course3._id,
      start_date: new Date(),
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      instructor_ids: [instructor1._id],
      capacity: 25,
      status: 'active'
    });

    console.log('Batches created.');

    // 4. Enroll Students
    await Enrollment.create({
      student_id: student1._id,
      batch_id: batch1._id,
      status: 'active'
    });

    await Enrollment.create({
      student_id: student2._id,
      batch_id: batch1._id,
      status: 'active'
    });

    await Enrollment.create({
      student_id: student1._id,
      batch_id: batch2._id,
      status: 'active'
    });

    console.log('Students enrolled.');

    // 5. Create Practice Slots (For this week)
    function getMonday(d: Date) {
      d = new Date(d);
      var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1); 
      return new Date(d.setDate(diff));
    }
    const thisMonday = getMonday(new Date());

    const slot1 = await PracticeSlot.create({
      batch_id: batch1._id,
      instructor_id: instructor1._id,
      week_start_date: thisMonday,
      day_of_week: 'Monday',
      start_time: '09:00',
      end_time: '12:00',
      max_students: 5,
      equipment_note: 'Bring safety boots and overalls',
      is_open: true
    });

    const slot2 = await PracticeSlot.create({
      batch_id: batch1._id,
      instructor_id: instructor2._id,
      week_start_date: thisMonday,
      day_of_week: 'Wednesday',
      start_time: '14:00',
      end_time: '17:00',
      max_students: 2,
      equipment_note: 'Toolkits will be provided',
      is_open: true
    });

    console.log('Practice slots created.');

    // 6. Create Slot Booking
    await SlotBooking.create({
      slot_id: slot1._id,
      student_id: student1._id,
      status: 'confirmed'
    });

    console.log('Slot bookings created.');

    // 7. Create Videos (Course Materials)
    await Video.create({
      title: 'Introduction to Engine Components',
      description: 'A detailed walkthrough of internal combustion engine parts.',
      batch_id: batch1._id,
      instructor_id: instructor1._id,
      cloudinary_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      topic: 'Engines 101',
      order: 1
    });

    await Video.create({
      title: 'Braking Systems Overview',
      description: 'Understanding hydraulic brakes and ABS.',
      batch_id: batch1._id,
      instructor_id: instructor2._id,
      cloudinary_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      topic: 'Safety Systems',
      order: 2
    });

    console.log('Videos created.');

    // 8. Create Announcements
    await Announcement.create({
      title: 'Welcome to Automotive Mechanics!',
      message: 'We are excited to have you in the 2026 Batch A. Please ensure you watch the first video module before booking your first practice session.',
      posted_by: admin._id,
      batch_id: batch1._id
    });

    console.log('Announcements created.');

    console.log('Seeding completed successfully!');
    console.log('----------------------------------------------------');
    console.log('Admin: admin@twintec.com / password123');
    console.log('Instructor: instructor@twintec.com / password123');
    console.log('Student 1: student1@twintec.com / password123');
    console.log('----------------------------------------------------');
    process.exit(0);

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
