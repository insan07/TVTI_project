import { KeyboardAvoidingView } from "../../components/shared/KeyboardForm";
import { KeyboardScrollView as ScrollView, KeyboardTextInput as TextInput } from '../../components/shared/KeyboardForm';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, RefreshControl, Platform, Animated } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  PickerField,
  DatePickerModal,
  TimePickerModal,
} from '../../components/shared/DateTimePickerModals';
import api from '../../services/api';
import { updatePracticeSlot, getSlotBookings } from '../../services/practiceService';
import MainPageHeader from '../../components/shared/MainPageHeader';
import ScheduleOverview, { scheduleOverviewStyles } from '../../components/schedule/ScheduleOverview';
import ScheduleSlotCard from '../../components/schedule/ScheduleSlotCard';
import ScreenBackground from '../../components/shared/ScreenBackground';
import WhatsAppOptionsMenu, { MenuOption } from '../../components/shared/WhatsAppOptionsMenu';
import { useTheme } from '../../context/ThemeContext';
import { isPracticalExpired, instituteDateKey, instituteWallTime } from '../../utils/practicalTime';
import usePracticalClock from '../../hooks/usePracticalClock';
import { scheduleToday } from '../../utils/scheduleViews';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  const diff = DAYS.indexOf(dayOfWeek);
  const slotDate = new Date(weekStart);
  if (diff !== -1) {
    slotDate.setDate(slotDate.getDate() + diff);
  }
  return slotDate;
};

const isPastDate = (date: Date) => {
  return getLocalDateString(date) < instituteDateKey();
};

const isSlotDateTimeInPast = (date: Date, endTimeStr?: string) => {
  return instituteWallTime(date, endTimeStr || '23:59') <= Date.now();
};

export default function PracticeSessionsScreen() {
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day' | 'List'>('List');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(scheduleToday()));
  const [selectedDate, setSelectedDate] = useState<Date>(scheduleToday);

  const [slots, setSlots] = useState<any[]>([]);
  const now = usePracticalClock(slots);
  const [loading, setLoading] = useState(true);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [masterError, setMasterError] = useState<string | null>(null);
  const slotRequest = useRef(0);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<{ [key: string]: boolean }>({
    open: true, full: true, locked: true, completed: true, cancelled: true
  });
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // Master Data
  const [batches, setBatches] = useState<any[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);

  // Modals & Sub-modals (Same as original but styled to fit new theme if needed)
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingsModalVisible, setBookingsModalVisible] = useState(false);
  const [slotBookings, setSlotBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMaxStudents, setEditMaxStudents] = useState('');
  const [editEquipmentNote, setEditEquipmentNote] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [confirmModal, setConfirmModal] = useState<any>({ visible: false, title: '', message: '', onConfirm: () => { } });
  const [alertModal, setAlertModal] = useState<any>({ visible: false, title: '', message: '' });

  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuSlot, setActionMenuSlot] = useState<any>(null);

  const openSlotActions = (slot: any) => {
    setActionMenuSlot(slot);
    setActionMenuVisible(true);
  };

  const isSlotExpired = (slot: any) => {
    return isPracticalExpired(slot, now);
  };

  const openEditModal = (slot: any) => {
    if (isSlotExpired(slot)) {
      return showAlert('Expired Slot', 'Expired practical slots cannot be edited.', undefined, 'error');
    }
    setSelectedSlot(slot);
    setEditMaxStudents(slot.max_students?.toString() || '');
    setEditEquipmentNote(slot.equipment_note || '');
    setEditLocation(slot.location || '');
    setEditModalVisible(true);
  };

  const saveEditSlot = async () => {
    if (!selectedSlot) return;
    const capacity = Number(editMaxStudents);
    if (!Number.isInteger(capacity) || capacity < 1) return showAlert('Invalid capacity', 'Enter a positive whole number of students.', undefined, 'error');
    setEditSaving(true);
    try {
      await updatePracticeSlot(selectedSlot._id, {
        max_students: capacity,
        equipment_note: editEquipmentNote,
        location: editLocation
      });
      setEditModalVisible(false);
      fetchSlots();
      showAlert('Success', 'Slot updated successfully', undefined, 'success');
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to update slot', undefined, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleViewBookings = async (slot: any) => {
    setSelectedSlot(slot);
    setBookingsModalVisible(true);
    setBookingsLoading(true);
    try {
      const res = await getSlotBookings(slot._id);
      setSlotBookings(res);
    } catch (e) {
      console.log('Error fetching bookings', e);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleApproveCancellation = async (bookingId: string) => {
    try {
      await api.post(`/instructors/practice-slots/${selectedSlot._id}/bookings/${bookingId}/approve-cancellation`);
      showAlert('Success', 'Cancellation approved', () => handleViewBookings(selectedSlot), 'success');
      fetchSlots();
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to approve cancellation', undefined, 'error');
    }
  };

  const handleRejectCancellation = async (bookingId: string) => {
    try {
      await api.post(`/instructors/practice-slots/${selectedSlot._id}/bookings/${bookingId}/reject-cancellation`);
      showAlert('Success', 'Cancellation rejected', () => handleViewBookings(selectedSlot), 'success');
      fetchSlots();
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to reject cancellation', undefined, 'error');
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
          showAlert('Success', 'Student removed from slot', () => handleViewBookings(selectedSlot), 'success');
          fetchSlots();
        } catch (e: any) {
          showAlert('Error', e.response?.data?.message || 'Failed to remove booking', undefined, 'error');
        }
      }
    });
  };

  // Create Form State
  const [createCourseId, setCreateCourseId] = useState('all');
  const [createBatchId, setCreateBatchId] = useState('all');
  const [createDate, setCreateDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerPurpose, setDatePickerPurpose] = useState<'create' | 'navigate'>('create');
  const [timePickerField, setTimePickerField] = useState<'start' | 'end' | null>(null);
  const [createStartTime, setCreateStartTime] = useState('09:00');
  const [createEndTime, setCreateEndTime] = useState('12:00');
  const [createLocation, setCreateLocation] = useState('');
  const [createCapacity, setCreateCapacity] = useState('10');
  const [createNotes, setCreateNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const handleTimeSelect = (selectedTimeStr: string) => {
    if (timePickerField === 'start') {
      setCreateStartTime(selectedTimeStr);
    } else if (timePickerField === 'end') {
      setCreateEndTime(selectedTimeStr);
    }
    setTimePickerField(null);
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [weekStart, selectedDate, viewMode]);

  const showAlert = (title: string, msg: string, onOk?: () => void, type = 'info') => {
    setAlertModal({ visible: true, title, message: msg, type, onOk });
  };

  const fetchMasterData = async () => {
    setMasterLoading(true);
    setMasterError(null);
    try {
      const res = await api.get('/instructors/my-schedule');
      const bList = res.data || [];
      setBatches(bList);
      if (bList.length > 0) setCreateBatchId(bList[0]._id);
    } catch (e) {
      console.log('Error fetching instructor batches', e);
      setMasterError('Courses could not be loaded. Please try again.');
    } finally {
      setMasterLoading(false);
    }
  };

  const fetchSlots = async () => {
    const request = ++slotRequest.current;
    setLoading(true);
    setSlotError(null);
    try {
      const params: any = {};
      if (viewMode === 'Month') {
        const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        // week_start_date represents the Monday of the week. So to get all slots that fall in this month, 
        // we might need to fetch weeks that start a bit before the month (e.g., late previous month).
        // To be safe, we pad the start and end by 7 days.
        start.setDate(start.getDate() - 7);
        const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 7);
        params.startDate = getLocalDateString(start);
        params.endDate = getLocalDateString(end);
      } else if (viewMode === 'Week' || viewMode === 'Day') {
        params.weekStart = getLocalDateString(weekStart);
      }
      // When viewMode === 'List', omit weekStart & date range so all practical slots are retrieved

      const res = await api.get('/instructors/practice-slots', { params });
      let data = res.data || [];

      // Newest session date and start time first.
      data.sort((a: any, b: any) => {
        const dateA = getSlotActualDate(a.week_start_date, a.day_of_week).getTime();
        const dateB = getSlotActualDate(b.week_start_date, b.day_of_week).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.start_time || '').localeCompare(a.start_time || '');
      });

      if (request === slotRequest.current) setSlots(data);
    } catch (e) {
      if (request === slotRequest.current) { setSlots([]); setSlotError('Practice sessions could not be loaded. Please try again.'); }
    } finally {
      if (request === slotRequest.current) { setLoading(false); setRefreshing(false); }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSlots();
  };

  const toggleSlotStatus = (slot: any) => {
    if (isSlotExpired(slot)) {
      return showAlert('Expired Slot', 'Expired practical slots cannot be locked or reopened.', undefined, 'error');
    }
    setConfirmModal({
      visible: true,
      title: slot.is_open ? 'Lock Practical Slot?' : 'Reopen Practical Slot?',
      message: `This will ${slot.is_open ? 'close' : 'allow'} student bookings.`,
      type: slot.is_open ? 'lock' : 'info',
      confirmText: slot.is_open ? 'Lock Slot' : 'Reopen Slot',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await updatePracticeSlot(slot._id, { is_open: !slot.is_open });
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
      message: 'Are you sure you want to permanently remove this slot?',
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

  const handleCreateSlot = async () => {
    if (!createBatchId || createBatchId === 'all') return showAlert('Validation Error', 'Please select a batch', undefined, 'error');
    if (!createStartTime || !createEndTime) return showAlert('Validation Error', 'Please complete time', undefined, 'error');

    if (isPastDate(createDate)) {
      return showAlert('Past Date', 'Cannot create a practical slot for a past date. Past dates are view-only.', undefined, 'error');
    }

    if (isSlotDateTimeInPast(createDate, createStartTime)) {
      return showAlert('Past Time', 'The session must start in the future.', undefined, 'error');
    }

    if (createStartTime >= createEndTime) return showAlert('Invalid time', 'End time must be after start time.', undefined, 'error');
    const capacity = Number(createCapacity);
    if (!Number.isInteger(capacity) || capacity < 1) return showAlert('Invalid capacity', 'Enter a positive whole number of students.', undefined, 'error');

    setCreating(true);
    try {
      const dayOfWeek = DAYS[createDate.getDay() === 0 ? 6 : createDate.getDay() - 1];
      const slotData = {
        batch_id: createBatchId,
        week_start_date: getLocalDateString(getMonday(createDate)),
        slots: [{
          day_of_week: dayOfWeek,
          start_time: createStartTime,
          end_time: createEndTime,
          max_students: capacity,
          equipment_note: createNotes,
          location: createLocation
        }]
      };
      await api.post('/instructors/practice-slots', slotData);
      setCreateModalVisible(false);
      showAlert('Success', 'Practical slot created successfully!', () => {
        fetchSlots();
      }, 'success');
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to create practical slot', undefined, 'error');
    } finally {
      setCreating(false);
    }
  };

  // UI Renderers
  const renderListCard = (slot: any) => {
    const isExpired = isSlotExpired(slot);
    const menuOptions: MenuOption[] = [
      {
        id: 'view_students',
        label: 'View Students',
        onPress: () => handleViewBookings(slot),
      },
      ...(!isExpired
        ? [
            {
              id: 'edit_slot',
              label: 'Edit Slot',
              onPress: () => openEditModal(slot),
            },
            {
              id: 'toggle_status',
              label: slot.is_open ? 'Lock Slot' : 'Open Slot',
              destructive: !!slot.is_open,
              onPress: () => toggleSlotStatus(slot),
            },
          ]
        : []),
      {
        id: 'delete_slot',
        label: 'Delete Slot',
        destructive: true,
        onPress: () => handleDeleteSlot(slot._id),
      },
    ];

    return <ScheduleSlotCard key={slot._id} slot={slot} now={now} menuOptions={menuOptions}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View students for ${slot.batch_id?.course_id?.title || 'this session'}`}
        onPress={() => handleViewBookings(slot)} style={scheduleOverviewStyles.manageButton}>
        <Icon name="people-outline" size={17} color="#FFFFFF" />
        <Text style={scheduleOverviewStyles.manageButtonText}>View students</Text>
      </TouchableOpacity>
    </ScheduleSlotCard>;
  };

  const openCreateScheduleSlot = () => {
    const date = isPastDate(selectedDate) ? new Date() : selectedDate;
    setCreateDate(date);
    if (selectedBatchFilter !== 'all') setCreateBatchId(selectedBatchFilter);
    if (isPastDate(weekStart)) setWeekStart(getMonday(date));
    setCreateModalVisible(true);
  };
  const overviewSlots = slots.filter(slot => selectedBatchFilter === 'all' || String(slot.batch_id?._id || slot.batch_id) === selectedBatchFilter);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0B0F19' : '#F5F6F8' }]}>
      <ScreenBackground />
      <MainPageHeader title="Schedule" showBack={false} />
      <ScheduleOverview collapseControls batches={batches} selectedBatchId={selectedBatchFilter === 'all' ? null : selectedBatchFilter}
        onBatchSelect={id => { setSelectedBatchFilter(id || 'all'); setSelectedCourseFilter('all'); }}
        slots={overviewSlots} renderSlot={renderListCard}
        loading={loading || masterLoading} error={masterError || slotError}
        onRetry={() => { void fetchMasterData(); void fetchSlots(); }}
        onRefresh={onRefresh} refreshing={refreshing} onCreate={openCreateScheduleSlot}
        viewMode={viewMode} selectedDate={selectedDate} onViewChange={setViewMode}
        onDateChange={date => { setSelectedDate(date); setWeekStart(getMonday(date)); }}
        emptyMessage="No batches are available for this schedule." />

      {/* POP-UP MODAL FOR CREATE SLOT */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.78)' }]}>
          <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
            <View style={[styles.modalHeaderRow, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.10)' }]}>
              <Text style={[styles.modalTitleText, isDark && { color: '#FFFFFF' }]}>Create Practical Slot</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={[styles.closeModalIconBtn, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.10)' }]}>
                <Icon name="close" size={20} color={isDark ? '#FFFFFF' : '#4B5563'} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
              <Text style={[styles.createFormSubtitle, isDark && { color: '#A89F93' }]}>Add a new practical training session</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, isDark && { color: '#D4CAC0' }]}><Icon name="people-outline" size={14} /> Batch *</Text>
                <View style={styles.pickerWrap}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {batches.map(b => (
                      <TouchableOpacity key={b._id} style={[styles.pillsForm, isDark && styles.pillsFormDark, createBatchId === b._id && styles.pillsFormActive]} onPress={() => setCreateBatchId(b._id)}>
                        <Text style={[styles.pillsFormText, isDark && { color: '#A89F93' }, createBatchId === b._id && { color: '#fff' }]}>{b.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, isDark && { color: '#D4CAC0' }]}><Icon name="calendar-outline" size={14} /> Practical Date *</Text>
                <PickerField
                  icon="calendar"
                  isDark={isDark}
                  label={createDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  onPress={() => {
                    setDatePickerPurpose('create');
                    setShowDatePicker(true);
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, flexWrap: 'wrap', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: isDark ? '#A89F93' : '#64748B', fontWeight: '500' }}>
                    Selected: <Text style={{ fontWeight: '700', color: isDark ? '#FB923C' : '#FF5E14' }}>{createDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}
                      onPress={() => setCreateDate(new Date())}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#CBD5E1' : '#475569' }}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}
                      onPress={() => {
                        const tom = new Date();
                        tom.setDate(tom.getDate() + 1);
                        setCreateDate(tom);
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#CBD5E1' : '#475569' }}>Tomorrow</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.rowGroup}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, isDark && { color: '#D4CAC0' }]}>Start Time *</Text>
                  <PickerField
                    icon="time-outline"
                    isDark={isDark}
                    label={createStartTime || 'Select'}
                    onPress={() => setTimePickerField('start')}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={[styles.label, isDark && { color: '#D4CAC0' }]}>End Time *</Text>
                  <PickerField
                    icon="time-outline"
                    isDark={isDark}
                    label={createEndTime || 'Select'}
                    onPress={() => setTimePickerField('end')}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, isDark && { color: '#D4CAC0' }]}><Icon name="location-outline" size={14} /> Location / Lab *</Text>
                <TextInput style={[styles.textInputBox, isDark && styles.textInputBoxDark]} value={createLocation} onChangeText={setCreateLocation} placeholder="Hardware Lab 01" placeholderTextColor={isDark ? '#8A7D71' : '#9CA3AF'} />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, isDark && { color: '#D4CAC0' }]}><Icon name="person-outline" size={14} /> Capacity *</Text>
                <TextInput style={[styles.textInputBox, isDark && styles.textInputBoxDark]} value={createCapacity} onChangeText={setCreateCapacity} keyboardType="numeric" placeholderTextColor={isDark ? '#8A7D71' : '#9CA3AF'} />
              </View>

              <View style={styles.createActionsRow}>
                <TouchableOpacity style={[styles.cancelBtn, isDark && styles.cancelBtnDark]} onPress={() => setCreateModalVisible(false)}>
                  <Text style={[styles.cancelBtnText, isDark && { color: '#A89F93' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#FF5E14' }]} onPress={handleCreateSlot} disabled={creating}>
                  {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Slot</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
</Modal>

      <Modal visible={showFilter} animationType="slide" transparent>
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.filterHeader}>
              <TouchableOpacity onPress={() => setShowFilter(false)}><Icon name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
              <Text style={styles.filterTitle}>Filters</Text>
            </View>
            <ScrollView style={{ padding: 16 }}>
              <Text style={styles.filterSectionTitle}>Course</Text>
              <View style={styles.pickerBox}><Text>All Courses</Text></View>

              <Text style={[styles.filterSectionTitle, { marginTop: 20 }]}>Batch</Text>
              <View style={styles.pickerBox}><Text>All Batches</Text></View>

              <Text style={[styles.filterSectionTitle, { marginTop: 20 }]}>Status</Text>
              {Object.keys(statusFilter).map(k => (
                <TouchableOpacity key={k} style={styles.checkboxRow} onPress={() => setStatusFilter({ ...statusFilter, [k]: !statusFilter[k] })}>
                  <View style={[styles.checkbox, statusFilter[k] && styles.checkboxActive]}>
                    {statusFilter[k] && <Icon name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.filterFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={() => setShowFilter(false)}><Text style={styles.resetBtnText}>Reset</Text></TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilter(false)}><Text style={styles.applyBtnText}>Apply</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={editModalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.78)' }]}>
          <View style={[[styles.modalContent, isDark && styles.modalCardDark], { maxHeight: '100%', flexShrink: 1 }]}>
            <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
              <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>Edit Slot</Text>
              <Text style={[styles.label, isDark && { color: '#D4CAC0' }]}>Capacity</Text>
              <TextInput style={[styles.textInputBox, isDark && styles.textInputBoxDark]} value={editMaxStudents} onChangeText={setEditMaxStudents} keyboardType="numeric" placeholderTextColor={isDark ? '#8A7D71' : '#9CA3AF'} />
              <Text style={[styles.label, { marginTop: 12 }, isDark && { color: '#D4CAC0' }]}>Location</Text>
              <TextInput style={[styles.textInputBox, isDark && styles.textInputBoxDark]} value={editLocation} onChangeText={setEditLocation} placeholderTextColor={isDark ? '#8A7D71' : '#9CA3AF'} />
              <Text style={[styles.label, { marginTop: 12 }, isDark && { color: '#D4CAC0' }]}>Notes</Text>
              <TextInput style={[styles.textInputBox, { height: 80, textAlignVertical: 'top' }, isDark && styles.textInputBoxDark]} value={editEquipmentNote} onChangeText={setEditEquipmentNote} multiline placeholderTextColor={isDark ? '#8A7D71' : '#9CA3AF'} />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, isDark && styles.cancelBtnDark]} onPress={() => setEditModalVisible(false)}>
                  <Text style={[styles.cancelBtnText, isDark && { color: '#A89F93' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#FF5E14' }]} onPress={saveEditSlot} disabled={editSaving}>
                  {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
          </ScrollView>
</View>
        </View>
      </KeyboardAvoidingView>
</Modal>

      {/* BOOKINGS (STUDENTS) MODAL */}
      <Modal visible={bookingsModalVisible} animationType="fade" transparent>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.78)' }]}>
          <View style={[styles.modalContent, { maxHeight: '80%' }, isDark && styles.modalCardDark]}>
            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>Booked Students</Text>
            {bookingsLoading ? <ActivityIndicator size="small" color="#FF5E14" /> : (
              <ScrollView style={{ marginBottom: 20 }}>
                {slotBookings.length === 0 ? <Text style={{ color: isDark ? '#8A7D71' : '#6B7280' }}>No students booked yet.</Text> :
                  slotBookings.map((b: any) => (
                    <View key={b._id} style={[{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontWeight: '500', color: '#1F2937' }, isDark && { color: '#FFFFFF' }]}>{b.student_id?.name || 'Unknown Student'}</Text>
                        <Text style={[{ fontSize: 12, color: '#6B7280' }, isDark && { color: '#A89F93' }]}>{b.student_id?.email || ''}</Text>
                        {b.status === 'cancellation_requested' && (
                          <View>
                            <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '600', marginTop: 2 }}>Cancellation Requested</Text>
                            {b.cancellation_reason ? (
                              <Text style={{ fontSize: 12, color: isDark ? '#A89F93' : '#6B7280', fontStyle: 'italic', marginTop: 2 }}>Reason: {b.cancellation_reason}</Text>
                            ) : null}
                          </View>
                        )}
                      </View>
                      {!(selectedSlot && isSlotExpired(selectedSlot)) && (
                        b.status === 'cancellation_requested' ? (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }} onPress={() => handleApproveCancellation(b._id)}>
                              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }} onPress={() => handleRejectCancellation(b._id)}>
                              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                            onPress={() => handleRemoveBooking(b._id, b.student_id?.name || 'Student')}
                          >
                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Remove</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  ))
                }
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.cancelBtn, isDark && styles.cancelBtnDark]} onPress={() => setBookingsModalVisible(false)}>
              <Text style={[styles.cancelBtnText, isDark && { color: '#A89F93' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CONFIRM MODAL */}
      <Modal visible={confirmModal.visible} animationType="fade" transparent>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.78)' }]}>
          <View style={[styles.modalContent, isDark && styles.modalCardDark]}>
            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>{confirmModal.title}</Text>
            <Text style={[{ color: '#4B5563', marginBottom: 20 }, isDark && { color: '#A89F93' }]}>{confirmModal.message}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, isDark && styles.cancelBtnDark]} onPress={() => setConfirmModal({ ...confirmModal, visible: false })}>
                <Text style={[styles.cancelBtnText, isDark && { color: '#A89F93' }]}>{confirmModal.cancelText || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: confirmModal.type === 'danger' ? '#EF4444' : '#FF5E14' }]} onPress={() => { setConfirmModal({ ...confirmModal, visible: false }); confirmModal.onConfirm(); }}>
                <Text style={styles.submitBtnText}>{confirmModal.confirmText || 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ALERT MODAL */}
      <Modal visible={alertModal.visible} animationType="fade" transparent>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.78)' }]}>
          <View style={[styles.modalContent, isDark && styles.modalCardDark]}>
            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>{alertModal.title}</Text>
            <Text style={[{ color: '#4B5563', marginBottom: 20 }, isDark && { color: '#A89F93' }]}>{alertModal.message}</Text>
            <TouchableOpacity style={styles.alertOkBtn} onPress={() => { setAlertModal({ ...alertModal, visible: false }); if (alertModal.onOk) alertModal.onOk(); }}>
              <Text style={styles.submitBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={datePickerPurpose === 'create' ? createDate : selectedDate}
        minDate={datePickerPurpose === 'create' ? new Date() : undefined}
        isDark={isDark}
        title={datePickerPurpose === 'create' ? 'Select Practical Date' : 'Navigate to Date'}
        onSelectDate={(newDate) => {
          if (datePickerPurpose === 'create') {
            if (isPastDate(newDate)) {
              showAlert('Past Date', 'Cannot create a slot for a past date. Past dates are view-only.', undefined, 'error');
              return;
            }
            setCreateDate(newDate);
          } else {
            setSelectedDate(newDate);
            setWeekStart(getMonday(newDate));
          }
        }}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={!!timePickerField}
        onClose={() => setTimePickerField(null)}
        selectedTime={timePickerField === 'start' ? createStartTime : createEndTime}
        isDark={isDark}
        title={timePickerField === 'start' ? 'Select Start Time' : 'Select End Time'}
        onSelectTime={handleTimeSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  createFormSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  pickerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12 },
  textInputBox: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#1F2937' },
  pickerWrap: { flexDirection: 'row' },
  pillsForm: { borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  pillsFormActive: { backgroundColor: '#1F2937', borderColor: '#1F2937' },
  pillsFormText: { color: '#4B5563', fontSize: 13 },
  rowGroup: { flexDirection: 'row' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '100%',
    flexShrink: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    ...Platform.select({
      web: { boxShadow: '0px 10px 24px rgba(0, 0, 0, 0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 }
    }),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 440,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  closeModalIconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 24, marginRight: 8 },
  cancelBtnText: { color: '#4B5563', fontWeight: '600' },
  submitBtn: {
    flex: 2,
    minHeight: 48,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    marginLeft: 8,
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(15, 23, 42, 0.22)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 4 }
    }),
  },
  alertOkBtn: {
    width: '100%',
    minHeight: 48,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5E14',
    borderRadius: 24,
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(255, 94, 20, 0.22)' },
      default: { shadowColor: '#FF5E14', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 4 }
    }),
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  createActionsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '75%' },
  filterHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, color: '#1F2937' },
  filterSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  checkboxActive: { backgroundColor: '#F58220', borderColor: '#F58220' },
  checkboxLabel: { fontSize: 14, color: '#374151' },
  filterFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  resetBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  resetBtnText: { color: '#4B5563', fontWeight: '600' },
  applyBtn: { flex: 2, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F58220', borderRadius: 8 },
  applyBtnText: { color: '#fff', fontWeight: '600' },
  modalCardDark: {
    backgroundColor: '#141B26',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  textInputBoxDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#FFFFFF',
  },
  pillsFormDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cancelBtnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  }
});
