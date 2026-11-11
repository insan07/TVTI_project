const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/practicalTime.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const time = {};
new Function('exports', js)(time);
const slot = { week_start_date: '2026-11-09T00:00:00Z', day_of_week: 'Wednesday', start_time: '09:00', end_time: '10:00' };

test('legacy slot times are interpreted in Sri Lanka time, independent of the device timezone', () => {
  assert.equal(time.practicalInstant(slot, 'start'), Date.parse('2026-11-11T03:30:00Z'));
  assert.equal(time.practicalInstant(slot, 'end'), Date.parse('2026-11-11T04:30:00Z'));
});
test('expiration changes exactly at the end and booking closes exactly at the start', () => {
  const end = time.practicalInstant(slot, 'end'), start = time.practicalInstant(slot, 'start');
  assert.equal(time.isPracticalExpired(slot, end - 1), false);
  assert.equal(time.isPracticalExpired(slot, end), true);
  assert.equal(time.practicalBookingClosed(slot, start - 1), false);
  assert.equal(time.practicalBookingClosed(slot, start), true);
});
test('server timestamps are authoritative and an earlier booking deadline is respected', () => {
  const value = { ...slot, starts_at: '2026-11-11T05:00:00Z', ends_at: '2026-11-11T06:00:00Z', booking_closes_at: '2026-11-10T12:00:00Z' };
  assert.equal(time.practicalInstant(value, 'start'), Date.parse(value.starts_at));
  assert.equal(time.isPracticalExpired(value, Date.parse('2026-11-11T05:59:59Z')), false);
  assert.equal(time.practicalBookingClosed(value, Date.parse(value.booking_closes_at)), true);
});
test('calendar date validation uses the institute day across midnight and parses institute wall time', () => {
  assert.equal(time.instituteDateKey(Date.parse('2026-11-10T19:00:00Z')), '2026-11-11');
  assert.equal(time.instituteWallTime(new Date(2026, 10, 11), '09:00'), Date.parse('2026-11-11T03:30:00Z'));
});
