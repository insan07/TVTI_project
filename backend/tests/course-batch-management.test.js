// Disposable local replica set, local HTTP server, and stubbed delivery only.
const assert = require('node:assert/strict');
const { test, before, beforeEach, after } = require('node:test');
const { MongoMemoryReplSet } = require('mongodb-memory-server-core');
const mongoose = require('mongoose'), express = require('express'), jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'course-batch-tests-only';
const models = Object.fromEntries(['User', 'Course', 'Batch', 'Enrollment', 'Video', 'Result', 'Attendance', 'Announcement', 'Application', 'PracticeSlot', 'SlotBooking'].map(name => [name, require(`../dist/models/${name}`).default]));
const { User, Course, Batch, Enrollment, Video, PracticeSlot, SlotBooking } = models;
const notifications = require('../dist/services/notificationService'), email = require('../dist/services/emailService');
const originalNotify = notifications.sendNotification, originalEmail = email.sendBatchAssignmentEmail;
const rules = require('../dist/services/courseBatchManagement'), admissions = require('../dist/services/studentAdmissions');
const practical = require('../dist/services/practicalScheduling');
let replica, server, base, admin, instructors, students, courses, batch, deliveryFails;
before(async () => {
  notifications.sendNotification = async () => { if (deliveryFails) throw Error('Fixture delivery failure'); return []; };
  email.sendBatchAssignmentEmail = async () => { if (deliveryFails) throw Error('Fixture email failure'); return { success: true }; };
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger', spawn: { windowsHide: true } } });
  await mongoose.connect(replica.getUri('course_batch_tests'));
  await Promise.all(Object.values(models).map(model => model.init()));
  const app = express(); app.use(express.json());
  app.use('/admin', require('../dist/routes/admin').default);
  app.use('/instructors', require('../dist/routes/instructors').default);
  app.use('/students', require('../dist/routes/students').default);
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 120000 });
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); notifications.sendNotification = originalNotify; email.sendBatchAssignmentEmail = originalEmail; await mongoose.disconnect(); if (replica) await replica.stop(); });
const input = (extra = {}) => ({ name: 'Morning A', course_id: String(courses[0]._id), start_date: '2026-01-01T00:00:00+05:30', end_date: '2099-12-31T23:59:59+05:30', capacity: 20, instructor_ids: instructors.map(person => String(person._id)), room: 'Workshop 1', status: 'active', schedule_json: { days: ['Mon', 'Wed'], time: '09:00 - 12:00' }, ...extra });
beforeEach(async () => {
  deliveryFails = false;
  for (const model of Object.values(models)) await model.deleteMany({});
  admin = await User.create({ name: 'Admin', email: 'a@test.invalid', role: 'admin', password_hash: 'unused' });
  instructors = await User.insertMany([0, 1, 2].map(i => ({ name: `Instructor ${i}`, email: `i${i}@test.invalid`, role: 'instructor', password_hash: 'private' })));
  students = await User.insertMany([0, 1, 2].map(i => ({ name: `Student ${i}`, email: `s${i}@test.invalid`, role: 'student', password_hash: 'private' })));
  courses = await Course.insertMany(['Electrical', 'Plumbing'].map(title => ({ title, description: title, fee: 1000, duration_weeks: 12 })));
  batch = (await rules.saveManagedBatch(null, input())).batch;
});
async function http(path, actor = admin, method = 'GET', body) {
  const res = await fetch(base + path, { method, headers: { ...(actor ? { Authorization: 'Bearer ' + jwt.sign({ id: actor._id }, process.env.JWT_SECRET) } : {}), 'Content-Type': 'application/json' }, ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json() };
}
const fails = (promise, status) => assert.rejects(promise, error => error.status === status);

test('only admin can read or change course, batch, details and enrollment management', async () => {
  const paths = [['/admin/courses', 'GET'], ['/admin/courses', 'POST'], [`/admin/courses/${courses[0]._id}`, 'PUT'], [`/admin/courses/${courses[0]._id}`, 'DELETE'], ['/admin/batches', 'GET'], ['/admin/batches', 'POST'], [`/admin/batches/${batch._id}`, 'PUT'], [`/admin/batches/${batch._id}/details`, 'GET'], [`/admin/batches/${batch._id}/enroll`, 'POST'], [`/admin/batches/${batch._id}/delete`, 'DELETE']];
  for (const [path, method] of paths) for (const actor of [instructors[0], students[0]]) assert.equal((await http(path, actor, method, { name: 'Unauthorized' })).status, 403);
  assert.equal((await http('/admin/courses', null)).status, 401);
  assert.equal((await http('/instructors/my-batches', students[0])).status, 403);
  assert.equal((await http('/students/my-schedule', instructors[0])).status, 403);
  assert.equal(await Batch.countDocuments(), 1);
});
test('enrolled student lists are admin-only and expose names, registration numbers and profile photos', async () => {
  const paths = [`/admin/courses/${courses[0]._id}/enrolled-students`, `/admin/batches/${batch._id}/enrolled-students`];
  for (const path of paths) {
    assert.equal((await http(path, null)).status, 401);
    for (const actor of [instructors[0], students[0]]) assert.equal((await http(path, actor)).status, 403);
  }
  await User.updateOne({ _id: students[0]._id }, { registration_number: 'TVTI-2026-001', index_number: 'PRIVATE-INDEX', phone: '0700000000', profile_photo: 'https://example.test/student.jpg' });
  await Enrollment.create({ student_id: students[0]._id, batch_id: batch._id });
  for (const path of paths) {
    const res = await http(path); assert.equal(res.status, 200); assert.equal(res.body.length, 1);
    assert.deepEqual(Object.keys(res.body[0]).sort(), ['_id', 'name', 'profile_photo', 'registration_number']);
    assert.equal(res.body[0].profile_photo, 'https://example.test/student.jpg');
    assert.equal(res.body[0].registration_number, 'TVTI-2026-001');
  }
});
test('course roster combines batches, deduplicates students, excludes dropped and unrelated records, and sorts names', async () => {
  const second = await Batch.create({ ...input({ name: 'Completed batch', status: 'completed' }), course_id: courses[0]._id });
  const unrelated = await Batch.create({ ...input({ name: 'Other course' }), course_id: courses[1]._id });
  await User.updateOne({ _id: students[0]._id }, { name: 'Zara', registration_number: 'TVTI-2026-001' });
  await User.updateOne({ _id: students[1]._id }, { name: 'Amal', registration_number: 'TVTI-2026-002' });
  await Enrollment.insertMany([
    { student_id: students[0]._id, batch_id: batch._id },
    { student_id: students[0]._id, batch_id: second._id, status: 'completed' },
    { student_id: students[1]._id, batch_id: second._id, status: 'completed' },
    { student_id: students[2]._id, batch_id: batch._id, status: 'dropped' },
    { student_id: students[2]._id, batch_id: unrelated._id },
    { student_id: instructors[0]._id, batch_id: batch._id },
    { student_id: new mongoose.Types.ObjectId(), batch_id: batch._id },
  ]);
  const course = await http(`/admin/courses/${courses[0]._id}/enrolled-students`);
  assert.deepEqual(course.body.map(student => student.name), ['Amal', 'Zara']);
  assert.equal(new Set(course.body.map(student => student._id)).size, 2);
  const primary = await http(`/admin/batches/${batch._id}/enrolled-students`);
  assert.deepEqual(primary.body.map(student => student.name), ['Zara']);
  const completed = await http(`/admin/batches/${second._id}/enrolled-students`);
  assert.deepEqual(completed.body.map(student => student.name), ['Amal', 'Zara']);
});
test('roster endpoints handle empty, malformed and missing scopes without using index numbers as registration numbers', async () => {
  assert.deepEqual((await http(`/admin/courses/${courses[1]._id}/enrolled-students`)).body, []);
  assert.deepEqual((await http(`/admin/batches/${batch._id}/enrolled-students`)).body, []);
  for (const kind of ['courses', 'batches']) {
    assert.equal((await http(`/admin/${kind}/bad/enrolled-students`)).status, 400);
    assert.equal((await http(`/admin/${kind}/000000000000000000000001/enrolled-students`)).status, 404);
  }
  await User.updateOne({ _id: students[0]._id }, { index_number: 'INDEX-ONLY' });
  await Enrollment.create({ student_id: students[0]._id, batch_id: batch._id });
  const res = await http(`/admin/batches/${batch._id}/enrolled-students`);
  assert.equal(res.body[0].registration_number, undefined);
  assert.equal(res.body[0].index_number, undefined);
  assert.equal(res.body[0].email, undefined);
});
test('courses validate edits and return not-found instead of successful null responses', async () => {
  const valid = { title: 'Free orientation', description: 'Intro', fee: 0, duration_weeks: 1, is_active: true };
  assert.equal((await http('/admin/courses', admin, 'POST', valid)).status, 201);
  for (const changes of [{ fee: -1 }, { fee: true }, { duration_weeks: 1.5 }, { title: ' ' }, { is_active: 'false' }]) assert.equal((await http(`/admin/courses/${courses[0]._id}`, admin, 'PUT', changes)).status, 400);
  assert.equal((await http('/admin/courses/000000000000000000000001', admin, 'PUT', valid)).status, 404);
  assert.equal((await http('/admin/courses/bad/archive', admin, 'PUT', {})).status, 400);
});
test('admin can delete an unused course and invalid or missing IDs report the correct error', async () => {
  assert.equal((await http(`/admin/courses/${courses[1]._id}`, admin, 'DELETE')).status, 200);
  assert.equal(await Course.countDocuments(), 1);
  assert.equal((await http(`/admin/courses/${courses[1]._id}`, admin, 'DELETE')).status, 404);
  assert.equal((await http('/admin/courses/bad', admin, 'DELETE')).status, 400);
  assert.equal(await Batch.countDocuments(), 1);
});
test('course deletion preserves batches and applications referring to primary or additional courses', async () => {
  assert.equal((await http(`/admin/courses/${courses[0]._id}`, admin, 'DELETE')).status, 409);
  const application = await models.Application.create({ full_name: 'Applicant', email: 'applicant@test.invalid', phone: '0700000000', course_id: courses[1]._id, terms_accepted: true });
  assert.equal((await http(`/admin/courses/${courses[1]._id}`, admin, 'DELETE')).status, 409);
  await models.Application.updateOne({ _id: application._id }, { course_id: courses[0]._id, course_ids: [courses[0]._id, courses[1]._id] });
  assert.equal((await http(`/admin/courses/${courses[1]._id}`, admin, 'DELETE')).status, 409);
  assert.equal(await Course.countDocuments(), 2); assert.equal(await Batch.countDocuments(), 1); assert.equal(await models.Application.countDocuments(), 1);
});
test('course deletion and batch creation cannot leave a batch pointing at a deleted course', async () => {
  const results = await Promise.allSettled([rules.deleteUnusedCourse(String(courses[1]._id)), rules.saveManagedBatch(null, input({ course_id: String(courses[1]._id), name: 'New batch' }))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const linked = await Batch.countDocuments({ course_id: courses[1]._id });
  assert.equal(!!await Course.exists({ _id: courses[1]._id }), linked > 0);
});
test('deactivated accounts cannot reuse previously issued tokens to read assigned records', async () => {
  await Enrollment.create({ student_id: students[0]._id, batch_id: batch._id });
  for (const [actor, path] of [[admin, '/admin/batches'], [instructors[0], `/instructors/my-students?batch_id=${batch._id}`], [students[0], '/students/my-schedule']]) {
    assert.equal((await http(path, actor)).status, 200);
    await User.updateOne({ _id: actor._id }, { is_active: false });
    assert.equal((await http(path, actor)).status, 401);
    await User.updateOne({ _id: actor._id }, { is_active: true });
    assert.equal((await http(path, actor)).status, 200);
  }
});
test('course, batch list and details count the same non-dropped enrollments', async () => {
  await Enrollment.insertMany(students.map((student, i) => ({ student_id: student._id, batch_id: batch._id, status: ['active', 'completed', 'dropped'][i] })));
  const course = (await http('/admin/courses')).body.find(course => course._id === String(courses[0]._id));
  assert.equal(course.enrollment_count, 2); assert.equal(course.batch_count, 1);
  assert.equal((await http('/admin/batches')).body[0].enrolled_count, 2);
  const details = (await http(`/admin/batches/${batch._id}/details`)).body;
  assert.equal(details.enrolled_count, 2); assert.equal(details.enrollments.length, 3);
  assert(details.enrollments.every(entry => !entry.student_id.password_hash));
  assert.equal((await http('/instructors/my-batches', instructors[0])).body[0].enrolled_count, 2);
});
test('batch validation rejects invalid dates, capacity, instructors and ambiguous schedules', async () => {
  for (const changes of [{ start_date: '2026-02-31' }, { end_date: '2025-01-01' }, { capacity: -1 }, { capacity: 1.5 }, { capacity: true }, { instructor_ids: [String(students[0]._id)] }, { instructor_ids: [String(instructors[0]._id), String(instructors[0]._id)] }, { status: 'bad' }, { room: '' }, { schedule_json: { days: ['Funday'], time: '09:00 - 12:00' } }, { schedule_json: { days: ['Mon'], time: '12:00 - 09:00' } }]) await fails(rules.saveManagedBatch(null, input(changes)), 400);
  await Course.updateOne({ _id: courses[1]._id }, { is_active: false });
  await fails(rules.saveManagedBatch(null, input({ course_id: String(courses[1]._id) })), 400);
});
test('capacity and course identity cannot invalidate existing student records', async () => {
  await Enrollment.insertMany(students.map(student => ({ student_id: student._id, batch_id: batch._id })));
  await fails(rules.saveManagedBatch(String(batch._id), { capacity: 2 }), 409);
  await fails(rules.saveManagedBatch(String(batch._id), { course_id: String(courses[1]._id) }), 409);
  assert.equal((await Batch.findById(batch._id)).capacity, 20);
});
test('multiple instructor assignments and reassignment immediately scope roster access', async () => {
  await Enrollment.create({ student_id: students[0]._id, batch_id: batch._id });
  for (const instructor of instructors) assert.equal((await http(`/instructors/my-students?batch_id=${batch._id}`, instructor)).body.length, 1);
  await rules.saveManagedBatch(String(batch._id), { instructor_ids: [String(instructors[0]._id)] });
  assert.equal((await http('/instructors/my-batches', instructors[1])).body.length, 0);
  assert.equal((await http(`/instructors/my-students?batch_id=${batch._id}`, instructors[1])).status, 404);
  assert.equal((await http(`/instructors/my-students?batch_id=${batch._id}`, instructors[0])).body.length, 1);
});
test('students see only their own active schedules; completed history stays in instructor batches', async () => {
  await Enrollment.create({ student_id: students[0]._id, batch_id: batch._id });
  assert.equal((await http('/students/my-schedule', students[0])).body.length, 1);
  assert.deepEqual((await http('/students/my-schedule', students[1])).body, []);
  await rules.saveManagedBatch(String(batch._id), { status: 'completed' });
  assert.deepEqual((await http('/students/my-schedule', students[0])).body, []);
  assert.deepEqual((await http('/instructors/my-schedule', instructors[0])).body, []);
  assert.equal((await http('/instructors/my-batches', instructors[0])).body[0].status, 'completed');
});
test('archive closes enrollment without erasing existing learning access', async () => {
  await Enrollment.create({ student_id: students[0]._id, batch_id: batch._id });
  assert.equal((await http(`/admin/courses/${courses[0]._id}/archive`, admin, 'PUT', {})).status, 200);
  await fails(admissions.assignStudentsToBatch(String(batch._id), [String(students[1]._id)]), 400);
  assert.equal((await http('/students/batches', students[0])).body.length, 1);
  assert.equal((await http(`/admin/courses/${courses[0]._id}`, admin, 'PUT', { is_active: true })).status, 200);
  await admissions.assignStudentsToBatch(String(batch._id), [String(students[1]._id)]);
});
test('enrollment is idempotent and does not reactivate completed enrollments', async () => {
  await Enrollment.create({ student_id: students[0]._id, batch_id: batch._id, status: 'completed' });
  const result = await admissions.assignStudentsToBatch(String(batch._id), [String(students[0]._id)]);
  assert.equal(result.newStudentIds.length, 0); assert.equal((await Enrollment.findOne()).status, 'completed');
  await rules.saveManagedBatch(String(batch._id), { capacity: 2 });
  const results = await Promise.allSettled([students[1], students[2]].map(student => admissions.assignStudentsToBatch(String(batch._id), [String(student._id)])));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(await Enrollment.countDocuments(), 2);
});
test('notification failures return successful saved batch and enrollment acknowledgements', async () => {
  deliveryFails = true;
  const res = await http(`/admin/batches/${batch._id}`, admin, 'PUT', { name: 'Updated batch' });
  assert.equal(res.status, 200); assert.equal(res.body.notification_sent, false); assert.equal((await Batch.findById(batch._id)).name, 'Updated batch');
  const enrolled = await http(`/admin/batches/${batch._id}/enroll`, admin, 'POST', { studentIds: [String(students[0]._id)] });
  assert.equal(enrolled.status, 200); assert.equal(enrolled.body.notification_sent, false); assert.equal(enrolled.body.email_sent, false); assert.equal(await Enrollment.countDocuments(), 1);
});
test('empty deletion is allowed but enrolled and teaching batches retain all records', async () => {
  await rules.deleteEmptyBatch(String(batch._id)); assert.equal(await Batch.countDocuments(), 0);
  batch = (await rules.saveManagedBatch(null, input())).batch;
  await Video.create({ batch_id: batch._id, instructor_id: instructors[0]._id, title: 'Notes', topic: 'Safety', content_type: 'material', cloudinary_url: 'https://test.invalid/notes.pdf' });
  await fails(rules.deleteEmptyBatch(String(batch._id)), 409); assert.equal(await Video.countDocuments(), 1); assert.equal(await Batch.countDocuments(), 1);
});
test('batch closure and instructor removal cannot strand upcoming practical bookings', async () => {
  const monday = new Date(); monday.setUTCDate(monday.getUTCDate() + 14 - (monday.getUTCDay() + 6) % 7); monday.setUTCHours(0, 0, 0, 0);
  const slot = await PracticeSlot.create({ batch_id: batch._id, instructor_id: instructors[1]._id, week_start_date: monday, day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', max_students: 2 });
  await SlotBooking.create({ slot_id: slot._id, student_id: students[0]._id });
  await fails(rules.saveManagedBatch(String(batch._id), { status: 'cancelled' }), 409);
  await fails(rules.saveManagedBatch(String(batch._id), { instructor_ids: [String(instructors[0]._id)] }), 409);
  await SlotBooking.updateMany({}, { status: 'cancelled' });
  await rules.saveManagedBatch(String(batch._id), { status: 'cancelled' });
  assert.equal((await PracticeSlot.findById(slot._id)).is_open, false);
  const second = (await rules.saveManagedBatch(null, input({ name: 'Other batch', instructor_ids: [String(instructors[1]._id)] }))).batch;
  const slots = await practical.createPracticalSlots(admin, { batch_id: second._id, instructor_id: instructors[1]._id, week_start_date: monday.toISOString().slice(0, 10), slots: [{ day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', max_students: 2 }] });
  assert.equal(slots.length, 1);
  await fails(rules.saveManagedBatch(String(batch._id), { status: 'active' }), 409);
  await PracticeSlot.deleteOne({ _id: slot._id });
  await rules.saveManagedBatch(String(batch._id), { status: 'active' });
  assert.equal((await Batch.findById(batch._id)).status, 'active');
});
