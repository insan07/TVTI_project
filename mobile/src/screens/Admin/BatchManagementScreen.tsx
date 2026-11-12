import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import useScrollAwareControls from '../../hooks/useScrollAwareControls';
import ScrollAwareControls from '../../components/shared/ScrollAwareControls';
import MainPageHeader from '../../components/shared/MainPageHeader';
import CustomDropdown from '../../components/shared/CustomDropdown';
import ManagementDialog from '../../components/shared/ManagementDialog';
import WhatsAppOptionsMenu from '../../components/shared/WhatsAppOptionsMenu';
import EnrolledStudentsSheet from '../../components/shared/EnrolledStudentsSheet';
import { usersSectionTheme } from '../../components/shared/usersSectionTheme';
import { floatingTabBarClearance } from '../../components/navigation/floatingTabBarLayout';
import { ManagementButton, ManagementEmpty, ManagementField, ManagementCard, ManagementSearchFilters, ManagementSheet, managementStyles as s } from '../../components/shared/CourseBatchUI';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dateKey = (value: any) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Asia/Colombo' }) : '';
const blank = () => ({ name: '', course_id: '', start_date: dateKey(new Date().toISOString()), end_date: '', capacity: '25', room: '', instructor_ids: [] as string[], status: 'active', schedule_json: { days: [] as string[], time: '' } });
type Notice = { title: string; message: string; type: 'success' | 'error' | 'warning' };
export default function BatchManagementScreen() {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark); const navigation = useNavigation<any>(); const route = useRoute<any>(); const insets = useSafeAreaInsets();
  const [batches, setBatches] = useState<any[]>([]), [courses, setCourses] = useState<any[]>([]), [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState('');
  const [courseId, setCourseId] = useState(route.params?.courseId || ''), [search, setSearch] = useState(''), [status, setStatus] = useState('all');
  const scrollControls = useScrollAwareControls(`${courseId}:${search}:${status}`);
  const [panel, setPanel] = useState<'form' | 'details' | null>(null), [selected, setSelected] = useState<any>(null), [details, setDetails] = useState<any>(null), [detailsLoading, setDetailsLoading] = useState(false), [detailsError, setDetailsError] = useState('');
  const [form, setForm] = useState(blank), [editing, setEditing] = useState<string | null>(null), [saving, setSaving] = useState(false), [notice, setNotice] = useState<Notice | null>(null), [deleteTarget, setDeleteTarget] = useState<any>(null);
  const request = useRef(0), detailRequest = useRef(0), savingRef = useRef(false);
  const [rosterBatch, setRosterBatch] = useState<any>(null);
  useEffect(() => { setCourseId(route.params?.courseId || ''); }, [route.params?.courseId]);
  const load = useCallback(async () => {
    const current = ++request.current; setError('');
    try { const [b, c, i] = await Promise.all([api.get('/admin/batches'), api.get('/admin/courses'), api.get('/admin/users?role=instructor')]); if (current === request.current) { setBatches(b.data); setCourses(c.data); setInstructors(i.data); } }
    catch (failure: any) { if (current === request.current) setError(failure.response?.data?.message || 'Batch data could not be loaded. Please try again.'); }
    finally { if (current === request.current) { setLoading(false); setRefreshing(false); } }
  }, []);
  useFocusEffect(useCallback(() => { void load(); return () => { request.current++; detailRequest.current++; }; }, [load]));
  const closePanel = () => { detailRequest.current++; setPanel(null); setNotice(null); };
  const openForm = (batch?: any) => {
    detailRequest.current++; setEditing(batch?._id || null); setNotice(null); setSelected(batch || null);
    setForm(batch ? { name: batch.name, course_id: batch.course_id?._id || batch.course_id, start_date: dateKey(batch.start_date), end_date: dateKey(batch.end_date), capacity: String(batch.capacity), room: batch.room || '', instructor_ids: (batch.instructor_ids || []).map((instructor: any) => instructor._id || instructor), status: batch.status, schedule_json: { days: Array.isArray(batch.schedule_json?.days) ? batch.schedule_json.days : [], time: batch.schedule_json?.time || '' } } : { ...blank(), course_id: courses.find(course => course._id === courseId && course.is_active)?._id || '' });
    setPanel('form');
  };
  const openDetails = async (batch: any) => {
    setSelected(batch); setDetails(null); setDetailsError(''); setDetailsLoading(true); setPanel('details'); const current = ++detailRequest.current;
    try { const res = await api.get(`/admin/batches/${batch._id}/details`); if (current === detailRequest.current) setDetails(res.data); }
    catch (failure: any) { if (current === detailRequest.current) setDetailsError(failure.response?.data?.message || 'Batch details could not be loaded.'); }
    finally { if (current === detailRequest.current) setDetailsLoading(false); }
  };
  const save = async () => {
    if (savingRef.current) return;
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!form.name.trim() || !form.course_id || !Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1 || !validDate(form.start_date) || !validDate(form.end_date) || form.end_date < form.start_date || !form.room.trim() || !form.schedule_json.days.length || !form.schedule_json.time.trim()) {
      setNotice({ title: 'Check batch details', message: 'Enter a name, course, valid dates, positive whole capacity, location and class schedule. Dates use YYYY-MM-DD and the end date must follow the start date.', type: 'error' }); return;
    }
    savingRef.current = true; setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), capacity: Number(form.capacity), start_date: `${form.start_date}T00:00:00+05:30`, end_date: `${form.end_date}T23:59:59.999+05:30` };
      const res = editing ? await api.put(`/admin/batches/${editing}`, payload) : await api.post('/admin/batches', payload);
      setNotice({ title: editing ? 'Batch updated' : 'Batch created', message: res.data.notification_sent === false ? 'The batch is saved. Some notifications could not be delivered.' : 'The batch details and instructor assignments have been saved.', type: 'success' }); void load();
    } catch (failure: any) { setNotice({ title: 'Batch not saved', message: failure.response?.data?.message || 'Please try again. Your details are still here.', type: 'error' }); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const remove = async () => {
    if (savingRef.current || !deleteTarget) return; savingRef.current = true; setSaving(true);
    try { await api.delete(`/admin/batches/${deleteTarget._id}/delete`); setDeleteTarget(null); setNotice({ title: 'Batch deleted', message: 'The empty batch has been deleted.', type: 'success' }); void load(); }
    catch (failure: any) { setDeleteTarget(null); setNotice({ title: 'Batch not deleted', message: failure.response?.data?.message || 'Please try again.', type: 'error' }); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const enroll = (batch: any) => { closePanel(); navigation.navigate('EnrollStudent', { batchId: batch._id }); };
  const canEnroll = (batch: any) => batch?.status === 'active' && courses.some(course => course._id === (batch.course_id?._id || batch.course_id) && course.is_active) && (batch.enrolled_count || 0) < batch.capacity;
  const visible = batches.filter(batch => (!courseId || batch.course_id?._id === courseId) && `${batch.name} ${batch.course_id?.title || ''} ${(batch.instructor_ids || []).map((i: any) => i.name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()) && (status === 'all' || (status === 'full' ? batch.status === 'active' && batch.enrolled_count >= batch.capacity : batch.status === status)));
  const feedback = <ManagementDialog visible={!!notice} inline={!!panel} title={notice?.title || ''} message={notice?.message || ''} type={notice?.type} confirmText={notice?.type === 'success' ? 'Done' : 'OK'} onConfirm={() => { if (notice?.type === 'success') closePanel(); else setNotice(null); }} />;
  const deleteConfirmation = <ManagementDialog visible={!!deleteTarget} inline={!!panel} title="Delete empty batch?" message={`Delete ${deleteTarget?.name || 'this batch'}? Only batches without student or teaching records can be deleted. Complete or cancel other batches to retain their history.`} type="danger" confirmText="Delete" busy={saving} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />;
  const row = (label: string, value: any) => <View key={label} style={{ marginBottom: 12 }}><Text style={[s.hint, { color: theme.muted }]}>{label}</Text><Text style={[s.copy, { color: theme.text }]}>{value || 'Not set'}</Text></View>;
  return <SafeAreaView edges={['top']} style={[s.page, { backgroundColor: theme.background }]}>
    <MainPageHeader safeAreaHandled title="Batches" showBack plainBack containerStyle={{ maxWidth: 860 }} />
    <ScrollAwareControls controls={scrollControls}><View style={[s.content, s.controls]}><CustomDropdown appearance="management" placeholder="All courses" selectedValue={courseId} onValueChange={setCourseId} containerStyle={{ marginBottom: 0 }} items={[{ label: 'All courses', value: '' }, ...courses.map(course => ({ label: course.title, value: course._id, subtext: course.is_active ? undefined : 'Archived course' }))]} /><ManagementSearchFilters value={search} onChangeText={setSearch} placeholder="Search batch or instructor" label="Batch filters" status={status} onStatusChange={setStatus} options={['all', 'active', 'full', 'completed', 'cancelled'].map(value => ({ label: value[0].toUpperCase() + value.slice(1), value, count: batches.filter(batch => (!courseId || batch.course_id?._id === courseId) && (value === 'all' || (value === 'full' ? batch.status === 'active' && batch.enrolled_count >= batch.capacity : batch.status === value))).length }))} /></View></ScrollAwareControls>
    {loading ? <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} /> : <FlatList onScroll={scrollControls.onScroll} scrollEventThrottle={16} style={{ flex: 1 }} data={visible} keyExtractor={batch => batch._id} contentContainerStyle={[s.content, { flexGrow: 1, paddingBottom: floatingTabBarClearance(insets.bottom) + 84 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} colors={[theme.accent]} tintColor={theme.accent} />}
      ListHeaderComponent={<><ManagementCard title="Batch overview"><View style={[s.metrics, { paddingVertical: 0 }]}>{[['Batches', batches.filter(batch => !courseId || batch.course_id?._id === courseId).length], ['Active', batches.filter(batch => (!courseId || batch.course_id?._id === courseId) && batch.status === 'active').length], ['Enrolled', batches.filter(batch => !courseId || batch.course_id?._id === courseId).reduce((total, batch) => total + (batch.enrolled_count || 0), 0)]].map(([label, value]) => <View key={label} style={s.metric}><Text style={[s.metricValue, { color: theme.text }]}>{value}</Text><Text style={[s.metricLabel, { color: theme.muted }]}>{label}</Text></View>)}</View></ManagementCard>{!!error && batches.length > 0 && <Text accessibilityRole="alert" style={[s.copy, { color: theme.accent, marginBottom: 16 }]}>{error}</Text>}</>}
      renderItem={({ item }) => <ManagementCard title={item.name} headerAction={<WhatsAppOptionsMenu accessibilityLabel={`Options for ${item.name}`} triggerIconColor={theme.text} triggerIconSize={21} triggerStyle={s.iconButton} options={[{ id: 'edit', label: 'Edit batch', onPress: () => openForm(item) }, { id: 'students', label: 'Enrolled students', onPress: () => setRosterBatch(item) }, { id: 'delete', label: 'Delete empty batch', destructive: true, onPress: () => setDeleteTarget(item) }]} />}>
        <View style={s.recordContent}><View style={[s.row, s.between]}><Text style={[s.copy, s.grow, { color: theme.accent }]}>{item.course_id?.title || 'Course unavailable'}</Text><Text style={[s.badge, { backgroundColor: item.status === 'active' ? theme.accentSoft : theme.field, color: item.status === 'active' ? theme.accent : theme.muted }]}>{item.status}</Text></View>
          <Text style={[s.copy, { color: theme.muted }]}>{dateKey(item.start_date)} – {dateKey(item.end_date)}</Text><Text style={[s.copy, { color: theme.text }]}>{item.schedule_json?.days?.join(', ') || 'Days not set'} · {item.schedule_json?.time || 'Time not set'}</Text><Text style={[s.copy, { color: theme.muted }]}>{(item.instructor_ids || []).map((i: any) => i.name).join(', ') || 'No instructors assigned'}{item.room ? ` · ${item.room}` : ''}</Text>
          <View style={[s.row, s.between]}><Text style={[s.copy, { color: theme.text }]}>{item.enrolled_count || 0} / {item.capacity} enrolled</Text>{item.status === 'active' && item.enrolled_count >= item.capacity && <Text style={s.link}>Full</Text>}</View>
          <View style={[s.row, s.between, s.divider, { borderColor: theme.line }]}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${item.name}`} onPress={() => void openDetails(item)} style={[s.row, { minHeight: 44 }]}><Text style={s.link}>View details</Text><Icon name="chevron-forward" size={16} color={theme.accent} /></TouchableOpacity><ManagementButton title="Enroll students" accessibilityLabel={`Enroll students in ${item.name}`} secondary disabled={!canEnroll(item)} onPress={() => enroll(item)} /></View>
        </View>
      </ManagementCard>}
      ListEmptyComponent={<ManagementEmpty title={error ? 'Unable to load batches' : 'No matching batches'} message={error || 'Create a batch with the + button, or adjust your filters.'} retry={error ? () => { setLoading(true); void load(); } : undefined} />} />}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add batch" onPress={() => openForm()} disabled={loading || !!error} style={[s.fab, { bottom: floatingTabBarClearance(insets.bottom) + 12, opacity: loading || error ? 0.5 : 1 }]}><Icon name="add" size={28} color="#FFFFFF" /></TouchableOpacity>
    <ManagementSheet visible={!!panel} title={panel === 'form' ? editing ? 'Edit batch' : 'Create batch' : selected?.name || 'Batch details'} busy={saving || !!notice || !!deleteTarget} onClose={closePanel}
      footer={panel === 'form' ? <><ManagementButton title="Cancel" secondary disabled={saving} onPress={closePanel} /><ManagementButton title="Save batch" busy={saving} onPress={save} /></> : panel === 'details' && details ? <ManagementButton title="Enroll students" disabled={!canEnroll({ ...details.batch, enrolled_count: details.enrolled_count })} onPress={() => enroll(details.batch)} /> : undefined}
      overlay={!!panel ? <>{feedback}{deleteConfirmation}</> : undefined}>
      {panel === 'form' && <>
        <ManagementField label="Batch name" value={form.name} onChangeText={name => setForm({ ...form, name })} />
        <CustomDropdown appearance="management" label="Course" placeholder="Select course" selectedValue={form.course_id} onValueChange={course_id => setForm({ ...form, course_id })} items={courses.filter(course => course.is_active || course._id === form.course_id).map(course => ({ label: course.title, value: course._id, subtext: course.is_active ? undefined : 'Archived · existing batch only' }))} />
        <ManagementField label="Start date" placeholder="YYYY-MM-DD" value={form.start_date} onChangeText={start_date => setForm({ ...form, start_date })} /><ManagementField label="End date" placeholder="YYYY-MM-DD" value={form.end_date} onChangeText={end_date => setForm({ ...form, end_date })} hint="Dates use institute time (Sri Lanka)." />
        <ManagementField label="Capacity" numeric value={form.capacity} onChangeText={capacity => setForm({ ...form, capacity })} />
        <Text style={[s.label, { color: theme.text }]}>Assigned instructors</Text><Text style={[s.hint, { color: theme.muted }]}>Select every instructor teaching this batch.</Text>
        {instructors.filter(instructor => instructor.is_active || form.instructor_ids.includes(instructor._id)).map(instructor => <TouchableOpacity key={instructor._id} accessibilityRole="checkbox" accessibilityLabel={`Assign ${instructor.name}`} aria-checked={form.instructor_ids.includes(instructor._id)} accessibilityState={{ checked: form.instructor_ids.includes(instructor._id) }} onPress={() => setForm({ ...form, instructor_ids: form.instructor_ids.includes(instructor._id) ? form.instructor_ids.filter(id => id !== instructor._id) : [...form.instructor_ids, instructor._id] })} style={[s.choice, { borderColor: theme.line }]}><Icon name={form.instructor_ids.includes(instructor._id) ? 'checkbox' : 'square-outline'} size={23} color={theme.accent} /><View style={s.grow}><Text style={[s.copy, { color: theme.text }]}>{instructor.name}{!instructor.is_active ? ' (inactive)' : ''}</Text><Text style={[s.hint, { color: theme.muted }]}>{instructor.email}</Text></View></TouchableOpacity>)}
        <Text style={[s.label, { color: theme.text, marginTop: 18 }]}>Class days</Text><View style={[s.row, { marginBottom: 16 }]}>{days.map(day => <TouchableOpacity key={day} accessibilityRole="checkbox" accessibilityLabel={day} aria-checked={form.schedule_json.days.includes(day)} accessibilityState={{ checked: form.schedule_json.days.includes(day) }} onPress={() => setForm({ ...form, schedule_json: { ...form.schedule_json, days: form.schedule_json.days.includes(day) ? form.schedule_json.days.filter(value => value !== day) : [...form.schedule_json.days, day] } })} style={[s.filter, form.schedule_json.days.includes(day) && s.filterActive]}><Text style={[s.filterText, form.schedule_json.days.includes(day) && { color: '#FFFFFF' }]}>{day}</Text></TouchableOpacity>)}</View>
        <ManagementField label="Class time" placeholder="09:00 - 12:00" value={form.schedule_json.time} onChangeText={time => setForm({ ...form, schedule_json: { ...form.schedule_json, time } })} hint="Use 24-hour time, or 9:00 AM - 12:00 PM." /><ManagementField label="Room or location" value={form.room} onChangeText={room => setForm({ ...form, room })} />
        <CustomDropdown appearance="management" label="Batch status" selectedValue={form.status} onValueChange={status => setForm({ ...form, status })} items={['active', 'completed', 'cancelled'].map(value => ({ label: value[0].toUpperCase() + value.slice(1), value }))} />
        <Text style={[s.hint, { color: theme.muted }]}>Only active batches appear in current schedules and accept enrollment. Resolve upcoming practical bookings before closing a batch.</Text>
      </>}
      {panel === 'details' && (detailsLoading ? <ActivityIndicator color={theme.accent} /> : detailsError ? <ManagementEmpty title="Unable to load batch" message={detailsError} retry={() => void openDetails(selected)} /> : details ? <>
        <ManagementCard title="Batch information"><View style={s.recordContent}>{row('Course', details.batch.course_id?.title)}{row('Status', details.batch.status)}{row('Dates', `${dateKey(details.batch.start_date)} – ${dateKey(details.batch.end_date)}`)}{row('Class schedule', `${details.batch.schedule_json?.days?.join(', ') || ''} · ${details.batch.schedule_json?.time || ''}`)}{row('Location', details.batch.room)}{row('Instructors', details.batch.instructor_ids.map((i: any) => i.name).join(', '))}{row('Enrollment', `${details.enrolled_count} / ${details.batch.capacity}`)}</View></ManagementCard>
        <ManagementCard title={`Student roster (${details.enrollments?.length || 0})`}><View style={s.recordContent}>{details.enrollments?.length ? details.enrollments.map((entry: any) => <View key={entry._id} style={[s.divider, { borderColor: theme.line }]}><Text style={[s.title, { color: theme.text }]}>{entry.student_id?.name || 'Student unavailable'}</Text><Text style={[s.copy, { color: theme.muted }]}>{entry.student_id?.registration_number || entry.student_id?.index_number || entry.student_id?.email || ''}</Text><Text style={[s.hint, { color: theme.accent }]}>{entry.status}</Text></View>) : <Text style={[s.copy, { color: theme.muted }]}>No students assigned yet.</Text>}</View></ManagementCard>
        <ManagementCard title="Teaching records"><View style={s.recordContent}>{row('Uploads', details.videos?.length || '0')}{row('Assessment results', details.results?.length || '0')}{details.videos?.map((video: any) => <View key={video._id}>{row(video.content_type === 'material' ? 'Document' : 'Video', video.title)}</View>)}</View></ManagementCard>
      </> : null)}
    </ManagementSheet>
    {!panel && <>{feedback}{deleteConfirmation}</>}
    {!!rosterBatch && <EnrolledStudentsSheet scope="batch" id={rosterBatch._id} name={rosterBatch.name} onClose={() => setRosterBatch(null)} />}
  </SafeAreaView>;
}
