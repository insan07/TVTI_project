// Isolated MongoDB; storage and notification delivery are in-memory doubles.
const assert = require('node:assert/strict');
const { test, before, beforeEach, after } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const dotenv = require('dotenv'), originalConfig = dotenv.config; dotenv.config = () => ({ parsed: {} });
const videoController = require('../dist/controllers/videoController');
const materialController = require('../dist/controllers/uploadController');
const viewer = require('../dist/controllers/studentVideoController'); dotenv.config = originalConfig;
const Video = require('../dist/models/Video').default, Batch = require('../dist/models/Batch').default, Course = require('../dist/models/Course').default, User = require('../dist/models/User').default;
const activity = require('../dist/models/StudentVideoActivity').default;
const storage = require('../dist/services/fileStorage'), notification = require('../dist/services/notificationService');
const pdf = require('pdf2pic'), originals = { save: storage.saveBufferToGridFS, notify: notification.sendNotification, thumbnail: pdf.fromBuffer };
let database, instructor, other, batch, course;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
before(async () => { database = await MongoMemoryServer.create(); await mongoose.connect(database.getUri('upload_viewer_tests')); storage.saveBufferToGridFS = async () => String(new mongoose.Types.ObjectId()); pdf.fromBuffer = () => async () => ({}); });
after(async () => { storage.saveBufferToGridFS = originals.save; notification.sendNotification = originals.notify; pdf.fromBuffer = originals.thumbnail; await mongoose.disconnect(); await database.stop(); });
beforeEach(async () => {
  for (const model of [Video, Batch, Course, User, activity]) await model.deleteMany({});
  notification.sendNotification = async () => [];
  [instructor, other] = await User.create([{ name: 'Teacher', email: 'teacher@test.invalid', role: 'instructor', password_hash: 'fixture' }, { name: 'Other', email: 'other@test.invalid', role: 'instructor', password_hash: 'fixture' }]);
  course = await Course.create({ title: 'Electrical', description: 'Fixture', fee: 1000, duration_weeks: 12 });
  batch = await Batch.create({ name: 'Assigned Batch', course_id: course._id, instructor_ids: [instructor._id], start_date: new Date(), end_date: new Date('2099-01-01'), capacity: 20, status: 'active' });
});
const body = () => ({ batch_id: String(batch._id), topic: 'Safety', title: 'Safe Working', youtube_url: 'https://www.youtube.com/watch?v=abcdefghijk' });
test('video remains published and reports notification failure instead of a failed upload', async () => {
  notification.sendNotification = async () => { throw Error('Offline notification fixture'); };
  const res = response(); await videoController.uploadVideo({ user: instructor, body: body(), files: {} }, res);
  assert.equal(res.statusCode, 201); assert.equal(res.body.notification_sent, false); assert.equal(await Video.countDocuments(), 1);
});
test('PDF publication persists and acknowledges correctly when notifications fail', async () => {
  notification.sendNotification = async () => { throw Error('Offline notification fixture'); };
  const res = response(); await materialController.uploadMaterial({ user: instructor, body: body(), files: { material: [{ originalname: 'notes.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nfixture'), size: 16 }] } }, res);
  assert.equal(res.statusCode, 201); assert.equal(res.body.notification_sent, false); assert.equal(res.body.content_type, 'material'); assert.equal(await Video.countDocuments(), 1);
});
test('uploads reject unassigned batches and invalid PDF files without publishing', async () => {
  const denied = response(); await videoController.uploadVideo({ user: other, body: body(), files: {} }, denied); assert.equal(denied.statusCode, 403);
  const invalid = response(); await materialController.uploadMaterial({ user: instructor, body: body(), files: { material: [{ originalname: 'bad.pdf', mimetype: 'application/pdf', buffer: Buffer.from('not a pdf') }] } }, invalid); assert.equal(invalid.statusCode, 400);
  const notes = response(); await videoController.uploadVideo({ user: instructor, body: body(), files: { notes: [{ buffer: Buffer.from('not a pdf') }] } }, notes); assert.equal(notes.statusCode, 400); assert.equal(await Video.countDocuments(), 0);
});
test('instructors preview their own videos and notes without student enrollment or student history', async () => {
  const video = await Video.create({ instructor_id: instructor._id, batch_id: batch._id, topic: 'Safety', title: 'Lesson', cloudinary_url: 'https://www.youtube.com/watch?v=abcdefghijk', notes_url: '/api/files/fixture', content_type: 'video' });
  const req = user => ({ user, params: { videoId: String(video._id) }, protocol: 'https', get: () => 'fixture.invalid' });
  const stream = response(); await viewer.getVideoStreamUrl(req(instructor), stream); assert.equal(stream.statusCode, 200); assert.equal(stream.body.type, 'youtube');
  const notes = response(); await viewer.getNotesUrl(req(instructor), notes); assert.equal(notes.statusCode, 200); assert.equal(notes.body.url, '/api/files/fixture');
  const denied = response(); await viewer.getVideoStreamUrl(req(other), denied); assert.equal(denied.statusCode, 403);
  const deniedNotes = response(); await viewer.getNotesUrl(req(other), deniedNotes); assert.equal(deniedNotes.statusCode, 403); assert.equal(await activity.countDocuments(), 0);
});
