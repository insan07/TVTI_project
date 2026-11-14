import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { KeyboardTextInput as TextInput } from './KeyboardForm';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';
import api from '../../services/api';
import { API_URL } from '../../config/constants';
import ManagementSheet from './ManagementSheet';
import PaymentSummaryCard from './PaymentSummaryCard';
import CustomDropdown from './CustomDropdown';
import { money, paymentSummary, paymentProjection } from '../../utils/paymentSummary';

export default function StudentPayments({ visible, profile, onClose, onUpdated }: { visible: boolean; profile: any; onClose: () => void; onUpdated: () => void }) {
  const { isDark } = useTheme(), theme = usersSectionTheme(isDark);
  const [data, setData] = useState<any>(null), [loading, setLoading] = useState(false), [upload, setUpload] = useState(false);
  const [amount, setAmount] = useState(''), [method, setMethod] = useState('bank_transfer'), [notes, setNotes] = useState('');
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const request = useRef(0), busy = useRef(false);
  const summary = paymentSummary(data?.summary || profile?.payment_summary || profile?.payment_info);
  const projected = paymentProjection(summary, amount);
  const load = async () => {
    const current = ++request.current; setLoading(true); setError('');
    try { const result = await api.get('/students/payments/my-slips'); if (request.current === current) setData(result.data); }
    catch { if (request.current === current) setError('Payment details could not be loaded. Please refresh before submitting a receipt.'); }
    finally { if (request.current === current) setLoading(false); }
  };
  useEffect(() => { if (visible) { setUpload(false); setMessage(''); void load(); } return () => { request.current++; }; }, [visible]);
  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'application/pdf'], copyToCacheDirectory: true });
      if (result.canceled) return;
      if ((result.assets[0].size || 0) > 8 * 1024 * 1024) { setError('Choose a receipt no larger than 8 MB.'); return; }
      setAsset(result.assets[0]); setError('');
    } catch { setError('The receipt could not be selected. Please try again.'); }
  };
  const submit = async () => {
    if (busy.current) return;
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || Number(amount) <= 0) { setError('Enter a positive amount with at most two decimal places.'); return; }
    if (!asset) { setError('Choose your payment receipt.'); return; }
    busy.current = true; setSaving(true); setError(''); setMessage('');
    try {
      const body = new FormData(); body.append('amount', amount.trim()); body.append('payment_method', method); body.append('notes', notes.trim());
      if (Platform.OS === 'web') body.append('slip_file', asset.file || await (await fetch(asset.uri)).blob(), asset.name);
      else body.append('slip_file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' } as any);
      const result = await api.post('/students/payments/upload-slip', body);
      setData((previous: any) => ({ summary: result.data.summary, slips: [result.data.slip, ...(previous?.slips || [])] }));
      setUpload(false); setAmount(''); setNotes(''); setAsset(null);
      setMessage(`Receipt submitted for review. Confirmed balance due: ${money(result.data.summary.remaining_balance)}. Overpayment credit: ${money(result.data.summary.credit_balance)}. Your new receipt will be credited only after approval.`);
      onUpdated();
    } catch (failure: any) { setError(failure.response?.data?.message || 'The receipt could not be submitted. Your form is kept here so you can retry.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const button = (label: string, action: () => void, disabled = false) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={action} style={[styles.button, { backgroundColor: theme.accent, opacity: disabled ? 0.5 : 1 }]}><Text style={styles.buttonText}>{label}</Text></TouchableOpacity>;
  const field = [styles.input, { color: theme.text, borderColor: theme.line, backgroundColor: theme.field }];
  const receiptUrl = (url: string) => url.startsWith('/') ? API_URL.replace(/\/api\/?$/, '') + url : url;
  return <ManagementSheet visible={visible} title={upload ? 'Submit payment receipt' : 'My payments'} backLabel={upload ? 'Back to payment details' : 'Close payment details'} busy={saving}
    onClose={() => { if (upload) setUpload(false); else onClose(); }} footer={upload ? button(saving ? 'Submitting…' : 'Submit for review', () => { void submit(); }, saving || loading || !data) : button('Upload payment receipt', () => { setUpload(true); setMessage(''); }, loading || !data)}>
    <Text style={[styles.title, { color: theme.text }]}>{profile?.name}</Text>
    <Text style={[styles.copy, { color: theme.muted }]}>{profile?.registration_number || profile?.index_number} · {profile?.email}</Text>
    {loading && <ActivityIndicator color={theme.accent} />}
    {!!error && <Text accessibilityRole="alert" style={[styles.copy, { color: '#DC2626' }]}>{error}</Text>}
    {!!message && <Text accessibilityRole="alert" style={[styles.copy, { color: theme.accent }]}>{message}</Text>}
    {button('Refresh payment details', () => { void load(); }, saving || loading)}
    <PaymentSummaryCard summary={summary} />
    {upload ? <>
      <Text style={[styles.title, { color: theme.text }]}>Receipt details</Text>
      <Text style={[styles.copy, { color: theme.muted }]}>Amount paid on this receipt (LKR)</Text>
      <TextInput accessibilityLabel="Receipt amount" editable={!saving} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={theme.muted} style={field} />
      <CustomDropdown appearance="management" label="Payment method" selectedValue={method} items={[{ value: 'bank_transfer', label: 'Bank deposit' }, { value: 'online_transfer', label: 'Online transfer' }, { value: 'physical_cash', label: 'Cash at counter' }]} onValueChange={value => { if (!saving) setMethod(value); }} />
      <Text style={[styles.copy, { color: theme.muted }]}>Receipt reference / notes (optional)</Text>
      <TextInput accessibilityLabel="Receipt reference or notes" editable={!saving} value={notes} onChangeText={setNotes} multiline style={field} />
      {button(asset ? 'Change receipt' : 'Choose receipt', () => { void pick(); }, saving)}
      <Text style={[styles.copy, { color: theme.muted }]}>{asset?.name || 'JPG, PNG or PDF · maximum 8 MB'}</Text>
      {!!asset && asset.mimeType?.startsWith('image/') && <Image source={{ uri: asset.uri }} resizeMode="contain" style={styles.preview} />}
      {Number(amount) > 0 && <PaymentSummaryCard title="Estimate after this receipt is approved" summary={{ ...projected, pending_amount: 0, pending_slips_count: 0 }} />}
      <Text style={[styles.copy, { color: theme.muted }]}>The estimate includes this receipt only. Pending receipts are not confirmed payments. Submission does not immediately reduce your balance.</Text>
    </> : <>
      <Text style={[styles.title, { color: theme.text }]}>Payment history ({data?.slips?.length || 0})</Text>
      {!loading && !data?.slips?.length && <Text style={[styles.copy, { color: theme.muted }]}>No payment receipts submitted yet.</Text>}
      {data?.slips?.map((slip: any) => <View key={slip._id} style={[styles.receipt, { borderColor: theme.line }]}>
        <Text style={[styles.title, { color: theme.text }]}>{money(slip.amount)} · {slip.status === 'verified' ? 'Approved & credited' : slip.status === 'rejected' ? 'Rejected' : 'Awaiting review'}</Text>
        <Text style={[styles.copy, { color: theme.muted }]}>{slip.payment_method?.replace(/_/g, ' ')} · {new Date(slip.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })}</Text>
        {!!slip.notes && <Text style={[styles.copy, { color: theme.text }]}>{slip.notes}</Text>}
        {!!slip.rejection_reason && <Text style={[styles.copy, { color: '#DC2626' }]}>{slip.rejection_reason}</Text>}
        {!!slip.slip_url && button('Open receipt', () => { void Linking.openURL(receiptUrl(slip.slip_url)).catch(() => setError('The receipt could not be opened.')); })}
      </View>)}
    </>}
  </ManagementSheet>;
}
const styles = StyleSheet.create({ title: { fontSize: 15, fontWeight: '700' }, copy: { fontSize: 12, lineHeight: 19 }, input: { borderWidth: 1, borderRadius: 10, minHeight: 48, padding: 12 }, button: { minHeight: 44, padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, buttonText: { fontWeight: '700', color: '#FFFFFF', fontSize: 13 }, preview: { height: 150, width: '100%' }, receipt: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 } });
