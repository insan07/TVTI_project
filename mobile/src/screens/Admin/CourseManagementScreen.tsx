import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  ScrollView,
  Platform
} from 'react-native';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';

import ScreenHeader from '../../components/shared/ScreenHeader';

type Tab = 'all' | 'active' | 'archived';

export default function CourseManagementScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const navigation = useNavigation<any>();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fee: '',
    duration_weeks: '',
    prerequisites: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/courses');
      setCourses(res.data);
    } catch (e: any) {
      console.warn('Failed to fetch courses from server', e);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCourseId(null);
    setFormData({
      title: '',
      description: '',
      fee: '',
      duration_weeks: '',
      prerequisites: '',
      is_active: true
    });
    setModalVisible(true);
  };

  const openEditModal = (course: any) => {
    setEditingCourseId(course._id);
    setFormData({
      title: course.title || '',
      description: course.description || '',
      fee: course.fee ? course.fee.toString() : '0',
      duration_weeks: course.duration_weeks ? course.duration_weeks.toString() : '4',
      prerequisites: course.prerequisites || '',
      is_active: course.is_active ?? true
    });
    setModalVisible(true);
  };

  const saveCourse = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Course title is required');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return;
    }
    const feeVal = Number(formData.fee);
    if (isNaN(feeVal) || feeVal <= 0) {
      Alert.alert('Validation Error', 'Fee must be a valid positive number');
      return;
    }
    const durationVal = Number(formData.duration_weeks);
    if (isNaN(durationVal) || durationVal <= 0) {
      Alert.alert('Validation Error', 'Duration must be a valid positive number of weeks');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        fee: feeVal,
        duration_weeks: durationVal
      };

      if (editingCourseId) {
        await api.put(`/admin/courses/${editingCourseId}`, payload);
        Alert.alert('Success', 'Course updated successfully');
      } else {
        await api.post('/admin/courses', payload);
        Alert.alert('Success', 'Course created successfully');
      }
      setModalVisible(false);
      fetchCourses();
    } catch (e: any) {
      console.warn('API Error saving course:', e);
      const serverMsg = e.response?.data?.message;
      Alert.alert('Error', serverMsg || 'Failed to save course. Please check inputs.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && c.is_active) ||
      (activeTab === 'archived' && !c.is_active);
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const renderCourseCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.archivedBadge]}>
          <Text style={[styles.statusBadgeText, item.is_active ? styles.activeBadgeText : styles.archivedBadgeText]}>
            {item.is_active ? 'ACTIVE' : 'ARCHIVED'}
          </Text>
        </View>
      </View>

      <Text style={styles.descriptionText}>{item.description}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="people-outline" size={15} color="#6B7280" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>Enrollments: {item.enrollment_count || 0}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="time-outline" size={15} color="#6B7280" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>{item.duration_weeks || 0} Weeks</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editOutlineBtn} onPress={() => openEditModal(item)}>
          <Icon name="pencil" size={16} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewBatchesBtn}
          onPress={() => navigation.navigate('Batches', { courseId: item._id })}
        >
          <Text style={styles.viewBatchesText}>Manage Batches</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Course Management"
        subtitle="Create & manage vocational training courses"
      />

      {/* Top Create Course Action Button */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity style={styles.addCourseBtn} onPress={openAddModal} activeOpacity={0.85}>
          <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addCourseBtnText}>Create Course</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Sleek Segmented Pill Track Header */}
      <View style={styles.segmentedTrackContainer}>
        <View style={styles.segmentedTrack}>
          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'all' && styles.segmentedTabActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentedTabText, activeTab === 'all' && styles.segmentedTabTextActive]}>
              All ({courses.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'active' && styles.segmentedTabActive]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentedTabText, activeTab === 'active' && styles.segmentedTabTextActive]}>
              Active ({courses.filter(c => c.is_active).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'archived' && styles.segmentedTabActive]}
            onPress={() => setActiveTab('archived')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentedTabText, activeTab === 'archived' && styles.segmentedTabTextActive]}>
              Archived ({courses.filter(c => !c.is_active).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Course List */}
      {loading ? (
        <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={item => item._id}
          renderItem={renderCourseCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No courses found.</Text>}
        />
      )}

      {/* Add / Edit Course Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingCourseId ? 'Edit Course' : 'Create Course'}</Text>

              <Text style={styles.label}>Course Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Automotive Diagnostics Level 1"
                value={formData.title}
                onChangeText={t => setFormData({ ...formData, title: t })}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 75 }]}
                placeholder="Overview of syllabus and course goals..."
                multiline
                numberOfLines={3}
                value={formData.description}
                onChangeText={t => setFormData({ ...formData, description: t })}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Fee (LKR)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="25000"
                    keyboardType="numeric"
                    value={formData.fee}
                    onChangeText={t => setFormData({ ...formData, fee: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Duration (Weeks)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="8"
                    keyboardType="numeric"
                    value={formData.duration_weeks}
                    onChangeText={t => setFormData({ ...formData, duration_weeks: t })}
                  />
                </View>
              </View>

              <Text style={styles.label}>Prerequisites</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Basic Electronics"
                value={formData.prerequisites}
                onChangeText={t => setFormData({ ...formData, prerequisites: t })}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active Status</Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={v => setFormData({ ...formData, is_active: v })}
                  trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitModalBtn} onPress={saveCourse} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitModalText}>Save Course</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  actionButtonRow: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  addCourseBtn: {
    backgroundColor: '#F58220',
    borderRadius: 26,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.12)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 }
    }),
  },
  addCourseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 26,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    height: 46,
    marginTop: 12,
    marginBottom: 10,
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  segmentedTrackContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 26,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: 'inset 0px 1px 3px rgba(0, 0, 0, 0.04)' },
      default: {}
    }),
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 22,
  },
  segmentedTabActive: {
    backgroundColor: '#0F172A',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(15, 23, 42, 0.22)' },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
        elevation: 4,
      }
    }),
  },
  segmentedTabText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.05)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  archivedBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeBadgeText: {
    color: '#15803D',
  },
  archivedBadgeText: {
    color: '#4B5563',
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editOutlineBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBatchesBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 22,
    paddingVertical: 10,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(15, 23, 42, 0.2)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 }
    }),
  },
  viewBatchesText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#F58220',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.16)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 6, elevation: 6 }
    }),
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingBottom: 20,
  },
  cancelModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginRight: 8,
    borderRadius: 24,
  },
  cancelModalText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitModalBtn: {
    backgroundColor: '#F58220',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 22,
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.12)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 5, elevation: 4 }
    }),
  },
  submitModalText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
