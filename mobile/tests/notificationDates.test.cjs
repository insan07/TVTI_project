const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/notificationDates.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const dates = {};
new Function('exports', js)(dates);
const item = (id, createdAt) => ({ _id: id, createdAt, title: id, message: id, is_read: false });
const now = Date.parse('2026-11-11T06:00:00Z');

test('notifications group by exact date with newest sections and rows first', () => {
  const entries = [item('older', '2026-11-09T10:00:00Z'), item('yesterday', '2026-11-10T06:00:00Z'), item('early', '2026-11-11T01:00:00Z'), item('latest', '2026-11-11T05:00:00Z')];
  const sections = dates.groupNotificationsByDate(entries, now);
  assert.deepEqual(sections.map(s => s.key), ['2026-11-11', '2026-11-10', '2026-11-09']);
  assert.deepEqual(sections.map(s => s.title), ['Today', 'Yesterday', 'Monday, 9 November 2026']);
  assert.deepEqual(sections[0].data.map(n => n._id), ['latest', 'early']);
  assert.equal(entries[0]._id, 'older', 'grouping does not reorder source state');
});
test('date boundaries follow Sri Lanka midnight rather than UTC midnight', () => {
  const sections = dates.groupNotificationsByDate([item('after', '2026-11-10T18:30:00Z'), item('before', '2026-11-10T18:29:59Z')], now);
  assert.deepEqual(sections.map(s => s.title), ['Today', 'Yesterday']);
});
test('Yesterday works across year and month changes', () => {
  const sections = dates.groupNotificationsByDate([item('last-year', '2026-12-31T10:00:00Z')], Date.parse('2026-12-31T19:00:00Z'));
  assert.equal(sections[0].title, 'Yesterday');
  assert.equal(sections[0].key, '2026-12-31');
});
test('invalid or missing timestamps stay visible in Earlier after all dated notifications', () => {
  const sections = dates.groupNotificationsByDate([item('missing'), item('invalid', 'bad'), item('valid', '2026-11-11T05:00:00Z')], now);
  assert.deepEqual(sections.map(s => s.title), ['Today', 'Earlier']);
  assert.deepEqual(sections[1].data.map(n => n._id), ['missing', 'invalid']);
  assert.deepEqual(dates.groupNotificationsByDate([], now), []);
});
test('notification times use the institute clock and invalid times are blank', () => {
  assert.match(dates.notificationClockTime('2026-11-11T06:00:00Z'), /^11:30\s*am$/i);
  assert.equal(dates.notificationClockTime('bad'), '');
  assert.equal(dates.notificationClockTime(), '');
});
test('date headings refresh at the next midnight', () => {
  const beforeMidnight = Date.parse('2026-11-11T18:29:59Z');
  assert.equal(dates.millisecondsUntilNotificationDayChange(beforeMidnight), 1050);
  assert.equal(dates.millisecondsUntilNotificationDayChange(Date.parse('2026-11-11T18:30:00Z')), 86400050);
});
