const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/registrationIdentity.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const identity = {}; new Function('exports', js)(identity);
test('official registration wins over legacy index in screens and exports', () => {
  assert.equal(identity.registrationNumberOf({ registration_number: '26T0001', index_number: '26T0001' }), '26T0001');
  assert.equal(identity.registrationNumberOf({ registration_number: 'TVTI-2026-00001', index_number: '26T0001' }), 'TVTI-2026-00001');
  assert.equal(identity.registrationNumberOf({ registration_number: '26I0001', index_number: '26T0999' }), '26I0001');
  assert.equal(identity.registrationNumberOf({ index_number: '25I0010' }), '25I0010');
  assert.equal(identity.registrationNumberOf({}), '');
});
test('student and instructor directories sort number sequences naturally, with unassigned accounts last', () => {
  for (const prefix of ['26T', '27T', 'TVTI-2026-', '26I']) {
    const rows = [{ registration_number: prefix + '10' }, { name: 'Unassigned' }, { registration_number: prefix + '2' }, { registration_number: prefix + '0001' }];
    assert.deepEqual(rows.sort(identity.compareRegistrationNumbers).map(identity.registrationNumberOf), [prefix + '0001', prefix + '2', prefix + '10', '']);
  }
});
