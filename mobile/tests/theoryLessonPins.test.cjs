// Run: node --test tests/theoryLessonPins.test.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function harness(saved = {}, reject) {
  const values = new Map(Object.entries(saved));
  const requests = [];
  const source = fs.readFileSync(path.join(__dirname, '../src/services/theoryLessonPins.ts'), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', js)(name => {
    if (name === './api') return { patch: async (url, body) => { requests.push({ url, body }); if (reject) await reject(url); } };
    if (name === '../utils/storage') return { storage: {
      getItem: async key => values.get(key) ?? null,
      setItem: async (key, value) => values.set(key, value),
    } };
    throw new Error(`Unexpected import: ${name}`);
  }, module.exports, module);
  return { migrate: module.exports.migrateLegacyLessonPins, values, requests };
}

const id = 'a'.repeat(24);
const oldKey = 'pinned_lessons_student-a';
const doneKey = 'lesson_pins_migrated_student-a';

test('existing pins migrate once and are not reapplied after an explicit unpin', async () => {
  const h = harness({ [oldKey]: JSON.stringify({ [id]: true }) });
  await h.migrate('student-a');
  await h.migrate('student-a');
  assert.deepEqual(h.requests, [{ url: `/students/videos/${id}/pin`, body: { pinned: true } }]);
  assert.equal(h.values.get(doneKey), 'true');
});

test('simultaneous home refreshes share one migration', async () => {
  const h = harness({ [oldKey]: JSON.stringify({ [id]: true }) });
  await Promise.all([h.migrate('student-a'), h.migrate('student-a')]);
  assert.equal(h.requests.length, 1);
});

test('only valid pinned video IDs migrate, with no more than three slots', async () => {
  const ids = ['a', 'b', 'c', 'd'].map(value => value.repeat(24));
  const h = harness({ [oldKey]: JSON.stringify({ invalid: true, ['e'.repeat(24)]: false, ...Object.fromEntries(ids.map(value => [value, true])) }) });
  await h.migrate('student-a');
  assert.equal(h.requests.length, 3);
  assert.ok(h.requests.every(request => request.body.pinned === true));
});

test('network failures retain pending migration for the next visit', async () => {
  let offline = true;
  const h = harness({ [oldKey]: JSON.stringify({ [id]: true }) }, () => { if (offline) throw new Error('offline'); });
  await assert.rejects(h.migrate('student-a'), /offline/);
  assert.equal(h.values.has(doneKey), false);
  offline = false;
  await h.migrate('student-a');
  assert.equal(h.values.get(doneKey), 'true');
});

test('an outdated backend route does not discard pending device pins', async () => {
  const h = harness({ [oldKey]: JSON.stringify({ [id]: true }) }, () => { throw { response: { status: 404, data: 'Route not found' } }; });
  await assert.rejects(h.migrate('student-a'));
  assert.equal(h.values.has(doneKey), false);
});

test('removed lessons and enrollments do not prevent valid remaining pins from migrating', async () => {
  const second = 'b'.repeat(24);
  const h = harness({ [oldKey]: JSON.stringify({ [id]: true, [second]: true }) }, url => {
    if (url.includes(id)) throw { response: { status: 404, data: { message: 'Video not found' } } };
  });
  await h.migrate('student-a');
  assert.equal(h.requests.length, 2);
  assert.equal(h.values.get(doneKey), 'true');
});

test('no authenticated student means no pin requests or shared default history', async () => {
  const h = harness();
  await h.migrate();
  assert.equal(h.requests.length, 0);
  assert.equal(h.values.size, 0);
});
