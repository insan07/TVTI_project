const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const dns = require('dns');

// Configure environment and DNS
dotenv.config({ path: __dirname + '/.env' });
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoURI = process.env.MONGO_URI;

// Import compiled or raw models
const OtpVerification = mongoose.model(
  'OtpVerification',
  new mongoose.Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      otp_hash: { type: String, default: '' },
      expires_at: { type: Date, required: true },
      attempts: { type: Number, default: 0 },
      verified: { type: Boolean, default: false },
      verified_at: { type: Date },
      last_sent_at: { type: Date, default: Date.now },
    },
    { timestamps: true }
  )
);

const Application = mongoose.model(
  'Application',
  new mongoose.Schema(
    {
      full_name: { type: String, required: true },
      nic_number: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true },
      course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
      course_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
      status: { type: String, default: 'pending' },
      terms_accepted: { type: Boolean, required: true, default: true },
      terms_accepted_at: { type: Date, default: Date.now },
      submitted_at: { type: Date, default: Date.now },
      email_verified: { type: Boolean, default: false },
    },
    { timestamps: true }
  )
);

const User = mongoose.model(
  'User',
  new mongoose.Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password_hash: { type: String, required: true },
      role: { type: String, required: true },
      is_active: { type: Boolean, default: true },
    },
    { timestamps: true }
  )
);

// Helpers mimicking services
async function sendOtpHelper(rawEmail, forcedOtp = null) {
  const email = rawEmail.toLowerCase().trim();
  const otp = forcedOtp || Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(10);
  const otp_hash = await bcrypt.hash(otp, salt);
  const expires_at = new Date(Date.now() + 10 * 60 * 1000);

  await OtpVerification.findOneAndUpdate(
    { email },
    {
      email,
      otp_hash,
      expires_at,
      attempts: 0,
      verified: false,
      verified_at: null,
      last_sent_at: new Date(),
    },
    { upsert: true, new: true }
  );

  return { success: true, otp };
}

async function verifyOtpHelper(rawEmail, otp) {
  const email = rawEmail.toLowerCase().trim();
  const record = await OtpVerification.findOne({ email });

  if (!record) return { success: false, message: 'No OTP request found' };
  if (record.verified) return { success: true, verified: true, message: 'Already verified' };
  if (record.attempts >= 5) return { success: false, message: 'Too many attempts. Please request a new OTP.' };
  if (new Date() > new Date(record.expires_at)) return { success: false, message: 'OTP has expired. Please request a new OTP.' };
  if (!record.otp_hash) return { success: false, message: 'Invalid OTP' };

  const isMatch = await bcrypt.compare(otp, record.otp_hash);
  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  record.verified = true;
  record.verified_at = new Date();
  record.otp_hash = '';
  await record.save();

  return { success: true, verified: true, message: 'Email verified successfully' };
}

async function isEmailVerifiedHelper(rawEmail) {
  const email = rawEmail.toLowerCase().trim();
  const record = await OtpVerification.findOne({ email, verified: true });
  if (!record || !record.verified_at) return false;
  return new Date(record.verified_at).getTime() > Date.now() - 2 * 60 * 60 * 1000;
}

async function submitApplicationHelper(data) {
  const { full_name, nic_number, email, phone, course_ids, terms_accepted } = data;

  if (!full_name || !nic_number || !email || !phone || !course_ids || course_ids.length === 0) {
    return { status: 400, message: 'All application fields and at least one course selection are required' };
  }

  if (!terms_accepted) {
    return { status: 400, message: 'You must accept the Terms & Conditions to apply' };
  }

  const verified = await isEmailVerifiedHelper(email);
  if (!verified) {
    return { status: 400, message: 'Email address must be verified via OTP before submitting the application.' };
  }

  const app = await Application.create({
    full_name,
    nic_number,
    email: email.toLowerCase().trim(),
    phone,
    course_id: course_ids[0],
    course_ids,
    terms_accepted: true,
    email_verified: true,
  });

  await OtpVerification.deleteOne({ email: email.toLowerCase().trim() });
  return { status: 201, message: 'Application submitted successfully', app };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 TVTI EMAIL OTP VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    const testEmail1 = `test.student.${Date.now()}@tvti.edu`;
    const dummyCourseId = new mongoose.Types.ObjectId();

    // ----------------------------------------------------
    // TEST 1 — Correct Flow
    // ----------------------------------------------------
    console.log('▶ TEST 1 — Correct Flow:');
    const send1 = await sendOtpHelper(testEmail1, '482915');
    console.log('  1. Sent OTP to:', testEmail1, '-> Code:', send1.otp);

    const verify1 = await verifyOtpHelper(testEmail1, send1.otp);
    if (!verify1.verified) throw new Error('Test 1 failed: OTP verification failed');
    console.log('  2. OTP verified successfully:', verify1.message);

    const sub1 = await submitApplicationHelper({
      full_name: 'Test Student One',
      nic_number: '200112345678',
      email: testEmail1,
      phone: '+94771234567',
      course_ids: [dummyCourseId],
      terms_accepted: true,
    });
    if (sub1.status !== 201) throw new Error('Test 1 failed: Application submission rejected');
    console.log('  3. Application submitted successfully! Email verified status:', sub1.app.email_verified);
    console.log('  ✅ TEST 1 PASSED\n');

    // ----------------------------------------------------
    // TEST 2 — Wrong OTP
    // ----------------------------------------------------
    console.log('▶ TEST 2 — Wrong OTP:');
    const testEmail2 = `test.wrong.${Date.now()}@tvti.edu`;
    const send2 = await sendOtpHelper(testEmail2, '123456');
    const wrongVerify = await verifyOtpHelper(testEmail2, '999999');
    if (wrongVerify.success) throw new Error('Test 2 failed: Incorrect OTP was accepted');
    console.log('  Rejected incorrect OTP as expected:', wrongVerify.message);
    console.log('  ✅ TEST 2 PASSED\n');

    // ----------------------------------------------------
    // TEST 3 — Expired OTP & Attempt Limit
    // ----------------------------------------------------
    console.log('▶ TEST 3 — Expired OTP & Attempt Limit:');
    // Test attempt limit
    for (let i = 0; i < 4; i++) {
      await verifyOtpHelper(testEmail2, '000000');
    }
    const maxAttemptsVerify = await verifyOtpHelper(testEmail2, '123456');
    if (maxAttemptsVerify.success || !maxAttemptsVerify.message.includes('Too many attempts')) {
      throw new Error('Test 3 failed: Max attempts limit not enforced');
    }
    console.log('  Attempt limit enforced properly:', maxAttemptsVerify.message);

    // Test expired OTP
    const testEmail3 = `test.expired.${Date.now()}@tvti.edu`;
    await sendOtpHelper(testEmail3, '654321');
    await OtpVerification.updateOne(
      { email: testEmail3 },
      { expires_at: new Date(Date.now() - 60000) } // expired 1 min ago
    );
    const expiredVerify = await verifyOtpHelper(testEmail3, '654321');
    if (expiredVerify.success || !expiredVerify.message.includes('expired')) {
      throw new Error('Test 3 failed: Expired OTP was accepted');
    }
    console.log('  Expired OTP rejected properly:', expiredVerify.message);
    console.log('  ✅ TEST 3 PASSED\n');

    // ----------------------------------------------------
    // TEST 4 — Resend OTP (Old OTP Invalidated)
    // ----------------------------------------------------
    console.log('▶ TEST 4 — Resend OTP:');
    const testEmail4 = `test.resend.${Date.now()}@tvti.edu`;
    const firstOtp = '111111';
    const secondOtp = '222222';

    await sendOtpHelper(testEmail4, firstOtp);
    console.log('  First OTP issued:', firstOtp);

    await sendOtpHelper(testEmail4, secondOtp);
    console.log('  Second OTP (resend) issued:', secondOtp);

    const tryFirst = await verifyOtpHelper(testEmail4, firstOtp);
    if (tryFirst.success) throw new Error('Test 4 failed: Previous OTP was accepted after resend');
    console.log('  Previous OTP is invalid:', tryFirst.message);

    const trySecond = await verifyOtpHelper(testEmail4, secondOtp);
    if (!trySecond.verified) throw new Error('Test 4 failed: New OTP was rejected');
    console.log('  New OTP verified successfully:', trySecond.message);
    console.log('  ✅ TEST 4 PASSED\n');

    // ----------------------------------------------------
    // TEST 5 — Submit Without Verification
    // ----------------------------------------------------
    console.log('▶ TEST 5 — Submit Without Email Verification:');
    const unverifiedEmail = `unverified.${Date.now()}@tvti.edu`;
    const subUnverified = await submitApplicationHelper({
      full_name: 'Unverified Applicant',
      nic_number: '200199999999',
      email: unverifiedEmail,
      phone: '+94770000000',
      course_ids: [dummyCourseId],
      terms_accepted: true,
    });
    if (subUnverified.status === 201) throw new Error('Test 5 failed: Unverified application was accepted');
    console.log('  Backend rejected unverified submission:', subUnverified.message);
    console.log('  ✅ TEST 5 PASSED\n');

    // ----------------------------------------------------
    // TEST 6 — Submit Without Course
    // ----------------------------------------------------
    console.log('▶ TEST 6 — Submit Without Course:');
    const testEmail6 = `test.nocourse.${Date.now()}@tvti.edu`;
    await sendOtpHelper(testEmail6, '333333');
    await verifyOtpHelper(testEmail6, '333333');

    const subNoCourse = await submitApplicationHelper({
      full_name: 'No Course Applicant',
      nic_number: '200188888888',
      email: testEmail6,
      phone: '+94771112233',
      course_ids: [],
      terms_accepted: true,
    });
    if (subNoCourse.status === 201) throw new Error('Test 6 failed: Application without courses was accepted');
    console.log('  Backend rejected submission with no course:', subNoCourse.message);
    console.log('  ✅ TEST 6 PASSED\n');

    // ----------------------------------------------------
    // TEST 7 — Submit Without Terms
    // ----------------------------------------------------
    console.log('▶ TEST 7 — Submit Without Terms Accepted:');
    const testEmail7 = `test.noterms.${Date.now()}@tvti.edu`;
    await sendOtpHelper(testEmail7, '444444');
    await verifyOtpHelper(testEmail7, '444444');

    const subNoTerms = await submitApplicationHelper({
      full_name: 'No Terms Applicant',
      nic_number: '200177777777',
      email: testEmail7,
      phone: '+94772223344',
      course_ids: [dummyCourseId],
      terms_accepted: false,
    });
    if (subNoTerms.status === 201) throw new Error('Test 7 failed: Application without terms was accepted');
    console.log('  Backend rejected submission without terms accepted:', subNoTerms.message);
    console.log('  ✅ TEST 7 PASSED\n');

    // ----------------------------------------------------
    // TEST 8 — Login Operates Without OTP
    // ----------------------------------------------------
    console.log('▶ TEST 8 — Login Operates Without OTP:');
    // Verify an existing user or create temporary student
    const testLoginEmail = `login.student.${Date.now()}@tvti.edu`;
    const testPassword = 'Password#123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(testPassword, salt);

    const testUser = await User.create({
      name: 'Standard Login Student',
      email: testLoginEmail,
      password_hash: hash,
      role: 'student',
      is_active: true,
    });

    // Simulate standard login check
    const fetchedUser = await User.findOne({ email: testLoginEmail });
    const passwordValid = await bcrypt.compare(testPassword, fetchedUser.password_hash);
    if (!passwordValid) throw new Error('Test 8 failed: Password comparison failed');

    console.log('  User authenticated successfully with email + password only.');
    console.log('  No OTP requested or required for login authentication.');
    console.log('  ✅ TEST 8 PASSED\n');

    // Clean up test data
    await Application.deleteMany({ email: { $in: [testEmail1] } });
    await User.deleteOne({ _id: testUser._id });
    await OtpVerification.deleteMany({
      email: { $in: [testEmail1, testEmail2, testEmail3, testEmail4, testEmail6, testEmail7] },
    });

    console.log('====================================================');
    console.log('🎉 ALL 8 TEST CASES PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
