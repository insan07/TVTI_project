import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import useScrollAwareControls from '../../hooks/useScrollAwareControls';
import ScrollAwareControls from '../../components/shared/ScrollAwareControls';
import MainPageHeader from '../../components/shared/MainPageHeader';
import ManagementDialog from '../../components/shared/ManagementDialog';
import { usersSectionTheme } from '../../components/shared/usersSectionTheme';
import { ManagementButton, ManagementCard, ManagementEmpty, ManagementSearch, managementStyles as s } from '../../components/shared/CourseBatchUI';

export default function EnrollStudentScreen() {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark); const batchId = useRoute<any>().params?.batchId;
  const [batch, setBatch] = useState<any>(null), [students, setStudents] = useState<any[]>([]), [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [saving, setSaving] = useState(false), [search, setSearch] = useState(''), [error, setError] = useState('');
  const scrollControls = useScrollAwareControls(`${batchId}:${search}`);
  const [notice, setNotice] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);
  const request = useRef(0), inFlight = useRef(false);
  const load = useCallback(async () => {
    const current = ++request.current; setError('');
    try {
      const [details, available] = await Promise.all([api.get(`/admin/batches/${batchId}/details`), api.get('/admin/users?role=student&status=active')]);
      if (current !== request.current) return;
      const assigned = new Set(details.data.enrollments.filter((entry: any) => entry.status !== 'dropped').map((entry: any) => entry.student_id?._id).filter(Boolean));
      const candidates = available.data.filter((student: any) => student.is_active && !student.is_graduated && !['completed', 'rejected'].includes(student.status) && !assigned.has(student._id));
      setBatch({ ...details.data.batch, enrolled_count: details.data.enrolled_count }); setStudents(candidates);
      setSelected(previous => previous.filter(id => candidates.some((student: any) => student._id === id)));
    } catch (failure: any) { if (current === request.current) setError(failure.response?.data?.message || 'Enrollment details could not be loaded.'); }
    finally { if (current === request.current) { setLoading(false); setRefreshing(false); } }
  }, [batchId]);
  useFocusEffect(useCallback(() => { void load(); return () => { request.current++; }; }, [load]));
  const remaining = Math.max(0, (batch?.capacity || 0) - (batch?.enrolled_count || 0));
  const allowed = batch?.status === 'active' && batch?.course_id?.is_active !== false;
  const enroll = async () => {
    if (inFlight.current) return;
    if (!selected.length || selected.length > remaining || !allowed || error) { setNotice({ title: 'Check selection', message: 'Select active students within the available capacity of an active batch and course.', type: 'error' }); return; }
    inFlight.current = true; setSaving(true);
    try {
      const res = await api.post(`/admin/batches/${batchId}/enroll`, { studentIds: selected }); setSelected([]);
      setNotice({ title: 'Students enrolled', message: res.data.notification_sent === false || res.data.email_sent === false ? 'The selected students are assigned. Some assignment messages could not be delivered.' : res.data.message || 'The selected students have been assigned to this batch.', type: 'success' }); await load();
    } catch (failure: any) { setNotice({ title: 'Enrollment not completed', message: failure.response?.data?.message || 'Please try again.', type: 'error' }); await load(); }
    finally { inFlight.current = false; setSaving(false); }
  };
  const visible = students.filter(student => `${student.name} ${student.email} ${student.registration_number || student.index_number || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <SafeAreaView edges={['top', 'bottom']} style={[s.page, { backgroundColor: theme.background }]}>
    <MainPageHeader safeAreaHandled title="Enroll students" showBack plainBack containerStyle={{ maxWidth: 860 }} />
    <ScrollAwareControls controls={scrollControls}><View style={[s.content, s.controls]}><ManagementSearch value={search} onChangeText={setSearch} placeholder="Search available students" /></View></ScrollAwareControls>
    {loading ? <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} /> : <FlatList onScroll={scrollControls.onScroll} scrollEventThrottle={16} style={{ flex: 1 }} data={error ? [] : visible} keyExtractor={student => student._id} contentContainerStyle={[s.content, { flexGrow: 1, paddingBottom: 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} enabled={!saving} onRefresh={() => { setRefreshing(true); void load(); }} colors={[theme.accent]} tintColor={theme.accent} />}
      ListHeaderComponent={batch && <ManagementCard title={batch.name}><View style={s.recordContent}><Text style={[s.copy, { color: theme.accent }]}>{batch.course_id?.title}</Text><View style={[s.metrics, { paddingVertical: 0 }]}>{[['Enrolled', batch.enrolled_count], ['Seats left', remaining], ['Selected', selected.length]].map(([label, value]) => <View key={label} style={s.metric}><Text style={[s.metricValue, { color: theme.text }]}>{value}</Text><Text style={[s.metricLabel, { color: theme.muted }]}>{label}</Text></View>)}</View>{!allowed && <Text style={[s.copy, { color: theme.muted }]}>Enrollment is closed for this batch or course.</Text>}</View></ManagementCard>}
      renderItem={({ item }) => {
        const checked = selected.includes(item._id), disabled = saving || !allowed || (!checked && selected.length >= remaining);
        return <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={`Select ${item.name}`} aria-checked={checked} accessibilityState={{ checked, disabled }} disabled={disabled}
          onPress={() => setSelected(previous => checked ? previous.filter(id => id !== item._id) : [...previous, item._id])}
          style={[s.row, { flexWrap: 'nowrap', padding: 16, borderWidth: 1, borderRadius: 18, marginBottom: 10, backgroundColor: checked ? theme.accentSoft : theme.surface, borderColor: checked ? theme.accent : theme.line, opacity: disabled && !checked ? 0.5 : 1 }]}>
          <Icon name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? theme.accent : theme.muted} /><View style={s.grow}><Text style={[s.title, { color: theme.text }]}>{item.name}</Text><Text style={[s.copy, { color: theme.muted }]}>{item.registration_number || item.index_number || item.email}</Text></View>
        </TouchableOpacity>;
      }} ListEmptyComponent={<ManagementEmpty title={error ? 'Unable to load enrollment' : 'No available students'} message={error || 'All eligible students are assigned, or no students match your search.'} retry={error ? () => { setLoading(true); void load(); } : undefined} />} />}
    <View style={[s.content, s.footer, { borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center' }]}><Text style={[s.copy, s.grow, { color: theme.text }]}>{selected.length} selected</Text><ManagementButton title="Enroll selected" busy={saving} disabled={loading || !!error || !allowed || !selected.length || selected.length > remaining} onPress={enroll} /></View>
    <ManagementDialog visible={!!notice} title={notice?.title || ''} message={notice?.message || ''} type={notice?.type} confirmText="Done" onConfirm={() => setNotice(null)} />
  </SafeAreaView>;
}
