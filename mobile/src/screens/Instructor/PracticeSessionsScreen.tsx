import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Modal, RefreshControl, Platform, Animated
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';
import { updatePracticeSlot, getSlotBookings } from '../../services/practiceService';
import ScreenHeader from '../../components/shared/ScreenHeader';

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

export default function PracticeSessionsScreen() {
  const navigation = useNavigation<any>();
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day' | 'List'>('List');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
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

  const [confirmModal, setConfirmModal] = useState<any>({ visible: false, title: '', message: '', onConfirm: () => {} });
  const [alertModal, setAlertModal] = useState<any>({ visible: false, title: '', message: '' });

  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuSlot, setActionMenuSlot] = useState<any>(null);

  const openSlotActions = (slot: any) => {
    setActionMenuSlot(slot);
    setActionMenuVisible(true);
  };

  const openEditModal = (slot: any) => {
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
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to reject cancellation', undefined, 'error');
    }
  };

  // Create Form State
  const [createCourseId, setCreateCourseId] = useState('all');
  const [createBatchId, setCreateBatchId] = useState('all');
  const [createDate, setCreateDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [createStartTime, setCreateStartTime] = useState('09:00');
  const [createEndTime, setCreateEndTime] = useState('12:00');
  const [createLocation, setCreateLocation] = useState('');
  const [createCapacity, setCreateCapacity] = useState('10');
  const [createNotes, setCreateNotes] = useState('');
  const [creating, setCreating] = useState(false);

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
      } else {
         params.weekStart = getLocalDateString(weekStart);
      }
      
      const res = await api.get('/instructors/practice-slots', { params });
      setSlots(res.data || []);
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
    if (createBatchId === 'all') return showAlert('Validation Error', 'Please select a batch', undefined, 'error');
    if (!createStartTime || !createEndTime) return showAlert('Validation Error', 'Please complete time', undefined, 'error');
    
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
    const formattedDate = actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const dayShort = actualDate.toLocaleDateString('en-GB', { weekday: 'short' });

    return (
      <View key={slot._id} style={styles.cardWrapper}>
        <View style={styles.cardAccent} />
        <View style={styles.cardInner}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTag}><Text style={styles.cardTagText}>PRACTICAL SLOT</Text></View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={[styles.statusPill, slot.is_open ? styles.statusOpen : styles.statusLocked]}>
                <Text style={[styles.statusPillText, slot.is_open ? styles.textOpen : styles.textLocked]}>
                  {slot.is_open ? 'OPEN' : 'LOCKED'}
                </Text>
              </View>
              <TouchableOpacity style={styles.dotsBtn} onPress={() => {
                if (actionMenuVisible && actionMenuSlot?._id === slot._id) {
                  setActionMenuVisible(false);
                  setActionMenuSlot(null);
                } else {
                  setActionMenuSlot(slot);
                  setActionMenuVisible(true);
                }
              }}>
                <Icon name="ellipsis-vertical" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Inline Popover Menu */}
          {actionMenuVisible && actionMenuSlot?._id === slot._id && (
            <View style={styles.inlinePopoverContainer}>
              <TouchableOpacity style={styles.popoverMenuItem} onPress={() => { setActionMenuVisible(false); handleViewBookings(slot); }}>
                <Text style={styles.popoverMenuText}>View Students</Text>
              </TouchableOpacity>
              <View style={styles.popoverMenuDivider} />
              <TouchableOpacity style={styles.popoverMenuItem} onPress={() => { setActionMenuVisible(false); openEditModal(slot); }}>
                <Text style={styles.popoverMenuText}>Edit Slot</Text>
              </TouchableOpacity>
              <View style={styles.popoverMenuDivider} />
              <TouchableOpacity style={styles.popoverMenuItem} onPress={() => { setActionMenuVisible(false); toggleSlotStatus(slot); }}>
                <Text style={[styles.popoverMenuText, {color: slot.is_open ? '#DC2626' : '#374151'}]}>
                  {slot.is_open ? 'Lock Slot' : 'Open Slot'}
                </Text>
              </TouchableOpacity>
              <View style={styles.popoverMenuDivider} />
              <TouchableOpacity style={styles.popoverMenuItem} onPress={() => { setActionMenuVisible(false); handleDeleteSlot(slot._id); }}>
                <Text style={styles.popoverMenuTextDanger}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <Text style={styles.cardCourseTitle}>{slot.batch_id?.course_id?.title || slot.batch_id?.name || 'Practical Session'}</Text>
          <Text style={styles.cardBatchText}>Batch: {slot.batch_id?.name || 'N/A'}</Text>
          
          <View style={styles.cardInfoRow}>
            <Icon name="calendar-outline" size={14} color="#F97316" />
            <Text style={styles.cardInfoText}>{dayShort}, {formattedDate}</Text>
            <Icon name="time-outline" size={14} color="#6B7280" style={{marginLeft: 8}} />
            <Text style={styles.cardInfoText}>{slot.start_time} - {slot.end_time}</Text>
          </View>
          
          {!!slot.instructor_id?.name && (
            <View style={styles.cardInfoRow}>
              <Icon name="person-outline" size={14} color="#3B82F6" />
              <Text style={[styles.cardInfoText, {color: '#1E3A8A', fontWeight: '600'}]}>Inst. {slot.instructor_id.name}</Text>
            </View>
          )}

          {!!slot.location && (
            <View style={styles.cardInfoRow}>
              <Icon name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.cardInfoText}>{slot.location}</Text>
            </View>
          )}
          
          <View style={styles.capacityContainer}>
            <View style={styles.capacityRow}>
              <Text style={styles.capacityText}>Capacity: {booked}/{max} Booked</Text>
              <Text style={styles.capacityPct}>{Math.round(fillRatio * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${fillRatio * 100}%`, backgroundColor: fillRatio >= 1 ? '#EF4444' : '#F97316' }]} />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];
    const weekDates = Array.from({length: 7}).map((_,i) => {
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
              <Text style={styles.dayColDay}>{DAYS[i].slice(0,3)}</Text>
              <Text style={styles.dayColDate}>{d.getDate()}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView style={{flex: 1}}>
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
                   <View key={s._id} style={[styles.slotBlock, { left: `${(dayIdx * 14.28)}%`, top, height, backgroundColor: idx%2===0 ? '#93C5FD' : '#FDE047' }]}>
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
    
    const blanks = Array.from({length: startOffset}).map((_,i) => <View key={`blank-${i}`} style={styles.monthCell} />);
    const days = Array.from({length: daysInMonth}).map((_,i) => {
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
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <Text key={d} style={styles.monthHeaderText}>{d}</Text>)}
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
        title="Practice Slots"
        subtitle="Schedule & manage practical sessions"
      />



      <View style={styles.viewToggleRow}>
        {['Month', 'Week', 'Day', 'List'].map(mode => (
          <TouchableOpacity key={mode} style={[styles.viewToggleBtn, viewMode === mode && styles.viewToggleBtnActive]} onPress={() => setViewMode(mode as any)}>
            <Text style={[styles.viewToggleText, viewMode === mode && styles.viewToggleTextActive]}>{mode}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.subHeader}>
         <View style={styles.subHeaderLeft}>
            <Icon name="calendar" size={18} color="#F58220" />
            <Text style={styles.subHeaderTitle}>My Practical Slots ({slots.length})</Text>
         </View>
      </View>

      <View style={styles.dateNavigator}>
        <TouchableOpacity onPress={() => viewMode === 'Month' ? changeMonth(-1) : viewMode === 'Day' ? changeDay(-1) : changeWeek(-1)}>
          <Icon name="chevron-back" size={20} color="#F97316" />
        </TouchableOpacity>
        <View style={styles.dateBadge}>
          <Icon name="calendar-outline" size={14} color="#F97316" style={{marginRight: 6}} />
          <Text style={styles.dateBadgeText}>
            {viewMode === 'Month' 
              ? selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
              : viewMode === 'Day'
              ? selectedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
              : `Week of ${getLocalDateString(weekStart)}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => viewMode === 'Month' ? changeMonth(1) : viewMode === 'Day' ? changeDay(1) : changeWeek(1)}>
          <Icon name="chevron-forward" size={20} color="#F97316" />
        </TouchableOpacity>
      </View>

      <View style={{flex: 1}}>
        {loading ? (
          <ActivityIndicator size="large" color="#F97316" style={{marginTop: 40}} />
        ) : (
          viewMode === 'Week' ? renderWeekView() :
          viewMode === 'Month' ? renderMonthView() :
          viewMode === 'Day' ? (
            <ScrollView style={{flex: 1}} contentContainerStyle={{padding: 16, paddingBottom: 100}}>
              {slots.filter(s => getSlotActualDate(s.week_start_date, s.day_of_week).getDate() === selectedDate.getDate()).length === 0 ? (
                <View style={{alignItems: 'center', marginTop: 40}}>
                  <Icon name="calendar-outline" size={48} color="#D1D5DB" />
                  <Text style={{color: '#6B7280', marginVertical: 12}}>No slots scheduled for this day.</Text>
                </View>
              ) : (
                <>
                  {slots.filter(s => getSlotActualDate(s.week_start_date, s.day_of_week).getDate() === selectedDate.getDate()).map(renderListCard)}
                </>
              )}
            </ScrollView>
          ) :
          <ScrollView style={{flex: 1}} contentContainerStyle={{padding: 16, paddingBottom: 100}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {slots.length === 0 ? <Text style={styles.emptyText}>No slots found</Text> : slots.map(renderListCard)}
          </ScrollView>
        )}
      </View>

      {/* POP-UP MODAL FOR CREATE SLOT */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>Create Practical Slot</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.closeModalIconBtn}>
                <Icon name="close" size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              <Text style={styles.createFormSubtitle}>Add a new practical training session</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}><Icon name="people-outline" size={14}/> Batch *</Text>
                <View style={styles.pickerWrap}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {batches.map(b => (
                      <TouchableOpacity key={b._id} style={[styles.pillsForm, createBatchId === b._id && styles.pillsFormActive]} onPress={() => setCreateBatchId(b._id)}>
                        <Text style={[styles.pillsFormText, createBatchId === b._id && {color: '#fff'}]}>{b.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}><Icon name="calendar-outline" size={14}/> Date *</Text>
                <TouchableOpacity style={styles.pickerBox} onPress={() => setShowDatePicker(true)}>
                  <Text>{createDate.toLocaleDateString('en-GB')}</Text>
                  <Icon name="calendar" size={18} color="#9CA3AF" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker value={createDate} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if (d) setCreateDate(d); }} />
                )}
              </View>

              <View style={styles.rowGroup}>
                <View style={[styles.formGroup, {flex: 1}]}>
                  <Text style={styles.label}>Start Time *</Text>
                  <TextInput style={styles.textInputBox} value={createStartTime} onChangeText={setCreateStartTime} placeholder="09:00" />
                </View>
                <View style={[styles.formGroup, {flex: 1, marginLeft: 12}]}>
                  <Text style={styles.label}>End Time *</Text>
                  <TextInput style={styles.textInputBox} value={createEndTime} onChangeText={setCreateEndTime} placeholder="12:00" />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}><Icon name="location-outline" size={14}/> Location / Lab *</Text>
                <TextInput style={styles.textInputBox} value={createLocation} onChangeText={setCreateLocation} placeholder="Hardware Lab 01" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}><Icon name="person-outline" size={14}/> Capacity *</Text>
                <TextInput style={styles.textInputBox} value={createCapacity} onChangeText={setCreateCapacity} keyboardType="numeric" />
              </View>
              
              <View style={styles.createActionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateSlot} disabled={creating}>
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
            <ScrollView style={{padding: 16}}>
              <Text style={styles.filterSectionTitle}>Course</Text>
              <View style={styles.pickerBox}><Text>All Courses</Text></View>
              
              <Text style={[styles.filterSectionTitle, {marginTop: 20}]}>Batch</Text>
              <View style={styles.pickerBox}><Text>All Batches</Text></View>

              <Text style={[styles.filterSectionTitle, {marginTop: 20}]}>Status</Text>
              {Object.keys(statusFilter).map(k => (
                <TouchableOpacity key={k} style={styles.checkboxRow} onPress={() => setStatusFilter({...statusFilter, [k]: !statusFilter[k]})}>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Slot</Text>
            <Text style={styles.label}>Capacity</Text>
            <TextInput style={styles.textInputBox} value={editMaxStudents} onChangeText={setEditMaxStudents} keyboardType="numeric" />
            <Text style={[styles.label, {marginTop: 12}]}>Location</Text>
            <TextInput style={styles.textInputBox} value={editLocation} onChangeText={setEditLocation} />
            <Text style={[styles.label, {marginTop: 12}]}>Notes</Text>
            <TextInput style={[styles.textInputBox, {height: 80, textAlignVertical: 'top'}]} value={editEquipmentNote} onChangeText={setEditEquipmentNote} multiline />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={saveEditSlot} disabled={editSaving}>
                {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BOOKINGS (STUDENTS) MODAL */}
      <Modal visible={bookingsModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxHeight: '80%'}]}>
            <Text style={styles.modalTitle}>Booked Students</Text>
            {bookingsLoading ? <ActivityIndicator size="small" color="#2563EB" /> : (
              <ScrollView style={{marginBottom: 20}}>
                {slotBookings.length === 0 ? <Text style={{color: '#6B7280'}}>No students booked yet.</Text> : 
                  slotBookings.map((b: any) => (
                    <View key={b._id} style={{paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                      <View style={{flex: 1}}>
                        <Text style={{fontWeight: '500', color: '#1F2937'}}>{b.student_id?.name || 'Unknown Student'}</Text>
                        <Text style={{fontSize: 12, color: '#6B7280'}}>{b.student_id?.email || ''}</Text>
                        {b.status === 'cancellation_requested' && (
                          <View>
                            <Text style={{fontSize: 12, color: '#F59E0B', fontWeight: '600', marginTop: 2}}>Cancellation Requested</Text>
                            {b.cancellation_reason ? (
                              <Text style={{fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginTop: 2}}>Reason: {b.cancellation_reason}</Text>
                            ) : null}
                          </View>
                        )}
                      </View>
                      {b.status === 'cancellation_requested' && (
                        <View style={{flexDirection: 'row', gap: 8}}>
                          <TouchableOpacity style={{backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6}} onPress={() => handleApproveCancellation(b._id)}>
                            <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={{backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6}} onPress={() => handleRejectCancellation(b._id)}>
                            <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                }
              </ScrollView>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookingsModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CONFIRM MODAL */}
      <Modal visible={confirmModal.visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{confirmModal.title}</Text>
            <Text style={{color: '#4B5563', marginBottom: 20}}>{confirmModal.message}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmModal({...confirmModal, visible: false})}>
                <Text style={styles.cancelBtnText}>{confirmModal.cancelText || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, confirmModal.type === 'danger' && {backgroundColor: '#DC2626'}]} onPress={() => { setConfirmModal({...confirmModal, visible: false}); confirmModal.onConfirm(); }}>
                <Text style={styles.submitBtnText}>{confirmModal.confirmText || 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ALERT MODAL */}
      <Modal visible={alertModal.visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{alertModal.title}</Text>
            <Text style={{color: '#4B5563', marginBottom: 20}}>{alertModal.message}</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={() => { setAlertModal({...alertModal, visible: false}); if (alertModal.onOk) alertModal.onOk(); }}>
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
              setCreateDate(selectedDate);
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

  monthGridContainer: { flex: 1, padding: 16 },
  monthHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  monthHeaderText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#6B7280' },
  monthDaysWrapper: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.28%', height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#E5E7EB' },
  monthCellText: { fontSize: 14, color: '#1F2937' },
  monthSlotIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F97316', marginTop: 4 },

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
});
