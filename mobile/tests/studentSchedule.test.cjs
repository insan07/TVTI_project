const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/studentSchedule.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const schedule = {};
new Function('exports', js)(schedule);

const batches = [
  { _id: 'a', name: 'A1', course_id: { title: 'Electrical' } },
  { _id: 'b', name: 'B1', course_id: { title: 'Refrigeration' } },
];
const slot = (id, extra = {}) => ({ _id: id, week_start_date: '2026-11-09T00:00:00Z', day_of_week: 'Monday', start_time: '09:00', ...extra });

test('All courses includes every enrolled batch and preserves course and batch names on slots', async () => {
  const calls = [];
  const slots = await schedule.loadScheduleSlots(batches, null, async ({ batchId }) => {
    calls.push(batchId);
    return [slot(batchId, { batch_id: batchId })];
  });
  assert.deepEqual(calls, ['a', 'b']);
  assert.deepEqual(schedule.scheduleBatches(batches, null), batches);
  assert.deepEqual(slots.map(item => [item.batch_id.course_id.title, item.batch_id.name]), [['Electrical', 'A1'], ['Refrigeration', 'B1']]);
});

test('selecting one course fetches and displays only that batch', async () => {
  const calls = [];
  const slots = await schedule.loadScheduleSlots(batches, 'b', async ({ batchId }) => { calls.push(batchId); return [slot('s')]; });
  assert.deepEqual(calls, ['b']);
  assert.deepEqual(schedule.scheduleBatches(batches, 'b'), [batches[1]]);
  assert.equal(slots[0].batch_id.name, 'B1');
});

test('weekly limits apply per batch, including pending cancellation bookings', () => {
  const bookings = [slot('s', { batch_id: batches[0], already_booked: true, booking_status: 'cancellation_requested' })];
  assert.equal(schedule.hasWeeklyBooking(bookings, slot('same-batch', { batch_id: 'a' })), true);
  assert.equal(schedule.hasWeeklyBooking(bookings, slot('other-batch', { batch_id: batches[1] })), false);
  assert.equal(schedule.hasWeeklyBooking(bookings, slot('other-week', { batch_id: 'a', week_start_date: '2026-11-16T00:00:00Z' })), false);
});

test('combined sessions show newest dates and later times first across batches and weeks', async () => {
  const slots = await schedule.loadScheduleSlots(batches, null, async ({ batchId }) => batchId === 'a'
    ? [slot('next-week', { week_start_date: '2026-11-16T00:00:00Z' }), slot('friday', { day_of_week: 'Friday' })]
    : [slot('late-monday', { start_time: '15:00' }), slot('early-monday')]);
  assert.deepEqual(slots.map(item => item._id), ['next-week', 'friday', 'late-monday', 'early-monday']);
});

test('a failed course request does not present an incomplete All courses list as complete', async () => {
  await assert.rejects(schedule.loadScheduleSlots(batches, null, async ({ batchId }) => {
    if (batchId === 'b') throw new Error('Connection failed');
    return [slot('s')];
  }), /Connection failed/);
  assert.deepEqual(await schedule.loadScheduleSlots([], null, async () => { throw Error('Should not load'); }), []);
});

test('slot dates preserve calendar dates across month boundaries', () => {
  const date = schedule.getSlotActualDate('2026-11-30T00:00:00Z', 'Sunday');
  assert.deepEqual([date.getFullYear(), date.getMonth() + 1, date.getDate()], [2026, 12, 6]);
});
