// Uses a disposable local MongoDB replica set. Never reads application credentials.
const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const { spawnSync } = require('node:child_process');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server-core');
const User = require('../dist/models/User').default;
const Batch = require('../dist/models/Batch').default;
const Course = require('../dist/models/Course').default;
const Enrollment = require('../dist/models/Enrollment').default;
const Slot = require('../dist/models/PracticeSlot').default;
const Booking = require('../dist/models/SlotBooking').default;
const rules = require('../dist/services/practicalScheduling');
const timing = require('../dist/utils/practicalTime');
const staffController = require('../dist/controllers/practiceSlotController');
const studentController = require('../dist/controllers/studentPracticeController');
const notifications = require('../dist/services/notificationService');

let replica, admin, instructors, students, batches, week;
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger', spawn: { windowsHide: true } } });
  await mongoose.connect(replica.getUri('practical_tests'));
  await Promise.all([User.init(), Batch.init(), Course.init(), Enrollment.init(), Slot.init(), Booking.init(), mongoose.model('PracticalScheduleGuard').init()]);
}, { timeout: 600000 });
after(async () => { await mongoose.disconnect(); if (replica) await replica.stop(); });
beforeEach(async () => {
  for (const model of [Booking, Slot, Enrollment, Batch, Course, User]) await model.deleteMany({});
  admin = await User.create({ name: 'Admin', email: 'admin@test.invalid', password_hash: 'unused', role: 'admin' });
  instructors = await User.insertMany(Array.from({ length: 3 }, (_, i) => ({ name: `Instructor ${i}`, email: `i${i}@test.invalid`, password_hash: 'unused', role: 'instructor' })));
  students = await User.insertMany(Array.from({ length: 24 }, (_, i) => ({ name: `Student ${i}`, email: `s${i}@test.invalid`, password_hash: 'unused', role: 'student' })));
  const courses = await Course.insertMany(['Electrical', 'Refrigeration', 'Plumbing'].map(title => ({ title, description: title, fee: 1, duration_weeks: 1 })));
  batches = await Batch.insertMany(courses.map((course, i) => ({ name: `Batch ${i}`, course_id: course._id, start_date: new Date(), end_date: new Date('2099-01-01'), capacity: 100, instructor_ids: instructors.map(i => i._id) })));
  await Enrollment.insertMany(students.flatMap(student => batches.map(batch => ({ student_id: student._id, batch_id: batch._id }))));
  const date = new Date(); date.setUTCDate(date.getUTCDate() + 14); date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7); date.setUTCHours(0, 0, 0, 0);
  week = date.toISOString().slice(0, 10);
});

const input = (batch = 0, instructor = 0, extra = {}) => ({ batch_id: batches[batch]._id, instructor_id: instructors[instructor]._id,
  week_start_date: week, slots: [{ day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', max_students: 10, ...extra }] });
const create = async (batch = 0, instructor = 0, extra = {}, actor = admin) => (await rules.createPracticalSlots(actor, input(batch, instructor, extra)))[0];
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const fails = (promise, status, pattern) => assert.rejects(promise, error => error instanceof rules.PracticalError && error.status === status && pattern.test(error.message));

test('all three roles receive newest session dates and later same-day times first', async () => {
  const older = await create();
  const later = await create(1, 1, { start_time: '11:00', end_time: '12:00' });
  const nextWeek = new Date(`${week}T00:00:00Z`); nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
  const newestInput = input(); newestInput.week_start_date = nextWeek.toISOString().slice(0, 10);
  const [newest] = await rules.createPracticalSlots(admin, newestInput);
  for (const slot of [older, later, newest]) await rules.bookPracticalSlot(students[0], slot._id);
  const cases = [
    [staffController.getMySlots, { user: admin, query: {} }, [newest, later, older]],
    [staffController.getMySlots, { user: instructors[0], query: {} }, [newest, older]],
    [studentController.getOpenSlots, { user: students[0], query: { batchId: String(batches[0]._id) } }, [newest, older]],
    [studentController.getMyBookings, { user: students[0] }, [newest, later, older]],
  ];
  for (const [controller, request, expected] of cases) {
    const res = response(); await controller(request, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.map(item => String(item.slot_id?._id || item._id)), expected.map(slot => String(slot._id)));
  }
});

test('allows two simultaneous instructors and rejects a third across all courses', async () => {
  await create(0, 0); await create(1, 1);
  await fails(create(2, 2), 409, /two instructors/);
});

test('concurrent instructor creation cannot exceed the institute limit', async () => {
  const results = await Promise.allSettled(instructors.map((actor, i) => create(i, i, {}, actor)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 2);
  assert.equal(await Slot.countDocuments(), 2);
});

test('locking bookings does not release an instructor, and back-to-back sessions are allowed', async () => {
  const first = await create(0, 0);
  await rules.updatePracticalSlot(admin, first._id, { is_open: false });
  await create(1, 1);
  await fails(create(2, 2), 409, /two instructors/);
  await create(2, 2, { start_time: '10:00', end_time: '11:00' });
});

test('legacy Monday timestamps retain their sessions in availability and concurrency checks', async () => {
  const first = await create(0, 0);
  await Slot.updateOne({ _id: first._id }, { week_start_date: new Date(`${week}T12:34:00Z`) });
  await create(1, 1);
  await fails(create(2, 2), 409, /two instructors/);
  const res = response();
  await studentController.getOpenSlots({ user: students[0], query: { batchId: String(batches[0]._id), weekStart: week } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.length, 1);
});

test('an instructor may teach sequential sessions, but cannot double-book across batches', async () => {
  await create(0, 0);
  await fails(create(1, 0, { start_time: '09:30', end_time: '10:30' }), 409, /instructor.*overlapping/);
  await create(1, 0, { start_time: '10:00', end_time: '11:00' });
});

test('instructors cannot spoof another instructor or create for an unassigned batch', async () => {
  await fails(create(0, 1, {}, instructors[0]), 403, /another instructor/);
  await Batch.updateOne({ _id: batches[0]._id }, { instructor_ids: [instructors[1]._id] });
  await fails(create(0, 0, {}, instructors[0]), 403, /assigned/);
});

test('a student must be active and enrolled, including staff-assigned bookings', async () => {
  const slot = await create();
  await Enrollment.deleteMany({ student_id: students[0]._id });
  await fails(rules.bookPracticalSlot(students[0], slot._id), 403, /enrolled/);
  await fails(rules.bookPracticalSlot(admin, slot._id, students[0]._id), 403, /enrolled/);
  await User.updateOne({ _id: students[1]._id }, { is_active: false });
  await fails(rules.bookPracticalSlot(admin, slot._id, students[1]._id), 403, /active/);
});

test('24 concurrent students cannot overbook 20 seats through mixed student/admin/instructor paths', { timeout: 120000 }, async () => {
  const slot = await create(0, 0, { max_students: 20 });
  const results = await Promise.allSettled(students.map((student, i) =>
    i % 3 === 0 ? rules.bookPracticalSlot(student, slot._id)
      : rules.bookPracticalSlot(i % 3 === 1 ? admin : instructors[0], slot._id, student._id)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 20);
  assert.equal(await Booking.countDocuments({ status: 'confirmed' }), 20);
  for (const result of results.filter(r => r.status === 'rejected')) assert.match(result.reason.message, /full/);
});

test('students cannot overlap practicals across courses, but may book different batches at different times', async () => {
  const a = await create(0, 0), b = await create(1, 1, { start_time: '09:30', end_time: '10:30' });
  const c = await create(2, 2, { start_time: '10:30', end_time: '11:30' });
  await rules.bookPracticalSlot(students[0], a._id);
  await fails(rules.bookPracticalSlot(students[0], b._id), 409, /another course/);
  await fails(rules.bookPracticalSlot(admin, b._id, students[0]._id), 409, /another course/);
  await rules.bookPracticalSlot(students[0], c._id);
});

test('concurrent cross-course requests by one student cannot create overlapping bookings', async () => {
  const a = await create(0, 0), b = await create(1, 1);
  const results = await Promise.allSettled([rules.bookPracticalSlot(students[0], a._id), rules.bookPracticalSlot(admin, b._id, students[0]._id)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await Booking.countDocuments({ student_id: students[0]._id }), 1);
});

test('weekly batch rule applies across all roles and pending cancellation keeps the seat', async () => {
  const a = await create(0, 0, { max_students: 1 }), b = await create(0, 0, { day_of_week: 'Tuesday' });
  const { booking } = await rules.bookPracticalSlot(students[0], a._id);
  await rules.requestPracticalCancellation(students[0], a._id, 'Cannot attend');
  await fails(rules.bookPracticalSlot(admin, b._id, students[0]._id), 409, /per batch per week/);
  await fails(rules.bookPracticalSlot(students[1], a._id), 409, /full/);
  await rules.changePracticalBooking(instructors[0], a._id, booking._id, 'approve');
  await rules.bookPracticalSlot(students[0], b._id);
  await rules.bookPracticalSlot(students[1], a._id);
});

test('rejecting cancellation retains the booking and duplicate requests do not release capacity', async () => {
  const slot = await create(0, 0, { max_students: 1 });
  const { booking } = await rules.bookPracticalSlot(students[0], slot._id);
  await rules.requestPracticalCancellation(students[0], slot._id, 'Reason');
  await fails(rules.requestPracticalCancellation(students[0], slot._id, 'Again'), 404, /pending/);
  await rules.changePracticalBooking(instructors[0], slot._id, booking._id, 'reject');
  assert.equal((await Booking.findById(booking._id)).status, 'confirmed');
  await fails(rules.bookPracticalSlot(admin, slot._id, students[1]._id), 409, /full/);
});

test('ownership and URL slot/booking identity are enforced for all management actions', async () => {
  const slot = await create(), other = await create(1, 1);
  const { booking } = await rules.bookPracticalSlot(students[0], slot._id);
  await fails(rules.managedSlot(instructors[1], slot._id), 403, /own/);
  await fails(rules.bookPracticalSlot(instructors[1], slot._id, students[1]._id), 403, /own/);
  await fails(rules.updatePracticalSlot(instructors[1], slot._id, { max_students: 20 }), 403, /own/);
  await fails(rules.deletePracticalSlot(instructors[1], slot._id), 403, /own/);
  for (const action of ['remove', 'approve', 'reject']) await fails(rules.changePracticalBooking(admin, other._id, booking._id, action), 404, /Booking not found/);
  const res = response();
  await staffController.getSlotBookings({ user: instructors[1], params: { slotId: String(slot._id) } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal((await Booking.findById(booking._id)).status, 'confirmed');
});

test('capacity reductions include pending cancellations', async () => {
  const slot = await create(0, 0, { max_students: 2 });
  await rules.bookPracticalSlot(students[0], slot._id); await rules.bookPracticalSlot(students[1], slot._id);
  await rules.requestPracticalCancellation(students[1], slot._id, 'Reason');
  await fails(rules.updatePracticalSlot(admin, slot._id, { max_students: 1 }), 409, /pending cancellations/);
});

test('rescheduling cannot introduce student conflicts or exceed instructor concurrency', async () => {
  const a = await create(0, 0), b = await create(1, 1, { start_time: '11:00', end_time: '12:00' });
  await rules.bookPracticalSlot(students[0], a._id); await rules.bookPracticalSlot(students[0], b._id);
  await fails(rules.updatePracticalSlot(admin, b._id, { start_time: '09:30' }), 409, /enrolled student/);
  await create(2, 2);
  await fails(rules.updatePracticalSlot(admin, b._id, { start_time: '09:00', end_time: '10:00' }), 409, /two instructors/);
  assert.equal((await Slot.findById(b._id)).start_time, '11:00');
});

test('manual assignments respect locks, deadlines, started sessions, and expiry', async () => {
  const slot = await create();
  await rules.updatePracticalSlot(admin, slot._id, { is_open: false });
  await fails(rules.bookPracticalSlot(admin, slot._id, students[0]._id), 409, /locked/);
  await rules.updatePracticalSlot(admin, slot._id, { is_open: true, booking_deadline: new Date(Date.now() - 1000) });
  await fails(rules.bookPracticalSlot(instructors[0], slot._id, students[0]._id), 409, /deadline/);
  const start = timing.slotTimes(slot).start;
  assert.match(rules.bookingBlockReason(slot, [], start), /started/);
  assert.match(rules.bookingBlockReason(slot, [], timing.slotTimes(slot).end), /expired/);
});

test('invalid schedules are rejected atomically, including impossible dates, times and capacities', async () => {
  for (const extra of [{ start_time: '10:00', end_time: '09:00' }, { start_time: '25:00' }, { max_students: 1.5 }, { max_students: 0 }, { day_of_week: 'Unknown' }]) {
    await fails(create(0, 0, extra), 400, /./);
  }
  const invalid = input(); invalid.week_start_date = '2026-02-30';
  await fails(rules.createPracticalSlots(admin, invalid), 400, /Monday/);
  const multi = input(); multi.slots.push({ ...multi.slots[0], start_time: '09:30' });
  await fails(rules.createPracticalSlots(admin, multi), 409, /overlapping/);
  assert.equal(await Slot.countDocuments(), 0);
});

test('single-course availability detects other-course conflicts without exposing another student', async () => {
  const a = await create(0, 0), b = await create(1, 1);
  await rules.bookPracticalSlot(students[0], a._id);
  const res = response();
  await studentController.getOpenSlots({ user: students[0], query: { batchId: String(batches[1]._id) } }, res);
  assert.equal(res.statusCode, 200);
  const card = res.body.find(slot => String(slot._id) === String(b._id));
  assert.equal(card.can_book, false); assert.match(card.booking_block_reason, /another course/);
  assert.equal(card.batch_id.name, 'Batch 1');
  assert.equal(card.starts_at, new Date(timing.slotTimes(b).start).toISOString());
  assert.equal('student_id' in card, false);
});

test('notification delivery failure does not report a committed booking as failed', async () => {
  const slot = await create();
  const original = notifications.sendNotification, warn = console.warn;
  notifications.sendNotification = async () => { throw Error('Test delivery failure'); }; console.warn = () => {};
  try {
    const res = response();
    await studentController.bookSlot({ user: students[0], params: { slotId: String(slot._id) } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(await Booking.countDocuments({ student_id: students[0]._id }), 1);
  } finally { notifications.sendNotification = original; console.warn = warn; }
});

test('all servers calculate identical Sri Lanka instants and half-open interval boundaries', () => {
  const sample = { week_start_date: '2026-11-09T00:00:00Z', day_of_week: 'Wednesday', start_time: '09:00', end_time: '10:00' };
  const expected = { start: Date.parse('2026-11-11T03:30:00Z'), end: Date.parse('2026-11-11T04:30:00Z') };
  assert.deepEqual(timing.slotTimes(sample), expected);
  assert.equal(timing.overlaps({ start: 0, end: 10 }, { start: 10, end: 20 }), false);
  for (const zone of ['UTC', 'Asia/Colombo', 'America/New_York']) {
    const script = `process.stdout.write(JSON.stringify(require('./dist/utils/practicalTime').slotTimes(${JSON.stringify(sample)})))`;
    const result = spawnSync(process.execPath, ['-e', script], { cwd: require('node:path').join(__dirname, '..'), env: { ...process.env, TZ: zone }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout), expected);
  }
});
