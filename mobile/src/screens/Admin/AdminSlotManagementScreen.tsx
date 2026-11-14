import SlotStudentsSheet from '../../components/schedule/SlotStudentsSheet';
import { ManagementSheet, ManagementButton } from '../../components/shared/CourseBatchUI';
import CustomDropdown from '../../components/shared/CustomDropdown';
import ManagementDialog from '../../components/shared/ManagementDialog';
import { usersSectionTheme } from '../../components/shared/usersSectionTheme';
import { KeyboardAvoidingView } from "../../components/shared/KeyboardForm";
import { KeyboardScrollView as ScrollView, KeyboardTextInput as TextInput } from '../../components/shared/KeyboardForm';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList, RefreshControl, Platform, Animated, LayoutAnimation, UIManager, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import {
  PickerField,
  DatePickerModal,
  TimePickerModal,
} from '../../components/shared/DateTimePickerModals';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import MainPageHeader from '../../components/shared/MainPageHeader';
import ScheduleOverview, { scheduleOverviewStyles } from '../../components/schedule/ScheduleOverview';
import ScheduleSlotCard from '../../components/schedule/ScheduleSlotCard';
import { isPracticalExpired, instituteDateKey, instituteWallTime } from '../../utils/practicalTime';
import usePracticalClock from '../../hooks/usePracticalClock';
import { scheduleToday } from '../../utils/scheduleViews';
import ScreenBackground from '../../components/shared/ScreenBackground';
import WhatsAppOptionsMenu, { MenuOption } from '../../components/shared/WhatsAppOptionsMenu';
import { useTheme } from '../../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !(globalThis as any).nativeFabricUIManager) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

export default function AdminSlotManagementScreen() {
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
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

  // Search & Filters
  const [showFilter, setShowFilter] = useState(false);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [selectedInstructorFilter, setSelectedInstructorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Master Data
  const [batches, setBatches] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);

  // Bookings Modal
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingsModalVisible, setBookingsModalVisible] = useState(false);

  // Assign Student Sub-Modal

  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editInstructorId, setEditInstructorId] = useState('');
  const [editMaxStudents, setEditMaxStudents] = useState('');
  const [editEquipmentNote, setEditEquipmentNote] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Custom Confirm & Alert Popup Dialogs
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
    onConfirm: () => { },
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
  const [createMode, setCreateMode] = useState<'single' | 'multi'>('single');
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuSlot, setActionMenuSlot] = useState<any>(null);

  const [createBatchId, setCreateBatchId] = useState('');
  const [createInstructorId, setCreateInstructorId] = useState('');
  const [createDate, setCreateDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerPurpose, setDatePickerPurpose] = useState<'create' | 'navigate'>('create');
  const [timePickerTarget, setTimePickerTarget] = useState<{
    kind: 'single' | 'batch';
    field: 'start' | 'end';
    index?: number;
  } | null>(null);
  const [createStartTime, setCreateStartTime] = useState('09:00');
  const [createEndTime, setCreateEndTime] = useState('12:00');
  const [createLocation, setCreateLocation] = useState('Hardware Lab 01');
  const [createCapacity, setCreateCapacity] = useState('10');
  const [createEquipmentNote, setCreateEquipmentNote] = useState('');
  const [newSlots, setNewSlots] = useState([
    { day_of_week: 'Monday', start_time: '09:00', end_time: '12:00', max_students: '10', equipment_note: '', location: 'Hardware Lab 01' }
  ]);
  const [creating, setCreating] = useState(false);

  const handleTimeSelect = (selectedTimeStr: string) => {
    if (!timePickerTarget) return;
    if (timePickerTarget.kind === 'single') {
      if (timePickerTarget.field === 'start') {
        setCreateStartTime(selectedTimeStr);
      } else {
        setCreateEndTime(selectedTimeStr);
      }
    } else if (timePickerTarget.kind === 'batch' && typeof timePickerTarget.index === 'number') {
      const idx = timePickerTarget.index;
      const fieldKey = timePickerTarget.field === 'start' ? 'start_time' : 'end_time';
      updateNewSlot(idx, fieldKey, selectedTimeStr);
    }
    setTimePickerTarget(null);
  };

  const getActivePickerTime = () => {
    if (!timePickerTarget) return '09:00';
    if (timePickerTarget.kind === 'single') {
      return timePickerTarget.field === 'start' ? createStartTime : createEndTime;
    }
    if (timePickerTarget.kind === 'batch' && typeof timePickerTarget.index === 'number') {
      const s = newSlots[timePickerTarget.index];
      return timePickerTarget.field === 'start' ? (s?.start_time || '09:00') : (s?.end_time || '12:00');
    }
    return '09:00';
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [weekStart, selectedDate, viewMode, selectedBatchFilter, selectedInstructorFilter, selectedCourseFilter, statusFilter]);

  const showAlert = (title: string, msg: string, onOk?: () => void, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertModal({
      visible: true,
      title,
      message: msg,
      type,
      onOk
    });
  };

  const fetchMasterData = async () => {
    setMasterLoading(true);
    setMasterError(null);
    try {
      const [bRes, uRes, cRes] = await Promise.all([
        api.get('/admin/batches'),
        api.get('/admin/users?role=instructor'),
        api.get('/admin/courses')
      ]);
      const bList = bRes.data || [];
      const iList = uRes.data || [];
      const cList = cRes.data || [];
      setBatches(bList);
      setInstructors(iList);
      setCourses(cList);

      const activeBatches = bList.filter((batch: any) => batch.status === 'active');
      const initialBatch = activeBatches.find((batch: any) => batch._id === createBatchId) || activeBatches[0];
      if (initialBatch) {
        setCreateBatchId(initialBatch._id);
        const assigned = initialBatch.instructor_ids || [];
        if (!assigned.some((instructor: any) => String(instructor._id || instructor) === createInstructorId)) {
          setCreateInstructorId(String(assigned[0]?._id || assigned[0] || ''));
        }
      }
    } catch (e) {
      console.log('Error fetching master data', e);
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
      if (selectedBatchFilter !== 'all') params.batchId = selectedBatchFilter;
      if (selectedInstructorFilter !== 'all') params.instructorId = selectedInstructorFilter;

      if (viewMode === 'Month') {
        const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
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

      if (selectedCourseFilter !== 'all') {
        data = data.filter((s: any) => (s.batch_id?.course_id?._id || s.batch_id?.course_id) === selectedCourseFilter);
      }

      if (statusFilter === 'open') {
        data = data.filter((s: any) => s.is_open);
      } else if (statusFilter === 'closed') {
        data = data.filter((s: any) => !s.is_open);
      }


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

  const isSlotExpired = (slot: any) => {
    return isPracticalExpired(slot, now);
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

  const openBookingsModal = (slot: any) => { setSelectedSlot(slot); setBookingsModalVisible(true); };

  const openEditModal = (slot: any) => {
    if (isSlotExpired(slot)) {
      return showAlert('Expired Slot', 'Expired practical slots cannot be edited.', undefined, 'error');
    }
    setSelectedSlot(slot);
    setEditInstructorId(slot.instructor_id?._id || slot.instructor_id || '');
    setEditMaxStudents(String(slot.max_students || 10));
    setEditEquipmentNote(slot.equipment_note || '');
    setEditLocation(slot.location || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    const maxN = Number(editMaxStudents);
    if (!Number.isInteger(maxN) || maxN < 1) return showAlert('Error', 'Max students must be a positive whole number', undefined, 'error');

    setEditSaving(true);
    try {
      await api.patch(`/instructors/practice-slots/${selectedSlot._id}`, {
        max_students: maxN,
        equipment_note: editEquipmentNote.trim(),
        location: editLocation.trim(),
        instructor_id: editInstructorId || undefined
      });
      showAlert('Success', 'Practical slot updated successfully!', undefined, 'success');
      setEditModalVisible(false);
      fetchSlots();
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to update slot', undefined, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateSingleSlot = async () => {
    if (!createBatchId) return showAlert('Error', 'Please select a batch', undefined, 'error');
    if (!createInstructorId) return showAlert('Error', 'Please select an assigned instructor', undefined, 'error');
    if (!createStartTime.trim() || !createEndTime.trim()) return showAlert('Error', 'Please enter start and end time', undefined, 'error');
    if (createStartTime.trim() >= createEndTime.trim()) return showAlert('Invalid time', 'End time must be after start time.', undefined, 'error');

    if (isPastDate(createDate)) {
      return showAlert('Past Date', 'Cannot create a practical slot for a past date. Past dates are view-only.', undefined, 'error');
    }

    if (isSlotDateTimeInPast(createDate, createStartTime.trim())) {
      return showAlert('Past Time', 'The session must start in the future.', undefined, 'error');
    }

    const capN = Number(createCapacity);
    if (!Number.isInteger(capN) || capN < 1) return showAlert('Error', 'Capacity must be a positive whole number', undefined, 'error');

    const weekStart = getMonday(createDate);
    const dayName = DAYS[createDate.getDay() === 0 ? 6 : createDate.getDay() - 1];
    setCreating(true);
    try {
      await api.post('/instructors/practice-slots', {
        batch_id: createBatchId,
        week_start_date: getLocalDateString(weekStart),
        instructor_id: createInstructorId,
        slots: [{
          day_of_week: dayName,
          start_time: createStartTime.trim(),
          end_time: createEndTime.trim(),
          max_students: capN,
          location: createLocation.trim(),
          equipment_note: createEquipmentNote.trim(),
          instructor_id: createInstructorId
        }]
      });

      showAlert('Success', 'Practical slot created successfully!', () => {
        setCreateModalVisible(false);
        fetchSlots();
      }, 'success');
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to create slot', undefined, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateSlots = async () => {
    if (!createBatchId) return showAlert('Error', 'Please select a target batch', undefined, 'error');
    if (!createInstructorId) return showAlert('Error', 'Please select an assigned instructor', undefined, 'error');

    for (const s of newSlots) {
      if (!s.day_of_week || !s.start_time || !s.end_time) {
        return showAlert('Error', 'Please complete day and time for all slots', undefined, 'error');
      }
      if (s.start_time >= s.end_time) return showAlert('Invalid time', 'End time must be after start time for every slot.', undefined, 'error');

      const maxN = Number(s.max_students);
      if (!Number.isInteger(maxN) || maxN < 1) return showAlert('Error', 'Capacity must be a positive whole number', undefined, 'error');

      const slotActualDate = getSlotActualDate(getLocalDateString(weekStart), s.day_of_week);
      if (isPastDate(slotActualDate)) {
        return showAlert('Past Date', `Cannot create slot on ${s.day_of_week} because this date is in the past. Slots can only be created for current or future dates.`, undefined, 'error');
      }
      if (isSlotDateTimeInPast(slotActualDate, s.start_time)) {
        return showAlert('Past Time', `Cannot create slot on ${s.day_of_week} (${s.start_time} - ${s.end_time}) because this time has already passed.`, undefined, 'error');
      }

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
          max_students: Number(s.max_students)
        }))
      });
      showAlert('Success', `${newSlots.length} practical slot(s) created successfully!`, () => {
        setCreateModalVisible(false);
        setNewSlots([{ day_of_week: 'Monday', start_time: '09:00', end_time: '12:00', max_students: '10', equipment_note: '', location: 'Hardware Lab 01' }]);
        fetchSlots();
      }, 'success');
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to create practical slots', undefined, 'error');
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

  // Slot Card Renderer (Identical to Instructor PracticeSessionsScreen Card)
  const renderListCard = (slot: any) => {
    const isExpired = isSlotExpired(slot);
    const menuOptions: MenuOption[] = [
      {
        id: 'view_students',
        label: 'View Students',
        onPress: () => openBookingsModal(slot),
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
        onPress={() => openBookingsModal(slot)} style={scheduleOverviewStyles.manageButton}>
        <Icon name="people-outline" size={17} color="#FFFFFF" />
        <Text style={scheduleOverviewStyles.manageButtonText}>View students</Text>
      </TouchableOpacity>
    </ScheduleSlotCard>;
  };

  const openCreateScheduleSlot = () => {
    const date = isPastDate(selectedDate) ? new Date() : selectedDate;
    setCreateDate(date);
    if (selectedBatchFilter !== 'all') {
      setCreateBatchId(selectedBatchFilter);
      const assigned = batches.find(batch => batch._id === selectedBatchFilter)?.instructor_ids || [];
      setCreateInstructorId(String(assigned[0]?._id || assigned[0] || ''));
    }
    if (isPastDate(weekStart)) setWeekStart(getMonday(date));
    setCreateModalVisible(true);
  };
  const overviewBatches = batches.filter(batch =>
    (selectedCourseFilter === 'all' || String(batch.course_id?._id || batch.course_id) === selectedCourseFilter)
    && (selectedInstructorFilter === 'all' || batch.instructor_ids?.some((instructor: any) => String(instructor._id || instructor) === selectedInstructorFilter)));

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0B0F19' : '#F5F6F8' }]}>
      <ScreenBackground />
      <MainPageHeader title="Schedule" showBack={false} />
      <ScheduleOverview collapseControls batches={batches} selectedBatchId={selectedBatchFilter === 'all' ? null : selectedBatchFilter}
        onBatchSelect={id => { setSelectedBatchFilter(id || 'all'); setSelectedCourseFilter('all'); }}
        slots={slots} regularBatches={overviewBatches} renderSlot={renderListCard}
        loading={loading || masterLoading} error={masterError || slotError}
        onRetry={() => { void fetchMasterData(); void fetchSlots(); }}
        onRefresh={onRefresh} refreshing={refreshing} onCreate={openCreateScheduleSlot}
        viewMode={viewMode} selectedDate={selectedDate} onViewChange={setViewMode}
        onDateChange={date => { setSelectedDate(date); setWeekStart(getMonday(date)); }}
        onFilter={() => setShowFilter(true)}
        emptyMessage="No batches are available for this schedule." />

      {/* CREATE PRACTICAL SLOT POPUP MODAL */}
      <ManagementSheet visible={createModalVisible} title="Create practical slot" busy={creating} overlay={<ManagementDialog inline visible={alertModal.visible} title={alertModal.title} message={alertModal.message} type={alertModal.type} onConfirm={() => { setAlertModal(previous => ({ ...previous, visible: false })); alertModal.onOk?.(); }} />} onClose={() => setCreateModalVisible(false)} footer={<><ManagementButton title="Cancel" secondary disabled={creating} onPress={() => setCreateModalVisible(false)} /><ManagementButton title={createMode === 'single' ? 'Create slot' : 'Create slots'} busy={creating} disabled={masterLoading || !!masterError || !createBatchId || !createInstructorId} onPress={createMode === 'single' ? handleCreateSingleSlot : handleCreateSlots} /></>}>
              {/* Creation Mode Toggle Bar */}
              <View style={styles.modeToggleRow}>
                <TouchableOpacity
                  style={[styles.modeToggleBtn, createMode === 'single' && styles.modeToggleBtnActive]}
                  onPress={() => setCreateMode('single')}
                >
                  <Icon name="calendar-outline" size={15} color={createMode === 'single' ? '#FFFFFF' : '#4B5563'} style={{ marginRight: 6 }} />
                  <Text style={[styles.modeToggleText, createMode === 'single' && styles.modeToggleTextActive]}>Single Date Slot</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeToggleBtn, createMode === 'multi' && styles.modeToggleBtnActive]}
                  onPress={() => setCreateMode('multi')}
                >
                  <Icon name="layers-outline" size={15} color={createMode === 'multi' ? '#FFFFFF' : '#4B5563'} style={{ marginRight: 6 }} />
                  <Text style={[styles.modeToggleText, createMode === 'multi' && styles.modeToggleTextActive]}>Multi-Slot Builder</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formSectionTitle}>1. Target Batch & Instructor</Text>

              <CustomDropdown appearance="management" label="Batch *" selectedValue={createBatchId} onValueChange={id => { setCreateBatchId(id); const assigned = batches.find(batch => batch._id === id)?.instructor_ids || []; setCreateInstructorId(String(assigned[0]?._id || assigned[0] || '')); }} items={batches.filter(batch => !batch.status || batch.status === 'active').map(batch => ({ value: batch._id, label: batch.name, subtext: batch.course_id?.title }))} />
              <CustomDropdown appearance="management" label="Instructor *" selectedValue={createInstructorId} onValueChange={setCreateInstructorId} items={instructors.filter(instructor => instructor.is_active !== false && (batches.find(batch => batch._id === createBatchId)?.instructor_ids || []).some((assigned: any) => String(assigned?._id || assigned) === instructor._id)).map(instructor => ({ value: instructor._id, label: instructor.name }))} />

              {!createInstructorId && <Text style={{ color: isDark ? '#FDBA74' : '#9A3412', marginBottom: 12 }}>Assign an active instructor to this batch before creating a slot.</Text>}
              {createMode === 'single' ? (
                /* SINGLE SLOT (DATE PICKER FORM) */
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.formSectionTitle}>2. Date & Session Details</Text>

                  <Text style={styles.fieldLabel}>PRACTICAL DATE *</Text>
                  <PickerField
                    icon="calendar"
                    isDark={isDark}
                    label={createDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    onPress={() => {
                      setDatePickerPurpose('create');
                      setShowDatePicker(true);
                    }}
                  />

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>START TIME *</Text>
                      <PickerField
                        icon="time-outline"
                        isDark={isDark}
                        label={createStartTime || 'Select'}
                        onPress={() => setTimePickerTarget({ kind: 'single', field: 'start' })}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>END TIME *</Text>
                      <PickerField
                        icon="time-outline"
                        isDark={isDark}
                        label={createEndTime || 'Select'}
                        onPress={() => setTimePickerTarget({ kind: 'single', field: 'end' })}
                      />
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>LOCATION / LAB ROOM *</Text>
                  <TextInput
                    style={styles.textInputBox}
                    placeholder="Hardware Lab 01"
                    value={createLocation}
                    onChangeText={setCreateLocation}
                  />

                  <Text style={styles.fieldLabel}>MAX CAPACITY (STUDENTS) *</Text>
                  <TextInput
                    style={styles.textInputBox}
                    placeholder="10"
                    keyboardType="numeric"
                    value={createCapacity}
                    onChangeText={setCreateCapacity}
                  />

                  <Text style={styles.fieldLabel}>EQUIPMENT / LAB STATION NOTE</Text>
                  <TextInput
                    style={[styles.textInputBox, { height: 75, textAlignVertical: 'top' }]}
                    placeholder="e.g. Micro-soldering Workstation Bay 1"
                    multiline
                    value={createEquipmentNote}
                    onChangeText={setCreateEquipmentNote}
                  />


                </View>
              ) : (
                /* MULTI-SLOT BUILDER FORM */
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.formSectionTitle}>2. Slot Details & Schedule</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <View>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: 'bold' }}>SCHEDULE WEEK</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>Week of {getLocalDateString(weekStart)}</Text>
                    </View>
                    {isPastDate(new Date(new Date(weekStart).getTime() + 6 * 86400000)) && (
                      <TouchableOpacity
                        style={{ backgroundColor: '#F58220', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                        onPress={() => setWeekStart(getMonday(new Date()))}
                      >
                        <Text style={{ color: '#FFF', fontSize: 11.5, fontWeight: 'bold' }}>Switch to Current Week</Text>
                      </TouchableOpacity>
                    )}
                  </View>

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
                        {DAYS.map(d => {
                          const slotDate = getSlotActualDate(getLocalDateString(weekStart), d);
                          const isDayPassed = isPastDate(slotDate);
                          return (
                            <TouchableOpacity
                              key={d}
                              style={[
                                styles.dayPill,
                                slot.day_of_week === d && styles.dayPillActive,
                                isDayPassed && { opacity: 0.45, backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' }
                              ]}
                              onPress={() => {
                                if (isDayPassed) {
                                  showAlert('Past Day', `${d} of this week has already passed. Past days are view-only.`, undefined, 'error');
                                  return;
                                }
                                updateNewSlot(idx, 'day_of_week', d);
                              }}
                            >
                              <Text style={slot.day_of_week === d ? styles.dayPillTextActive : [styles.dayPillText, isDayPassed && { color: '#94A3B8' }]}>
                                {d.slice(0, 3)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>START TIME *</Text>
                          <PickerField
                            icon="time-outline"
                            isDark={isDark}
                            label={slot.start_time || 'Select'}
                            onPress={() => setTimePickerTarget({ kind: 'batch', field: 'start', index: idx })}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>END TIME *</Text>
                          <PickerField
                            icon="time-outline"
                            isDark={isDark}
                            label={slot.end_time || 'Select'}
                            onPress={() => setTimePickerTarget({ kind: 'batch', field: 'end', index: idx })}
                          />
                        </View>
                      </View>

                      <Text style={styles.fieldLabel}>MAX CAPACITY (STUDENTS) *</Text>
                      <TextInput
                        style={styles.textInputBox}
                        placeholder="10"
                        keyboardType="numeric"
                        value={slot.max_students}
                        onChangeText={t => updateNewSlot(idx, 'max_students', t)}
                      />

                      <Text style={styles.fieldLabel}>EQUIPMENT / LAB STATION NOTE</Text>
                      <TextInput
                        style={styles.textInputBox}
                        placeholder="e.g. Micro-soldering Workstation Bay 1"
                        value={slot.equipment_note}
                        onChangeText={t => updateNewSlot(idx, 'equipment_note', t)}
                      />
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.addMoreBtn}
                    onPress={() => setNewSlots([...newSlots, { day_of_week: 'Monday', start_time: '09:00', end_time: '12:00', max_students: '10', equipment_note: '', location: 'Hardware Lab 01' }])}
                  >
                    <Icon name="add-circle-outline" size={18} color="#F58220" style={{ marginRight: 6 }} />
                    <Text style={styles.addMoreText}>Add Another Slot Row</Text>
                  </TouchableOpacity>


                </View>
              )}
      </ManagementSheet>

      {/* FILTERS MODAL */}
      <Modal visible={showFilter} animationType="slide" transparent>
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.filterHeader}>
              <TouchableOpacity onPress={() => setShowFilter(false)}><Icon name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
              <Text style={styles.filterTitle}>Filters</Text>
            </View>
            <ScrollView style={{ padding: 16 }}>
              <Text style={styles.filterSectionTitle}>Course</Text>
              <View style={styles.pillsWrapModal}>
                <TouchableOpacity
                  style={[styles.modalPill, selectedCourseFilter === 'all' && styles.modalPillActive]}
                  onPress={() => setSelectedCourseFilter('all')}
                >
                  <Text style={selectedCourseFilter === 'all' ? styles.modalPillTextActive : styles.modalPillText}>All Courses</Text>
                </TouchableOpacity>
                {courses.map(c => (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.modalPill, selectedCourseFilter === c._id && styles.modalPillActive]}
                    onPress={() => setSelectedCourseFilter(c._id)}
                  >
                    <Text style={selectedCourseFilter === c._id ? styles.modalPillTextActive : styles.modalPillText}>{c.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.filterSectionTitle, { marginTop: 20 }]}>Batch</Text>
              <View style={styles.pillsWrapModal}>
                <TouchableOpacity
                  style={[styles.modalPill, selectedBatchFilter === 'all' && styles.modalPillActive]}
                  onPress={() => setSelectedBatchFilter('all')}
                >
                  <Text style={selectedBatchFilter === 'all' ? styles.modalPillTextActive : styles.modalPillText}>All Batches</Text>
                </TouchableOpacity>
                {batches.map(b => (
                  <TouchableOpacity
                    key={b._id}
                    style={[styles.modalPill, selectedBatchFilter === b._id && styles.modalPillActive]}
                    onPress={() => setSelectedBatchFilter(b._id)}
                  >
                    <Text style={selectedBatchFilter === b._id ? styles.modalPillTextActive : styles.modalPillText}>{b.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.filterSectionTitle, { marginTop: 20 }]}>Instructor</Text>
              <View style={styles.pillsWrapModal}>
                <TouchableOpacity
                  style={[styles.modalPill, selectedInstructorFilter === 'all' && styles.modalPillActive]}
                  onPress={() => setSelectedInstructorFilter('all')}
                >
                  <Text style={selectedInstructorFilter === 'all' ? styles.modalPillTextActive : styles.modalPillText}>All Instructors</Text>
                </TouchableOpacity>
                {instructors.map(inst => (
                  <TouchableOpacity
                    key={inst._id}
                    style={[styles.modalPill, selectedInstructorFilter === inst._id && styles.modalPillActive]}
                    onPress={() => setSelectedInstructorFilter(inst._id)}
                  >
                    <Text style={selectedInstructorFilter === inst._id ? styles.modalPillTextActive : styles.modalPillText}>{inst.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.filterSectionTitle, { marginTop: 20 }]}>Status</Text>
              {[
                { label: 'All Statuses', val: 'all' },
                { label: 'Open Only', val: 'open' },
                { label: 'Closed / Locked Only', val: 'closed' }
              ].map(item => (
                <TouchableOpacity key={item.val} style={styles.checkboxRow} onPress={() => setStatusFilter(item.val as any)}>
                  <View style={[styles.checkbox, statusFilter === item.val && styles.checkboxActive]}>
                    {statusFilter === item.val && <Icon name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.filterFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={() => {
                setSelectedCourseFilter('all');
                setSelectedBatchFilter('all');
                setSelectedInstructorFilter('all');
                setStatusFilter('all');
                setShowFilter(false);
              }}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilter(false)}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {bookingsModalVisible && selectedSlot && <SlotStudentsSheet slot={selectedSlot} admin onClose={() => setBookingsModalVisible(false)} onChanged={() => { void fetchSlots(); }} />}

      {/* EDIT SLOT MODAL */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '100%', flexShrink: 1 }]}>
            <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
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
                style={styles.textInputBox}
                keyboardType="numeric"
                value={editMaxStudents}
                onChangeText={setEditMaxStudents}
              />

              <Text style={styles.fieldLabel}>LOCATION</Text>
              <TextInput
                style={styles.textInputBox}
                value={editLocation}
                onChangeText={setEditLocation}
              />

              <Text style={styles.fieldLabel}>EQUIPMENT NOTE</Text>
              <TextInput
                style={[styles.textInputBox, { marginBottom: 20 }]}
                value={editEquipmentNote}
                onChangeText={setEditEquipmentNote}
              />

              <TouchableOpacity style={[styles.submitCreateBtn, { flex: 0, width: '100%', minHeight: 48, marginTop: 12 }]} onPress={handleSaveEdit} disabled={editSaving}>
                {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitCreateBtnText}>Save Changes</Text>}
              </TouchableOpacity>
          </ScrollView>
</View>
        </View>
      </KeyboardAvoidingView>
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
        visible={alertModal.visible && !createModalVisible}
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
                { backgroundColor: alertModal.type === 'error' ? '#DC2626' : alertModal.type === 'success' ? '#16A34A' : '#F97316' }
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
      {/* Practical Date Picker Modal */}
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
        visible={!!timePickerTarget}
        onClose={() => setTimePickerTarget(null)}
        selectedTime={getActivePickerTime()}
        isDark={isDark}
        title={
          timePickerTarget?.field === 'start'
            ? 'Select Start Time'
            : 'Select End Time'
        }
        onSelectTime={handleTimeSelect}
      />
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  createModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  createModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    ...Platform.select({
      web: { boxShadow: '0px -10px 25px rgba(0, 0, 0, 0.2)' },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
      }
    })
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeModalIconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  modeToggleRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 26, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  modeToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 22 },
  modeToggleBtnActive: { backgroundColor: '#0F172A' },
  modeToggleText: { fontSize: 12.5, fontWeight: '600', color: '#64748B' },
  modeToggleTextActive: { color: '#FFFFFF', fontWeight: '700' },
  formSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginTop: 8, marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: 'bold', color: '#475569', marginTop: 10, marginBottom: 6, letterSpacing: 0.5 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  selectPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  selectPillActive: { backgroundColor: '#F58220', borderColor: '#F58220' },
  selectPillText: { fontSize: 12.5, color: '#334155', fontWeight: '500' },
  selectPillTextActive: { fontSize: 12.5, color: '#FFFFFF', fontWeight: 'bold' },
  textInputBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  newSlotCard: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  newSlotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newSlotTitle: { fontSize: 14.5, fontWeight: 'bold', color: '#0F172A' },
  daysWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  dayPillActive: { backgroundColor: '#F58220', borderColor: '#F58220' },
  dayPillText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  dayPillTextActive: { fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#F58220', borderRadius: 10, marginBottom: 16 },
  addMoreText: { color: '#F58220', fontWeight: 'bold', fontSize: 14 },
  submitCreateBtn: {
    backgroundColor: '#0F172A',
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 2,
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(15, 23, 42, 0.22)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 4 }
    }),
  },
  submitCreateBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { alignItems: 'center', marginVertical: 30, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#475569', marginTop: 10 },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '75%' },
  filterHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, color: '#1F2937' },
  filterSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  pillsWrapModal: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  modalPillActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  modalPillText: { fontSize: 12, color: '#4B5563' },
  modalPillTextActive: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  checkboxActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  checkboxLabel: { fontSize: 14, color: '#374151' },
  filterFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  resetBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  resetBtnText: { color: '#4B5563', fontWeight: '600' },
  applyBtn: { flex: 2, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F97316', borderRadius: 8 },
  applyBtnText: { color: '#fff', fontWeight: '600' },
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
  popupOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  popupCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, width: '100%', maxWidth: 380, alignItems: 'center', elevation: 10 },
  popupIconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  popupTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  popupMessage: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  popupBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  popupCancelBtn: { flex: 1, backgroundColor: '#F1F5F9', minHeight: 48, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  popupCancelText: { color: '#475569', fontWeight: 'bold', fontSize: 14 },
  popupConfirmBtn: { flex: 1, minHeight: 48, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  popupConfirmText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  popupSingleBtn: { width: '100%', minHeight: 48, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  popupSingleBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }
});

function getStyles(isDark: boolean) {
  const theme = usersSectionTheme(isDark);
  const styles: any = { ...baseStyles };
  for (const [name, value] of Object.entries(baseStyles)) {
    const style = { ...value } as any;
    if (isDark) {
      if (['#FFFFFF', '#fff', '#FAFAFA', '#F8FAFC', '#F9FAFB', '#F1F5F9', '#F3F4F6'].includes(style.backgroundColor)) style.backgroundColor = ['textInputBox', 'newSlotCard', 'modeToggleRow', 'dayPill', 'selectPill'].includes(name) ? theme.field : theme.surface;
      if (['#0F172A', '#1F2937', '#374151', '#4B5563', '#475569', '#64748B'].includes(style.color)) style.color = name.toLowerCase().includes('title') ? theme.text : theme.muted;
      if (style.borderColor && !['#F58220', '#F97316'].includes(style.borderColor)) style.borderColor = theme.line;
      if (style.borderBottomColor) style.borderBottomColor = theme.line;
    }
    if (['textInputBox', 'selectPill', 'dayPill', 'modeToggleBtn'].includes(name)) style.minHeight = 44;
    if (name === 'modeToggleText') { style.flexShrink = 1; style.textAlign = 'center'; }
    if (name === 'modeToggleBtn') { style.paddingHorizontal = 8; style.borderRadius = 10; }
    if (name === 'modeToggleRow') style.borderRadius = 12;
    styles[name] = style;
  }
  return styles;
}
