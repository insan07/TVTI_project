export const money = (value: unknown) => `LKR ${Number(value ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const paymentStatusLabel = (status?: string) => ({ paid: 'Fees settled', overpaid: 'Overpaid · credit available', waived: 'Fees waived', partially_paid: 'Partially paid', pending: 'Awaiting payment' }[status || 'pending'] || 'Awaiting payment');
export function paymentSummary(value: any = {}) {
  const total = Math.round(Number(value.total_fee ?? value.total_course_fee ?? 0) * 100);
  const paid = Math.round(Number(value.amount_paid ?? 0) * 100);
  const waived = value.payment_status === 'waived';
  const balance = waived ? 0 : Math.max(0, total - paid) / 100, credit = Math.max(0, paid - total) / 100;
  return { ...value, total_fee: total / 100, amount_paid: paid / 100, remaining_balance: balance, credit_balance: credit,
    pending_amount: Number(value.pending_amount ?? 0), pending_slips_count: Number(value.pending_slips_count ?? 0),
    payment_status: waived ? 'waived' : credit > 0 ? 'overpaid' : balance === 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'pending' };
}
export function paymentProjection(summary: any, amount: string) {
  const value = Number(amount);
  return paymentSummary({ ...summary, amount_paid: Math.round((Number(summary.amount_paid || 0) + (Number.isFinite(value) && value > 0 ? value : 0)) * 100) / 100 });
}
