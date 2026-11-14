// Run: node --test tests/uploadLibrary.test.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/uploadLibrary.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const library = {};
new Function('exports', js)(library);
const { groupUploadModules, getUploadThumbnail, uploadDocumentUrl, formatUploadDate } = library;

test('videos and documents share one module despite spacing and case differences', () => {
  const video = { _id: 'v1', title: 'Circuit basics', topic: ' Electrical Theory ' };
  const notes = { _id: 'm1', title: 'Circuit notes', topic: 'electrical theory' };
  const modules = groupUploadModules([video], [notes]);
  assert.equal(modules.length, 1);
  assert.equal(modules[0].title, 'Electrical Theory');
  assert.deepEqual(modules[0].videos, [video]);
  assert.deepEqual(modules[0].materials, [notes]);
});

test('material-only modules are retained and module order is stable', () => {
  const modules = groupUploadModules([
    { _id: 'v1', title: 'Lesson', topic: 'Practical' },
    { _id: 'v2', title: 'Lesson 2', topic: 'Theory' },
  ], [{ _id: 'm1', title: 'Handbook', topic: 'Reference' }]);
  assert.deepEqual(modules.map(module => module.title), ['Practical', 'Theory', 'Reference']);
  assert.deepEqual(modules.filter(module => module.videos.length > 0).map(module => module.title), ['Practical', 'Theory']);
  assert.deepEqual(modules.filter(module => module.materials.length > 0).map(module => module.title), ['Reference']);
});

test('missing topics form one General module and empty libraries remain empty', () => {
  assert.equal(groupUploadModules([{ _id: 'v1', title: 'Lesson' }], [{ _id: 'm1', title: 'Notes', topic: ' ' }]).length, 1);
  assert.deepEqual(groupUploadModules([], []), []);
});

test('YouTube thumbnails work for watch, embed, shorts, and shortened URLs', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  ]) assert.equal(getUploadThumbnail({ cloudinary_url: url }), 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
});

test('explicit thumbnails win and raw local videos are not treated as images', () => {
  assert.equal(getUploadThumbnail({ thumbnail: 'https://example.test/cover.jpg' }), 'https://example.test/cover.jpg');
  assert.equal(getUploadThumbnail({ cloudinary_url: '/uploads/videos/lecture.mp4' }), undefined);
  assert.equal(getUploadThumbnail({ cloudinary_url: 'https://res.cloudinary.com/demo/video/upload/lesson.mp4?version=1' }), 'https://res.cloudinary.com/demo/video/upload/lesson.jpg?version=1');
});

test('document links preserve external URLs and resolve both supported local paths', () => {
  assert.equal(uploadDocumentUrl('/api/files/abc', 'https://example.test/api'), 'https://example.test/api/files/abc');
  assert.equal(uploadDocumentUrl('/uploads/notes.pdf', 'https://example.test/api/'), 'https://example.test/uploads/notes.pdf');
  assert.equal(uploadDocumentUrl('https://files.test/notes.pdf', 'https://example.test/api'), 'https://files.test/notes.pdf');
});

test('unavailable dates do not add placeholder copy', () => {
  assert.equal(formatUploadDate(), '');
  assert.equal(formatUploadDate('invalid-date'), '');
  assert.ok(formatUploadDate('2026-11-11T12:00:00Z').includes('2026'));
});

const { loadBatchUploads } = library;
const batches = [{ _id: 'batch-a', name: 'A' }, { _id: 'batch-b', name: 'B' }];
test('All courses loads both student enrollments and preserves each upload batch for playback', async () => {
  const calls = [];
  const uploads = await loadBatchUploads(batches, null, false, 'videos', async path => {
    calls.push(path); return { data: [{ _id: path.includes('batch-a') ? 'video-a' : 'video-b' }] };
  });
  assert.deepEqual(calls, ['/students/batches/batch-a/videos', '/students/batches/batch-b/videos']);
  assert.deepEqual(uploads.map(item => item.batch_id._id), ['batch-a', 'batch-b']);
});
test('selected course and empty enrollments never request unrelated student uploads', async () => {
  const calls = [];
  const get = async path => { calls.push(path); return { data: [{ _id: 'notes' }] }; };
  await loadBatchUploads(batches, 'batch-b', false, 'materials', get);
  await loadBatchUploads([], null, false, 'videos', get);
  await loadBatchUploads(batches, 'unassigned', false, 'videos', get);
  assert.deepEqual(calls, ['/students/batches/batch-b/materials']);
});
test('instructor All courses includes every assigned batch and excludes unrelated content', async () => {
  const get = async () => ({ data: [{ _id: 'a', batch_id: 'batch-a' }, { _id: 'b', batch_id: { _id: 'batch-b' } }, { _id: 'c', batch_id: 'other' }] });
  assert.deepEqual((await loadBatchUploads(batches, null, true, 'videos', get)).map(item => item._id), ['a', 'b']);
  assert.deepEqual((await loadBatchUploads(batches, 'batch-b', true, 'materials', get)).map(item => item._id), ['b']);
});
test('All courses rejects partial results if one enrolled course cannot load', async () => {
  await assert.rejects(loadBatchUploads(batches, null, false, 'videos', async path => {
    if (path.includes('batch-b')) throw new Error('Unavailable');
    return { data: [{ _id: 'a' }] };
  }), /Unavailable/);
});
