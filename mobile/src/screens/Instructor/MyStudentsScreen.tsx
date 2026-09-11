import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TextInput, TouchableOpacity, RefreshControl, Modal
} from 'react-native';
import api from '../../services/api';
import { COLORS } from '../../config/theme';
import { Ionicons as Icon } from '@expo/vector-icons';

export default function MyStudentsScreen() {
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
    <View style={styles.container}>
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

    </View>
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 15, borderRadius: 10, paddingHorizontal: 15,
    borderWidth: 1, borderColor: '#E5E7EB', elevation: 1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1F2937' },
  filterRow: { marginBottom: 8 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8,
  },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterPillText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  filterPillTextActive: { color: '#fff', fontWeight: 'bold' },
  statsBar: { paddingHorizontal: 15, paddingBottom: 8 },
  statsText: { fontSize: 12, color: '#6B7280' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { color: '#374151', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  emptySubtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 14, padding: 15, elevation: 2, boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#1E3A8A' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  email: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  phone: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  batchInfo: { flexDirection: 'column', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { color: '#92400E', fontSize: 12, fontWeight: 'bold' },
  batchDetail: { flexDirection: 'row', alignItems: 'center' },
  batchName: { color: '#6B7280', fontSize: 13 },
  
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
