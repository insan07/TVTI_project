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
  ScrollView
} from 'react-native';
import api from '../../services/api';
import CustomDropdown from '../../components/shared/CustomDropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';

export default function BatchManagementScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const filterCourseId = route.params?.courseId;

  // Edit/Add Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    course_id: '',
    start_date: new Date(),
    end_date: new Date(),
    capacity: '25',
    instructor_ids: [],
    schedule_json: { days: ['Mon', 'Wed', 'Fri'] }
  });
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  // Batch Details Modal
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, cRes, iRes] = await Promise.all([
        api.get('/admin/batches').catch(() => ({ data: [] })),
        api.get('/admin/courses').catch(() => ({ data: [] })),
        api.get('/admin/users?role=instructor').catch(() => ({ data: [] }))
      ]);

      setBatches(bRes.data);
      setCourses(cRes.data);
      setInstructors(iRes.data);

      if (cRes.data.length > 0 && !formData.course_id) {
        setFormData((prev: any) => ({ ...prev, course_id: cRes.data[0]._id }));
      }
    } catch (e) {
      console.warn('Failed to load batch data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (batchId: string) => {
    setDetailsModalVisible(true);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/admin/batches/${batchId}/details`);
      setBatchDetails(res.data);
    } catch (e) {
      console.warn('Failed to load batch details', e);
      Alert.alert('Error', 'Failed to load batch details');
      setDetailsModalVisible(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      course_id: courses[0]?._id || '',
      start_date: new Date(),
      end_date: new Date(Date.now() + 60 * 86400000),
      capacity: '25',
      instructor_ids: [],
      schedule_json: { days: ['Mon', 'Wed', 'Fri'] }
    });
    setModalVisible(true);
  };

  const openEditModal = (batch: any) => {
    setEditingId(batch._id);
    setFormData({
      name: batch.name || '',
      course_id: batch.course_id?._id || batch.course_id || '',
      start_date: batch.start_date ? new Date(batch.start_date) : new Date(),
      end_date: batch.end_date ? new Date(batch.end_date) : new Date(),
      capacity: String(batch.capacity || 25),
      instructor_ids: batch.instructor_ids?.map((i: any) => i._id || i) || [],
      schedule_json: batch.schedule_json || { days: ['Mon', 'Wed', 'Fri'] }
    });
    setModalVisible(true);
  };

  const toggleDay = (day: string) => {
    const currentDays = formData.schedule_json?.days || [];
    let updatedDays = [];
    if (currentDays.includes(day)) {
      updatedDays = currentDays.filter((d: string) => d !== day);
    } else {
      updatedDays = [...currentDays, day];
    }
    setFormData({
      ...formData,
      schedule_json: { ...formData.schedule_json, days: updatedDays }
    });
  };

  const saveBatch = async () => {
    if (!formData.name.trim()) return Alert.alert('Error', 'Batch name is required');
    if (!formData.course_id) return Alert.alert('Error', 'Course selection is required');

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        course_id: formData.course_id,
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date.toISOString(),
        capacity: parseInt(formData.capacity, 10) || 25,
        instructor_ids: formData.instructor_ids,
        schedule_json: formData.schedule_json
      };

      if (editingId) {
        await api.put(`/admin/batches/${editingId}`, payload);
        Alert.alert('Success', 'Batch updated successfully');
      } else {
        await api.post('/admin/batches', payload);
        Alert.alert('Success', 'Batch created successfully');
      }
      setModalVisible(false);
      fetchData();
      if (detailsModalVisible && editingId) {
        handleOpenDetails(editingId);
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save batch');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getGradeColor = (grade: string) => {
    if (!grade) return '#6B7280';
    const g = grade.toUpperCase();
    if (g.startsWith('A')) return '#10B981';
    if (g.startsWith('B')) return '#3B82F6';
    if (g.startsWith('C')) return '#F59E0B';
    return '#EF4444';
  };

  const renderBatchCard = ({ item }: { item: any }) => {
    const isFull = (item.enrolled_count || 0) >= item.capacity;
    const days = item.schedule_json?.days || ['Mon', 'Wed', 'Fri'];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpenDetails(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={styles.batchTitle}>{item.name || item.course_id?.title || 'Batch'}</Text>
          {isFull ? (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>Full</Text>
            </View>
          ) : (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>

        <Text style={styles.courseSubtitle}>{item.course_id?.title || 'Vocational Course'}</Text>

        <View style={styles.enrolledRow}>
          <Icon name="people-outline" size={15} color="#6B7280" style={{ marginRight: 6 }} />
          <Text style={styles.enrolledText}>
            Enrolled Students: <Text style={{ fontWeight: 'bold', color: '#111827' }}>{item.enrolled_count || 0} / {item.capacity}</Text>
          </Text>
        </View>

        <View style={styles.daysRow}>
          {days.map((day: string) => (
            <View key={day} style={styles.dayChip}>
              <Text style={styles.dayChipText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardFooterActions}>
          <TouchableOpacity style={styles.viewDetailsTextBtn} onPress={() => handleOpenDetails(item._id)}>
            <Text style={styles.viewDetailsText}>View Details & Enrolled Students →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Icon name="pencil-outline" size={14} color="#1F2937" style={{ marginRight: 4 }} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredBatches = filterCourseId
    ? batches.filter(b => b.course_id?._id === filterCourseId || b.course_id === filterCourseId)
    : batches;

  const courseName = filterCourseId
    ? courses.find(c => c._id === filterCourseId)?.title || 'Selected Course'
    : 'All Active Courses';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Title & Subtitle */}
      <View style={styles.topHeaderContainer}>
        <Text style={styles.title}>Batches Management</Text>
        <Text style={styles.subtitle}>Manage vocational course batches, student rosters, and schedules.</Text>
      </View>

      {/* Filter Banner if active */}
      {filterCourseId ? (
        <View style={styles.filterBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Icon name="options-outline" size={16} color="#78350F" style={{ marginRight: 8 }} />
            <Text style={styles.filterText} numberOfLines={1}>
              Filtered by: <Text style={{ fontWeight: 'bold' }}>{courseName}</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.setParams({ courseId: null })}>
            <Icon name="close" size={18} color="#78350F" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Batch List */}
      {loading ? (
        <ActivityIndicator size="large" color="#000000" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredBatches}
          renderItem={renderBatchCard}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No batches found.</Text>}
        />
      )}

      {/* FAB (+) */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Icon name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ========================================================================= */}
      {/* COMPREHENSIVE BATCH DETAILS MODAL */}
      {/* ========================================================================= */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '88%', padding: 0, overflow: 'hidden' }]}>
            {loadingDetails || !batchDetails ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#000000" />
                <Text style={styles.modalLoadingText}>Loading batch details & roster...</Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                {/* Batch Top Header */}
                <View style={styles.detailsHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailsTitle}>{batchDetails.batch.name}</Text>
                    <Text style={styles.detailsSubtitle}>
                      {batchDetails.batch.course_id?.title || 'Vocational Course'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.closeModalIconBtn} onPress={() => setDetailsModalVisible(false)}>
                    <Icon name="close" size={22} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                {/* Scrollable Body */}
                <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
                  {/* Summary Metric Cards */}
                  <View style={styles.summaryMetricRow}>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricValue}>{batchDetails.enrolled_count} / {batchDetails.batch.capacity}</Text>
                      <Text style={styles.metricLabel}>STUDENTS ENROLLED</Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricValue}>{batchDetails.videos?.length || 0}</Text>
                      <Text style={styles.metricLabel}>VIDEO LESSONS</Text>
                    </View>
                  </View>

                  {/* Batch Details Section */}
                  <View style={styles.detailSectionCard}>
                    <Text style={styles.detailSectionTitle}>📅 Schedule & Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Course Fee:</Text>
                      <Text style={styles.detailValue}>LKR {batchDetails.batch.course_id?.fee || 0}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Course Duration:</Text>
                      <Text style={styles.detailValue}>{batchDetails.batch.course_id?.duration_weeks || 'N/A'} Weeks</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Start Date:</Text>
                      <Text style={styles.detailValue}>
                        {batchDetails.batch.start_date ? new Date(batchDetails.batch.start_date).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>End Date:</Text>
                      <Text style={styles.detailValue}>
                        {batchDetails.batch.end_date ? new Date(batchDetails.batch.end_date).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Active Schedule:</Text>
                      <Text style={styles.detailValue}>
                        {batchDetails.batch.schedule_json?.days?.join(', ') || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Assigned Instructors */}
                  <View style={styles.detailSectionCard}>
                    <Text style={styles.detailSectionTitle}>👨‍🏫 Assigned Instructors</Text>
                    {(!batchDetails.batch.instructor_ids || batchDetails.batch.instructor_ids.length === 0) ? (
                      <Text style={styles.emptyDetailText}>No instructors assigned to this batch yet.</Text>
                    ) : (
                      batchDetails.batch.instructor_ids.map((inst: any) => (
                        <View key={inst._id} style={styles.instructorItemRow}>
                          <View style={styles.instAvatar}>
                            <Text style={styles.instAvatarText}>{getInitials(inst.name)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.instName}>{inst.name}</Text>
                            <Text style={styles.instEmail}>{inst.email}</Text>
                            {inst.phone ? <Text style={styles.instPhone}>📱 {inst.phone}</Text> : null}
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Enrolled Students Roster */}
                  <View style={styles.detailSectionCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={styles.detailSectionTitle}>👥 Enrolled Students Roster ({batchDetails.enrollments?.length || 0})</Text>
                    </View>

                    {(!batchDetails.enrollments || batchDetails.enrollments.length === 0) ? (
                      <Text style={styles.emptyDetailText}>No students currently enrolled in this batch.</Text>
                    ) : (
                      batchDetails.enrollments.map((e: any, index: number) => {
                        const s = e.student_id;
                        if (!s) return null;
                        const sResults = batchDetails.results?.filter((r: any) => r.student_id?._id === s._id || r.student_id === s._id) || [];
                        const avgMark = sResults.length > 0
                          ? (sResults.reduce((sum: number, r: any) => sum + (r.marks || 0), 0) / sResults.length).toFixed(1)
                          : null;

                        return (
                          <View key={e._id || index} style={styles.studentRosterRow}>
                            <View style={styles.studentAvatar}>
                              <Text style={styles.studentAvatarText}>{getInitials(s.name)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.studentName}>{s.name}</Text>
                              <Text style={styles.studentSub}>Reg No: {s.index_number || s.nic || 'N/A'}</Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Course Videos List */}
                  <View style={styles.detailSectionCard}>
                    <Text style={styles.detailSectionTitle}>📹 Course Lessons ({batchDetails.videos?.length || 0})</Text>
                    {(!batchDetails.videos || batchDetails.videos.length === 0) ? (
                      <Text style={styles.emptyDetailText}>No video lessons uploaded for this batch yet.</Text>
                    ) : (
                      batchDetails.videos.map((v: any) => (
                        <View key={v._id} style={styles.videoRow}>
                          <Icon name="videocam-outline" size={20} color="#F58220" style={{ marginRight: 10 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.videoTitle}>{v.title}</Text>
                            <Text style={styles.videoSub}>Topic: {v.topic || 'General'} · Inst: {v.instructor_id?.name || 'Assigned'}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={{ height: 40 }} />
                </ScrollView>

                {/* Bottom Actions */}
                <View style={styles.detailsFooter}>
                  <TouchableOpacity style={styles.footerEditBtn} onPress={() => { setDetailsModalVisible(false); openEditModal(batchDetails.batch); }}>
                    <Icon name="pencil" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.footerEditBtnText}>Edit Batch Config</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add / Edit Batch Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Batch' : 'Create Batch'}</Text>

              <Text style={styles.label}>Batch Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Auto Diagnostics - Morning Batch A"
                value={formData.name}
                onChangeText={t => setFormData({ ...formData, name: t })}
              />

              <CustomDropdown
                label="Vocational Course *"
                placeholder="Select course..."
                iconName="book-outline"
                items={courses.map(c => ({
                  label: c.title,
                  value: c._id,
                  subtext: `${c.duration_weeks} Weeks · Fee: LKR ${c.fee}`
                }))}
                selectedValue={formData.course_id}
                onValueChange={v => setFormData({ ...formData, course_id: v })}
              />

              <Text style={styles.label}>Dates</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker('start')}>
                  <Text style={styles.dateBtnText}>Start: {formData.start_date.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker('end')}>
                  <Text style={styles.dateBtnText}>End: {formData.end_date.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>

              {showPicker && (
                <DateTimePicker
                  value={showPicker === 'start' ? formData.start_date : formData.end_date}
                  mode="date"
                  onChange={(e, d) => {
                    setShowPicker(null);
                    if (d) {
                      setFormData({
                        ...formData,
                        [showPicker === 'start' ? 'start_date' : 'end_date']: d
                      });
                    }
                  }}
                />
              )}

              <Text style={styles.label}>Capacity (Max Students)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formData.capacity}
                onChangeText={t => setFormData({ ...formData, capacity: t })}
              />

              <CustomDropdown
                label="Assigned Instructor"
                placeholder="Select instructor..."
                iconName="person-outline"
                items={[
                  { label: 'Unassigned', value: '', subtext: 'No instructor assigned' },
                  ...instructors.map(i => ({
                    label: i.name,
                    value: i._id,
                    subtext: i.email
                  }))
                ]}
                selectedValue={formData.instructor_ids[0] || ''}
                onValueChange={v => setFormData({ ...formData, instructor_ids: v ? [v] : [] })}
              />

              <Text style={styles.label}>Schedule Days</Text>
              <View style={styles.scheduleDaysRow}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                  const isSelected = formData.schedule_json?.days?.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.scheduleDayBadge, isSelected && styles.scheduleDayBadgeActive]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text style={[styles.scheduleDayText, isSelected && styles.scheduleDayTextActive]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitModalBtn} onPress={saveBatch} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitModalText}>Save Batch</Text>}
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
    paddingBottom: 12,
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
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  filterText: {
    fontSize: 13,
    color: '#78350F',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  courseSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#065F46',
  },
  fullBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fullBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  enrolledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  enrolledText: {
    fontSize: 13,
    color: '#4B5563',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  dayChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  cardFooterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    paddingTop: 10,
  },
  viewDetailsTextBtn: {
    paddingVertical: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F58220',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },

  /* DETAILS MODAL STYLES */
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  detailsSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  closeModalIconBtn: {
    padding: 6,
  },
  summaryMetricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginTop: 4,
  },
  detailSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyDetailText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  instructorItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  instAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  instAvatarText: {
    fontWeight: 'bold',
    color: '#92400E',
    fontSize: 15,
  },
  instName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  instEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  instPhone: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  studentRosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentAvatarText: {
    fontWeight: 'bold',
    color: '#1E40AF',
    fontSize: 14,
  },
  studentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  studentSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  markBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  markBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
  },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  videoSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  detailsFooter: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerEditBtn: {
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerEditBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  /* OTHER MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '88%',
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dateBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  dateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  scheduleDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 10,
  },
  scheduleDayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  scheduleDayBadgeActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  scheduleDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  scheduleDayTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  cancelModalText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitModalBtn: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  submitModalText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
