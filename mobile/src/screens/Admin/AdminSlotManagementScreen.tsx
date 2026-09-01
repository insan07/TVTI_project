import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  RefreshControl
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getMonday(d: Date) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const parseUTCDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  return new Date(dateStr);
};

const getSlotActualDate = (weekStartDateStr: string, dayOfWeek: string) => {
  if (!weekStartDateStr) return new Date();
  const weekStart = parseUTCDate(weekStartDateStr);
  const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const diff = daysArr.indexOf(dayOfWeek);
  const slotDate = new Date(weekStart);
  if (diff !== -1) {
    slotDate.setDate(slotDate.getDate() + diff);
  }
  return slotDate;
};

export default function AdminSlotManagementScreen() {
  const [activeTab, setActiveTab] = useState<'slots' | 'create'>('slots');
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [selectedInstructorFilter, setSelectedInstructorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Master Data
  const [batches, setBatches] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);

  // Bookings Modal
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingsModalVisible, setBookingsModalVisible] = useState(false);
  const [slotBookings, setSlotBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Assign Student to Slot Sub-Modal
  const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);

  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editInstructorId, setEditInstructorId] = useState('');
  const [editMaxStudents, setEditMaxStudents] = useState('');
  const [editEquipmentNote, setEditEquipmentNote] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Custom Confirmation & Alert Dialog Popup State
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info' | 'lock';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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

  // Create Form State
  const [createBatchId, setCreateBatchId] = useState('');
  const [createInstructorId, setCreateInstructorId] = useState('');
  const [newSlots, setNewSlots] = useState([
    { day_of_week: 'Monday', start_time: '09:00', end_time: '12:00', max_students: '10', equipment_note: '' }
  ]);
  const [creating, setCreating] = useState(false);

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
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (activeTab === 'slots') {
      fetchSlots();
    }
  }, [activeTab, weekStart, selectedBatchFilter, selectedInstructorFilter, statusFilter]);

  const fetchMasterData = async () => {
    setMasterLoading(true);
    try {
      const [bRes, uRes] = await Promise.all([
        api.get('/admin/batches').catch(() => ({ data: [] })),
        api.get('/admin/users?role=instructor').catch(() => ({ data: [] }))
      ]);
      const bList = bRes.data || [];
      const iList = uRes.data || [];
      setBatches(bList);
      setInstructors(iList);

      if (bList.length > 0 && !createBatchId) setCreateBatchId(bList[0]._id);
      if (iList.length > 0 && !createInstructorId) setCreateInstructorId(iList[0]._id);
    } catch (e) {
      console.log('Error fetching master data', e);
    } finally {
      setMasterLoading(false);
    }
  };

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedBatchFilter !== 'all') params.batchId = selectedBatchFilter;
      if (selectedInstructorFilter !== 'all') params.instructorId = selectedInstructorFilter;

      const res = await api.get('/instructors/practice-slots', { params });
      let data = res.data || [];

      if (statusFilter === 'open') {
        data = data.filter((s: any) => s.is_open);
      } else if (statusFilter === 'closed') {
        data = data.filter((s: any) => !s.is_open);
      }

      setSlots(data);
    } catch (e) {
      console.log('Error fetching practice slots', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSlots();
  };

  const changeWeek = (offset: number) => {
    const nd = new Date(weekStart);
    nd.setDate(nd.getDate() + offset * 7);
    setWeekStart(nd);
  };

  const toggleSlotStatus = (slot: any) => {
    setConfirmModal({
      visible: true,
      title: slot.is_open ? 'Lock Practical Slot?' : 'Reopen Practical Slot?',
      message: `This will ${slot.is_open ? 'close' : 'allow'} student bookings for this slot.`,
      type: slot.is_open ? 'lock' : 'info',
      confirmText: slot.is_open ? 'Lock Slot' : 'Reopen Slot',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.patch(`/instructors/practice-slots/${slot._id}`, { is_open: !slot.is_open });
          fetchSlots();
          showAlert('Success', `Practical slot ${slot.is_open ? 'locked' : 'reopened'} successfully!`, undefined, 'success');
        } catch (e: any) {
          showAlert('Error', e.response?.data?.message || 'Failed to update slot status', undefined, 'error');
        }
      }
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    setConfirmModal({
      visible: true,
      title: 'Delete Practical Slot',
      message: 'Are you sure you want to permanently remove this slot? All student bookings for this slot will be canceled.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(`/instructors/practice-slots/${slotId}`);
          fetchSlots();
          showAlert('Deleted', 'Slot removed successfully', undefined, 'success');
        } catch (e: any) {
          showAlert('Error', e.response?.data?.message || 'Failed to delete slot', undefined, 'error');
        }
      }
    });
  };

  const openBookingsModal = async (slot: any) => {
    setSelectedSlot(slot);
    setBookingsModalVisible(true);
    setBookingsLoading(true);
    try {
      const res = await api.get(`/instructors/practice-slots/${slot._id}/bookings`);
      setSlotBookings(res.data || []);
    } catch (e) {
      showAlert('Error', 'Failed to fetch slot bookings', undefined, 'error');
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleRemoveBooking = (bookingId: string, studentName: string) => {
    setConfirmModal({
      visible: true,
      title: 'Cancel Booking',
      message: `Remove ${studentName} from this practical slot?`,
      type: 'danger',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(`/instructors/practice-slots/${selectedSlot._id}/bookings/${bookingId}`);
          showAlert('Success', 'Student removed from slot', undefined, 'success');
          openBookingsModal(selectedSlot);
          fetchSlots();
        } catch (e) {
          showAlert('Error', 'Failed to remove booking', undefined, 'error');
        }
      }
    });
  };

  const openAddStudentModal = async () => {
    if (!selectedSlot?.batch_id?._id) return;
    setAddStudentModalVisible(true);
    setLoadingBatchStudents(true);
    try {
      const res = await api.get('/instructors/my-students');
      const bStudents = (res.data || [])
        .filter((e: any) => String(e.batch_id?._id || e.batch_id) === String(selectedSlot.batch_id._id))
        .map((e: any) => e.student_id)
        .filter(Boolean);
      setBatchStudents(bStudents);
    } catch (e) {
      console.log('Error loading batch students', e);
    } finally {
      setLoadingBatchStudents(false);
    }
  };

  const handleAssignStudent = async (studentId: string, studentName: string) => {
    try {
      await api.post(`/instructors/practice-slots/${selectedSlot._id}/bookings`, { student_id: studentId });
      Alert.alert('Success', `${studentName} assigned to slot!`);
      setAddStudentModalVisible(false);
      openBookingsModal(selectedSlot);
      fetchSlots();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to assign student');
    }
  };

  const openEditModal = (slot: any) => {
    setSelectedSlot(slot);
    setEditInstructorId(slot.instructor_id?._id || slot.instructor_id || '');
    setEditMaxStudents(String(slot.max_students || 10));
    setEditEquipmentNote(slot.equipment_note || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    const maxN = parseInt(editMaxStudents, 10);
    if (!maxN || maxN < 1) return Alert.alert('Validation Error', 'Max students must be at least 1');
    setEditSaving(true);
    try {
      await api.patch(`/instructors/practice-slots/${selectedSlot._id}`, {
        max_students: maxN,
        equipment_note: editEquipmentNote.trim(),
        instructor_id: editInstructorId || undefined
      });
      Alert.alert('Success', 'Practical slot updated!');
      setEditModalVisible(false);
      fetchSlots();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update slot');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateSlots = async () => {
    if (!createBatchId) return Alert.alert('Validation Error', 'Please select a target batch');
    if (!createInstructorId) return Alert.alert('Validation Error', 'Please select an assigned instructor');

    for (const s of newSlots) {
      if (!s.day_of_week || !s.start_time || !s.end_time) {
        return Alert.alert('Validation Error', 'Please complete day and time for all slots');
      }
      const maxN = parseInt(s.max_students, 10);
      if (!maxN || maxN < 1) return Alert.alert('Validation Error', 'Max capacity must be at least 1');
    }

    setCreating(true);
    try {
      await api.post('/instructors/practice-slots', {
        batch_id: createBatchId,
        week_start_date: getLocalDateString(weekStart),
        instructor_id: createInstructorId,
        slots: newSlots.map(s => ({
          ...s,
          instructor_id: createInstructorId,
          max_students: parseInt(s.max_students, 10)
        }))
      });
      Alert.alert('Success', `${newSlots.length} practical slot(s) created successfully!`, [
        {
          text: 'View All Slots',
          onPress: () => {
            setActiveTab('slots');
            setNewSlots([{ day_of_week: 'Monday', start_time: '09:00', end_time: '12:00', max_students: '10', equipment_note: '' }]);
          }
        }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create practical slots');
    } finally {
      setCreating(false);
    }
  };

  const updateNewSlot = (index: number, field: string, value: string) => {
    const updated = [...newSlots];
    (updated[index] as any)[field] = value;
    setNewSlots(updated);
  };

  const removeNewSlotRow = (index: number) => {
    setNewSlots(newSlots.filter((_, i) => i !== index));
  };

  const totalBooked = slots.reduce((sum, s) => sum + (s.booked_count || 0), 0);
  const openCount = slots.filter(s => s.is_open).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Practical Slots Control</Text>
          <Text style={styles.headerSubtitle}>Manage lab stations, instructor schedules, & student bookings.</Text>
        </View>
      </View>

      {/* Main Mode Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'slots' && styles.activeTabItem]}
          onPress={() => setActiveTab('slots')}
        >
          <Icon name="calendar" size={17} color={activeTab === 'slots' ? '#D97706' : '#6B7280'} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, activeTab === 'slots' && styles.activeTabText]}>All Practical Slots ({slots.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'create' && styles.activeTabItem]}
          onPress={() => setActiveTab('create')}
        >
          <Icon name="add-circle" size={17} color={activeTab === 'create' ? '#D97706' : '#6B7280'} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>+ Create Slots</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'slots' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D97706']} />}>
          {/* Quick Metrics Bar */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{slots.length}</Text>
              <Text style={styles.metricLabel}>Total Slots</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: '#10B981' }]}>{openCount}</Text>
              <Text style={styles.metricLabel}>Open Slots</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: '#2563EB' }]}>{totalBooked}</Text>
              <Text style={styles.metricLabel}>Booked Seats</Text>
            </View>
          </View>

          {/* Filter Bar Section */}
          <View style={styles.filterSection}>
            {/* Batch Filter */}
            <Text style={styles.filterGroupLabel}>FILTER BY BATCH</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.filterPill, selectedBatchFilter === 'all' && styles.filterPillActive]}
                onPress={() => setSelectedBatchFilter('all')}
              >
                <Text style={selectedBatchFilter === 'all' ? styles.filterPillTextActive : styles.filterPillText}>All Batches</Text>
              </TouchableOpacity>
              {batches.map(b => (
                <TouchableOpacity
                  key={b._id}
                  style={[styles.filterPill, selectedBatchFilter === b._id && styles.filterPillActive]}
                  onPress={() => setSelectedBatchFilter(b._id)}
                >
                  <Text style={selectedBatchFilter === b._id ? styles.filterPillTextActive : styles.filterPillText}>
                    {b.name || 'Batch'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Instructor Filter */}
            <Text style={styles.filterGroupLabel}>FILTER BY INSTRUCTOR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.filterPill, selectedInstructorFilter === 'all' && styles.filterPillActive]}
                onPress={() => setSelectedInstructorFilter('all')}
              >
                <Text style={selectedInstructorFilter === 'all' ? styles.filterPillTextActive : styles.filterPillText}>All Instructors</Text>
              </TouchableOpacity>
              {instructors.map(inst => (
                <TouchableOpacity
                  key={inst._id}
                  style={[styles.filterPill, selectedInstructorFilter === inst._id && styles.filterPillActive]}
                  onPress={() => setSelectedInstructorFilter(inst._id)}
                >
                  <Text style={selectedInstructorFilter === inst._id ? styles.filterPillTextActive : styles.filterPillText}>
                    Inst. {inst.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Status Filter */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.statusPill, statusFilter === 'all' && styles.statusPillActive]}
                onPress={() => setStatusFilter('all')}
              >
                <Text style={statusFilter === 'all' ? styles.statusPillTextActive : styles.statusPillText}>All Status</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusPill, statusFilter === 'open' && styles.statusPillActive]}
                onPress={() => setStatusFilter('open')}
              >
                <Text style={statusFilter === 'open' ? styles.statusPillTextActive : styles.statusPillText}>Open Only</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusPill, statusFilter === 'closed' && styles.statusPillActive]}
                onPress={() => setStatusFilter('closed')}
              >
                <Text style={statusFilter === 'closed' ? styles.statusPillTextActive : styles.statusPillText}>Closed Only</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Slot Cards List */}
          {loading ? (
            <ActivityIndicator size="large" color="#D97706" style={{ marginTop: 30 }} />
          ) : slots.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="calendar-outline" size={54} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No practical slots found.</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your batch/instructor filters or create a new slot.</Text>
            </View>
          ) : (
            slots.map(slot => {
              const booked = slot.booked_count || 0;
              const max = slot.max_students || 1;
              const fillRatio = Math.min(1, booked / max);
              const actualDate = getSlotActualDate(slot.week_start_date, slot.day_of_week);
              const formattedDate = actualDate.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

              return (
                <View key={slot._id} style={styles.slotCard}>
                  <View style={styles.cardAccentBar} />
                  <View style={styles.cardMain}>
                    {/* Header Row */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <View style={styles.slotBadge}>
                            <Text style={styles.slotBadgeText}>PRACTICE SLOT</Text>
                          </View>
                          <View style={[styles.statusBadge, slot.is_open ? styles.statusBadgeOpen : styles.statusBadgeClosed]}>
                            <Text style={[styles.statusBadgeText, slot.is_open ? styles.statusTextOpen : styles.statusTextClosed]}>
                              {slot.is_open ? 'OPEN' : 'LOCKED'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.courseTitle}>
                          {slot.batch_id?.course_id?.title || slot.batch_id?.name || 'Practical Session'}
                        </Text>
                        <Text style={styles.batchSubtext}>Batch: {slot.batch_id?.name || 'N/A'}</Text>
                      </View>
                    </View>

                    {/* Date & Instructor Info */}
                    <View style={styles.infoRow}>
                      <Icon name="calendar-outline" size={15} color="#D97706" style={{ marginRight: 6 }} />
                      <Text style={styles.infoDateText}>{formattedDate}</Text>
                      <Text style={styles.dotSeparator}>•</Text>
                      <Icon name="time-outline" size={15} color="#666" style={{ marginRight: 4 }} />
                      <Text style={styles.infoText}>{slot.start_time} – {slot.end_time}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Icon name="person-outline" size={15} color="#2563EB" style={{ marginRight: 6 }} />
                      <Text style={[styles.infoText, { color: '#1E40AF', fontWeight: 'bold' }]}>
                        Inst. {slot.instructor_id?.name || 'Assigned Instructor'}
                      </Text>
                    </View>

                    {slot.equipment_note ? (
                      <View style={styles.noteBox}>
                        <Icon name="hardware-chip-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                        <Text style={styles.noteText}>{slot.equipment_note}</Text>
                      </View>
                    ) : null}

                    {/* Seats Capacity Progress Bar */}
                    <View style={styles.seatsContainer}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.seatsText}>Capacity: {booked} / {max} Booked</Text>
                        <Text style={styles.seatsPct}>{Math.round(fillRatio * 100)}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFillBar, { width: `${fillRatio * 100}%`, backgroundColor: fillRatio >= 1 ? '#EF4444' : '#F97316' }]} />
                      </View>
                    </View>

                    {/* Card Actions Bar */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity style={styles.actionBtnOutline} onPress={() => openBookingsModal(slot)}>
                        <Icon name="people" size={15} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>Students ({booked})</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionBtnOutline} onPress={() => openEditModal(slot)}>
                        <Icon name="create-outline" size={15} color="#4B5563" style={{ marginRight: 4 }} />
                        <Text style={styles.actionBtnText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionBtnOutline} onPress={() => toggleSlotStatus(slot)}>
                        <Icon name={slot.is_open ? 'lock-closed-outline' : 'lock-open-outline'} size={15} color={slot.is_open ? '#DC2626' : '#16A34A'} style={{ marginRight: 4 }} />
                        <Text style={[styles.actionBtnText, { color: slot.is_open ? '#DC2626' : '#16A34A' }]}>
                          {slot.is_open ? 'Lock' : 'Open'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDeleteSlot(slot._id)}>
                        <Icon name="trash-outline" size={15} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* CREATE NEW SLOTS TAB */
        <ScrollView style={styles.createScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.formSectionTitle}>1. Target Batch & Instructor</Text>

          <Text style={styles.fieldLabel}>SELECT BATCH *</Text>
          <View style={styles.pillsWrap}>
            {batches.map(b => (
              <TouchableOpacity
                key={b._id}
                style={[styles.selectPill, createBatchId === b._id && styles.selectPillActive]}
                onPress={() => setCreateBatchId(b._id)}
              >
                <Text style={createBatchId === b._id ? styles.selectPillTextActive : styles.selectPillText}>
                  {b.name || 'Batch'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>ASSIGN INSTRUCTOR *</Text>
          <View style={styles.pillsWrap}>
            {instructors.map(inst => (
              <TouchableOpacity
                key={inst._id}
                style={[styles.selectPill, createInstructorId === inst._id && styles.selectPillActive]}
                onPress={() => setCreateInstructorId(inst._id)}
              >
                <Text style={createInstructorId === inst._id ? styles.selectPillTextActive : styles.selectPillText}>
                  Inst. {inst.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formSectionTitle}>2. Slot Details & Schedule</Text>

          {newSlots.map((slot, idx) => (
            <View key={idx} style={styles.newSlotCard}>
              <View style={styles.newSlotHeader}>
                <Text style={styles.newSlotTitle}>Practical Slot #{idx + 1}</Text>
                {newSlots.length > 1 && (
                  <TouchableOpacity onPress={() => removeNewSlotRow(idx)}>
                    <Icon name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.fieldLabel}>DAY OF WEEK *</Text>
              <View style={styles.daysWrap}>
                {DAYS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayPill, slot.day_of_week === d && styles.dayPillActive]}
                    onPress={() => updateNewSlot(idx, 'day_of_week', d)}
                  >
                    <Text style={slot.day_of_week === d ? styles.dayPillTextActive : styles.dayPillText}>
                      {d.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>START TIME *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="09:00"
                    value={slot.start_time}
                    onChangeText={t => updateNewSlot(idx, 'start_time', t)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>END TIME *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="12:00"
                    value={slot.end_time}
                    onChangeText={t => updateNewSlot(idx, 'end_time', t)}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>MAX CAPACITY (STUDENTS) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="10"
                keyboardType="numeric"
                value={slot.max_students}
                onChangeText={t => updateNewSlot(idx, 'max_students', t)}
              />

              <Text style={styles.fieldLabel}>EQUIPMENT / LAB STATION NOTE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Micro-soldering Workstation Bay 1"
                value={slot.equipment_note}
                onChangeText={t => updateNewSlot(idx, 'equipment_note', t)}
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.addMoreBtn}
            onPress={() => setNewSlots([...newSlots, { day_of_week: 'Monday', start_time: '09:00', end_time: '12:00', max_students: '10', equipment_note: '' }])}
          >
            <Icon name="add-circle-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={styles.addMoreText}>Add Another Slot Row</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitCreateBtn, creating && { opacity: 0.6 }]}
            onPress={handleCreateSlots}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitCreateBtnText}>Create {newSlots.length} Practical Slot{newSlots.length > 1 ? 's' : ''}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STUDENT BOOKINGS MODAL */}
      <Modal visible={bookingsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Slot Bookings</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedSlot?.day_of_week} ({selectedSlot?.start_time} - {selectedSlot?.end_time})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBookingsModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Action Bar inside Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', color: '#1F2937', fontSize: 14 }}>
                Booked Students ({slotBookings.length})
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#EFF6FF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#BFDBFE'
                }}
                onPress={openAddStudentModal}
              >
                <Icon name="person-add" size={14} color="#2563EB" style={{ marginRight: 4 }} />
                <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 12 }}>+ Assign Student</Text>
              </TouchableOpacity>
            </View>

            {bookingsLoading ? (
              <ActivityIndicator size="large" color="#D97706" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={slotBookings}
                keyExtractor={item => item._id}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Icon name="people-outline" size={44} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No students booked yet.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.bookingRowItem}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>
                        {item.student_id?.name?.charAt(0)?.toUpperCase() || 'S'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{item.student_id?.name || 'Student'}</Text>
                      <Text style={styles.studentMeta}>
                        Index: {item.student_id?.index_number || 'N/A'} • {item.student_id?.phone || item.student_id?.email || ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBookingBtn}
                      onPress={() => handleRemoveBooking(item._id, item.student_id?.name || 'Student')}
                    >
                      <Text style={styles.removeBookingText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ASSIGN STUDENT SUB-MODAL */}
      <Modal visible={addStudentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '75%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Student to Slot</Text>
              <TouchableOpacity onPress={() => setAddStudentModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {loadingBatchStudents ? (
              <ActivityIndicator size="large" color="#D97706" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={batchStudents}
                keyExtractor={item => item._id}
                ListEmptyComponent={<Text style={styles.emptyTitle}>No enrolled students found in this batch.</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.assignStudentRow}
                    onPress={() => handleAssignStudent(item._id, item.name)}
                  >
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>{item.name?.charAt(0) || 'S'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{item.name}</Text>
                      <Text style={styles.studentMeta}>{item.index_number || item.phone || item.email}</Text>
                    </View>
                    <Text style={{ color: '#2563EB', fontWeight: 'bold' }}>Assign +</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* EDIT SLOT MODAL */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Practical Slot</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>ASSIGNED INSTRUCTOR</Text>
            <View style={styles.pillsWrap}>
              {instructors.map(inst => (
                <TouchableOpacity
                  key={inst._id}
                  style={[styles.selectPill, editInstructorId === inst._id && styles.selectPillActive]}
                  onPress={() => setEditInstructorId(inst._id)}
                >
                  <Text style={editInstructorId === inst._id ? styles.selectPillTextActive : styles.selectPillText}>
                    Inst. {inst.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>MAX CAPACITY (STUDENTS)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={editMaxStudents}
              onChangeText={setEditMaxStudents}
            />

            <Text style={styles.fieldLabel}>EQUIPMENT NOTE</Text>
            <TextInput
              style={[styles.textInput, { marginBottom: 20 }]}
              value={editEquipmentNote}
              onChangeText={setEditEquipmentNote}
            />

            <TouchableOpacity style={styles.submitCreateBtn} onPress={handleSaveEdit} disabled={editSaving}>
              {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitCreateBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CUSTOM IN-APP CONFIRMATION POPUP MODAL */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={[
              styles.popupIconCircle,
              { backgroundColor: confirmModal.type === 'danger' ? '#FEE2E2' : confirmModal.type === 'lock' ? '#FEF3C7' : '#EFF6FF' }
            ]}>
              <Icon
                name={
                  confirmModal.type === 'danger'
                    ? 'trash-outline'
                    : confirmModal.type === 'lock'
                    ? 'lock-closed-outline'
                    : 'alert-circle-outline'
                }
                size={28}
                color={
                  confirmModal.type === 'danger'
                    ? '#DC2626'
                    : confirmModal.type === 'lock'
                    ? '#D97706'
                    : '#2563EB'
                }
              />
            </View>
            <Text style={styles.popupTitle}>{confirmModal.title}</Text>
            <Text style={styles.popupMessage}>{confirmModal.message}</Text>
            <View style={styles.popupBtnRow}>
              <TouchableOpacity
                style={styles.popupCancelBtn}
                onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.popupCancelText}>{confirmModal.cancelText || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.popupConfirmBtn,
                  { backgroundColor: confirmModal.type === 'danger' ? '#DC2626' : confirmModal.type === 'lock' ? '#D97706' : '#2563EB' }
                ]}
                onPress={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(prev => ({ ...prev, visible: false }));
                  if (action) action();
                }}
              >
                <Text style={styles.popupConfirmText}>{confirmModal.confirmText || 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                { backgroundColor: alertModal.type === 'error' ? '#DC2626' : alertModal.type === 'success' ? '#16A34A' : '#D97706' }
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabItem: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabItem: { borderBottomColor: '#D97706' },
  tabText: { fontSize: 13.5, fontWeight: 'bold', color: '#64748B' },
  activeTabText: { color: '#D97706' },
  scrollContent: { padding: 16, paddingBottom: 60 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  metricCard: { backgroundColor: '#FFFFFF', flex: 1, marginHorizontal: 4, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  metricNumber: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  metricLabel: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  filterSection: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  filterGroupLabel: { fontSize: 11, fontWeight: 'bold', color: '#475569', marginBottom: 6, letterSpacing: 0.5 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', marginRight: 8 },
  filterPillActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  filterPillText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  filterPillTextActive: { fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F1F5F9', marginRight: 8 },
  statusPillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  statusPillText: { fontSize: 11.5, color: '#475569', fontWeight: '500' },
  statusPillTextActive: { fontSize: 11.5, color: '#FFFFFF', fontWeight: 'bold' },
  slotCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 14, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  cardAccentBar: { width: 6, backgroundColor: '#F58220' },
  cardMain: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  slotBadge: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6 },
  slotBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#D97706' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeOpen: { backgroundColor: '#DCFCE7' },
  statusBadgeClosed: { backgroundColor: '#FEE2E2' },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  statusTextOpen: { color: '#15803D' },
  statusTextClosed: { color: '#B91C1C' },
  courseTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginTop: 4 },
  batchSubtext: { fontSize: 12.5, color: '#64748B', marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  infoDateText: { fontSize: 13.5, fontWeight: 'bold', color: '#D97706' },
  infoText: { fontSize: 13, color: '#475569' },
  dotSeparator: { color: '#CBD5E1', marginHorizontal: 6, fontSize: 12 },
  noteBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  noteText: { fontSize: 12, color: '#475569', fontStyle: 'italic' },
  seatsContainer: { marginTop: 10 },
  seatsText: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
  seatsPct: { fontSize: 12, fontWeight: 'bold', color: '#64748B' },
  progressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressFillBar: { height: 6, borderRadius: 3 },
  cardActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtnOutline: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flex: 1, justifyContent: 'center' },
  actionBtnText: { fontSize: 11.5, fontWeight: 'bold', color: '#475569' },
  actionBtnDanger: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  createScroll: { flex: 1, padding: 16 },
  formSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginTop: 8, marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: 'bold', color: '#475569', marginTop: 10, marginBottom: 6, letterSpacing: 0.5 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  selectPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  selectPillActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  selectPillText: { fontSize: 12.5, color: '#334155', fontWeight: '500' },
  selectPillTextActive: { fontSize: 12.5, color: '#FFFFFF', fontWeight: 'bold' },
  newSlotCard: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  newSlotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newSlotTitle: { fontSize: 14.5, fontWeight: 'bold', color: '#0F172A' },
  daysWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  dayPillActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  dayPillText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  dayPillTextActive: { fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D97706', borderRadius: 10, marginBottom: 16 },
  addMoreText: { color: '#D97706', fontWeight: 'bold', fontSize: 14 },
  submitCreateBtn: { backgroundColor: '#D97706', paddingVertical: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  submitCreateBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { alignItems: 'center', marginVertical: 30, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#475569', marginTop: 10 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  bookingRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  studentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  studentAvatarText: { fontWeight: 'bold', color: '#1E40AF', fontSize: 15 },
  studentName: { fontSize: 14.5, fontWeight: 'bold', color: '#0F172A' },
  studentMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  removeBookingBtn: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#FCA5A5' },
  removeBookingText: { color: '#DC2626', fontSize: 12, fontWeight: 'bold' },
  assignStudentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
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
  popupBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  popupCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  popupCancelText: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 14
  },
  popupConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  popupConfirmText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
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
