import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Modal, RefreshControl, Platform, Animated
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  PickerField,
  DatePickerModal,
  TimePickerModal,
  MonthPickerModal,
} from '../../components/shared/DateTimePickerModals';
import api from '../../services/api';
import { updatePracticeSlot, getSlotBookings } from '../../services/practiceService';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import WhatsAppOptionsMenu, { MenuOption } from '../../components/shared/WhatsAppOptionsMenu';
import { useTheme } from '../../context/ThemeContext';

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
};

const isSlotDateTimeInPast = (date: Date, endTimeStr?: string) => {
  const now = new Date();
  const target = new Date(date);
  if (endTimeStr) {
    const [h, m] = endTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
    target.setHours(h, m, 0, 0);
    return target.getTime() < now.getTime();
  }
  target.setHours(23, 59, 59, 999);
  return target.getTime() < now.getTime();
};

export default function PracticeSessionsScreen() {
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day' | 'List'>('List');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekFilterDay, setWeekFilterDay] = useState<string | null>(null);

  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Liquid FAB Animation State
  const wave1Anim = React.useRef(new Animated.Value(0)).current;
  const wave2Anim = React.useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    wave1Anim.setValue(0);
    wave2Anim.setValue(0);

    const animation = Animated.loop(
      Animated.parallel([
        Animated.timing(wave1Anim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(wave2Anim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const handleFabPressIn = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 5,
      tension: 100,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 80,
    }).start();
  };

  const wave1Scale = wave1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.55],
  });

  const wave1Opacity = wave1Anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.45, 0.25, 0],
  });

  const wave2Scale = wave2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const wave2Opacity = wave2Anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.35, 0.18, 0],
  });

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
    if (!slot) return false;
    const actualDate = getSlotActualDate(slot.week_start_date, slot.day_of_week);
    return isPastDate(actualDate) || isSlotDateTimeInPast(actualDate, slot.end_time);
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
    setEditSaving(true);
    try {
      await updatePracticeSlot(selectedSlot._id, {
        max_students: parseInt(editMaxStudents, 10),
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
  const [showMonthPicker, setShowMonthPicker] = useState(false);
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
    try {
      const res = await api.get('/instructors/my-schedule');
      const bList = res.data || [];
      setBatches(bList);
      if (bList.length > 0) setCreateBatchId(bList[0]._id);
    } catch (e) {
      console.log('Error fetching instructor batches', e);
    } finally {
      setMasterLoading(false);
    }
  };

  const fetchSlots = async () => {
    setLoading(true);
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

      // Chronological sort by actual calendar date and start time
      data.sort((a: any, b: any) => {
        const dateA = getSlotActualDate(a.week_start_date, a.day_of_week).getTime();
        const dateB = getSlotActualDate(b.week_start_date, b.day_of_week).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

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

  const changeMonth = (offset: number) => {
    const nd = new Date(selectedDate);
    nd.setMonth(nd.getMonth() + offset);
    setSelectedDate(nd);
  };

  const changeDay = (offset: number) => {
    const nd = new Date(selectedDate);
    nd.setDate(nd.getDate() + offset);
    setSelectedDate(nd);
    setWeekStart(getMonday(nd));
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

    if (isSlotDateTimeInPast(createDate, createEndTime)) {
      return showAlert('Past Time', 'The session end time has already passed. Please select a future time.', undefined, 'error');
    }

    const targetDateStr = getLocalDateString(createDate);
    const alreadyHasSlotOnDate = slots.some(
      s => getLocalDateString(getSlotActualDate(s.week_start_date, s.day_of_week)) === targetDateStr
    );
    if (alreadyHasSlotOnDate) {
      return showAlert(
        'One Slot Per Day Limit',
        'You can only create one practical slot per day. A practical slot is already scheduled for this date.',
        undefined,
        'error'
      );
    }

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
          max_students: parseInt(createCapacity, 10) || 10,
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
    const booked = slot.booked_count || 0;
    const max = slot.max_students || 1;
    const fillRatio = Math.min(1, booked / max);
    const actualDate = getSlotActualDate(slot.week_start_date, slot.day_of_week);
    const isExpired = isSlotExpired(slot);
    const formattedDate = actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const dayShort = actualDate.toLocaleDateString('en-GB', { weekday: 'short' });

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

    return (
      <View
        key={slot._id}
        style={[
          styles.cardWrapper,
          isDark && styles.cardWrapperDark,
        ]}
      >
        <View style={[styles.cardAccent, { backgroundColor: '#FF5E14' }]} />
        <View style={styles.cardInner}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardTag, isDark && { backgroundColor: 'rgba(255, 94, 20, 0.15)' }]}>
              <Text style={[styles.cardTagText, isDark && { color: '#FB923C' }]}>PRACTICAL SLOT</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {slot.pending_cancellation_count > 0 && !isExpired && (
                <View style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#D97706' }}>
                    {slot.pending_cancellation_count} CANCEL REQ
                  </Text>
                </View>
              )}
              {isExpired && (
                <View style={[styles.pastTag, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.15)' }, { marginRight: 6 }]}>
                  <Text style={[styles.pastTagText, isDark && { color: '#94A3B8' }]}>EXPIRED</Text>
                </View>
              )}
              <View style={[styles.statusPill, slot.is_open ? styles.statusOpen : styles.statusLocked, { marginRight: 6 }]}>
                <Text style={[styles.statusPillText, slot.is_open ? styles.textOpen : styles.textLocked]}>
                  {slot.is_open ? 'OPEN' : 'LOCKED'}
                </Text>
              </View>
              <WhatsAppOptionsMenu
                options={menuOptions}
                triggerIconSize={20}
                triggerIconColor={isDark ? '#FFFFFF' : '#111827'}
              />
            </View>
          </View>

          <Text style={[styles.cardCourseTitle, isDark && { color: '#FFFFFF' }]}>{slot.batch_id?.course_id?.title || slot.batch_id?.name || 'Practical Session'}</Text>
          <Text style={[styles.cardBatchText, isDark && { color: '#A89F93' }]}>Batch: {slot.batch_id?.name || 'N/A'}</Text>

          <View style={styles.cardInfoRow}>
            <Icon name="calendar-outline" size={14} color="#FF5E14" />
            <Text style={[styles.cardInfoText, isDark && { color: '#A89F93' }]}>{dayShort}, {formattedDate}</Text>
            <Icon name="time-outline" size={14} color={isDark ? '#8A7D71' : '#6B7280'} style={{ marginLeft: 8 }} />
            <Text style={[styles.cardInfoText, isDark && { color: '#A89F93' }]}>{slot.start_time} - {slot.end_time}</Text>
          </View>

          {!!slot.instructor_id?.name && (
            <View style={styles.cardInfoRow}>
              <Icon name="person-outline" size={14} color="#3B82F6" />
              <Text style={[styles.cardInfoText, { color: isDark ? '#93C5FD' : '#1E3A8A', fontWeight: '600' }]}>Inst. {slot.instructor_id.name}</Text>
            </View>
          )}

          {!!slot.location && (
            <View style={styles.cardInfoRow}>
              <Icon name="location-outline" size={14} color={isDark ? '#8A7D71' : '#6B7280'} />
              <Text style={[styles.cardInfoText, isDark && { color: '#A89F93' }]}>{slot.location}</Text>
            </View>
          )}

          <View style={styles.capacityContainer}>
            <View style={styles.capacityRow}>
              <Text style={[styles.capacityText, isDark && { color: '#A89F93' }]}>Capacity: {booked}/{max} Booked</Text>
              <Text style={[styles.capacityPct, isDark && { color: '#FFFFFF' }]}>{Math.round(fillRatio * 100)}%</Text>
            </View>
            <View style={[styles.progressTrack, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.10)' }]}>
              <View style={[styles.progressFill, { width: `${fillRatio * 100}%`, backgroundColor: fillRatio >= 1 ? '#EF4444' : '#FF5E14' }]} />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    const weekDates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });

    const weekStartDate = weekDates[0];
    const weekEndDate = weekDates[6];
    const weekRangeText = `${weekStartDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${weekEndDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startMs = new Date(weekStartDate).setHours(0, 0, 0, 0);
    const endMs = new Date(weekEndDate).setHours(23, 59, 59, 999);

    const weekSlots = slots.filter(s => {
      const slotDate = getSlotActualDate(s.week_start_date, s.day_of_week);
      const slotMs = slotDate.getTime();
      return slotMs >= startMs && slotMs <= endMs;
    });

    const sortedWeekSlots = [...weekSlots].sort((a, b) => {
      const dateA = getSlotActualDate(a.week_start_date, a.day_of_week).getTime();
      const dateB = getSlotActualDate(b.week_start_date, b.day_of_week).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    const displayedSlots = weekFilterDay
      ? sortedWeekSlots.filter(s => s.day_of_week === weekFilterDay)
      : sortedWeekSlots;

    const filteredDateObj = weekFilterDay
      ? weekDates.find((_, i) => DAYS[i] === weekFilterDay) || selectedDate
      : null;

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 1. WEEK CARD (Matching Month View Card Style) */}
        <View style={[styles.monthCardContainer, isDark && styles.monthCardContainerDark, { marginBottom: 18 }]}>
          {/* Card Header */}
          <View style={styles.monthCardHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.monthCardTitle, isDark && { color: '#FFFFFF' }]}>
                {weekRangeText}
              </Text>
              <Text style={[styles.monthCardSubtitle, isDark && { color: '#94A3B8' }]}>
                {weekFilterDay
                  ? `Filtering by ${weekFilterDay} • Tap day again or "Show All" to view all week`
                  : `Showing all practical slots for this week (${weekSlots.length} slots)`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {weekFilterDay && (
                <TouchableOpacity
                  style={[styles.quickPresetChip, isDark && { backgroundColor: '#1C1510', borderColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={() => setWeekFilterDay(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickPresetChipText, isDark && { color: '#CBD5E1' }]}>Show All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.monthPickerQuickBtn}
                onPress={() => {
                  setDatePickerPurpose('navigate');
                  setShowDatePicker(true);
                }}
                activeOpacity={0.7}
              >
                <Icon name="calendar" size={15} color="#FF5E14" style={{ marginRight: 6 }} />
                <Text style={styles.monthPickerQuickBtnText}>Pick Week</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday Labels Header Row */}
          <View style={[styles.monthHeaderRow, isDark && { backgroundColor: '#1C1510', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((wd, i) => (
              <Text
                key={wd}
                style={[
                  styles.monthHeaderText,
                  isDark && { color: '#94A3B8' },
                  (i === 5 || i === 6) && { color: '#FF5E14' },
                ]}
              >
                {wd}
              </Text>
            ))}
          </View>

          {/* 7 Days Strip */}
          <View style={[styles.monthDaysWrapper, { borderBottomWidth: 0 }]}>
            {weekDates.map((d, i) => {
              const dayName = DAYS[i];
              const cellDate = new Date(d);
              cellDate.setHours(0, 0, 0, 0);

              const isToday = cellDate.getTime() === today.getTime();
              const isPast = cellDate.getTime() < today.getTime();
              const isDaySelected = weekFilterDay === dayName;

              const daySlots = weekSlots.filter(s => s.day_of_week === dayName);
              const hasSlot = daySlots.length > 0;

              return (
                <TouchableOpacity
                  key={`wd-${i}`}
                  style={[
                    styles.monthCell,
                    isDark && { backgroundColor: '#1C1510', borderColor: 'rgba(255, 255, 255, 0.06)' },
                    isToday && { borderColor: '#FF5E14', borderWidth: 2 },
                    isDaySelected && {
                      backgroundColor: isDark ? 'rgba(255, 94, 20, 0.2)' : '#FFF7ED',
                      borderColor: '#FF5E14',
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    if (weekFilterDay === dayName) {
                      setWeekFilterDay(null);
                    } else {
                      setWeekFilterDay(dayName);
                      setSelectedDate(d);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.monthDayHeaderRow}>
                    <View
                      style={[
                        styles.dayNumberBadge,
                        isToday && styles.todayNumberBadge,
                        isDaySelected && !isToday && styles.selectedNumberBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthCellText,
                          isDark && { color: '#F1F5F9' },
                          isPast && !isToday && { color: '#94A3B8' },
                          isToday && styles.todayNumberText,
                          isDaySelected && !isToday && styles.selectedNumberText,
                        ]}
                      >
                        {d.getDate()}
                      </Text>
                    </View>
                    {isPast && (
                      <Icon name="eye-outline" size={11} color={isDark ? '#64748B' : '#94A3B8'} />
                    )}
                  </View>

                  {hasSlot && (
                    <View style={[styles.monthSlotCountBadge, isDark && { backgroundColor: 'rgba(255, 94, 20, 0.25)' }]}>
                      <View style={styles.monthSlotIndicatorDot} />
                      <Text style={styles.monthSlotCountText}>
                        {daySlots.length} {daySlots.length === 1 ? 'slot' : 'slots'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend Row */}
          <View style={[styles.monthLegendRow, isDark && { borderTopColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF5E14' }]} />
              <Text style={[styles.legendText, isDark && { color: '#94A3B8' }]}>Today</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.legendText, isDark && { color: '#94A3B8' }]}>Has Slots</Text>
            </View>
            <View style={styles.legendItem}>
              <Icon name="eye-outline" size={13} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={[styles.legendText, isDark && { color: '#94A3B8' }]}>Past (View Only)</Text>
            </View>
          </View>
        </View>

        {/* 2. SLOTS LIST SECTION HEADER */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A' }}>
              {weekFilterDay
                ? `${weekFilterDay}'s Practical Slots`
                : 'All Practical Slots This Week'}
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
              {displayedSlots.length} {displayedSlots.length === 1 ? 'session scheduled' : 'sessions scheduled'}
            </Text>
          </View>

          {weekFilterDay && (
            <TouchableOpacity
              style={[styles.quickPresetChip, isDark && { backgroundColor: '#1C1510', borderColor: 'rgba(255,255,255,0.1)' }]}
              onPress={() => setWeekFilterDay(null)}
            >
              <Icon name="close-circle-outline" size={14} color="#FF5E14" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF5E14' }}>Clear Filter</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 3. SLOTS LIST */}
        {displayedSlots.length === 0 ? (
          <View style={[styles.emptyWeekCard, isDark && styles.emptyWeekCardDark]}>
            <Icon name="calendar-outline" size={44} color={isDark ? '#475569' : '#CBD5E1'} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyWeekTitle, isDark && { color: '#FFFFFF' }]}>
              {weekFilterDay
                ? `No slots scheduled for ${weekFilterDay}`
                : 'No practical slots scheduled for this week'}
            </Text>
            <Text style={[styles.emptyWeekSubtitle, isDark && { color: '#94A3B8' }]}>
              {filteredDateObj && isPastDate(filteredDateObj)
                ? 'This date is in the past. Past dates are view-only.'
                : 'No practical sessions have been scheduled yet.'}
            </Text>
          </View>
        ) : (
          displayedSlots.map(slot => renderListCard(slot))
        )}
      </ScrollView>
    );
  };

  const renderMonthView = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prevMonthDays = new Date(year, month, 0).getDate();
    const blanks = Array.from({ length: startOffset }).map((_, i) => {
      const prevD = prevMonthDays - startOffset + 1 + i;
      return (
        <View key={`blank-${i}`} style={[styles.monthCell, { opacity: 0.35 }]}>
          <Text style={[styles.monthCellText, { color: '#94A3B8' }]}>{prevD}</Text>
        </View>
      );
    });

    const days = Array.from({ length: daysInMonth }).map((_, i) => {
      const d = i + 1;
      const cellDate = new Date(year, month, d);
      cellDate.setHours(0, 0, 0, 0);

      const isToday = cellDate.getTime() === today.getTime();
      const isPast = cellDate.getTime() < today.getTime();
      const isSelected =
        selectedDate.getDate() === d &&
        selectedDate.getMonth() === month &&
        selectedDate.getFullYear() === year;

      const daySlots = slots.filter(s => {
        const slotDate = getSlotActualDate(s.week_start_date, s.day_of_week);
        return (
          slotDate.getDate() === d &&
          slotDate.getMonth() === month &&
          slotDate.getFullYear() === year
        );
      });
      const hasSlot = daySlots.length > 0;

      return (
        <TouchableOpacity
          key={`day-${d}`}
          style={[
            styles.monthCell,
            isDark && { backgroundColor: '#1C1510', borderColor: 'rgba(255, 255, 255, 0.06)' },
            isToday && { borderColor: '#FF5E14', borderWidth: 2 },
            isSelected && { backgroundColor: isDark ? 'rgba(255, 94, 20, 0.2)' : '#FFF7ED', borderColor: '#FF5E14' },
          ]}
          onPress={() => {
            const newDate = new Date(year, month, d);
            setSelectedDate(newDate);
            setWeekStart(getMonday(newDate));
            setViewMode('Day');
          }}
          activeOpacity={0.7}
        >
          <View style={styles.monthDayHeaderRow}>
            <View
              style={[
                styles.dayNumberBadge,
                isToday && styles.todayNumberBadge,
                isSelected && !isToday && styles.selectedNumberBadge,
              ]}
            >
              <Text
                style={[
                  styles.monthCellText,
                  isDark && { color: '#F1F5F9' },
                  isPast && !isToday && { color: '#94A3B8' },
                  isToday && styles.todayNumberText,
                  isSelected && !isToday && styles.selectedNumberText,
                ]}
              >
                {d}
              </Text>
            </View>
            {isPast && (
              <Icon name="eye-outline" size={11} color={isDark ? '#64748B' : '#94A3B8'} />
            )}
          </View>

          {hasSlot && (
            <View style={[styles.monthSlotCountBadge, isDark && { backgroundColor: 'rgba(255, 94, 20, 0.25)' }]}>
              <View style={styles.monthSlotIndicatorDot} />
              <Text style={styles.monthSlotCountText}>
                {daySlots.length} {daySlots.length === 1 ? 'slot' : 'slots'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    });

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.monthCardContainer, isDark && styles.monthCardContainerDark]}>
          {/* Card Header with Month Picker Button */}
          <View style={styles.monthCardHeader}>
            <View>
              <Text style={[styles.monthCardTitle, isDark && { color: '#FFFFFF' }]}>
                {selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </Text>
              <Text style={[styles.monthCardSubtitle, isDark && { color: '#94A3B8' }]}>
                Select any date to view practical sessions
              </Text>
            </View>
            <TouchableOpacity
              style={styles.monthPickerQuickBtn}
              onPress={() => setShowMonthPicker(true)}
              activeOpacity={0.7}
            >
              <Icon name="calendar" size={15} color="#FF5E14" style={{ marginRight: 6 }} />
              <Text style={styles.monthPickerQuickBtnText}>Pick Month</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={[styles.monthHeaderRow, isDark && { backgroundColor: '#1C1510', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((wd, i) => (
              <Text
                key={wd}
                style={[
                  styles.monthHeaderText,
                  isDark && { color: '#94A3B8' },
                  (i === 5 || i === 6) && { color: '#FF5E14' },
                ]}
              >
                {wd}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.monthDaysWrapper}>
            {blanks}
            {days}
          </View>

          {/* Legend */}
          <View style={[styles.monthLegendRow, isDark && { borderTopColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF5E14' }]} />
              <Text style={[styles.legendText, isDark && { color: '#94A3B8' }]}>Today</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.legendText, isDark && { color: '#94A3B8' }]}>Has Practical Slots</Text>
            </View>
            <View style={styles.legendItem}>
              <Icon name="eye-outline" size={13} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={[styles.legendText, isDark && { color: '#94A3B8' }]}>Past (View Only)</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#0F0B08' }]} edges={['top', 'bottom']}>
      <ScreenBackground />
      <ScreenHeader
        title="Practice Slots"
        subtitle="Schedule & manage practical sessions"
      />

      <View style={[styles.viewToggleRow, isDark && styles.viewToggleRowDark]}>
        {['Month', 'Week', 'Day', 'List'].map(mode => (
          <TouchableOpacity key={mode} style={[styles.viewToggleBtn, viewMode === mode && (isDark ? styles.viewToggleBtnActiveDark : styles.viewToggleBtnActive)]} onPress={() => setViewMode(mode as any)}>
            <Text style={[styles.viewToggleText, isDark && { color: '#A89F93' }, viewMode === mode && styles.viewToggleTextActive]}>{mode}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.subHeader}>
        <View style={styles.subHeaderLeft}>
          <Icon name="calendar" size={18} color="#FF5E14" />
          <Text style={[styles.subHeaderTitle, isDark && { color: '#FFFFFF' }]}>My Practical Slots ({slots.length})</Text>
        </View>
      </View>

      {viewMode !== 'List' && (
        <View style={[styles.dateNavigator, isDark && styles.dateNavigatorDark]}>
          <TouchableOpacity onPress={() => viewMode === 'Month' ? changeMonth(-1) : viewMode === 'Day' ? changeDay(-1) : changeWeek(-1)}>
            <Icon name="chevron-back" size={20} color="#FF5E14" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (viewMode === 'Day') {
                setDatePickerPurpose('navigate');
                setShowDatePicker(true);
              } else {
                setShowMonthPicker(true);
              }
            }}
            style={[styles.dateBadge, isDark && styles.dateBadgeDark]}
          >
            <Icon name="calendar-outline" size={14} color="#FF5E14" style={{ marginRight: 6 }} />
            <Text style={[styles.dateBadgeText, isDark && { color: '#FB923C' }]}>
              {viewMode === 'Month'
                ? selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                : viewMode === 'Day'
                  ? selectedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                  : `Week of ${getLocalDateString(weekStart)}`}
            </Text>
            <Icon name="chevron-down" size={12} color="#FF5E14" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => viewMode === 'Month' ? changeMonth(1) : viewMode === 'Day' ? changeDay(1) : changeWeek(1)}>
            <Icon name="chevron-forward" size={20} color="#FF5E14" />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#FF5E14" style={{ marginTop: 40 }} />
        ) : (
          viewMode === 'Week' ? renderWeekView() :
            viewMode === 'Month' ? renderMonthView() :
              viewMode === 'Day' ? (() => {
                const daySlots = slots.filter(s => getLocalDateString(getSlotActualDate(s.week_start_date, s.day_of_week)) === getLocalDateString(selectedDate));
                return (
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5E14']} />}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A' }}>
                          Schedule for {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                        <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                          {daySlots.length} {daySlots.length === 1 ? 'session scheduled' : 'sessions scheduled'}
                        </Text>
                      </View>
                      {isPastDate(selectedDate) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                          <Icon name="eye-outline" size={13} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginRight: 5 }} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B' }}>Past Date (View Only)</Text>
                        </View>
                      )}
                    </View>
                    {daySlots.length === 0 ? (
                      <View style={[styles.emptyWeekCard, isDark && styles.emptyWeekCardDark]}>
                        <Icon name="calendar-outline" size={44} color={isDark ? '#475569' : '#CBD5E1'} style={{ marginBottom: 10 }} />
                        <Text style={[styles.emptyWeekTitle, isDark && { color: '#FFFFFF' }]}>
                          No practical slots scheduled for this day
                        </Text>
                        <Text style={[styles.emptyWeekSubtitle, isDark && { color: '#94A3B8' }]}>
                          {isPastDate(selectedDate)
                            ? 'This date is in the past. Past dates are view-only.'
                            : 'No practical sessions have been scheduled yet.'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        {isPastDate(selectedDate) && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF7ED', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#FED7AA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 }}>
                            <Icon name="information-circle-outline" size={16} color="#FF5E14" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 13, color: isDark ? '#CBD5E1' : '#9A3412', fontWeight: '500', flex: 1 }}>
                              Viewing past schedule. New slots cannot be created for past dates.
                            </Text>
                          </View>
                        )}
                        {daySlots.map(renderListCard)}
                      </>
                    )}
                  </ScrollView>
                );
              })() :
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5E14']} />}>
                  {slots.length === 0 ? (
                    <View style={[styles.emptyWeekCard, isDark && styles.emptyWeekCardDark]}>
                      <Icon name="calendar-outline" size={44} color={isDark ? '#475569' : '#CBD5E1'} style={{ marginBottom: 10 }} />
                      <Text style={[styles.emptyWeekTitle, isDark && { color: '#FFFFFF' }]}>No practical slots found</Text>
                      <Text style={[styles.emptyWeekSubtitle, isDark && { color: '#94A3B8' }]}>No practical sessions have been scheduled yet.</Text>
                    </View>
                  ) : slots.map(renderListCard)}
                </ScrollView>
        )}
      </View>

      {/* POP-UP MODAL FOR CREATE SLOT */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.78)' }]}>
          <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
            <View style={[styles.modalHeaderRow, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.10)' }]}>
              <Text style={[styles.modalTitleText, isDark && { color: '#FFFFFF' }]}>Create Practical Slot</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={[styles.closeModalIconBtn, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.10)' }]}>
                <Icon name="close" size={20} color={isDark ? '#FFFFFF' : '#4B5563'} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
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
        <View style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.78)' }]}>
          <View style={[styles.modalContent, isDark && styles.modalCardDark]}>
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
          </View>
        </View>
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
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#FF5E14' }]} onPress={() => { setAlertModal({ ...alertModal, visible: false }); if (alertModal.onOk) alertModal.onOk(); }}>
              <Text style={styles.submitBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Floating Create Practical Slot Liquid FAB Button */}
      <View style={styles.liquidFabContainer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.liquidWaveRing,
            { transform: [{ scale: wave1Scale }], opacity: wave1Opacity }
          ]}
        />
        <Animated.View
          style={[
            styles.liquidWaveRingSecond,
            { transform: [{ scale: wave2Scale }], opacity: wave2Opacity }
          ]}
        />
        <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
          <TouchableOpacity
            style={styles.liquidFabButton}
            onPress={() => {
              const today = new Date();
              if (isPastDate(selectedDate)) {
                setCreateDate(today);
              } else {
                setCreateDate(selectedDate);
              }
              const currentMonday = getMonday(today);
              if (weekStart < currentMonday) {
                setWeekStart(currentMonday);
              }
              setCreateModalVisible(true);
            }}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            activeOpacity={0.9}
          >
            <View style={styles.liquidGlassSheen} />
            <View style={styles.liquidInnerCore}>
              <Icon name="add" size={32} color="#FFFFFF" style={styles.liquidPlusIcon} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

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

      {/* Month Picker Modal */}
      <MonthPickerModal
        visible={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        selectedYear={selectedDate.getFullYear()}
        selectedMonth={selectedDate.getMonth()}
        isDark={isDark}
        title="Jump to Month & Year"
        onSelectMonth={(year, month) => {
          const newD = new Date(year, month, 1);
          setSelectedDate(newD);
          setWeekStart(getMonday(newD));
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6B7280' },

  viewToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    borderRadius: 26,
    padding: 4,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: 'inset 0px 1px 3px rgba(0, 0, 0, 0.04)' },
      default: {}
    }),
  },
  viewToggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  viewToggleBtnActive: {
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
  viewToggleText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  subHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  subHeaderTitle: { fontSize: 15, fontWeight: '600', color: '#F97316', marginLeft: 8 },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  createBtnText: { fontSize: 13, color: '#4B5563', fontWeight: '500', marginLeft: 4 },
  backToSlotsBtn: { flexDirection: 'row', alignItems: 'center' },
  backToSlotsText: { marginLeft: 4, color: '#6B7280', fontWeight: '500' },

  dateNavigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginHorizontal: 16 },
  dateBadgeText: { color: '#F97316', fontWeight: '600', fontSize: 14 },

  listTopBar: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metricItem: { alignItems: 'center', flex: 1 },
  metricVal: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  metricLbl: { fontSize: 10, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  searchFilterRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1F2937' },
  filterBtnOutline: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  filterBtnOutlineText: { marginLeft: 6, color: '#4B5563', fontSize: 14, fontWeight: '500' },

  cardWrapper: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, elevation: 2, zIndex: 1 },
  cardAccent: { width: 6, backgroundColor: '#F97316', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  cardInner: { flex: 1, padding: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTag: { backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  cardTagText: { color: '#F97316', fontSize: 10, fontWeight: '700' },
  pastTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pastTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusOpen: { backgroundColor: '#ECFDF5' },
  statusLocked: { backgroundColor: '#FEF2F2' },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  textOpen: { color: '#10B981' },
  textLocked: { color: '#EF4444' },
  cardCourseTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  cardBatchText: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardInfoText: { fontSize: 13, color: '#4B5563', marginLeft: 6 },
  capacityContainer: { marginTop: 12, marginBottom: 16 },
  capacityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  capacityText: { fontSize: 12, color: '#4B5563' },
  capacityPct: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  actionBtnBlue: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionBtnBlueText: { color: '#2563EB', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  actionBtnOutline: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionBtnOutlineText: { color: '#4B5563', fontSize: 12, fontWeight: '500', marginLeft: 4 },
  actionBtnDanger: { padding: 6, backgroundColor: '#FEF2F2', borderRadius: 6 },

  gridContainer: { flex: 1, backgroundColor: '#fff' },
  gridHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 8, paddingTop: 16 },
  timeColHeader: { width: 50 },
  dayColHeader: { flex: 1, alignItems: 'center' },
  dayColDay: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  dayColDate: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  gridBody: { flexDirection: 'row', height: 600 },
  timeAxis: { width: 50, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  timeAxisLabel: { height: 60, textAlign: 'center', fontSize: 11, color: '#9CA3AF', paddingTop: -8 },
  gridLinesContainer: { flex: 1, position: 'relative' },
  gridLineHorizontal: { height: 60, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  gridLineVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#F3F4F6' },
  slotBlock: { position: 'absolute', width: '14.28%', padding: 4, borderRadius: 4, overflow: 'hidden', borderLeftWidth: 2, borderLeftColor: '#2563EB' },
  slotBlockTitle: { fontSize: 10, fontWeight: 'bold', color: '#1E3A8A' },
  slotBlockTime: { fontSize: 9, color: '#1E3A8A' },

  monthCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)' },
      default: { elevation: 3 }
    }),
  },
  monthCardContainerDark: {
    backgroundColor: '#141B26',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  monthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  monthCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  monthCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  monthPickerQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  monthPickerQuickBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FF5E14',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
  },
  monthHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  monthDaysWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    width: '14.28%',
    height: 72,
    padding: 6,
    borderWidth: 0.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  monthDayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayNumberBadge: {
    backgroundColor: '#FF5E14',
  },
  selectedNumberBadge: {
    backgroundColor: '#0F172A',
  },
  monthCellText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  todayNumberText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  selectedNumberText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthSlotCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  monthSlotIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF5E14',
    marginRight: 3,
  },
  monthSlotCountText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FF5E14',
  },
  monthLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
  },
  quickPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickPresetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  emptyWeekCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyWeekCardDark: {
    backgroundColor: '#1C1510',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyWeekTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptyWeekSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 16,
  },
  emptyWeekActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5E14',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyWeekActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  createScroll: { flex: 1, backgroundColor: '#fff', padding: 16 },
  createFormTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
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
  actionButtonRow: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  addSlotBtn: {
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
  addSlotBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
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
  popupCancelText: {
    color: '#64748B',
    fontWeight: 'bold',
  },
  popupConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F97316'
  },
  popupConfirmText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  /* LIQUID FAB STYLES */
  inlinePopoverContainer: {
    position: 'absolute',
    top: 45,
    right: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 200,
    paddingVertical: 4,
    zIndex: 999,
    ...Platform.select({
      web: { boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      }
    }),
  },
  popoverMenuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  popoverMenuText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '400',
  },
  popoverMenuTextDanger: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '500',
  },
  popoverMenuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  dotsBtn: {
    padding: 8,
    marginLeft: 12,
  },
  liquidFabContainer: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 998,
  },
  liquidWaveRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 107, 0, 0.4)',
  },
  liquidWaveRingSecond: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 140, 0, 0.3)',
  },
  liquidFabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 8px 26px rgba(255, 107, 0, 0.55), inset 0px 2px 4px rgba(255, 255, 255, 0.4)' },
      default: {
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 10,
      },
    }),
  },
  liquidGlassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  liquidInnerCore: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  liquidPlusIcon: {
    ...Platform.select({
      web: { filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2))' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    }),
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    marginLeft: 8,
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(15, 23, 42, 0.22)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 4 }
    }),
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },

  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 30, fontSize: 14 },
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

  /* Dark mode variants */
  cardWrapperDark: {
    backgroundColor: '#141B26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inlinePopoverContainerDark: {
    backgroundColor: '#141B26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  viewToggleRowDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  viewToggleBtnActiveDark: {
    backgroundColor: '#FF5E14',
  },
  dateNavigatorDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateBadgeDark: {
    backgroundColor: 'rgba(255, 94, 20, 0.15)',
  },
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
  pickerBoxDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillsFormDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cancelBtnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
