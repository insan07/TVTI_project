const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/paymentSummary.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const summary = {}; new Function('exports', js)(summary);
test('payment screens preserve zero fees and display overpayments as a separate credit', () => {
  const over = summary.paymentSummary({ total_fee: 10000, amount_paid: 12000, pending_amount: 500, pending_slips_count: 1 });
  assert.equal(over.remaining_balance, 0); assert.equal(over.credit_balance, 2000); assert.equal(over.payment_status, 'overpaid'); assert.equal(over.pending_amount, 500);
  assert.equal(summary.paymentSummary({ total_fee: 0, total_course_fee: 500, amount_paid: 0 }).total_fee, 0);
  assert.equal(summary.paymentSummary({ total_fee: 10000, amount_paid: 100, payment_status: 'waived' }).remaining_balance, 0);
});
test('payment estimates use only confirmed paid plus the receipt being entered', () => {
  const current = { total_fee: 1000, amount_paid: 800, pending_amount: 100 };
  assert.equal(summary.paymentProjection(current, '300').credit_balance, 100);
  assert.equal(summary.paymentProjection(current, '100').remaining_balance, 100);
  assert.equal(summary.paymentProjection(current, 'invalid').remaining_balance, 200);
  assert.equal(summary.paymentSummary({ total_fee: .3, amount_paid: .1 + .2 }).credit_balance, 0);
});
