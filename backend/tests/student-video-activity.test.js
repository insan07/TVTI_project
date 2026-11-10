// Run: npm run build; node --test tests/student-video-activity.test.js
// Uses in-memory model doubles; never connects to a database or reads credentials.
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { Types } = require('mongoose');
const Video = require('../dist/models/Video').default;
const Enrollment = require('../dist/models/Enrollment').default;
const Activity = require('../dist/models/StudentVideoActivity').default;
const service = require('../dist/services/studentVideoActivity');
const dotenv = require('dotenv');
const originalConfig = dotenv.config;
dotenv.config = () => ({ parsed: {} });
const controller = require('../dist/controllers/studentVideoController');
dotenv.config = originalConfig;

const studentId = new Types.ObjectId();
const videoId = new Types.ObjectId();
const batchId = new Types.ObjectId();
const original = {
  video: Video.findById, enrollment: Enrollment.findOne, enrollments: Enrollment.find,
  activity: Activity.findOne, update: Activity.updateOne, recent: service.getRecentTheoryLessons,
};
let video, enrolled, records, writes, recent;
const key = filter => `${filter.student_id}:${filter.video_id}`;
const request = body => ({ user: { _id: studentId }, params: { videoId: String(videoId) }, body, protocol: 'https', get: () => 'example.test' });
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const getRecord = () => records.get(`${studentId}:${videoId}`);

beforeEach(() => {
  video = { _id: videoId, batch_id: batchId, title: 'Circuit basics', topic: 'Theory', content_type: 'video', cloudinary_url: '/uploads/videos/circuit.mp4' };
  enrolled = true;
  records = new Map();
  writes = 0;
  recent = [];
  Video.findById = async () => video;
  Enrollment.findOne = async () => enrolled ? { batch_id: batchId } : null;
  Enrollment.find = () => ({ select: async () => enrolled ? [{ batch_id: batchId }] : [] });
  Activity.findOne = async filter => records.get(key(filter)) || null;
  Activity.updateOne = async (filter, update) => {
    writes += 1;
    records.set(key(filter), { last_accessed_at: null, pinned_at: null, ...records.get(key(filter)), ...update.$set });
  };
  service.getRecentTheoryLessons = async () => recent;
});

afterEach(() => {
  Video.findById = original.video;
  Enrollment.findOne = original.enrollment;
  Enrollment.find = original.enrollments;
  Activity.findOne = original.activity;
  Activity.updateOne = original.update;
  service.getRecentTheoryLessons = original.recent;
});

test('opening an authorized video records access, resolves its URL, and preserves its pin', async () => {
  const pinnedAt = new Date('2026-01-01');
  records.set(`${studentId}:${videoId}`, { pinned_at: pinnedAt, last_accessed_at: new Date('2025-01-01') });
  const res = response();
  await controller.getVideoStreamUrl(request({}), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.url, 'https://example.test/uploads/videos/circuit.mp4');
  assert.equal(getRecord().pinned_at, pinnedAt);
  assert.ok(getRecord().last_accessed_at > new Date('2025-01-01'));
  await controller.getVideoStreamUrl(request({}), response());
  assert.equal(records.size, 1, 'reopening updates one history record');
});

test('YouTube opens are included in access history', async () => {
  video.cloudinary_url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const res = response();
  await controller.getVideoStreamUrl(request({}), res);
  assert.equal(res.body.type, 'youtube');
  assert.ok(getRecord().last_accessed_at instanceof Date);
});

for (const [name, change, status] of [
  ['unauthorized enrollment', () => { enrolled = false; }, 403],
  ['a PDF/material', () => { video.content_type = 'material'; }, 400],
  ['a deleted video', () => { video = null; }, 404],
  ['an unavailable stream', () => { video.cloudinary_url = ''; }, 404],
]) {
  test(`${name} is never recorded as a recently accessed video`, async () => {
    change();
    const res = response();
    await controller.getVideoStreamUrl(request({}), res);
    assert.equal(res.statusCode, status);
    assert.equal(writes, 0);
  });
}

test('pin survives repeated saves and a subsequent video open', async () => {
  await controller.setVideoPinned(request({ pinned: true }), response());
  const firstPin = getRecord().pinned_at;
  assert.ok(firstPin instanceof Date);
  await controller.setVideoPinned(request({ pinned: true }), response());
  await controller.getVideoStreamUrl(request({}), response());
  assert.equal(getRecord().pinned_at, firstPin, 'access history must not reorder saved pins');
});

test('unpinning keeps the actual access history', async () => {
  const accessedAt = new Date('2026-01-02');
  records.set(`${studentId}:${videoId}`, { pinned_at: new Date('2026-01-03'), last_accessed_at: accessedAt });
  const res = response();
  await controller.setVideoPinned(request({ pinned: false }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(getRecord().pinned_at, null);
  assert.equal(getRecord().last_accessed_at, accessedAt);
});

test('a fourth pin cannot displace three saved pins', async () => {
  recent = [1, 2, 3].map(id => ({ _id: id, is_pinned: true }));
  const res = response();
  await controller.setVideoPinned(request({ pinned: true }), res);
  assert.equal(res.statusCode, 409);
  assert.equal(writes, 0);
});

test('pin endpoint rejects invalid input, materials, and unavailable enrollments', async () => {
  for (const pinned of ['true', undefined, null]) {
    const res = response();
    await controller.setVideoPinned(request({ pinned }), res);
    assert.equal(res.statusCode, 400);
  }
  video.content_type = 'material';
  const material = response();
  await controller.setVideoPinned(request({ pinned: true }), material);
  assert.equal(material.statusCode, 404);
  video.content_type = 'video';
  enrolled = false;
  const forbidden = response();
  await controller.setVideoPinned(request({ pinned: true }), forbidden);
  assert.equal(forbidden.statusCode, 403);
  assert.equal(writes, 0);
});

test('concurrent first opens recover from a unique-key race', async () => {
  let attempts = 0;
  Activity.updateOne = async () => {
    if (++attempts === 1) throw Object.assign(new Error('duplicate'), { code: 11000 });
  };
  await service.updateStudentVideoActivity(studentId, videoId, { last_accessed_at: new Date() });
  assert.equal(attempts, 2);
});

test('unexpected persistence failures propagate to the caller', async () => {
  Activity.updateOne = async () => { throw new Error('database unavailable'); };
  await assert.rejects(service.updateStudentVideoActivity(studentId, videoId, { pinned_at: new Date() }), /database unavailable/);
});
