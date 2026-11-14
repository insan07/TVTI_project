import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { isPracticalExpired, practicalBookingClosed } from '../../utils/practicalTime';
import usePracticalClock from '../../hooks/usePracticalClock';
import { ManagementButton, ManagementEmpty, ManagementSearch, ManagementSheet } from '../shared/CourseBatchUI';
import ManagementDialog from '../shared/ManagementDialog';
import UserAvatar from '../shared/UserAvatar';
import { usersSectionTheme } from '../shared/usersSectionTheme';

type Action = { title: string; message: string; label: string; run: () => Promise<unknown> };

/** One roster and assignment flow for both staff roles, without stacked native modals. */
export default function SlotStudentsSheet({ slot, admin = false, onClose, onChanged }: { slot: any; admin?: boolean; onClose: () => void; onChanged: () => void }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  const now = usePracticalClock([slot]);
  const expired = isPracticalExpired(slot, now);
  const [bookings, setBookings] = useState<any[]>([]), [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(false), [busy, setBusy] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);
  const request = useRef(0), pending = useRef(false);
  const base = `/instructors/practice-slots/${slot._id}/bookings`;
  const batchId = String(slot.batch_id?._id || slot.batch_id);
  const load = useCallback(async () => {
    const current = ++request.current; setLoading(true); setError('');
    try {
      const [roster, enrollment] = await Promise.all([
        api.get(`/instructors/practice-slots/${slot._id}/bookings`),
        api.get(admin ? `/admin/batches/${batchId}/details` : '/instructors/my-students', admin ? undefined : { params: { batch_id: batchId } }),
      ]);
      if (current !== request.current) return;
      setBookings(roster.data || []);
      const entries = admin ? enrollment.data.enrollments : enrollment.data;
      const unique = new Map<string, any>();
      (entries || []).filter((entry: any) => entry.status === 'active').forEach((entry: any) => {
        if (entry.student_id?._id) unique.set(entry.student_id._id, entry.student_id);
      });
      setStudents([...unique.values()].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (failure: any) {
      if (current === request.current) setError(failure.response?.data?.message || 'Students could not be loaded. Please try again.');
    } finally { if (current === request.current) setLoading(false); }
  }, [slot._id, batchId, admin]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  const perform = async () => {
    if (!action || pending.current) return;
    pending.current = true; setBusy(true);
    try {
      await action.run(); setAction(null);
      await load(); onChanged();
      setNotice({ title: 'Slot updated', message: 'The student booking has been updated successfully.', type: 'success' });
    } catch (failure: any) {
      setAction(null); setNotice({ title: 'Unable to update booking', message: failure.response?.data?.message || 'Please try again.', type: 'error' });
    } finally { pending.current = false; setBusy(false); }
  };
  const enrolled = new Set(bookings.map(booking => String(booking.student_id?._id || booking.student_id)));
  const candidates = students.filter(student => !enrolled.has(student._id));
  const matches = (student: any) => `${student?.name || ''} ${student?.registration_number || student?.index_number || ''} ${student?.email || ''}`.toLowerCase().includes(search.trim().toLowerCase());
  const rows = assigning ? candidates.filter(matches) : bookings.filter(booking => matches(booking.student_id));
  const seats = Math.max(0, slot.max_students - bookings.length);
  const canAssign = !expired && !practicalBookingClosed(slot, now) && slot.is_open && seats > 0;
  return <ManagementSheet visible spaced title={assigning ? 'Assign student' : 'Enrolled students'} busy={busy} onClose={onClose}
    footer={<><Text style={{ color: theme.muted, flex: 1 }}>{bookings.length} / {slot.max_students} booked · {seats} seats left</Text><ManagementButton title={assigning ? 'Back to roster' : 'Done'} secondary onPress={() => { if (assigning) { setAssigning(false); setSearch(''); } else onClose(); }} disabled={busy} /></>}
    overlay={<><ManagementDialog inline visible={!!action} title={action?.title || ''} message={action?.message || ''} confirmText={action?.label} busy={busy} onConfirm={() => { void perform(); }} onCancel={() => setAction(null)} /><ManagementDialog inline visible={!!notice} title={notice?.title || ''} message={notice?.message || ''} type={notice?.type} onConfirm={() => setNotice(null)} /></>}>
    <View style={[styles.summary, { backgroundColor: theme.field, borderColor: theme.line }]}>
      <Text style={[styles.title, { color: theme.text }]}>{slot.batch_id?.course_id?.title || 'Practical session'}</Text>
      <Text style={{ color: theme.muted }}>{slot.batch_id?.name} · {slot.day_of_week} · {slot.start_time}–{slot.end_time}</Text>
      {!!slot.location && <Text style={{ color: theme.muted }}>{slot.location}</Text>}
    </View>
    {!assigning && canAssign && <ManagementButton title="Assign student" onPress={() => { setAssigning(true); setSearch(''); }} />}
    {expired && <Text style={{ color: theme.muted }}>This session has ended. The roster is available to view.</Text>}
    <ManagementSearch value={search} onChangeText={setSearch} placeholder="Search name or registration number" />
    {loading ? <ActivityIndicator color={theme.accent} /> : error ? <ManagementEmpty title="Unable to load students" message={error} retry={() => { void load(); }} />
      : rows.length === 0 ? <ManagementEmpty title={assigning ? 'No eligible students' : 'No students found'} message={assigning ? 'All active students in this batch are assigned, or no students match your search.' : 'No bookings match your search.'} />
      : rows.map(row => {
        const student = assigning ? row : row.student_id;
        return <View key={row._id} style={[styles.row, { borderColor: theme.line, backgroundColor: theme.field }]}>
          <View style={styles.identity}><UserAvatar user={student} /><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.title, { color: theme.text }]}>{student?.name || 'Student'}</Text><Text style={{ color: theme.muted }}>{student?.registration_number || student?.index_number || student?.email || 'No registration number'}</Text></View></View>
          {row.status === 'cancellation_requested' && <Text style={{ color: theme.accent }}>Cancellation requested{row.cancellation_reason ? `: ${row.cancellation_reason}` : ''}</Text>}
          <View style={styles.actions}>
            {assigning ? <ManagementButton title="Assign to slot" disabled={!canAssign || busy} onPress={() => setAction({ title: 'Assign student?', message: `Book this practical session for ${student.name}?`, label: 'Assign student', run: () => api.post(base, { student_id: student._id }) })} />
              : !expired && (row.status === 'cancellation_requested' ? <>
                <ManagementButton title="Approve cancellation" disabled={busy} onPress={() => setAction({ title: 'Approve cancellation?', message: `Cancel ${student?.name || 'this student'}’s booking and release their seat?`, label: 'Approve', run: () => api.post(`${base}/${row._id}/approve-cancellation`) })} />
                <ManagementButton title="Keep booking" secondary disabled={busy} onPress={() => setAction({ title: 'Keep booking?', message: 'Decline the cancellation request and keep this booking active?', label: 'Keep booking', run: () => api.post(`${base}/${row._id}/reject-cancellation`) })} />
              </> : <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${student?.name || 'student'} from slot`} disabled={busy} style={styles.remove} onPress={() => setAction({ title: 'Remove student?', message: `Remove ${student?.name || 'this student'} from this practical session?`, label: 'Remove', run: () => api.delete(`${base}/${row._id}`) })}><Text style={{ color: theme.accent, fontWeight: '600' }}>Remove from slot</Text></TouchableOpacity>)}
          </View>
        </View>;
      })}
  </ManagementSheet>;
}
const styles = StyleSheet.create({
  summary: { padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 6 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 21 },
  row: { padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  remove: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
