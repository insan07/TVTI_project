import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { FONTS } from '../../config/theme';
import ScreenHeader from '../../components/shared/ScreenHeader';
import { communicationTheme, COMMUNICATION_ACCENT } from '../../components/shared/communicationTheme';

type AssignedBatch = {
  _id: string; name: string; course_id?: { title?: string } | null;
  status: 'active' | 'completed' | 'cancelled'; start_date?: string; end_date?: string;
  room?: string; enrolled_count: number;
};

const dateLabel = (value?: string) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function MyBatchesScreen() {
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const [batches, setBatches] = useState<AssignedBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const request = useRef(0);
  const fetchBatches = useCallback(async () => {
    const current = ++request.current;
    setError('');
    try {
      const res = await api.get('/instructors/my-batches');
      if (current === request.current) setBatches(res.data || []);
    } catch (failure: any) {
      if (current === request.current) setError(failure.response?.data?.message || 'Batches could not be loaded. Please try again.');
    } finally {
      if (current === request.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);
  useFocusEffect(useCallback(() => {
    void fetchBatches();
    return () => { request.current += 1; };
  }, [fetchBatches]));
  const visibleBatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return batches.filter(batch => !term || `${batch.name} ${batch.course_id?.title || ''}`.toLowerCase().includes(term));
  }, [batches, search]);

  return <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
    <ScreenHeader title="My Batches" showBack plainBack containerStyle={styles.header}
      onBackPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('InstructorApp', { screen: 'Home' })} />
    <View style={styles.controls}>
      <Text style={[styles.description, { color: theme.muted }]}>Your assigned batches and their students</Text>
      <View style={[styles.search, { borderColor: theme.line, backgroundColor: theme.surface }]}>
        <Icon name="search-outline" size={18} color={theme.muted} />
        <TextInput accessibilityLabel="Search batches" placeholder="Search batch or course" placeholderTextColor={theme.muted}
          value={search} onChangeText={setSearch} style={[styles.searchInput, { color: theme.text }]} />
        {!!search && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear batch search" onPress={() => setSearch('')} style={styles.clear}>
          <Icon name="close" size={18} color={theme.muted} />
        </TouchableOpacity>}
      </View>
      {!loading && <Text style={[styles.count, { color: theme.muted }]}>{visibleBatches.length} {visibleBatches.length === 1 ? 'batch' : 'batches'}</Text>}
      {!!error && batches.length > 0 && <Text accessibilityRole="alert" style={[styles.error, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>{error}</Text>}
    </View>
    {loading ? <View style={styles.empty}><ActivityIndicator color={COMMUNICATION_ACCENT} size="large" /></View> : <FlatList
      style={styles.list} data={visibleBatches} keyExtractor={batch => batch._id} contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchBatches(); }} colors={[COMMUNICATION_ACCENT]} tintColor={COMMUNICATION_ACCENT} />}
      renderItem={({ item }) => {
        const dates = [dateLabel(item.start_date), dateLabel(item.end_date)].filter(Boolean).join(' – ');
        const statusColor = item.status === 'active' ? isDark ? '#86EFAC' : '#166534' : theme.muted;
        return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View students in ${item.name}, ${item.course_id?.title || 'Course unavailable'}`}
          activeOpacity={0.7} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}
          onPress={() => navigation.navigate('MyStudents', { batchId: item._id, batchName: item.name, courseTitle: item.course_id?.title || '' })}>
          <View style={styles.cardTop}>
            <Text style={[styles.course, { color: theme.muted }]}>{item.course_id?.title || 'Course unavailable'}</Text>
            <Text style={[styles.status, { color: statusColor }]}>{item.status}</Text>
          </View>
          <Text style={[styles.batchName, { color: theme.text }]}>{item.name}</Text>
          {!!dates && <Text style={[styles.detail, { color: theme.muted }]}>{dates}</Text>}
          {!!item.room && <Text style={[styles.detail, { color: theme.muted }]}>Room: {item.room}</Text>}
          <View style={[styles.cardBottom, { borderTopColor: theme.line }]}>
            <View style={styles.studentCount}>
              <Icon name="people-outline" size={17} color={theme.muted} />
              <Text style={[styles.detail, { color: theme.text }]}>{item.enrolled_count} {item.enrolled_count === 1 ? 'student' : 'students'}</Text>
            </View>
            <View style={styles.viewStudents}><Text style={styles.link}>View students</Text><Icon name="chevron-forward" size={16} color={COMMUNICATION_ACCENT} /></View>
          </View>
        </TouchableOpacity>;
      }}
      ListEmptyComponent={<View style={styles.empty}>
        <Icon name={error ? 'cloud-offline-outline' : 'layers-outline'} size={36} color={theme.muted} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>{error ? 'Unable to load batches' : search.trim() ? 'No matching batches' : 'No assigned batches yet'}</Text>
        <Text style={[styles.emptyText, { color: theme.muted }]}>{error || (search.trim() ? 'Try a different batch or course name.' : 'Batches assigned to you will appear here, including batches with no students.')}</Text>
        {!!error && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading batches" style={styles.retry} onPress={() => { setLoading(true); void fetchBatches(); }}><Text style={styles.link}>Try again</Text></TouchableOpacity>}
      </View>} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { maxWidth: 860 },
  controls: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 20 },
  description: { ...FONTS.regular, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  searchInput: { ...FONTS.regular, fontSize: 14, flex: 1, minWidth: 0, minHeight: 46 }, clear: { padding: 8 },
  count: { ...FONTS.medium, fontSize: 12, marginTop: 14, marginBottom: 12 }, error: { ...FONTS.regular, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  list: { width: '100%', maxWidth: 860, alignSelf: 'center', flex: 1 }, listContent: { paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  course: { ...FONTS.medium, flex: 1, fontSize: 12, lineHeight: 18 }, status: { ...FONTS.medium, fontSize: 11, textTransform: 'capitalize', lineHeight: 18 },
  batchName: { ...FONTS.semiBold, fontSize: 17, lineHeight: 25, marginTop: 5, marginBottom: 6 }, detail: { ...FONTS.regular, fontSize: 12, lineHeight: 19 },
  cardBottom: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  studentCount: { flexDirection: 'row', alignItems: 'center', gap: 7 }, viewStudents: { flexDirection: 'row', alignItems: 'center', gap: 4 }, link: { ...FONTS.semiBold, color: COMMUNICATION_ACCENT, fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { ...FONTS.semiBold, fontSize: 17, textAlign: 'center' }, emptyText: { ...FONTS.regular, fontSize: 13, lineHeight: 20, textAlign: 'center' }, retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
});
