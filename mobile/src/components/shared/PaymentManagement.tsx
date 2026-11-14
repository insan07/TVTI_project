import { KeyboardTextInput as TextInput } from './KeyboardForm';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';
import ManagementSheet from './ManagementSheet';
import CustomDropdown from './CustomDropdown';

const money = (value: any) => `LKR ${Number(value ?? 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;
const initials = (name: string = '') => name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
const method = (value: string) => value === 'bank_transfer' ? 'Bank deposit' : value === 'online_transfer' ? 'Online transfer' : 'Cash at counter';
function useDesign() { const { isDark } = useTheme(); return usersSectionTheme(isDark); }
function Totals({ total, paid, balance }: { total: number; paid: number; balance: number }) {
  const theme = useDesign();
  return <View style={styles.totals}>{[['Total fee', total], ['Paid', paid], ['Balance due', balance]].map(([label, value]) => <View key={label} style={styles.total}>
    <Text style={[styles.label, { color: theme.muted }]}>{label}</Text><Text style={[styles.amount, { color: label === 'Balance due' && balance > 0 ? theme.accent : theme.text }]}>{money(value)}</Text>
  </View>)}</View>;
}
export function PaymentListCard({ item, selected, selecting, onPress, onLongPress }: { item: any; selected: boolean; selecting: boolean; onPress: () => void; onLongPress: () => void }) {
  const theme = useDesign(), total = Number(item.total_fee ?? 0), paid = Number(item.amount_paid ?? 0);
  const settled = item.category === 'completed' || item.payment_status === 'waived' || item.payment_status === 'paid' || paid >= total;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open payments for ${item.name}`} accessibilityState={{ selected }} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}
    style={[styles.listCard, { backgroundColor: selected ? theme.accentSoft : theme.surface, borderColor: selected ? theme.accent : theme.line }]}>
    <View style={styles.identity}>
      <View style={[styles.avatar, { backgroundColor: theme.field }]}>{item.profile_photo ? <Image source={{ uri: item.profile_photo }} style={styles.photo} /> : <Text style={[styles.initials, { color: theme.text }]}>{initials(item.name)}</Text>}{selecting && <View style={[styles.check, { backgroundColor: selected ? theme.accent : theme.field, borderColor: theme.line }]}><Icon name={selected ? 'checkmark' : 'add'} size={12} color={selected ? '#FFFFFF' : theme.muted} /></View>}</View>
      <View style={styles.identityText}><Text style={[styles.name, { color: theme.text }]}>{item.name}</Text><Text style={[styles.copy, { color: theme.muted }]}>{item.registration_number || item.index_number || 'Registration not assigned'}</Text><Text style={[styles.copy, { color: theme.muted }]}>{item.email}</Text></View>
      <Icon name="chevron-forward" size={18} color={theme.muted} />
    </View>
    <View style={[styles.cardRule, { borderColor: theme.line }]}><Totals total={total} paid={paid} balance={Number(item.remaining_balance ?? Math.max(0, total - paid))} /></View>
    <View style={styles.meta}><Text style={[styles.status, { color: theme.text }]}>{settled ? 'Settled' : paid > 0 ? 'Partially paid' : 'Awaiting payment'}</Text>{item.pending_slips_count > 0 ? <Text style={[styles.status, { color: theme.accent }]}>{item.pending_slips_count} to review</Text> : <Text style={[styles.copy, { color: theme.muted }]}>{method(item.payment_method)}</Text>}</View>
  </TouchableOpacity>;
}
export function PaymentDetails({ visible, loading, data, onClose, onAdd, onImage, onApprove, onReject, verifyingId }: { visible: boolean; loading: boolean; data: any; onClose: () => void; onAdd: () => void; onImage: (uri: string) => void; onApprove: (slip: any) => void; onReject: (slip: any) => void; verifyingId: string | null }) {
  const theme = useDesign(), summary = data?.summary || {}, total = Number(summary.total_fee ?? 0), paid = Number(summary.amount_paid ?? 0);
  const progress = summary.category === 'completed' || total === 0 ? 100 : Math.min(100, paid / total * 100);
  const section = { backgroundColor: theme.surface, borderColor: theme.line };
  return <ManagementSheet visible={visible} title="Payment Details" backLabel="Close payment dossier" onClose={onClose} footer={!loading && data && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add payment" onPress={onAdd} style={[styles.primary, { backgroundColor: theme.accent }]}><Icon name="add" size={19} color="#FFFFFF" /><Text style={styles.primaryText}>Add payment</Text></TouchableOpacity>}>
    {loading ? <ActivityIndicator color={theme.accent} style={{ margin: 40 }} /> : data && <>
      <View style={styles.identity}><View style={[styles.avatar, { backgroundColor: theme.field }]}>{data.student?.profile_photo ? <Image source={{ uri: data.student.profile_photo }} style={styles.photo} /> : <Text style={[styles.initials, { color: theme.text }]}>{initials(data.student?.name)}</Text>}</View><View style={styles.identityText}><Text style={[styles.name, { color: theme.text }]}>{data.student?.name}</Text><Text style={[styles.copy, { color: theme.muted }]}>{data.student?.registration_number || data.student?.index_number || 'Registration not assigned'} · {data.student?.phone || 'No phone'}</Text><Text style={[styles.copy, { color: theme.muted }]}>{data.student?.email}</Text></View></View>
      <View style={[styles.section, section]}><Text style={[styles.heading, { color: theme.text }]}>Payment Summary</Text><Totals total={total} paid={paid} balance={Number(summary.remaining_balance ?? Math.max(0, total - paid))} /><View style={[styles.progress, { backgroundColor: theme.field }]}><View style={{ width: `${progress}%`, height: '100%', backgroundColor: theme.accent }} /></View><Text style={[styles.copy, { color: theme.muted }]}>{summary.category === 'completed' ? 'Fees settled' : `${Math.round(progress)}% of fees paid`}</Text></View>
      {data.registration_info && <View style={[styles.section, section]}><Text style={[styles.heading, { color: theme.text }]}>Registration Payment</Text><Text style={[styles.copy, { color: theme.muted }]}>{method(data.registration_info.payment_method)}</Text>{data.registration_info.payment_slip && <TouchableOpacity accessibilityRole="button" accessibilityLabel="View registration receipt" onPress={() => onImage(data.registration_info.payment_slip)} style={[styles.receipt, { backgroundColor: theme.field }]}><Icon name="document-text-outline" size={20} color={theme.accent} /><Text style={[styles.link, { color: theme.text }]}>View receipt</Text><Icon name="chevron-forward" size={16} color={theme.muted} /></TouchableOpacity>}</View>}
      <Text style={[styles.heading, { color: theme.text }]}>Payment History ({data.slips?.length || 0})</Text>
      {!data.slips?.length && <View style={[styles.section, section]}><Text style={[styles.copy, { color: theme.muted }]}>No payment records yet. Add a payment when an amount is received.</Text></View>}
      {data.slips?.map((slip: any) => <View key={slip._id} style={[styles.section, section]}>
        <View style={styles.meta}><Text style={[styles.amount, { color: theme.text }]}>{money(slip.amount)}</Text><Text style={[styles.status, { color: slip.status === 'pending' ? theme.accent : theme.text }]}>{slip.status === 'verified' ? 'Verified' : slip.status === 'rejected' ? 'Rejected' : 'To review'}</Text></View>
        <Text style={[styles.copy, { color: theme.muted }]}>{method(slip.payment_method)} · {slip.createdAt ? new Date(slip.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric' }) : 'Date unavailable'}</Text>
        {!!slip.notes && <Text style={[styles.copy, { color: theme.text }]}>{slip.notes}</Text>}{!!slip.rejection_reason && <Text style={[styles.copy, { color: theme.text }]}>Reason: {slip.rejection_reason}</Text>}
        {!!slip.slip_url && <TouchableOpacity accessibilityRole="button" accessibilityLabel="View payment receipt" style={[styles.receipt, { backgroundColor: theme.field }]} onPress={() => onImage(slip.slip_url)}><Icon name="document-text-outline" size={19} color={theme.accent} /><Text style={[styles.link, { color: theme.text }]}>View receipt</Text><Icon name="chevron-forward" size={16} color={theme.muted} /></TouchableOpacity>}
        {slip.status === 'pending' && <View style={styles.actions}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Approve payment slip" disabled={verifyingId === slip._id} onPress={() => onApprove(slip)} style={[styles.primary, styles.action, { backgroundColor: theme.accent }]}>{verifyingId === slip._id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Approve & credit</Text>}</TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Reject payment slip" onPress={() => onReject(slip)} style={[styles.secondary, styles.action, { borderColor: theme.line, backgroundColor: theme.field }]}><Text style={[styles.link, { color: theme.text }]}>Reject</Text></TouchableOpacity></View>}
      </View>)}
    </>}
  </ManagementSheet>;
}
export type ManualPaymentForm = { amount: string; payment_method: string; notes: string };
export function AddPayment({ visible, data, form, onChange, onClose, onSubmit, saving }: { visible: boolean; data: any; form: ManualPaymentForm; onChange: (form: ManualPaymentForm) => void; onClose: () => void; onSubmit: () => void; saving: boolean }) {
  const theme = useDesign();
  return <ManagementSheet visible={visible} title="Add Payment" backLabel="Back to payment details" onClose={onClose} busy={saving} footer={<View style={styles.actions}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel payment" disabled={saving} onPress={onClose} style={[styles.secondary, styles.action, { borderColor: theme.line, backgroundColor: theme.field }]}><Text style={[styles.link, { color: theme.text }]}>Cancel</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Record Payment" disabled={saving} onPress={onSubmit} style={[styles.primary, styles.action, { backgroundColor: theme.accent }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Record payment</Text>}</TouchableOpacity></View>}>
    <View style={[styles.section, { borderColor: theme.line }]}><Text style={[styles.name, { color: theme.text }]}>{data?.student?.name}</Text><Text style={[styles.copy, { color: theme.muted }]}>{data?.student?.registration_number || data?.student?.index_number || data?.student?.email}</Text><Text style={[styles.amount, { color: theme.accent }]}>Balance: {money(data?.summary?.remaining_balance)}</Text></View>
    <View style={styles.field}><Text style={[styles.label, { color: theme.muted }]}>Amount received (LKR) *</Text><TextInput accessibilityLabel="Payment amount" editable={!saving} value={form.amount} onChangeText={amount => onChange({ ...form, amount })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.field, borderColor: theme.line, color: theme.text }]} /></View>
    <CustomDropdown appearance="management" label="Payment method" selectedValue={form.payment_method} items={[{ value: 'physical_cash', label: 'Cash at counter' }, { value: 'bank_transfer', label: 'Bank deposit' }]} onValueChange={payment_method => { if (!saving) onChange({ ...form, payment_method }); }} />
    <View style={styles.field}><Text style={[styles.label, { color: theme.muted }]}>Receipt reference / notes</Text><TextInput accessibilityLabel="Payment notes" editable={!saving} multiline value={form.notes} onChangeText={notes => onChange({ ...form, notes })} placeholder="Receipt number or payment details" placeholderTextColor={theme.muted} style={[styles.input, { minHeight: 88, paddingTop: 12, textAlignVertical: 'top', backgroundColor: theme.field, borderColor: theme.line, color: theme.text }]} /></View>
    <Text style={[styles.copy, { color: theme.muted }]}>Recording this payment credits the student's paid amount immediately.</Text>
  </ManagementSheet>;
}
const styles = StyleSheet.create({
  listCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, marginBottom: 12, gap: 14 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 12 }, identityText: { flex: 1, gap: 3 },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' }, photo: { width: '100%', height: '100%', borderRadius: 23 }, initials: { ...FONTS.bold, fontSize: 15 }, check: { position: 'absolute', right: -3, bottom: -3, width: 19, height: 19, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  name: { ...FONTS.bold, fontSize: 16 }, copy: { ...FONTS.regular, fontSize: 12, lineHeight: 18, flexShrink: 1 }, status: { ...FONTS.medium, fontSize: 11, lineHeight: 16, flexShrink: 1 },
  cardRule: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 13 }, totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, total: { flex: 1, minWidth: 76, gap: 5 }, label: { ...FONTS.medium, fontSize: 11, lineHeight: 16 }, amount: { ...FONTS.bold, fontSize: 14, lineHeight: 21 }, meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, gap: 12 }, heading: { ...FONTS.bold, fontSize: 15 }, progress: { height: 5, borderRadius: 3, overflow: 'hidden' }, receipt: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, link: { ...FONTS.medium, fontSize: 12, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 10 }, action: { flex: 1 }, primary: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, primaryText: { ...FONTS.bold, color: '#FFFFFF', fontSize: 13 }, secondary: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 11, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 7 }, input: { ...FONTS.regular, fontSize: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, minHeight: 46, paddingHorizontal: 12 },
});
