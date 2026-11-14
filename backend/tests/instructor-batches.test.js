// Uses a disposable local database; does not load application credentials.
const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const User = require('../dist/models/User').default;
const Course = require('../dist/models/Course').default;
const Batch = require('../dist/models/Batch').default;
const Enrollment = require('../dist/models/Enrollment').default;
const { getMyBatches, getMyStudents } = require('../dist/controllers/instructorController');

let server, instructors, students, batches;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
before(async () => {
  server = await MongoMemoryServer.create({ instance: { spawn: { windowsHide: true } } });
  await mongoose.connect(server.getUri('instructor_batch_tests'));
}, { timeout: 120000 });
after(async () => { await mongoose.disconnect(); if (server) await server.stop(); });
beforeEach(async () => {
  for (const model of [Enrollment, Batch, Course, User]) await model.deleteMany({});
  instructors = await User.insertMany([0, 1].map(i => ({ name: `Instructor ${i}`, email: `i${i}@test.invalid`, password_hash: 'unused', role: 'instructor' })));
  students = await User.insertMany([0, 1, 2].map(i => ({ name: `Student ${i}`, email: `s${i}@test.invalid`, password_hash: 'private', role: 'student', registration_number: `REG-${i}`, phone: `070000000${i}` })));
  const courses = await Course.insertMany(['Electrical', 'Plumbing'].map(title => ({ title, description: title, fee: 1, duration_weeks: 1 })));
  batches = await Batch.insertMany([
    { name: 'Batch A', course_id: courses[0]._id, status: 'active', instructor_ids: [instructors[0]._id] },
    { name: 'Batch A', course_id: courses[1]._id, status: 'completed', instructor_ids: instructors.map(i => i._id) },
    { name: 'Empty batch', course_id: courses[0]._id, status: 'cancelled', instructor_ids: [instructors[0]._id] },
    { name: 'Other instructor batch', course_id: courses[1]._id, status: 'active', instructor_ids: [instructors[1]._id] },
  ].map((batch, i) => ({ ...batch, start_date: new Date('2026-01-01'), end_date: new Date('2026-12-31'), capacity: 20, createdAt: new Date(`2026-01-0${i + 1}`) })));
  await Enrollment.insertMany([
    { batch_id: batches[0]._id, student_id: students[0]._id, status: 'active' },
    { batch_id: batches[1]._id, student_id: students[0]._id, status: 'completed' },
    { batch_id: batches[1]._id, student_id: students[1]._id, status: 'dropped' },
    { batch_id: batches[3]._id, student_id: students[2]._id, status: 'active' },
  ]);
});
const call = async (controller, actor = instructors[0], query = {}) => {
  const res = response(); await controller({ user: actor, query }, res); return res;
};

test('My Batches includes all assigned statuses and empty batches, newest first, with matching counts', async () => {
  const res = await call(getMyBatches);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.map(b => String(b._id)), [batches[2], batches[1], batches[0]].map(b => String(b._id)));
  assert.deepEqual(res.body.map(b => b.enrolled_count), [0, 1, 1]);
  assert.deepEqual(res.body.map(b => b.course_id.title), ['Electrical', 'Plumbing', 'Electrical']);
});

test('batch roster is scoped by batch ID even when two batches have the same name', async () => {
  await User.updateOne({ _id: students[0]._id }, { profile_photo: 'https://example.test/student.jpg' });
  const res = await call(getMyStudents, instructors[0], { batch_id: String(batches[1]._id) });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 2);
  assert(res.body.every(e => String(e.batch_id._id) === String(batches[1]._id)));
  assert.deepEqual(res.body.map(e => e.status).sort(), ['completed', 'dropped']);
  assert.equal(res.body[0].student_id.registration_number, 'REG-0');
  assert.equal(res.body[0].student_id.profile_photo, 'https://example.test/student.jpg');
  assert.equal(res.body[0].student_id.password_hash, undefined);
  assert.equal(res.body[0].student_id.payment_info, undefined);
});

test('unassigned and malformed batch requests cannot reveal student records', async () => {
  const unauthorized = await call(getMyStudents, instructors[0], { batch_id: String(batches[3]._id) });
  assert.equal(unauthorized.statusCode, 404);
  for (const batch_id of ['bad', '', { $ne: null }, [String(batches[0]._id)]]) {
    assert.equal((await call(getMyStudents, instructors[0], { batch_id })).statusCode, 400);
  }
});

test('shared instructors can read the relevant batch and assignment removal takes effect immediately', async () => {
  const query = { batch_id: String(batches[1]._id) };
  assert.equal((await call(getMyStudents, instructors[1], query)).body.length, 2);
  await Batch.updateOne({ _id: batches[1]._id }, { $pull: { instructor_ids: instructors[1]._id } });
  assert.equal((await call(getMyStudents, instructors[1], query)).statusCode, 404);
});

test('the My Students shortcut keeps the existing active-only assigned roster', async () => {
  const res = await call(getMyStudents);
  assert.equal(res.body.length, 1);
  assert.equal(String(res.body[0].student_id._id), String(students[0]._id));
  assert.equal(res.body[0].status, 'active');
});

test('empty batches and instructors with no batches return empty rosters', async () => {
  assert.deepEqual((await call(getMyStudents, instructors[0], { batch_id: String(batches[2]._id) })).body, []);
  const unassigned = { _id: new mongoose.Types.ObjectId(), role: 'instructor' };
  assert.deepEqual((await call(getMyBatches, unassigned)).body, []);
  assert.deepEqual((await call(getMyStudents, unassigned)).body, []);
});
