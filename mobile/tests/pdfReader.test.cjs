const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/pdfReader.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const reader = {};
new Function('exports', js)(reader);

test('PDF URLs resolve server paths and reject executable or credential-bearing links', () => {
  assert.equal(reader.resolvePdfUrl('/uploads/notes.pdf', 'https://example.test/api'), 'https://example.test/uploads/notes.pdf');
  assert.equal(reader.resolvePdfUrl('https://cdn.example.test/notes.pdf', 'https://example.test/api'), 'https://cdn.example.test/notes.pdf');
  for (const value of ['', 'javascript:alert(1)', 'file:///secrets', 'https://user:secret@example.test/notes.pdf']) assert.throws(() => reader.resolvePdfUrl(value, 'https://example.test/api'));
});

test('binary PDF data is preserved through the native-to-WebView base64 bridge', () => {
  for (const size of [0, 1, 2, 3, 1024, 20000]) {
    const bytes = Uint8Array.from({ length: size }, (_, index) => index % 256);
    assert.equal(reader.pdfBase64(bytes), Buffer.from(bytes).toString('base64'));
  }
});

test('invalid file responses are reported instead of showing a blank PDF frame', () => {
  assert.equal(reader.isPdfFile(Buffer.from('%PDF-1.7\n')), true);
  assert.equal(reader.isPdfFile(Buffer.from('<html>Access denied</html>')), false);
  assert.equal(reader.isPdfFile(new Uint8Array()), false);
});

test('document download names preserve titles and remove file-path characters', () => {
  assert.equal(reader.pdfFileName('Circuit notes'), 'Circuit notes.pdf');
  assert.equal(reader.pdfFileName('Circuit notes.PDF'), 'Circuit notes.pdf');
  assert.equal(reader.pdfFileName('../notes: test?'), '.. notes test.pdf');
  assert.equal(reader.pdfFileName(''), 'Lesson notes.pdf');
});
