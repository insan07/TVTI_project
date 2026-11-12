import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import useScrollAwareControls from '../../hooks/useScrollAwareControls';
import ScrollAwareControls from '../../components/shared/ScrollAwareControls';
import MainPageHeader from '../../components/shared/MainPageHeader';
import ManagementDialog from '../../components/shared/ManagementDialog';
import WhatsAppOptionsMenu from '../../components/shared/WhatsAppOptionsMenu';
import EnrolledStudentsSheet from '../../components/shared/EnrolledStudentsSheet';
import { usersSectionTheme } from '../../components/shared/usersSectionTheme';
import { floatingTabBarClearance } from '../../components/navigation/floatingTabBarLayout';
import { ManagementButton, ManagementEmpty, ManagementField, ManagementCard, ManagementSearchFilters, ManagementSheet, managementStyles as s } from '../../components/shared/CourseBatchUI';

const blank = { title: '', description: '', fee: '', duration_weeks: '', prerequisites: '', is_active: true };
type Notice = { title: string; message: string; type: 'success' | 'error' | 'warning' };
export default function CourseManagementScreen() {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark); const navigation = useNavigation<any>(); const insets = useSafeAreaInsets();
  const [courses, setCourses] = useState<any[]>([]), [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState('');
  const [search, setSearch] = useState(''), [status, setStatus] = useState('all');
  const scrollControls = useScrollAwareControls(`${search}:${status}`);
  const [form, setForm] = useState(blank), [editing, setEditing] = useState<string | null>(null), [formOpen, setFormOpen] = useState(false), [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null), [action, setAction] = useState<any>(null), [busy, setBusy] = useState(false);
  const [actionType, setActionType] = useState<'status' | 'delete'>('status');
  const [rosterCourse, setRosterCourse] = useState<any>(null);
  const request = useRef(0), savingRef = useRef(false), actionPending = useRef(false);
  const requestAction = (course: any, type: 'status' | 'delete') => { setActionType(type); setAction(course); };
  const load = useCallback(async () => {
    const current = ++request.current; setError('');
    try { const res = await api.get('/admin/courses'); if (current === request.current) setCourses(res.data); }
    catch (failure: any) { if (current === request.current) setError(failure.response?.data?.message || 'Courses could not be loaded.'); }
    finally { if (current === request.current) { setLoading(false); setRefreshing(false); } }
  }, []);
  useFocusEffect(useCallback(() => { void load(); return () => { request.current++; }; }, [load]));
  const openForm = (course?: any) => {
    setEditing(course?._id || null); setNotice(null);
    setForm(course ? { title: course.title, description: course.description, fee: String(course.fee), duration_weeks: String(course.duration_weeks), prerequisites: course.prerequisites || '', is_active: course.is_active } : { ...blank });
    setFormOpen(true);
  };
  const save = async () => {
    if (savingRef.current) return;
    if (!form.title.trim() || !form.description.trim() || form.fee.trim() === '' || !Number.isFinite(Number(form.fee)) || Number(form.fee) < 0 || !Number.isInteger(Number(form.duration_weeks)) || Number(form.duration_weeks) < 1) {
      setNotice({ title: 'Check course details', message: 'Enter a title, description, valid fee and a positive whole number of weeks.', type: 'error' }); return;
    }
    savingRef.current = true; setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), description: form.description.trim(), fee: Number(form.fee), duration_weeks: Number(form.duration_weeks) };
      if (editing) await api.put(`/admin/courses/${editing}`, payload); else await api.post('/admin/courses', payload);
      setNotice({ title: editing ? 'Course updated' : 'Course created', message: 'The course details have been saved.', type: 'success' }); void load();
    } catch (failure: any) { setNotice({ title: 'Course not saved', message: failure.response?.data?.message || 'Please try again. Your details are still here.', type: 'error' }); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const confirmAction = async () => {
    if (actionPending.current || !action) return; actionPending.current = true; setBusy(true);
    try {
      if (actionType === 'delete') await api.delete(`/admin/courses/${action._id}`);
      else if (action.is_active) await api.put(`/admin/courses/${action._id}/archive`); else await api.put(`/admin/courses/${action._id}`, { is_active: true });
      const archived = action.is_active; setAction(null); void load();
      setNotice(actionType === 'delete' ? { title: 'Course deleted', message: 'The unused course has been deleted.', type: 'success' } : { title: archived ? 'Course archived' : 'Course restored', message: archived ? 'New registrations and enrollment are closed. Existing batches and learning history are retained.' : 'The course is available for new batches and registrations.', type: 'success' });
    } catch (failure: any) { setAction(null); setNotice({ title: actionType === 'delete' ? 'Course not deleted' : 'Status not changed', message: failure.response?.data?.message || 'Please try again.', type: 'error' }); }
    finally { actionPending.current = false; setBusy(false); }
  };
  const visible = courses.filter(course => (status === 'all' || (status === 'active') === course.is_active) && `${course.title} ${course.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  const acknowledge = () => { if (notice?.type === 'success') setFormOpen(false); setNotice(null); };
  const feedback = <ManagementDialog visible={!!notice} title={notice?.title || ''} message={notice?.message || ''} type={notice?.type} confirmText={notice?.type === 'success' ? 'Done' : 'OK'} inline={formOpen} onConfirm={acknowledge} />;
  return <SafeAreaView edges={['top']} style={[s.page, { backgroundColor: theme.background }]}>
    <MainPageHeader safeAreaHandled title="Courses" containerStyle={{ maxWidth: 860 }} />
    <ScrollAwareControls controls={scrollControls}><View style={[s.content, s.controls]}><ManagementSearchFilters value={search} onChangeText={setSearch} placeholder="Search courses" label="Course filters" status={status} onStatusChange={setStatus} options={[{ label: 'All', value: 'all', count: courses.length }, { label: 'Active', value: 'active', count: courses.filter(course => course.is_active).length }, { label: 'Archived', value: 'archived', count: courses.filter(course => !course.is_active).length }]} /></View></ScrollAwareControls>
    {loading ? <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} /> : <FlatList onScroll={scrollControls.onScroll} scrollEventThrottle={16} style={{ flex: 1 }} data={visible} keyExtractor={course => course._id} contentContainerStyle={[s.content, { paddingBottom: floatingTabBarClearance(insets.bottom) + 84, flexGrow: 1 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} colors={[theme.accent]} tintColor={theme.accent} />}
      ListHeaderComponent={<><ManagementCard title="Course overview"><View style={[s.metrics, { paddingVertical: 0 }]}>{[['Courses', courses.length], ['Active', courses.filter(course => course.is_active).length], ['Batches', courses.reduce((total, course) => total + (course.batch_count || 0), 0)]].map(([label, value]) => <View key={label} style={s.metric}><Text style={[s.metricValue, { color: theme.text }]}>{value}</Text><Text style={[s.metricLabel, { color: theme.muted }]}>{label}</Text></View>)}</View></ManagementCard>{!!error && courses.length > 0 && <Text accessibilityRole="alert" style={[s.copy, { color: theme.accent, marginBottom: 16 }]}>{error}</Text>}</>}
      renderItem={({ item }) => <ManagementCard title={item.title} headerAction={<WhatsAppOptionsMenu accessibilityLabel={`Options for ${item.title}`} triggerIconColor={theme.text} triggerIconSize={21} triggerStyle={s.iconButton} options={[
        { id: 'edit', label: 'Edit course', onPress: () => openForm(item) },
        { id: 'students', label: 'Enrolled students', onPress: () => setRosterCourse(item) },
        { id: 'status', label: item.is_active ? 'Archive course' : 'Restore course', onPress: () => requestAction(item, 'status') },
        { id: 'delete', label: 'Delete course', destructive: true, onPress: () => requestAction(item, 'delete') },
      ]} />}>
        <View style={s.recordContent}><View style={[s.row, s.between]}><View style={[s.row, s.grow]}><Icon name="book-outline" size={18} color={theme.accent} /><Text style={[s.copy, { color: theme.text }]}>{item.duration_weeks} weeks</Text></View><Text style={[s.badge, { color: item.is_active ? theme.accent : theme.muted, backgroundColor: item.is_active ? theme.accentSoft : theme.field }]}>{item.is_active ? 'Active' : 'Archived'}</Text></View>
          <Text numberOfLines={3} style={[s.copy, { color: theme.muted }]}>{item.description}</Text>
          <View style={[s.row, s.between]}><Text style={[s.title, { color: theme.text }]}>LKR {Number(item.fee).toLocaleString()}</Text><Text style={[s.copy, { color: theme.muted }]}>{item.enrollment_count || 0} enrollments</Text></View>
          <View style={[s.row, s.between, s.divider, { borderColor: theme.line }]}><Text style={[s.copy, { color: theme.muted }]}>{item.batch_count || 0} {item.batch_count === 1 ? 'batch' : 'batches'}</Text><ManagementButton title="Batches" accessibilityLabel={`View batches for ${item.title}`} secondary onPress={() => navigation.navigate('Batches', { courseId: item._id })} /></View>
        </View>
      </ManagementCard>}
      ListEmptyComponent={<ManagementEmpty title={error ? 'Unable to load courses' : search || status !== 'all' ? 'No matching courses' : 'No courses yet'} message={error || 'Use the + button to create a course, or adjust your search and filters.'} retry={error ? () => { setLoading(true); void load(); } : undefined} />} />}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add course" onPress={() => openForm()} style={[s.fab, { bottom: floatingTabBarClearance(insets.bottom) + 12 }]}><Icon name="add" size={28} color="#FFFFFF" /></TouchableOpacity>
    <ManagementSheet visible={formOpen} title={editing ? 'Edit course' : 'Create course'} busy={saving || !!notice} onClose={() => setFormOpen(false)} footer={<><ManagementButton title="Cancel" secondary disabled={saving} onPress={() => setFormOpen(false)} /><ManagementButton title="Save course" busy={saving} onPress={save} /></>} overlay={formOpen ? feedback : undefined}>
      <ManagementField label="Course title" value={form.title} onChangeText={title => setForm({ ...form, title })} /><ManagementField label="Description" value={form.description} multiline onChangeText={description => setForm({ ...form, description })} />
      <ManagementField label="Course fee (LKR)" value={form.fee} numeric onChangeText={fee => setForm({ ...form, fee })} /><ManagementField label="Duration (weeks)" value={form.duration_weeks} numeric onChangeText={duration_weeks => setForm({ ...form, duration_weeks })} /><ManagementField label="Prerequisites (optional)" value={form.prerequisites} multiline onChangeText={prerequisites => setForm({ ...form, prerequisites })} />
      <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="Available for new registrations" aria-checked={form.is_active} accessibilityState={{ checked: form.is_active }} onPress={() => setForm({ ...form, is_active: !form.is_active })} style={s.choice}><Icon name={form.is_active ? 'checkbox' : 'square-outline'} size={24} color={theme.accent} /><Text style={[s.copy, { color: theme.text, flex: 1 }]}>Available for new registrations</Text></TouchableOpacity>
      <Text style={[s.hint, { color: theme.muted }]}>Archiving preserves existing batches and student history.</Text>
    </ManagementSheet>
    {!formOpen && feedback}
    {!!rosterCourse && <EnrolledStudentsSheet scope="course" id={rosterCourse._id} name={rosterCourse.title} onClose={() => setRosterCourse(null)} />}
    <ManagementDialog visible={!!action} title={actionType === 'delete' ? 'Delete course?' : action?.is_active ? 'Archive course?' : 'Restore course?'} message={actionType === 'delete' ? `Permanently delete ${action?.title || 'this course'}? Courses with batches or applications must be archived to preserve their records.` : action?.is_active ? `Close new registrations for ${action.title}? Existing batches and learning history will be retained.` : `Make ${action?.title || 'this course'} available for new registrations?`} type={actionType === 'delete' ? 'danger' : 'warning'} confirmText={actionType === 'delete' ? 'Delete' : action?.is_active ? 'Archive' : 'Restore'} busy={busy} onCancel={() => setAction(null)} onConfirm={confirmAction} />
  </SafeAreaView>;
}
