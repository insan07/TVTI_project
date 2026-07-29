import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
// Dynamically configure DNS: Check if Google DNS is reachable.
// On some networks, Google DNS is blocked, causing ECONNREFUSED.
// On other networks, default DNS fails to resolve MongoDB Atlas SRV records, causing ETIMEOUT.
const setupDNS = () => {
  return new Promise<void>((resolve) => {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8']);
    resolver.resolve('google.com', (err) => {
      if (!err) {
        dns.setServers(['8.8.8.8', '8.8.4.4']);
      }
      resolve();
    });
  });
};

import User from './models/User';
import Course from './models/Course';
import Batch from './models/Batch';
import Enrollment from './models/Enrollment';
import PracticeSlot from './models/PracticeSlot';
import SlotBooking from './models/SlotBooking';
import Video from './models/Video';
import Announcement from './models/Announcement';
import Result from './models/Result';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/twintec_lms';

const seedDatabase = async () => {
  try {
    await setupDNS();
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data completely
    await User.deleteMany({});
    await Course.deleteMany({});
    await Batch.deleteMany({});
    await Enrollment.deleteMany({});
    await PracticeSlot.deleteMany({});
    await SlotBooking.deleteMany({});
    await Video.deleteMany({});
    await Announcement.deleteMany({});
    await Result.deleteMany({});
    console.log('Cleared all old dummy data.');

    const commonPassword = await bcrypt.hash('password123', 10);

    // 1. Create Admin User
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@tvti.edu',
      password_hash: commonPassword,
      role: 'admin',
      is_approved: true,
      is_active: true,
      phone: '+94 77 000 0000'
    });

    // 2. Create 3 Real Instructors
    const instructor1 = await User.create({
      name: 'Inst. James Miller',
      email: 'james.miller@tvti.edu',
      password_hash: commonPassword,
      role: 'instructor',
      is_approved: true,
      is_active: true,
      phone: '+94 77 111 2233'
    });

    const instructor2 = await User.create({
      name: 'Inst. Sarah Connor',
      email: 'sarah.connor@tvti.edu',
      password_hash: commonPassword,
      role: 'instructor',
      is_approved: true,
      is_active: true,
      phone: '+94 77 222 3344'
    });

    const instructor3 = await User.create({
      name: 'Inst. Kamal Perera',
      email: 'kamal.perera@tvti.edu',
      password_hash: commonPassword,
      role: 'instructor',
      is_approved: true,
      is_active: true,
      phone: '+94 77 333 4455'
    });

    // 3. Create 5 Real Students (4 Active, 1 Pending approval)
    const student1 = await User.create({
      name: 'John Doe',
      email: 'john.doe@student.tvti.edu',
      password_hash: commonPassword,
      role: 'student',
      is_approved: true,
      is_active: true,
      nic: '200112345678',
      phone: '+94 77 444 5566'
    });

    const student2 = await User.create({
      name: 'Alice Smith',
      email: 'alice.smith@student.tvti.edu',
      password_hash: commonPassword,
      role: 'student',
      is_approved: true,
      is_active: true,
      nic: '200223456789',
      phone: '+94 77 555 6677'
    });

    const student3 = await User.create({
      name: 'Robert Chen',
      email: 'robert.chen@student.tvti.edu',
      password_hash: commonPassword,
      role: 'student',
      is_approved: true,
      is_active: true,
      nic: '200034567890',
      phone: '+94 77 666 7788'
    });

    const student4 = await User.create({
      name: 'Fatima Perera',
      email: 'fatima.perera@student.tvti.edu',
      password_hash: commonPassword,
      role: 'student',
      is_approved: true,
      is_active: true,
      nic: '200345678901',
      phone: '+94 77 777 8899'
    });

    const student5 = await User.create({
      name: 'David Kumar',
      email: 'david.kumar@student.tvti.edu',
      password_hash: commonPassword,
      role: 'student',
      is_approved: false,
      is_active: false, // Pending Approval for testing Admin Approve/Reject flow!
      nic: '200156789012',
      phone: '+94 77 888 9900'
    });

    console.log('Created Users: 1 Admin, 3 Instructors, 5 Students (4 Active, 1 Pending).');

    // 4. Create Vocational Courses
    const course1 = await Course.create({
      title: 'Automotive Diagnostics Level 1',
      description: 'Introduction to OBD-II systems, engine management, and basic electrical fault finding.',
      duration_weeks: 8,
      fee: 35000,
      is_active: true
    });

    const course2 = await Course.create({
      title: 'Advanced Welding Techniques',
      description: 'TIG/MIG welding certification preparation for industrial and high-precision applications.',
      duration_weeks: 12,
      fee: 45000,
      is_active: true
    });

    const course3 = await Course.create({
      title: 'HVAC & Electrical Systems',
      description: 'Comprehensive installation, maintenance, and safety protocols for commercial HVAC.',
      duration_weeks: 10,
      fee: 30000,
      is_active: true
    });

    const course4 = await Course.create({
      title: 'Industrial Robotics & Automation',
      description: 'PLC programming, robotic arm kinematics, and sensor automation in modern factories.',
      duration_weeks: 16,
      fee: 55000,
      is_active: true
    });

    console.log('Created 4 Vocational Courses.');

    // 5. Create Batches
    const batch1 = await Batch.create({
      name: 'Auto Diagnostics - Morning Batch A',
      course_id: course1._id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 60 * 86400000),
      instructor_ids: [instructor1._id],
      capacity: 25,
      status: 'active',
      schedule_json: { days: ['Mon', 'Wed', 'Fri'] }
    });

    const batch2 = await Batch.create({
      name: 'Advanced Welding - Weekend Intensive',
      course_id: course2._id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 90 * 86400000),
      instructor_ids: [instructor2._id],
      capacity: 15,
      status: 'active',
      schedule_json: { days: ['Sat', 'Sun'] }
    });

    const batch3 = await Batch.create({
      name: 'HVAC Systems - Evening Batch',
      course_id: course3._id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 75 * 86400000),
      instructor_ids: [instructor3._id],
      capacity: 20,
      status: 'active',
      schedule_json: { days: ['Tue', 'Thu'] }
    });

    const batch4 = await Batch.create({
      name: 'Robotics - FastTrack 2026',
      course_id: course4._id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 120 * 86400000),
      instructor_ids: [instructor1._id],
      capacity: 20,
      status: 'active',
      schedule_json: { days: ['Mon', 'Wed', 'Fri'] }
    });

    console.log('Created 4 Active Batches with different schedules.');

    // 6. Enroll Active Students into Batches
    await Enrollment.create({ student_id: student1._id, batch_id: batch1._id, status: 'active' });
    await Enrollment.create({ student_id: student2._id, batch_id: batch1._id, status: 'active' });
    await Enrollment.create({ student_id: student2._id, batch_id: batch2._id, status: 'active' });
    await Enrollment.create({ student_id: student3._id, batch_id: batch3._id, status: 'active' });
    await Enrollment.create({ student_id: student4._id, batch_id: batch4._id, status: 'active' });

    console.log('Enrolled students into batches.');

    // 7. Create Student Assessment Results
    await Result.create({
      student_id: student1._id,
      batch_id: batch1._id,
      assessment_name: 'OBD-II Fault Diagnostics Practical',
      marks: 92.5,
      grade: 'A+'
    });

    await Result.create({
      student_id: student2._id,
      batch_id: batch1._id,
      assessment_name: 'OBD-II Fault Diagnostics Practical',
      marks: 85.0,
      grade: 'A'
    });

    await Result.create({
      student_id: student2._id,
      batch_id: batch2._id,
      assessment_name: 'TIG Welding Joint Safety Assessment',
      marks: 88.0,
      grade: 'A'
    });

    await Result.create({
      student_id: student3._id,
      batch_id: batch3._id,
      assessment_name: 'Refrigerant Pressure Testing',
      marks: 78.5,
      grade: 'B+'
    });

    await Result.create({
      student_id: student4._id,
      batch_id: batch4._id,
      assessment_name: 'PLC Motor Logic Control Quiz',
      marks: 95.0,
      grade: 'A+'
    });

    console.log('Created Student Results.');

    // 8. Create Course Video Lessons
    await Video.create({
      title: 'Introduction to OBD-II Scanners & CAN-Bus',
      description: 'Comprehensive overview of reading fault codes and live data streams.',
      batch_id: batch1._id,
      instructor_id: instructor1._id,
      cloudinary_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      topic: 'OBD-II Systems',
      order: 1
    });

    await Video.create({
      title: 'TIG Welding Electrode Selection & Shielding Gas',
      description: 'Proper tungsten electrode prep and argon gas flow rates.',
      batch_id: batch2._id,
      instructor_id: instructor2._id,
      cloudinary_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      topic: 'TIG Welding Fundamentals',
      order: 1
    });

    await Video.create({
      title: 'Commercial HVAC Airflow Calibration',
      description: 'Balancing supply air ducts and measuring CFM pressures.',
      batch_id: batch3._id,
      instructor_id: instructor3._id,
      cloudinary_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      topic: 'Airflow Balancing',
      order: 1
    });

    console.log('Created Video Lessons.');

    // 9. Create Announcements
    await Announcement.create({
      title: 'Practical Workshop Rescheduled',
      message: 'The upcoming Monday practical workshop for Auto Diagnostics has been rescheduled to Wednesday 10:00 AM.',
      posted_by: instructor1._id,
      batch_id: batch1._id
    });

    await Announcement.create({
      title: 'Safety Gear Inspection Notice',
      message: 'All students in Advanced Welding must bring certified leather gloves and auto-darkening helmets for Sunday lab.',
      posted_by: instructor2._id,
      batch_id: batch2._id
    });

    await Announcement.create({
      title: 'Mid-Term Assessment Results Published',
      message: 'Results for the first round of vocational assessments are now published. Check the Results tab in your app.',
      posted_by: admin._id,
      batch_id: null // Global
    });

    console.log('Created Announcements.');

    // 10. Practice Slots & Bookings
    function getMonday(d: Date) {
      d = new Date(d);
      var day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1); 
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
      equipment_note: 'Engine Diagnostic Bay 3',
      is_open: true
    });

    await SlotBooking.create({
      slot_id: slot1._id,
      student_id: student1._id,
      status: 'confirmed'
    });

    console.log('Created Practice Slots & Bookings.');

    console.log('----------------------------------------------------');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
    console.log('LOGIN CREDENTIALS:');
    console.log('1. Admin:      admin@tvti.edu / password123');
    console.log('2. Instructor: james.miller@tvti.edu / password123');
    console.log('   Instructor: sarah.connor@tvti.edu / password123');
    console.log('   Instructor: kamal.perera@tvti.edu / password123');
    console.log('3. Student 1:  john.doe@student.tvti.edu / password123');
    console.log('   Student 2:  alice.smith@student.tvti.edu / password123');
    console.log('   Student 3:  robert.chen@student.tvti.edu / password123');
    console.log('   Student 4:  fatima.perera@student.tvti.edu / password123');
    console.log('   Student 5:  david.kumar@student.tvti.edu / password123 (Pending Approval)');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
