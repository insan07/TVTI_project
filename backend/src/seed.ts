import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import dns from 'dns';

const setupDNS = () => {
  return new Promise<void>((resolve) => {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8']);
    resolver.resolve('google.com', (err: any) => {
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
    console.log('Cleared all old database records.');

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

    // 2. Create 3 Real TVTI Instructors
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

    // 3. Create Real TVTI Students
    const student1 = await User.create({
      name: 'John Doe',
      email: 'john.doe@student.tvti.edu',
      password_hash: commonPassword,
      role: 'student',
      is_approved: true,
      is_active: true,
      nic: '200112345678',
      index_number: '26T0001',
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
      index_number: '26T0002',
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
      index_number: '26T0003',
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
      index_number: '26T0004',
      phone: '+94 77 777 8899'
    });

    const student5 = await User.create({
      name: 'David Kumar',
      email: 'david.kumar@student.tvti.edu',
      password_hash: commonPassword,
      role: 'student',
      is_approved: false,
      is_active: false,
      nic: '200156789012',
      phone: '+94 77 888 9900'
    });

    console.log('Created Users: 1 Admin, 3 Instructors, 5 Students.');

    // 4. Create Official TVTI Vocational Courses
    const course1 = await Course.create({
      title: 'Mobile Phone Repairing (Hardware)',
      description: 'Master micro-soldering, SMD component replacement, screen lamination, water damage recovery, and hardware diagnostics for modern smartphones.',
      duration_weeks: 12,
      fee: 25000,
      is_active: true
    });

    const course2 = await Course.create({
      title: 'Mobile Phone Repairing (Hardware + Software)',
      description: 'Comprehensive chip-level hardware repair plus OS flashing, bootloop recovery, network unlocking, IMEI diagnostics, and firmware programming.',
      duration_weeks: 16,
      fee: 35000,
      is_active: true
    });

    const course3 = await Course.create({
      title: 'Laptop & Desktop Repairing',
      description: 'Learn motherboard schematic reading, power rail diagnostics, BGA chip reballing, desktop PC assembly, and BIOS EEPROM programming.',
      duration_weeks: 12,
      fee: 30000,
      is_active: true
    });

    const course4 = await Course.create({
      title: 'Home Appliances Repairing',
      description: 'Diagnose, service, and repair major household electrical appliances including washing machines, inverter refrigerators, microwave ovens, and air coolers.',
      duration_weeks: 12,
      fee: 28000,
      is_active: true
    });

    const course5 = await Course.create({
      title: 'CCTV Installation',
      description: 'Hands-on training in IP camera mounting, DVR/NVR storage setup, network cabling, coaxial crimping, and remote smartphone surveillance monitoring.',
      duration_weeks: 8,
      fee: 18000,
      is_active: true
    });

    const course6 = await Course.create({
      title: 'Home Wiring',
      description: 'Become a certified electrician. Master single-phase and 3-phase domestic wiring, circuit breaker installations, earth pit testing, and safety codes.',
      duration_weeks: 12,
      fee: 22000,
      is_active: true
    });

    console.log('Created 6 Official Vocational Courses.');

    // 5. Create Active Batches
    const batch1 = await Batch.create({
      name: 'Mobile Hardware - Morning Batch 2026',
      course_id: course1._id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 90 * 86400000),
      instructor_ids: [instructor1._id],
      capacity: 25,
      status: 'active',
      schedule_json: { days: ['Mon', 'Wed', 'Fri'], time: '09:00 - 12:00' }
    });

    const batch2 = await Batch.create({
      name: 'Mobile HW+SW Master Class',
      course_id: course2._id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 120 * 86400000),
      instructor_ids: [instructor1._id],
      capacity: 20,
      status: 'active',
      schedule_json: { days: ['Tue', 'Thu', 'Sat'], time: '13:00 - 16:00' }
    });

    const batch3 = await Batch.create({
      name: 'Laptop & Desktop Repair - Weekend Batch',
      course_id: course3._id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 90 * 86400000),
      instructor_ids: [instructor2._id],
      capacity: 15,
      status: 'active',
      schedule_json: { days: ['Sat', 'Sun'], time: '09:00 - 13:00' }
    });

    const batch4 = await Batch.create({
      name: 'Home Appliances Servicing - Evening Batch',
      course_id: course4._id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 90 * 86400000),
      instructor_ids: [instructor3._id],
      capacity: 20,
      status: 'active',
      schedule_json: { days: ['Mon', 'Wed'], time: '14:00 - 17:00' }
    });

    const batch5 = await Batch.create({
      name: 'CCTV Security Camera Installation',
      course_id: course5._id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 60 * 86400000),
      instructor_ids: [instructor2._id],
      capacity: 25,
      status: 'active',
      schedule_json: { days: ['Sat'], time: '09:00 - 15:00' }
    });

    const batch6 = await Batch.create({
      name: 'Domestic Home Wiring - Batch A',
      course_id: course6._id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 90 * 86400000),
      instructor_ids: [instructor3._id],
      capacity: 20,
      status: 'active',
      schedule_json: { days: ['Tue', 'Thu'], time: '13:00 - 16:30' }
    });

    console.log('Created 6 Active Batches.');

    // 6. Enroll Students
    await Enrollment.create({ student_id: student1._id, batch_id: batch1._id, status: 'active' });
    await Enrollment.create({ student_id: student2._id, batch_id: batch1._id, status: 'active' });
    await Enrollment.create({ student_id: student2._id, batch_id: batch2._id, status: 'active' });
    await Enrollment.create({ student_id: student3._id, batch_id: batch3._id, status: 'active' });
    await Enrollment.create({ student_id: student4._id, batch_id: batch4._id, status: 'active' });

    console.log('Enrolled students into batches.');

    // 7. Assessment Results
    await Result.create({
      student_id: student1._id,
      batch_id: batch1._id,
      assessment_name: 'Micro-soldering & Power IC Rework Exam',
      marks: 92.5,
      grade: 'A+'
    });

    await Result.create({
      student_id: student2._id,
      batch_id: batch1._id,
      assessment_name: 'SMD Component Testing & Short Isolation',
      marks: 85.0,
      grade: 'A'
    });

    await Result.create({
      student_id: student3._id,
      batch_id: batch3._id,
      assessment_name: 'Laptop Power Rail & Schematic Diagnostic Test',
      marks: 88.0,
      grade: 'A'
    });

    await Result.create({
      student_id: student4._id,
      batch_id: batch4._id,
      assessment_name: 'Inverter Compressor & Refrigerator PCB Repair',
      marks: 95.0,
      grade: 'A+'
    });

    console.log('Created Student Assessment Results.');

    // 8. Practical Video Lessons
    await Video.create({
      title: 'Micro-Soldering & SMD Hot Air Station Rework',
      description: 'Step-by-step techniques for replacing SMD capacitors, resistors, and charging ICs.',
      batch_id: batch1._id,
      instructor_id: instructor1._id,
      cloudinary_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      topic: 'Micro-Soldering',
      order: 1
    });

    await Video.create({
      title: 'Firmware Flashing & Bootloop Unbricking',
      description: 'Using software dongles to flash stock ROMs and unbrick Qualcomm and MediaTek devices.',
      batch_id: batch2._id,
      instructor_id: instructor1._id,
      cloudinary_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      topic: 'Software Flashing',
      order: 1
    });

    await Video.create({
      title: 'Laptop Boardview & Schematic Tracing',
      description: 'How to read laptop schematics and trace 19V main power rails.',
      batch_id: batch3._id,
      instructor_id: instructor2._id,
      cloudinary_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      topic: 'Laptop Schematics',
      order: 1
    });

    console.log('Created Practical Video Lessons.');

    // 9. Announcements
    await Announcement.create({
      title: 'Practical Workshop Schedule Update',
      message: 'The upcoming practical session for Mobile Micro-soldering will take place in Electronics Lab 1.',
      posted_by: instructor1._id,
      batch_id: batch1._id
    });

    await Announcement.create({
      title: 'Vocational Examination Results Published',
      message: 'Practical marks for all course modules are now published. Check the Results tab in your mobile app.',
      posted_by: admin._id,
      batch_id: null
    });

    console.log('Created Announcements.');

    // 10. Open Practice Slots & Bookings
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
      equipment_note: 'Micro-soldering Lab Station 1',
      is_open: true
    });

    const slot2 = await PracticeSlot.create({
      batch_id: batch1._id,
      instructor_id: instructor1._id,
      week_start_date: thisMonday,
      day_of_week: 'Wednesday',
      start_time: '13:00',
      end_time: '16:00',
      max_students: 5,
      equipment_note: 'Screen OCA Lamination Lab',
      is_open: true
    });

    const slot3 = await PracticeSlot.create({
      batch_id: batch3._id,
      instructor_id: instructor2._id,
      week_start_date: thisMonday,
      day_of_week: 'Saturday',
      start_time: '10:00',
      end_time: '13:00',
      max_students: 6,
      equipment_note: 'BGA Reballing Rework Bench',
      is_open: true
    });

    await SlotBooking.create({
      slot_id: slot1._id,
      student_id: student1._id,
      status: 'confirmed'
    });

    console.log('Created Practical Slots & Bookings.');

    console.log('----------------------------------------------------');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
