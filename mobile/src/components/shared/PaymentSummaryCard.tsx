import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';
import { money, paymentSummary, paymentStatusLabel } from '../../utils/paymentSummary';

export default function PaymentSummaryCard({ summary: value, title = 'Payment summary' }: { summary: any; title?: string }) {
  const { isDark } = useTheme(), theme = usersSectionTheme(isDark), summary = paymentSummary(value);
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.copy, { color: theme.accent }]}>{paymentStatusLabel(summary.payment_status)}</Text>
    <View style={styles.grid}>{[['Total fee', summary.total_fee], ['Confirmed paid', summary.amount_paid], ['Balance due', summary.remaining_balance], ['Overpayment credit', summary.credit_balance]].map(([label, amount]) =>
      <View style={styles.item} key={label}><Text style={[styles.copy, { color: theme.muted }]}>{label}</Text><Text style={[styles.amount, { color: theme.text }]}>{money(amount)}</Text></View>)}</View>
    {summary.payment_status === 'waived' && <Text style={[styles.copy, { color: theme.muted }]}>The unpaid fee has been waived.</Text>}
    {summary.credit_balance > 0 && <Text style={[styles.copy, { color: theme.muted }]}>You have paid more than the total fee. This credit is recorded on your account; it is not an automatic refund.</Text>}
    {!!summary.pending_slips_count && <Text style={[styles.copy, { color: theme.muted }]}>{summary.pending_slips_count} receipt(s) awaiting review · {money(summary.pending_amount)}. This amount is not included in confirmed payments.</Text>}
  </View>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 }, title: { fontSize: 16, fontWeight: '700' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, item: { minWidth: 120, flexBasis: '44%', flexGrow: 1, gap: 4 }, copy: { fontSize: 12, lineHeight: 18 }, amount: { fontSize: 16, fontWeight: '700' } });
