type Info = { total_fee?: number; amount_paid?: number; payment_status?: string };
type Receipt = { amount: number; status: string };
const cents = (value: unknown) => Math.round(Math.max(0, Number(value) || 0) * 100);
export const paymentMethods = ['physical_cash', 'bank_transfer', 'online_transfer', 'other'];
export function paymentAmount(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string' || String(value).trim() === '') return null;
  const amount = Number(value), rounded = Math.round(amount * 100);
  return Number.isFinite(amount) && amount > 0 && Number.isSafeInteger(rounded) && Math.abs(amount * 100 - rounded) < 0.00001 ? rounded / 100 : null;
}
export function summarizePayment(info: Info = {}, slips: Receipt[] = []) {
  const total = cents(info.total_fee), paid = cents(info.amount_paid);
  const waived = info.payment_status === 'waived';
  const balance = waived ? 0 : Math.max(0, total - paid), credit = Math.max(0, paid - total);
  const pending = slips.filter(slip => slip.status === 'pending');
  return { total_fee: total / 100, amount_paid: paid / 100, remaining_balance: balance / 100,
    credit_balance: credit / 100, waived_amount: waived ? Math.max(0, total - paid) / 100 : 0,
    pending_amount: pending.reduce((sum, slip) => sum + cents(slip.amount), 0) / 100,
    pending_slips_count: pending.length, total_slips_count: slips.length,
    payment_status: waived ? 'waived' : credit > 0 ? 'overpaid' : balance === 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'pending',
    category: balance === 0 ? 'completed' : 'pending' };
}
export function paymentBalanceMessage(info: Info = {}) {
  const summary = summarizePayment(info);
  return `Total fee: LKR ${summary.total_fee.toLocaleString('en-LK', { minimumFractionDigits: 2 })}. Confirmed paid: LKR ${summary.amount_paid.toLocaleString('en-LK', { minimumFractionDigits: 2 })}. Balance due: LKR ${summary.remaining_balance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}. Overpayment credit: LKR ${summary.credit_balance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}.`;
}
