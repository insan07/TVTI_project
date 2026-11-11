const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const source = fs.readFileSync(path.join(__dirname, '../src/utils', name + '.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {}; cache.set(name, exports);
  new Function('exports', 'require', js)(exports, dependency => load(dependency.replace('./', '')));
  return exports;
}
const views = load('scheduleViews');
const date = (year, month, day) => new Date(year, month - 1, day);
const key = views.scheduleDateKey;
const slot = (id, week, day, time = '09:00') => ({ _id: id, week_start_date: week, day_of_week: day, start_time: time });
const items = [
  slot('next-month', '2026-11-30', 'Tuesday'),
  slot('last-month-day', '2026-11-30', 'Monday'),
  slot('late-day', '2026-11-09', 'Wednesday', '15:00'),
  slot('early-day', '2026-11-09', 'Wednesday'),
  slot('previous-month', '2026-10-26', 'Saturday'),
];

test('List keeps the full newest-first history', () => {
  assert.equal(views.slotsForScheduleView(items, 'List', date(2026, 11, 11)), items);
});
test('Month excludes padded dates from adjacent months and keeps newest-first ordering', () => {
  assert.deepEqual(views.slotsForScheduleView(items, 'Month', date(2026, 11, 11)).map(s => s._id), ['last-month-day', 'late-day', 'early-day']);
});
test('Week includes Monday through Sunday even when the week crosses the year boundary', () => {
  const slots = [slot('next', '2027-01-04', 'Monday'), slot('sunday', '2026-12-28', 'Sunday'), slot('monday', '2026-12-28', 'Monday'), slot('previous', '2026-12-21', 'Sunday')];
  assert.deepEqual(views.slotsForScheduleView(slots, 'Week', date(2027, 1, 1)).map(s => s._id), ['sunday', 'monday']);
});
test('Day shows only its own sessions, with later times first', () => {
  assert.deepEqual(views.slotsForScheduleView(items, 'Day', date(2026, 11, 11)).map(s => s._id), ['late-day', 'early-day']);
  assert.deepEqual(views.slotsForScheduleView(items, 'Day', date(2026, 11, 12)), []);
});
test('month navigation clamps dates to short months, including leap years', () => {
  assert.equal(key(views.shiftScheduleDate(date(2026, 1, 31), 'Month', 1)), '2026-02-28');
  assert.equal(key(views.shiftScheduleDate(date(2028, 1, 31), 'Month', 1)), '2028-02-29');
  assert.equal(key(views.shiftScheduleDate(date(2026, 1, 31), 'Month', -1)), '2025-12-31');
});
test('week and day navigation crosses months and years without skipping dates', () => {
  assert.equal(key(views.shiftScheduleDate(date(2026, 12, 31), 'Day', 1)), '2027-01-01');
  assert.equal(key(views.shiftScheduleDate(date(2026, 12, 31), 'Week', 1)), '2027-01-07');
  assert.equal(key(views.shiftScheduleDate(date(2027, 1, 1), 'Day', -1)), '2026-12-31');
});
test('month calendar rows start on Monday and include every day exactly once', () => {
  const cells = views.scheduleCalendarDates('Month', date(2026, 3, 15));
  assert.equal(cells.length, 42); assert.equal(cells[0].getDay(), 1);
  assert.equal(key(cells[0]), '2026-02-23'); assert.equal(key(cells.at(-1)), '2026-04-05');
  assert.equal(cells.filter(d => d.getMonth() === 2).length, 31);
  assert.equal(new Set(cells.map(key)).size, 42);
});
test('week calendar has seven dates for the selected week', () => {
  const cells = views.scheduleCalendarDates('Week', date(2026, 11, 11));
  assert.equal(cells.length, 7); assert.equal(key(cells[0]), '2026-11-09'); assert.equal(key(cells[6]), '2026-11-15');
});
test('daily regular classes match abbreviated, full, and comma-separated weekday names', () => {
  const batches = [
    { _id: 'short', schedule_json: { days: ['Wed'] } },
    { _id: 'full', schedule_json: { days: ['Wednesday'] } },
    { _id: 'text', schedule_json: { days: 'Monday, Wednesday' } },
    { _id: 'other', schedule_json: { days: ['Tue'] } },
  ];
  assert.deepEqual(views.regularBatchesForScheduleView(batches, 'Day', date(2026, 11, 11)).map(b => b._id), ['short', 'full', 'text']);
  assert.equal(views.regularBatchesForScheduleView(batches, 'Month', date(2026, 11, 11)), batches);
});
