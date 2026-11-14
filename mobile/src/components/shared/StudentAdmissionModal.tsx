import { KeyboardAvoidingView, KeyboardScrollView as ScrollView, KeyboardTextInput as TextInput } from './KeyboardForm';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import api from '../../services/api';
import { FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';
import CourseBatchAssignments from './CourseBatchAssignments';
import ManagementDialog from './ManagementDialog';
import CustomDropdown from './CustomDropdown';
import AdmissionImageField from './AdmissionImageField';
import PaymentSummaryCard from './PaymentSummaryCard';

export type AdmissionTarget = { kind: 'create' } | { kind: 'approve'; id: string; name: string };
export default function StudentAdmissionModal({ target, onClose, onSaved }: { target: AdmissionTarget; onClose: () => void; onSaved: (data: any) => void }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  const creating = target.kind === 'create';
  const [form, setForm] = useState({ name: '', email: '', phone: '', nic: '', dob: '', gender: '', address: '', guardian_name: '', guardian_relationship: 'Father', guardian_phone: '', guardian_occupation: '', education_level: 'O/L Completed', grade_level: '', school_name: '', student_photo: '', payment_method: 'physical_pay', payment_slip: '', total: '', paid: '0' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [courseIds, setCourseIds] = useState<string[]>([]), [batchIds, setBatchIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false), [confirming, setConfirming] = useState(false), [error, setError] = useState('');
  const submit = async () => {
    setConfirming(false); setSaving(true);
    try {
      const data = creating ? await api.post('/admin/users/student', {
        name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), nic: form.nic.trim() || undefined,
        date_of_birth: form.dob.trim() || undefined, gender: form.gender || undefined, address: form.address.trim() || undefined,
        guardian: { name: form.guardian_name.trim(), relationship: form.guardian_relationship, phone: form.guardian_phone.trim(), occupation: form.guardian_occupation.trim() },
        educational_qualification: { highest_level: form.education_level, grade_level: form.education_level === 'Below O/L' ? form.grade_level.trim() : undefined, institute_name: form.school_name.trim() },
        student_photo: form.student_photo || undefined, payment_method: form.payment_method, payment_slip: form.payment_method === 'bank_transfer' ? form.payment_slip || undefined : undefined,
        terms_accepted: termsAccepted, course_ids: courseIds, batch_ids: batchIds, total_course_fee: form.total === '' ? undefined : Number(form.total), amount_paid: Number(form.paid)
      })
        : await api.put(`/admin/users/${target.id}/approve`, { assigned_course_ids: courseIds, assigned_batch_ids: batchIds });
      onSaved(data.data);
    } catch (failure: any) { setError(failure.response?.data?.message || 'The student could not be saved. Please try again.'); }
    finally { setSaving(false); }
  };
  const review = () => {
    if (creating && (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || !form.phone.trim())) { setError('Enter the student name, a valid email and phone.'); return; }
    if (creating && form.dob && (!/^\d{4}-\d{2}-\d{2}$/.test(form.dob) || !Number.isFinite(Date.parse(form.dob)) || new Date(form.dob).toISOString().slice(0, 10) !== form.dob || Date.parse(form.dob) > Date.now())) { setError('Enter a valid date of birth as YYYY-MM-DD.'); return; }
    if (creating && form.payment_method === 'bank_transfer' && !form.payment_slip) { setError('Choose the bank deposit receipt image.'); return; }
    if (!courseIds.length || batchIds.length !== courseIds.length) { setError('Choose a course and one batch for every selected course.'); return; }
    if (creating && ((!Number.isFinite(Number(form.paid)) || Number(form.paid) < 0) || form.total !== '' && (!Number.isFinite(Number(form.total)) || Number(form.total) < 0))) { setError('Enter valid, non-negative fees and payments.'); return; }
    setConfirming(true);
  };
  const dropdown = (key: keyof typeof form, label: string, values: string[]) => <CustomDropdown appearance="management" label={label} selectedValue={form[key]} placeholder={`Select ${label.toLowerCase()}`} items={values.map(value => ({ value, label: value }))} onValueChange={value => { if (!saving) setForm(current => ({ ...current, [key]: value })); }} />;
  const image = (key: 'student_photo' | 'payment_slip', label: string) => <AdmissionImageField label={label} value={form[key]} disabled={saving} onError={setError} onChange={value => setForm(current => ({ ...current, [key]: value }))} />;
  const field = (key: keyof typeof form, label: string, keyboardType: 'default' | 'email-address' | 'phone-pad' | 'numeric' = 'default', placeholder?: string) => <View style={styles.field}>
    <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
    <TextInput accessibilityLabel={`Student ${key}`} value={form[key]} editable={!saving} onChangeText={value => setForm(current => ({ ...current, [key]: value }))} keyboardType={keyboardType}
      autoCapitalize={key === 'email' ? 'none' : 'sentences'} placeholder={placeholder || label} placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.line }]} />
  </View>;
  return <>
    <Modal visible transparent animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <View style={[styles.header, { borderBottomColor: theme.line }]}>
            <Text style={[styles.title, { color: theme.text }]}>{creating ? 'Add Student' : 'Approve and Assign Batches'}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close student form" disabled={saving} onPress={onClose} style={styles.close}><Icon name="close" size={22} color={theme.text} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {creating ? <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Details</Text>
              {field('name', 'Full name *')}{field('email', 'Email *', 'email-address')}{field('phone', 'Phone *', 'phone-pad')}{field('nic', 'NIC')}{field('dob', 'Date of birth', 'default', 'YYYY-MM-DD')}
              {dropdown('gender', 'Gender', ['Male', 'Female', 'Other'])}{field('address', 'Residential address')}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Parent / Guardian</Text>
              {field('guardian_name', 'Guardian name')}{dropdown('guardian_relationship', 'Relationship', ['Father', 'Mother', 'Guardian', 'Other'])}{field('guardian_phone', 'Guardian phone', 'phone-pad')}{field('guardian_occupation', 'Occupation')}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Education</Text>
              {dropdown('education_level', 'Highest education level', ['Below O/L', 'O/L Completed', 'A/L Completed', 'Diploma / Higher Ed', 'NVQ Certified', 'Other Qualification'])}
              {form.education_level === 'Below O/L' && field('grade_level', 'Grade / result')}{field('school_name', 'School / institute')}{image('student_photo', 'Student photo')}
            </> : <Text style={[styles.title, { color: theme.text }]}>{target.name}</Text>}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Courses and Batches</Text>
            <CourseBatchAssignments courseIds={courseIds} batchIds={batchIds} onCoursesChange={setCourseIds} onBatchesChange={setBatchIds} />
            {creating && <><Text style={[styles.sectionTitle, { color: theme.text }]}>Payment Details</Text>
              <CustomDropdown appearance="management" label="Registration payment method" selectedValue={form.payment_method} items={[{ value: 'physical_pay', label: 'Cash at counter' }, { value: 'bank_transfer', label: 'Bank deposit' }]} onValueChange={value => { if (!saving) setForm(current => ({ ...current, payment_method: value })); }} />
              {form.payment_method === 'bank_transfer' && image('payment_slip', 'Bank receipt')}
              {field('total', 'Total fee (LKR)', 'numeric', 'Defaults to the selected course fees')}{field('paid', 'Amount received (LKR)', 'numeric')}
              {form.total !== '' && <PaymentSummaryCard summary={{ total_fee: Number(form.total), amount_paid: Number(form.paid) }} />}
              <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="Registration terms accepted" accessibilityState={{ checked: termsAccepted }} disabled={saving} onPress={() => setTermsAccepted(value => !value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}><Icon name={termsAccepted ? 'checkbox' : 'square-outline'} size={22} color={termsAccepted ? theme.accent : theme.muted} /><Text style={[styles.label, { color: theme.text, flex: 1 }]}>Student's registration consent recorded</Text></TouchableOpacity>
            </>}
          </ScrollView>
          <View style={[styles.actions, { borderTopColor: theme.line }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel student form" disabled={saving} onPress={onClose} style={[styles.button, { backgroundColor: theme.field, borderColor: theme.line }]}><Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={creating ? 'Create student' : 'Approve and assign student'} disabled={saving} onPress={review} style={[styles.button, { backgroundColor: theme.accent, borderColor: theme.accent }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{creating ? 'Create student' : 'Approve and assign'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <ManagementDialog visible={confirming} title={creating ? 'Create student?' : 'Approve student?'} message={`${creating ? 'Create the account' : 'Approve the student'} and assign ${batchIds.length} selected ${batchIds.length === 1 ? 'batch' : 'batches'}? Initial login details will be generated.`} confirmText={creating ? 'Create and assign' : 'Confirm approval'} onCancel={() => setConfirming(false)} onConfirm={() => { void submit(); }} />
    <ManagementDialog visible={!!error} title="Unable to continue" message={error} type="error" onConfirm={() => setError('')} />
  </>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 650, maxHeight: '90%', borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between', paddingLeft: 18, paddingRight: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { ...FONTS.bold, fontSize: 18, lineHeight: 25, flexShrink: 1 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, body: { padding: 18, gap: 14 },
  field: { gap: 6 }, label: { ...FONTS.medium, fontSize: 12 }, input: { ...FONTS.regular, fontSize: 14, minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 }, sectionTitle: { ...FONTS.bold, fontSize: 16, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: StyleSheet.hairlineWidth }, button: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 }, buttonText: { ...FONTS.semiBold, fontSize: 13, textAlign: 'center' },
});
