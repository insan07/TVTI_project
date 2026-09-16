import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
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

import ScreenHeader from '../../components/shared/ScreenHeader';

export default function BatchManagementScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const filterCourseId = route.params?.courseId;

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'full'>('all');

  // Edit/Add Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    course_id: '',
    start_date: new Date(),
    end_date: new Date(),
    capacity: '25',
    room: '',
    instructor_ids: [],
    schedule_json: { days: ['Mon', 'Wed', 'Fri'], time: '' }
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
      room: '',
      instructor_ids: [],
      schedule_json: { days: ['Mon', 'Wed', 'Fri'], time: '' }
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
      room: batch.room || '',
      instructor_ids: batch.instructor_ids?.map((i: any) => i._id || i) || [],
      schedule_json: batch.schedule_json || { days: ['Mon', 'Wed', 'Fri'], time: '' }
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
    if (!formData.name.trim()) return Alert.alert('Validation Error', 'Batch name is required.');
    if (!formData.course_id) return Alert.alert('Validation Error', 'Course selection is required.');
    if (!formData.capacity || isNaN(parseInt(formData.capacity))) return Alert.alert('Validation Error', 'A valid capacity is required.');
    if (!formData.schedule_json?.days || formData.schedule_json.days.length === 0) return Alert.alert('Validation Error', 'Please select at least one schedule day.');
    if (!formData.schedule_json?.time?.trim()) return Alert.alert('Validation Error', 'Class time is required.');
    if (!formData.room?.trim()) return Alert.alert('Validation Error', 'Room is required.');

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        course_id: formData.course_id,
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date.toISOString(),
        capacity: parseInt(formData.capacity, 10) || 25,
        room: formData.room,
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

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<{id: string, name: string} | null>(null);

  const handleDeleteBatch = (id: string, batchName: string) => {
    setBatchToDelete({ id, name: batchName });
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return;
    try {
      await api.delete(`/admin/batches/${batchToDelete.id}/delete`);
      fetchData();
      if (detailsModalVisible) {
        setDetailsModalVisible(false);
        setBatchDetails(null);
      }
      setDeleteConfirmVisible(false);
      setBatchToDelete(null);
      Alert.alert('Success', 'Batch and all related data deleted permanently.');
    } catch (e: any) {
      setDeleteConfirmVisible(false);
      setBatchToDelete(null);
      Alert.alert('Error', e.response?.data?.message || 'Failed to delete batch');
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
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
              <Icon name="pencil-outline" size={14} color="#1F2937" style={{ marginRight: 4 }} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteCardBtn} onPress={() => handleDeleteBatch(item._id, item.name || item.course_id?.title || 'Batch')}>
              <Icon name="trash-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.deleteCardBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredBatches = (batches || []).filter(b => {
    const matchesCourse = !filterCourseId || b.course_id?._id === filterCourseId || b.course_id === filterCourseId;
    const term = (search || '').toLowerCase().trim();
    const batchName = (b.name || '').toLowerCase();
    const courseTitle = (b.course_id?.title || '').toLowerCase();
    const room = (b.room || '').toLowerCase();
    const matchesSearch =
      !term ||
      batchName.includes(term) ||
      courseTitle.includes(term) ||
      room.includes(term);

    const isFull = (b.enrolled_count || 0) >= b.capacity;
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = !isFull;
    if (statusFilter === 'full') matchesStatus = isFull;

    return matchesCourse && matchesSearch && matchesStatus;
  });

  const courseName = filterCourseId
    ? courses.find(c => c._id === filterCourseId)?.title || 'Selected Course'
    : 'All Active Courses';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Batch Management"
        subtitle="Manage vocational training batches"
      />

      {/* Top Create Batch Action Button */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity style={styles.addBatchBtn} onPress={openAddModal} activeOpacity={0.85}>
          <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addBatchBtnText}>Create Batch</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar & Filter Toggle Button */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search batch by name, course, or room..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, showFilter && styles.filterBtnActive]}
          onPress={() => setShowFilter(!showFilter)}
          activeOpacity={0.8}
        >
          <Icon name="options-outline" size={18} color={showFilter ? '#FFFFFF' : '#374151'} style={{ marginRight: 6 }} />
          <Text style={[styles.filterBtnText, showFilter && { color: '#FFFFFF' }]}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Options Panel */}
      {showFilter && (
        <View style={styles.filterOptionsPanel}>
          <Text style={styles.filterPanelTitle}>Filter Batch Status:</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <TouchableOpacity
              style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
              onPress={() => setStatusFilter('all')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
                All ({batches.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, statusFilter === 'active' && styles.filterChipActive]}
              onPress={() => setStatusFilter('active')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, statusFilter === 'active' && styles.filterChipTextActive]}>
                Active ({batches.filter(b => (b.enrolled_count || 0) < b.capacity).length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, statusFilter === 'full' && styles.filterChipActive]}
              onPress={() => setStatusFilter('full')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, statusFilter === 'full' && styles.filterChipTextActive]}>
                Full ({batches.filter(b => (b.enrolled_count || 0) >= b.capacity).length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.footerEditBtn, { flex: 1 }]} onPress={() => { setDetailsModalVisible(false); openEditModal(batchDetails.batch); }}>
                      <Icon name="pencil" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.footerEditBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.footerEditBtn, { flex: 1, backgroundColor: '#7F1D1D' }]} onPress={() => handleDeleteBatch(batchDetails.batch._id, batchDetails.batch.name || batchDetails.batch.course_id?.title || 'Batch')}>
                      <Icon name="trash" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.footerEditBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
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

              <Text style={styles.label}>Class Time</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9:00 AM - 12:00 PM"
                value={formData.schedule_json?.time || ''}
                onChangeText={t => setFormData({ ...formData, schedule_json: { ...formData.schedule_json, time: t } })}
              />

              <Text style={styles.label}>Room</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Lab 2"
                value={formData.room}
                onChangeText={t => setFormData({ ...formData, room: t })}
              />

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

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteConfirmVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Icon name="warning" size={40} color="#DC2626" />
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center', color: '#991B1B' }]}>Permanently Delete?</Text>
            <Text style={{ textAlign: 'center', marginTop: 12, fontSize: 14, color: '#374151', lineHeight: 20 }}>
              This will <Text style={{ fontWeight: 'bold' }}>PERMANENTLY</Text> delete the batch <Text style={{ fontWeight: 'bold' }}>"{batchToDelete?.name}"</Text> and ALL related data including enrollments, results, videos, and practice slots.{'\n\n'}
              This action CANNOT be undone. Are you absolutely sure?
            </Text>
            <View style={[styles.modalActions, { marginTop: 24 }]}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setDeleteConfirmVisible(false); setBatchToDelete(null); }}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitModalBtn, { backgroundColor: '#DC2626' }]} onPress={confirmDeleteBatch}>
                <Text style={styles.submitModalText}>Delete Forever</Text>
              </TouchableOpacity>
            </View>
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
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 26,
    paddingHorizontal: 16,
    height: 46,
    marginRight: 8,
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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }
    }),
  },
  filterBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterOptionsPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  filterPanelTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  filterText: {
    fontSize: 13,
    color: '#78350F',
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
    borderRadius: 14,
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
    borderRadius: 14,
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
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  cardFooterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    paddingTop: 12,
  },
  viewDetailsTextBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  viewDetailsText: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#F58220',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  deleteCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7F1D1D',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 14,
    ...Platform.select({
      web: { boxShadow: '0px 3px 8px rgba(127, 29, 29, 0.3)' },
      default: { shadowColor: '#7F1D1D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 }
    }),
  },
  deleteCardBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
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
    backgroundColor: '#F58220',
    borderRadius: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.12)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 5, elevation: 4 }
    }),
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
  actionButtonRow: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  addBatchBtn: {
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
  addBatchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
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
