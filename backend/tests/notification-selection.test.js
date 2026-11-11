const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { Types } = require('mongoose');
const Notification = require('../dist/models/Notification').default;
const { deleteSelectedNotifications } = require('../dist/controllers/notificationController');

const owner = new Types.ObjectId(), other = new Types.ObjectId();
const first = String(new Types.ObjectId()), second = String(new Types.ObjectId()), unselected = String(new Types.ObjectId()), foreign = String(new Types.ObjectId());
const original = Notification.deleteMany;
let records, writes, fail;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
beforeEach(() => {
  records = [first, second, unselected].map(_id => ({ _id, user_id: owner })).concat([{ _id: foreign, user_id: other }]);
  writes = 0; fail = false;
  Notification.deleteMany = async query => {
    writes++;
    if (fail) throw Error('Database unavailable');
    assert.equal(String(query.user_id), String(owner));
    assert.equal(new Set(query._id.$in).size, query._id.$in.length, 'duplicate selections are removed');
    const before = records.length;
    records = records.filter(item => !(String(item.user_id) === String(query.user_id) && query._id.$in.includes(item._id)));
    return { deletedCount: before - records.length };
  };
});
afterEach(() => { Notification.deleteMany = original; });

test('all three roles delete only their selected notifications', async () => {
  for (const role of ['student', 'instructor', 'admin']) {
    records = [first, second, unselected].map(_id => ({ _id, user_id: owner })).concat([{ _id: foreign, user_id: other }]);
    const res = response();
    await deleteSelectedNotifications({ user: { _id: owner, role }, body: { ids: [first, second, foreign, first] } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.deleted_count, 2);
    assert.deepEqual(records.map(item => item._id), [unselected, foreign]);
  }
});

test('empty, missing, or malformed selections do not delete anything', async () => {
  for (const ids of [undefined, null, [], 'all', [first, 'bad'], [12], [{}]]) {
    const res = response();
    await deleteSelectedNotifications({ user: { _id: owner }, body: { ids } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(writes, 0);
  assert.equal(records.length, 4);
});

test('an already deleted selection is safe to retry', async () => {
  const req = { user: { _id: owner }, body: { ids: [first] } };
  const res = response(); await deleteSelectedNotifications(req, res);
  const retry = response(); await deleteSelectedNotifications(req, retry);
  assert.equal(res.body.deleted_count, 1);
  assert.equal(retry.statusCode, 200);
  assert.equal(retry.body.deleted_count, 0);
  assert.deepEqual(records.map(item => item._id), [second, unselected, foreign]);
});

test('a failed deletion returns an error so the selection can be retried', async () => {
  fail = true;
  const res = response();
  await deleteSelectedNotifications({ user: { _id: owner }, body: { ids: [first] } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(records.length, 4);
});
