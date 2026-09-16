import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TextInput, TouchableOpacity, RefreshControl, Modal, SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { COLORS, FONTS } from '../../config/theme';
import { Ionicons as Icon } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function MyStudentsScreen() {
  const navigation = useNavigation();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [batches, setBatches] = useState<string[]>([]);

  // Custom Alert Popup State
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    onOk?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (title: string, msg: string, onOk?: () => void, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertModal({
      visible: true,
      title,
      message: msg,
      type,
      onOk
    });
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/instructors/my-students');
      setStudents(res.data);
      // Extract unique batch names
      const batchNames: string[] = Array.from(
        new Set(res.data.map((s: any) => s.batch_id?.name).filter(Boolean))
      );
      setBatches(batchNames);
    } catch (e) {
      console.warn('Failed to load students', e);
      showAlert('Error', 'Failed to load students. Please try again.', undefined, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  const filteredStudents = students.filter(s => {
    const term = search.toLowerCase();
    const nameMatch = s.student_id?.name?.toLowerCase().includes(term);
    const emailMatch = s.student_id?.email?.toLowerCase().includes(term);
    const batchMatch = s.batch_id?.name?.toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || emailMatch || batchMatch;
    const matchesBatch = selectedBatch === 'all' || s.batch_id?.name === selectedBatch;
    return matchesSearch && matchesBatch;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeaderBar}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Students</Text>
            <Text style={styles.headerSubtitle}>
              Manage and view your assigned batches
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email or batch..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Batch Filter Pills */}
      {batches.length > 1 && (
        <View style={styles.filterRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['all', ...batches]}
            keyExtractor={item => item}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterPill, selectedBatch === item && styles.filterPillActive]}
                onPress={() => setSelectedBatch(item)}
              >
                <Text style={[styles.filterPillText, selectedBatch === item && styles.filterPillTextActive]}>
                  {item === 'all' ? 'All Batches' : item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <FlatList
        data={filteredStudents}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {search || selectedBatch !== 'all' ? 'No matching students' : 'No students assigned'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search || selectedBatch !== 'all'
                ? 'Try changing your search or filter'
                : 'Students enrolled in your batches will appear here'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: stringToColor(item.student_id?.name || 'S') }]}>
                <Text style={styles.avatarText}>
                  {item.student_id?.name?.charAt(0)?.toUpperCase() || 'S'}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.student_id?.name || 'Unknown Student'}</Text>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#059669', marginTop: 2 }}>
                  Reg No: {item.student_id?.index_number || item.student_id?.nic || 'N/A'}
                </Text>
                <Text style={styles.email}>{item.student_id?.email || 'No email'}</Text>
                {item.student_id?.phone ? (
                  <Text style={styles.phone}>📱 {item.student_id.phone}</Text>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.statusText, { color: item.status === 'active' ? '#065F46' : '#991B1B' }]}>
                  {item.status || 'active'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.batchInfo}>
              <View style={styles.badge}>
                <Icon name="book-outline" size={12} color="#92400E" style={{ marginRight: 4 }} />
                <Text style={styles.badgeText}>{item.batch_id?.course_id?.title || 'Unknown Course'}</Text>
              </View>
              <View style={styles.batchDetail}>
                <Icon name="layers-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.batchName}>{item.batch_id?.name || 'Unknown Batch'}</Text>
              </View>
              {item.enrolledAt || item.createdAt ? (
                <View style={styles.batchDetail}>
                  <Icon name="calendar-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                  <Text style={styles.batchName}>
                    Enrolled: {new Date(item.enrolledAt || item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      />

      {/* CUSTOM IN-APP ALERT POPUP MODAL */}
      <Modal
        visible={alertModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={[
              styles.popupIconCircle,
              { backgroundColor: alertModal.type === 'success' ? '#DCFCE7' : alertModal.type === 'error' ? '#FEE2E2' : '#EFF6FF' }
            ]}>
              <Icon
                name={
                  alertModal.type === 'success'
                    ? 'checkmark-circle-outline'
                    : alertModal.type === 'error'
                    ? 'close-circle-outline'
                    : 'information-circle-outline'
                }
                size={28}
                color={
                  alertModal.type === 'success'
                    ? '#16A34A'
                    : alertModal.type === 'error'
                    ? '#DC2626'
                    : '#2563EB'
                }
              />
            </View>
            <Text style={styles.popupTitle}>{alertModal.title}</Text>
            <Text style={styles.popupMessage}>{alertModal.message}</Text>
            <TouchableOpacity
              style={[
                styles.popupSingleBtn,
                { backgroundColor: alertModal.type === 'error' ? '#DC2626' : alertModal.type === 'success' ? '#16A34A' : '#F58220' }
              ]}
              onPress={() => {
                const action = alertModal.onOk;
                setAlertModal(prev => ({ ...prev, visible: false }));
                if (action) action();
              }}
            >
              <Text style={styles.popupSingleBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Generate a consistent color from a name
function stringToColor(str: string) {
  const colors = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#EDE9FE', '#FFEDD5'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 12, color: '#9CA3AF', fontSize: 14 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 16,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...Platform.select({
      web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  headerTitle: {
    fontSize: 22,
    ...FONTS.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    ...FONTS.regular,
    color: '#64748B',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 12, borderRadius: 10, paddingHorizontal: 15,
    borderWidth: 1, borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.04)' },
      default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    }),
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14.5, ...FONTS.regular, color: '#0F172A' },
  filterRow: { marginBottom: 12 },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 10,
  },
  filterPillActive: { backgroundColor: '#F58220', borderColor: '#F58220' },
  filterPillText: { fontSize: 13, color: '#475569', ...FONTS.medium },
  filterPillTextActive: { color: '#FFFFFF', ...FONTS.bold },
  statsBar: { paddingHorizontal: 16, paddingBottom: 10 },
  statsText: { fontSize: 12.5, color: '#64748B', ...FONTS.medium },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { color: '#0F172A', fontSize: 17, ...FONTS.bold, marginTop: 15 },
  emptySubtitle: { color: '#64748B', fontSize: 13, ...FONTS.regular, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 14, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, ...FONTS.bold, color: '#1E3A8A' },
  info: { flex: 1 },
  name: { fontSize: 15.5, ...FONTS.bold, color: '#0F172A', letterSpacing: -0.2 },
  email: { color: '#64748B', fontSize: 13, ...FONTS.regular, marginTop: 2 },
  phone: { color: '#64748B', fontSize: 12.5, ...FONTS.medium, marginTop: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, ...FONTS.bold, textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  batchInfo: { flexDirection: 'column', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { color: '#C2410C', fontSize: 12, ...FONTS.bold },
  batchDetail: { flexDirection: 'row', alignItems: 'center' },
  batchName: { color: '#475569', fontSize: 13, ...FONTS.medium },
  
  // Custom Popup Dialog Modal Styles
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  popupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.25)',
    elevation: 10
  },
  popupIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8
  },
  popupMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
  },
  popupSingleBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  popupSingleBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15
  }
});
