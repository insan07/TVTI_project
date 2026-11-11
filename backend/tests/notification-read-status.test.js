const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { Types } = require('mongoose');
const Notification = require('../dist/models/Notification').default;
const { markAsRead } = require('../dist/controllers/notificationController');
const owner = new Types.ObjectId(), other = new Types.ObjectId(), id = new Types.ObjectId();
const original = Notification.findOneAndUpdate;
let record, writes;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
beforeEach(() => {
  record = { _id: id, user_id: owner, is_read: false }; writes = 0;
  Notification.findOneAndUpdate = async (query, update, options) => {
    assert.equal(options.new, true);
    if (String(query._id) !== String(record._id) || String(query.user_id) !== String(record.user_id)) return null;
    writes++; Object.assign(record, update); return record;
  };
});
afterEach(() => { Notification.findOneAndUpdate = original; });

test('the existing read endpoint keeps its default behavior and can mark unread again', async () => {
  const req = { user: { _id: owner }, params: { id: String(id) } };
  const read = response(); await markAsRead(req, read);
  assert.equal(read.statusCode, 200); assert.equal(record.is_read, true);
  const unread = response(); await markAsRead({ ...req, body: { is_read: false } }, unread);
  assert.equal(unread.statusCode, 200); assert.equal(record.is_read, false); assert.equal(unread.body.is_read, false);
});
test('all three roles may update only their own notifications', async () => {
  for (const role of ['admin', 'instructor', 'student']) {
    const denied = response(); await markAsRead({ user: { _id: other, role }, params: { id: String(id) }, body: { is_read: true } }, denied);
    assert.equal(denied.statusCode, 404); assert.equal(record.is_read, false);
  }
  assert.equal(writes, 0);
});
test('malformed IDs and non-boolean read states are rejected without writing', async () => {
  for (const value of [null, 'false', 1, {}]) {
    const res = response(); await markAsRead({ user: { _id: owner }, params: { id: String(id) }, body: { is_read: value } }, res);
    assert.equal(res.statusCode, 400);
  }
  const res = response(); await markAsRead({ user: { _id: owner }, params: { id: 'bad' }, body: {} }, res);
  assert.equal(res.statusCode, 400); assert.equal(writes, 0);
});
test('deleted or missing notifications return 404 instead of reporting a saved change', async () => {
  const res = response(); await markAsRead({ user: { _id: owner }, params: { id: String(new Types.ObjectId()) }, body: {} }, res);
  assert.equal(res.statusCode, 404); assert.equal(writes, 0);
});
