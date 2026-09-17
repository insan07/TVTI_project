import React, { useState, useEffect, useRef } from 'react';
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
  RefreshControl,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import ScreenHeader from '../../components/shared/ScreenHeader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
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

export default function AdminSlotManagementScreen() {
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day' | 'List'>('List');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState('');
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
  const [slotBookings, setSlotBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Assign Student Sub-Modal
  const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);

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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const headerAnim = useRef(new Animated.Value(1)).current;
  const isHeaderVisibleRef = useRef(true);
  const lastScrollY = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isSearchFocused) return;
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (currentY <= 15) {
      if (!isHeaderVisibleRef.current) {
        isHeaderVisibleRef.current = true;
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }).start();
      }
    } else if (diff > 8 && currentY > 35) {
      if (isHeaderVisibleRef.current) {
        isHeaderVisibleRef.current = false;
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: false,
        }).start();
      }
    } else if (diff < -8) {
      if (!isHeaderVisibleRef.current) {
        isHeaderVisibleRef.current = true;
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }).start();
      }
    }
    lastScrollY.current = currentY;
  };
  const [createBatchId, setCreateBatchId] = useState('');
  const [createInstructorId, setCreateInstructorId] = useState('');
  const [createDate, setCreateDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [createStartTime, setCreateStartTime] = useState('09:00');
  const [createEndTime, setCreateEndTime] = useState('12:00');
  const [createLocation, setCreateLocation] = useState('Hardware Lab 01');
  const [createCapacity, setCreateCapacity] = useState('10');
  const [createEquipmentNote, setCreateEquipmentNote] = useState('');
  const [newSlots, setNewSlots] = useState([
    { day_of_week: 'Monday', start_time: '09:00', end_time: '12:00', max_students: '10', equipment_note: '', location: 'Hardware Lab 01' }
  ]);
  const [creating, setCreating] = useState(false);

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

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [weekStart, selectedDate, viewMode, selectedBatchFilter, selectedInstructorFilter, selectedCourseFilter, statusFilter, search]);

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
    try {
      const [bRes, uRes, cRes] = await Promise.all([
        api.get('/admin/batches').catch(() => ({ data: [] })),
        api.get('/admin/users?role=instructor').catch(() => ({ data: [] })),
        api.get('/admin/courses').catch(() => ({ data: [] }))
      ]);
      const bList = bRes.data || [];
      const iList = uRes.data || [];
      const cList = cRes.data || [];
      setBatches(bList);
      setInstructors(iList);
      setCourses(cList);

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

      if (viewMode === 'Month') {
        const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        start.setDate(start.getDate() - 7);
        const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 7);
        params.startDate = getLocalDateString(start);
        params.endDate = getLocalDateString(end);
      } else {
        params.weekStart = getLocalDateString(weekStart);
      }

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

      if (search.trim()) {
        const q = search.toLowerCase();
        data = data.filter((s: any) =>
          (s.batch_id?.name || '').toLowerCase().includes(q) ||
          (s.batch_id?.course_id?.title || '').toLowerCase().includes(q) ||
          (s.instructor_id?.name || '').toLowerCase().includes(q) ||
          (s.equipment_note || '').toLowerCase().includes(q) ||
          (s.location || '').toLowerCase().includes(q)
        );
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
      showAlert('Success', `${studentName} assigned to slot!`, undefined, 'success');
      setAddStudentModalVisible(false);
      openBookingsModal(selectedSlot);
      fetchSlots();
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to assign student', undefined, 'error');
    }
  };

  const openEditModal = (slot: any) => {
    setSelectedSlot(slot);
    setEditInstructorId(slot.instructor_id?._id || slot.instructor_id || '');
    setEditMaxStudents(String(slot.max_students || 10));
    setEditEquipmentNote(slot.equipment_note || '');
    setEditLocation(slot.location || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    const maxN = parseInt(editMaxStudents, 10);
    if (!maxN || maxN < 1) return showAlert('Error', 'Max students must be at least 1', undefined, 'error');
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

    const capN = parseInt(createCapacity, 10);
    if (isNaN(capN) || capN < 1) return showAlert('Error', 'Capacity must be at least 1 student', undefined, 'error');

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
      const maxN = parseInt(s.max_students, 10);
      if (!maxN || maxN < 1) return showAlert('Error', 'Max capacity must be at least 1', undefined, 'error');
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
    const booked = slot.booked_count || 0;
    const max = slot.max_students || 1;
    const fillRatio = Math.min(1, booked / max);
    const actualDate = getSlotActualDate(slot.week_start_date, slot.day_of_week);
    const formattedDate = actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const dayShort = actualDate.toLocaleDateString('en-GB', { weekday: 'short' });

    return (
      <View key={slot._id} style={styles.cardWrapper}>
        <View style={styles.cardAccent} />
        <View style={styles.cardInner}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTag}><Text style={styles.cardTagText}>PRACTICAL SLOT</Text></View>
            <View style={[styles.statusPillBadge, slot.is_open ? styles.statusOpen : styles.statusLocked]}>
              <Text style={[styles.statusPillBadgeText, slot.is_open ? styles.textOpen : styles.textLocked]}>
                {slot.is_open ? 'OPEN' : 'LOCKED'}
              </Text>
            </View>
          </View>

          <Text style={styles.cardCourseTitle}>{slot.batch_id?.course_id?.title || slot.batch_id?.name || 'Practical Session'}</Text>
          <Text style={styles.cardBatchText}>Batch: {slot.batch_id?.name || 'N/A'}</Text>

          <View style={styles.cardInfoRow}>
            <Icon name="calendar-outline" size={14} color="#F97316" />
            <Text style={styles.cardInfoText}>{dayShort}, {formattedDate}</Text>
            <Icon name="time-outline" size={14} color="#6B7280" style={{ marginLeft: 8 }} />
            <Text style={styles.cardInfoText}>{slot.start_time} - {slot.end_time}</Text>
          </View>

          {slot.instructor_id?.name && (
            <View style={styles.cardInfoRow}>
              <Icon name="person-outline" size={14} color="#3B82F6" />
              <Text style={[styles.cardInfoText, { color: '#1E3A8A', fontWeight: '600' }]}>Inst. {slot.instructor_id.name}</Text>
            </View>
          )}

          {slot.location && (
            <View style={styles.cardInfoRow}>
              <Icon name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.cardInfoText}>{slot.location}</Text>
            </View>
          )}

          {slot.equipment_note ? (
            <View style={styles.noteBox}>
              <Icon name="hardware-chip-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.noteText}>{slot.equipment_note}</Text>
            </View>
          ) : null}

          <View style={styles.capacityContainer}>
            <View style={styles.capacityRow}>
              <Text style={styles.capacityText}>Capacity: {booked}/{max} Booked</Text>
              <Text style={styles.capacityPct}>{Math.round(fillRatio * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${fillRatio * 100}%`, backgroundColor: fillRatio >= 1 ? '#EF4444' : '#F97316' }]} />
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtnBlue} onPress={() => openBookingsModal(slot)}>
              <Icon name="people" size={14} color="#2563EB" />
              <Text style={styles.actionBtnBlueText}>Students ({booked})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => openEditModal(slot)}>
              <Icon name="create-outline" size={14} color="#4B5563" />
              <Text style={styles.actionBtnOutlineText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => toggleSlotStatus(slot)}>
              <Icon name={slot.is_open ? "lock-closed-outline" : "lock-open-outline"} size={14} color={slot.is_open ? "#DC2626" : "#16A34A"} />
              <Text style={[styles.actionBtnOutlineText, { color: slot.is_open ? '#DC2626' : '#16A34A' }]}>{slot.is_open ? 'Lock' : 'Open'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDeleteSlot(slot._id)}>
              <Icon name="trash-outline" size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
    const weekDates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <View style={styles.gridContainer}>
        <View style={styles.gridHeaderRow}>
          <View style={styles.timeColHeader} />
          {weekDates.map((d, i) => (
            <TouchableOpacity key={i} style={styles.dayColHeader} onPress={() => {
              setSelectedDate(d);
              setWeekStart(getMonday(d));
              setViewMode('Day');
            }}>
              <Text style={styles.dayColDay}>{DAYS[i].slice(0, 3)}</Text>
              <Text style={styles.dayColDate}>{d.getDate()}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.gridBody}>
            <View style={styles.timeAxis}>
              {hours.map(h => <Text key={h} style={styles.timeAxisLabel}>{h}</Text>)}
            </View>
            <View style={styles.gridLinesContainer}>
              {hours.map(h => <View key={h} style={styles.gridLineHorizontal} />)}
              {weekDates.map((d, i) => <View key={i} style={styles.gridLineVertical} />)}

              {slots.map((s, idx) => {
                const dayIdx = DAYS.indexOf(s.day_of_week);
                if (dayIdx === -1) return null;
                const startH = parseInt(s.start_time.split(':')[0]);
                const endH = parseInt(s.end_time.split(':')[0]);
                if (startH < 8 || startH > 16) return null;
                const top = (startH - 8) * 60;
                const height = (endH - startH) * 60;
                return (
                  <View key={s._id} style={[styles.slotBlock, { left: `${(dayIdx * 14.28)}%`, top, height, backgroundColor: idx % 2 === 0 ? '#93C5FD' : '#FDE047' }]}>
                    <Text style={styles.slotBlockTitle}>{s.batch_id?.name || 'Slot'}</Text>
                    <Text style={styles.slotBlockTime}>{s.start_time}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderMonthView = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const blanks = Array.from({ length: startOffset }).map((_, i) => <View key={`blank-${i}`} style={styles.monthCell} />);
    const days = Array.from({ length: daysInMonth }).map((_, i) => {
      const d = i + 1;
      const hasSlot = slots.some(s => getSlotActualDate(s.week_start_date, s.day_of_week).getDate() === d);
      return (
        <TouchableOpacity key={`day-${d}`} style={styles.monthCell} onPress={() => {
          const newDate = new Date(year, month, d);
          setSelectedDate(newDate);
          setWeekStart(getMonday(newDate));
          setViewMode('Day');
        }}>
          <Text style={styles.monthCellText}>{d}</Text>
          {hasSlot && <View style={styles.monthSlotIndicator} />}
        </TouchableOpacity>
      );
    });

    return (
      <View style={styles.monthGridContainer}>
        <View style={styles.monthHeaderRow}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <Text key={d} style={styles.monthHeaderText}>{d}</Text>)}
        </View>
        <View style={styles.monthDaysWrapper}>
          {blanks}
          {days}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Slot Management"
        subtitle="Configure & manage practical training slots"
      />

      {/* Mode View Tabs (Month / Week / Day / List) */}
      <View style={styles.viewToggleRow}>
        {['Month', 'Week', 'Day', 'List'].map(mode => (
          <TouchableOpacity key={mode} style={[styles.viewToggleBtn, viewMode === mode && styles.viewToggleBtnActive]} onPress={() => setViewMode(mode as any)}>
            <Text style={[styles.viewToggleText, viewMode === mode && styles.viewToggleTextActive]}>{mode}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Navigator Bar */}
      <View style={styles.dateNavigator}>
        <TouchableOpacity onPress={() => viewMode === 'Month' ? changeMonth(-1) : viewMode === 'Day' ? changeDay(-1) : changeWeek(-1)}>
          <Icon name="chevron-back" size={20} color="#F58220" />
        </TouchableOpacity>
        <View style={styles.dateBadge}>
          <Icon name="calendar-outline" size={14} color="#F58220" style={{ marginRight: 6 }} />
          <Text style={styles.dateBadgeText}>
            {viewMode === 'Month'
              ? selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
              : viewMode === 'Day'
                ? selectedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                : `Week of ${getLocalDateString(weekStart)}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => viewMode === 'Month' ? changeMonth(1) : viewMode === 'Day' ? changeDay(1) : changeWeek(1)}>
          <Icon name="chevron-forward" size={20} color="#F58220" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {viewMode === 'List' && (
          <Animated.View
            style={{
              maxHeight: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 120],
              }),
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0],
                  }),
                },
              ],
              overflow: 'hidden',
            }}
          >
            <View style={styles.listTopBar}>
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}><Text style={styles.metricVal}>{slots.length}</Text><Text style={styles.metricLbl}>TOTAL SLOTS</Text></View>
                <View style={styles.metricItem}><Text style={[styles.metricVal, { color: '#10B981' }]}>{slots.filter(s => s.is_open).length}</Text><Text style={styles.metricLbl}>OPEN SLOTS</Text></View>
                <View style={styles.metricItem}><Text style={[styles.metricVal, { color: '#3B82F6' }]}>{slots.reduce((acc, s) => acc + (s.booked_count || 0), 0)}</Text><Text style={styles.metricLbl}>BOOKED SEATS</Text></View>
              </View>
              <View style={styles.searchFilterRow}>
                <View style={styles.searchBox}>
                  <Icon name="search-outline" size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by batch, note..."
                    value={search}
                    onChangeText={setSearch}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                </View>
                <TouchableOpacity style={styles.filterBtnOutline} onPress={() => setShowFilter(true)}>
                  <Icon name="options-outline" size={16} color="#4B5563" />
                  <Text style={styles.filterBtnOutlineText}>Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#F58220" style={{ marginTop: 40 }} />
        ) : (
          viewMode === 'Week' ? renderWeekView() :
            viewMode === 'Month' ? renderMonthView() :
              viewMode === 'Day' ? (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#1F2937' }}>
                    Schedule for {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                  {slots.filter(s => getSlotActualDate(s.week_start_date, s.day_of_week).getDate() === selectedDate.getDate()).length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                      <Icon name="calendar-outline" size={48} color="#D1D5DB" />
                      <Text style={{ color: '#6B7280', marginVertical: 12 }}>No slots scheduled for this day.</Text>
                      <TouchableOpacity style={styles.actionBtnBlue} onPress={() => {
                        setCreateDate(selectedDate);
                        setCreateModalVisible(true);
                      }}>
                        <Icon name="add" size={16} color="#2563EB" />
                        <Text style={styles.actionBtnBlueText}>Create Slot for this Day</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {slots.filter(s => getSlotActualDate(s.week_start_date, s.day_of_week).getDate() === selectedDate.getDate()).map(renderListCard)}
                      <TouchableOpacity style={[styles.actionBtnBlue, { marginTop: 16, alignSelf: 'center' }]} onPress={() => {
                        setCreateDate(selectedDate);
                        setCreateModalVisible(true);
                      }}>
                        <Icon name="add" size={16} color="#2563EB" />
                        <Text style={styles.actionBtnBlueText}>Add Another Slot</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>
              ) :
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  {slots.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Icon name="calendar-outline" size={48} color="#D1D5DB" />
                      <Text style={styles.emptyTitle}>No practical slots found.</Text>
                      <Text style={styles.emptySubtitle}>Try adjusting your filters or create a new slot.</Text>
                    </View>
                  ) : slots.map(renderListCard)}
                </ScrollView>
        )}
      </View>

      {/* CREATE PRACTICAL SLOT POPUP MODAL */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.createModalOverlay}>
          <View style={styles.createModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitleText}>Create Practical Slot</Text>
                <Text style={styles.modalSubtitleText}>Configure date, time & capacity</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.closeModalIconBtn}>
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
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

              {createMode === 'single' ? (
                /* SINGLE SLOT (DATE PICKER FORM) */
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.formSectionTitle}>2. Date & Session Details</Text>

                  <Text style={styles.fieldLabel}>PRACTICAL DATE *</Text>
                  <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                    <Icon name="calendar" size={18} color="#F58220" style={{ marginRight: 8 }} />
                    <Text style={styles.datePickerBtnText}>{createDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={createDate}
                      mode="date"
                      display="default"
                      onChange={(e, d) => {
                        setShowDatePicker(false);
                        if (d) setCreateDate(d);
                      }}
                    />
                  )}

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>START TIME *</Text>
                      <TextInput
                        style={styles.textInputBox}
                        placeholder="09:00"
                        value={createStartTime}
                        onChangeText={setCreateStartTime}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>END TIME *</Text>
                      <TextInput
                        style={styles.textInputBox}
                        placeholder="12:00"
                        value={createEndTime}
                        onChangeText={setCreateEndTime}
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

                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setCreateModalVisible(false)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.submitCreateBtn}
                      onPress={handleCreateSingleSlot}
                      disabled={creating}
                    >
                      {creating ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <Icon name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.submitCreateBtnText}>Create Practical Slot</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* MULTI-SLOT BUILDER FORM */
                <View style={{ marginTop: 16 }}>
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
                            style={styles.textInputBox}
                            placeholder="09:00"
                            value={slot.start_time}
                            onChangeText={t => updateNewSlot(idx, 'start_time', t)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>END TIME *</Text>
                          <TextInput
                            style={styles.textInputBox}
                            placeholder="12:00"
                            value={slot.end_time}
                            onChangeText={t => updateNewSlot(idx, 'end_time', t)}
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

                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setCreateModalVisible(false)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.submitCreateBtn}
                      onPress={handleCreateSlots}
                      disabled={creating}
                    >
                      {creating ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <Icon name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.submitCreateBtnText}>Publish All Slots</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

      {/* STUDENT BOOKINGS MODAL */}
      <Modal visible={bookingsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Booked Students</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedSlot?.day_of_week} ({selectedSlot?.start_time} - {selectedSlot?.end_time})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBookingsModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

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
              <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 20 }} />
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
              <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 20 }} />
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
            onPress={() => setCreateModalVisible(true)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  actionButtonRow: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
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
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  addSlotBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  viewToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    borderRadius: 26,
    padding: 4,
    marginTop: 6,
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

  dateNavigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginHorizontal: 16 },
  dateBadgeText: { color: '#F97316', fontWeight: '600', fontSize: 14 },

  listTopBar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metricItem: { alignItems: 'center', flex: 1 },
  metricVal: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  metricLbl: { fontSize: 10, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  searchFilterRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13.5, color: '#1F2937' },
  filterBtnOutline: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  filterBtnOutlineText: { marginLeft: 6, color: '#4B5563', fontSize: 13, fontWeight: '500' },

  cardWrapper: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', elevation: 2 },
  cardAccent: { width: 6, backgroundColor: '#F97316' },
  cardInner: { flex: 1, padding: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTag: { backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  cardTagText: { color: '#F97316', fontSize: 10, fontWeight: 'bold' },
  statusPillBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusOpen: { backgroundColor: '#DCFCE7' },
  statusLocked: { backgroundColor: '#FEE2E2' },
  statusPillBadgeText: { fontSize: 10, fontWeight: 'bold' },
  textOpen: { color: '#16A34A' },
  textLocked: { color: '#DC2626' },
  cardCourseTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 2 },
  cardBatchText: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardInfoText: { marginLeft: 6, fontSize: 13, color: '#4B5563' },
  noteBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  noteText: { fontSize: 12, color: '#475569', fontStyle: 'italic' },
  capacityContainer: { marginTop: 8, marginBottom: 12 },
  capacityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  capacityText: { fontSize: 12, color: '#6B7280' },
  capacityPct: { fontSize: 12, color: '#6B7280', fontWeight: 'bold' },
  progressTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtnBlue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', paddingVertical: 8, borderRadius: 6 },
  actionBtnBlueText: { marginLeft: 4, color: '#2563EB', fontSize: 12, fontWeight: '600' },
  actionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 8, borderRadius: 6 },
  actionBtnOutlineText: { marginLeft: 4, color: '#4B5563', fontSize: 12, fontWeight: '500' },
  actionBtnDanger: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', borderRadius: 6 },

  gridContainer: { flex: 1, backgroundColor: '#fff' },
  gridHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  timeColHeader: { width: 50 },
  dayColHeader: { flex: 1, alignItems: 'center', paddingVertical: 8, borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
  dayColDay: { fontSize: 12, color: '#6B7280' },
  dayColDate: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  gridBody: { flexDirection: 'row', flex: 1 },
  timeAxis: { width: 50, backgroundColor: '#F9FAFB' },
  timeAxisLabel: { height: 60, fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingTop: 4 },
  gridLinesContainer: { flex: 1, position: 'relative' },
  gridLineHorizontal: { height: 60, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  gridLineVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#F3F4F6' },
  slotBlock: { position: 'absolute', width: '14.28%', padding: 4, borderRadius: 4, overflow: 'hidden' },
  slotBlockTitle: { fontSize: 10, fontWeight: 'bold', color: '#1E3A8A' },
  slotBlockTime: { fontSize: 9, color: '#1E3A8A' },

  monthGridContainer: { flex: 1, padding: 16 },
  monthHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  monthHeaderText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#6B7280' },
  monthDaysWrapper: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.28%', height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#E5E7EB' },
  monthCellText: { fontSize: 14, color: '#1F2937' },
  monthSlotIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F97316', marginTop: 4 },

  createScroll: { flex: 1, padding: 16 },
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
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginTop: 4 },
  datePickerBtnText: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
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

  /* LIQUID FAB STYLES */
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

  emptyContainer: { alignItems: 'center', marginVertical: 30, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#475569', marginTop: 10 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4 },

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
  popupCancelBtn: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  popupCancelText: { color: '#475569', fontWeight: 'bold', fontSize: 14 },
  popupConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  popupConfirmText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  popupSingleBtn: { width: '100%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  popupSingleBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }
});

