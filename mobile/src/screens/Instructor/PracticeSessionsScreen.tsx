import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Modal, RefreshControl, Platform
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';
import { updatePracticeSlot, getSlotBookings } from '../../services/practiceService';

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
  const [activeTab, setActiveTab] = useState<'slots' | 'create'>('slots');
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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

  const [confirmModal, setConfirmModal] = useState<any>({ visible: false, title: '', message: '', onConfirm: () => {} });
  const [alertModal, setAlertModal] = useState<any>({ visible: false, title: '', message: '' });

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
    if (activeTab === 'slots') fetchSlots();
  }, [activeTab, weekStart, selectedDate, viewMode]);

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
      showAlert('Success', 'Practical slot created successfully!', () => {
        setActiveTab('slots');
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
            <View style={[styles.statusPill, slot.is_open ? styles.statusOpen : styles.statusLocked]}>
              <Text style={[styles.statusPillText, slot.is_open ? styles.textOpen : styles.textLocked]}>
                {slot.is_open ? 'OPEN' : 'LOCKED'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.cardCourseTitle}>{slot.batch_id?.course_id?.title || slot.batch_id?.name || 'Practical Session'}</Text>
          <Text style={styles.cardBatchText}>Batch: {slot.batch_id?.name || 'N/A'}</Text>
          
          <View style={styles.cardInfoRow}>
            <Icon name="calendar-outline" size={14} color="#F97316" />
            <Text style={styles.cardInfoText}>{dayShort}, {formattedDate}</Text>
            <Icon name="time-outline" size={14} color="#6B7280" style={{marginLeft: 8}} />
            <Text style={styles.cardInfoText}>{slot.start_time} - {slot.end_time}</Text>
          </View>
          
          {slot.instructor_id?.name && (
            <View style={styles.cardInfoRow}>
              <Icon name="person-outline" size={14} color="#3B82F6" />
              <Text style={[styles.cardInfoText, {color: '#1E3A8A', fontWeight: '600'}]}>Inst. {slot.instructor_id.name}</Text>
            </View>
          )}

          {slot.location && (
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
          
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtnBlue} onPress={() => handleViewBookings(slot)}>
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={{flex: 1}}>
          <Text style={styles.headerTitle}>Practice Slots</Text>
        </View>
      </View>

      {activeTab === 'slots' && (
        <View style={styles.viewToggleRow}>
          {['Month', 'Week', 'Day', 'List'].map(mode => (
            <TouchableOpacity key={mode} style={[styles.viewToggleBtn, viewMode === mode && styles.viewToggleBtnActive]} onPress={() => setViewMode(mode as any)}>
              <Text style={[styles.viewToggleText, viewMode === mode && styles.viewToggleTextActive]}>{mode}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.subHeader}>
        {activeTab === 'slots' ? (
           <>
             <View style={styles.subHeaderLeft}>
                <Icon name="calendar" size={18} color="#F97316" />
                <Text style={styles.subHeaderTitle}>My Practical Slots ({slots.length})</Text>
             </View>
             <TouchableOpacity style={styles.createBtn} onPress={() => setActiveTab('create')}>
               <Icon name="add" size={16} color="#4B5563" />
               <Text style={styles.createBtnText}>Create Slots</Text>
             </TouchableOpacity>
           </>
        ) : (
           <TouchableOpacity style={styles.backToSlotsBtn} onPress={() => setActiveTab('slots')}>
              <Icon name="arrow-back" size={16} color="#6B7280" />
              <Text style={styles.backToSlotsText}>Back to Slots</Text>
           </TouchableOpacity>
        )}
      </View>

      {activeTab === 'slots' && (
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
      )}

      {activeTab === 'slots' ? (
         <View style={{flex: 1}}>
           {viewMode === 'List' && (
             <View style={styles.listTopBar}>
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}><Text style={styles.metricVal}>{slots.length}</Text><Text style={styles.metricLbl}>TOTAL SLOTS</Text></View>
                  <View style={styles.metricItem}><Text style={[styles.metricVal, {color: '#10B981'}]}>{slots.filter(s=>s.is_open).length}</Text><Text style={styles.metricLbl}>OPEN SLOTS</Text></View>
                  <View style={styles.metricItem}><Text style={[styles.metricVal, {color: '#3B82F6'}]}>{slots.reduce((acc, s)=>acc+(s.booked_count||0),0)}</Text><Text style={styles.metricLbl}>BOOKED SEATS</Text></View>
                </View>
                <View style={styles.searchFilterRow}>
                  <View style={styles.searchBox}>
                    <Icon name="search-outline" size={16} color="#9CA3AF" />
                    <TextInput style={styles.searchInput} placeholder="Search by batch, note..." value={search} onChangeText={setSearch} />
                  </View>
                  <TouchableOpacity style={styles.filterBtnOutline} onPress={() => setShowFilter(true)}>
                    <Icon name="options-outline" size={16} color="#4B5563" />
                    <Text style={styles.filterBtnOutlineText}>Filters</Text>
                  </TouchableOpacity>
                </View>
             </View>
           )}

           {loading ? (
             <ActivityIndicator size="large" color="#F97316" style={{marginTop: 40}} />
           ) : (
             viewMode === 'Week' ? renderWeekView() :
             viewMode === 'Month' ? renderMonthView() :
             viewMode === 'Day' ? (
               <ScrollView style={{flex: 1}} contentContainerStyle={{padding: 16, paddingBottom: 100}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                 <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#1F2937'}}>
                   Schedule for {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                 </Text>
                 {slots.filter(s => getSlotActualDate(s.week_start_date, s.day_of_week).getDate() === selectedDate.getDate()).length === 0 ? (
                   <View style={{alignItems: 'center', marginTop: 40}}>
                     <Icon name="calendar-outline" size={48} color="#D1D5DB" />
                     <Text style={{color: '#6B7280', marginVertical: 12}}>No slots scheduled for this day.</Text>
                     <TouchableOpacity style={styles.actionBtnBlue} onPress={() => {
                        setCreateDate(selectedDate);
                        setActiveTab('create');
                     }}>
                       <Icon name="add" size={16} color="#2563EB" />
                       <Text style={styles.actionBtnBlueText}>Create Slot for this Day</Text>
                     </TouchableOpacity>
                   </View>
                 ) : (
                   <>
                     {slots.filter(s => getSlotActualDate(s.week_start_date, s.day_of_week).getDate() === selectedDate.getDate()).map(renderListCard)}
                     <TouchableOpacity style={[styles.actionBtnBlue, {marginTop: 16, alignSelf: 'center'}]} onPress={() => {
                        setCreateDate(selectedDate);
                        setActiveTab('create');
                     }}>
                       <Icon name="add" size={16} color="#2563EB" />
                       <Text style={styles.actionBtnBlueText}>Add Another Slot</Text>
                     </TouchableOpacity>
                   </>
                 )}
               </ScrollView>
             ) :
             <ScrollView style={{flex: 1}} contentContainerStyle={{padding: 16, paddingBottom: 100}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
               {slots.length === 0 ? <Text style={styles.emptyText}>No slots found</Text> : slots.map(renderListCard)}
             </ScrollView>
           )}
         </View>
      ) : (
         <ScrollView style={styles.createScroll} contentContainerStyle={{paddingBottom: 100}}>
           <Text style={styles.createFormTitle}>Create Practical Slot</Text>
           <Text style={styles.createFormSubtitle}>Add a new practical session</Text>
           
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
             <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveTab('slots')}>
               <Text style={styles.cancelBtnText}>Cancel</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.submitBtn} onPress={handleCreateSlot} disabled={creating}>
               {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Slot</Text>}
             </TouchableOpacity>
           </View>
         </ScrollView>
      )}

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
                    <View key={b._id} style={{paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'}}>
                      <Text style={{fontWeight: '500', color: '#1F2937'}}>{b.student_id?.name || 'Unknown Student'}</Text>
                      <Text style={{fontSize: 12, color: '#6B7280'}}>{b.student_id?.email || ''}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6B7280' },
  
  viewToggleRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', marginHorizontal: 16, borderRadius: 8, padding: 4, marginTop: 8 },
  viewToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  viewToggleBtnActive: { backgroundColor: '#F97316' },
  viewToggleText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  viewToggleTextActive: { color: '#fff', fontWeight: '600' },

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

  cardWrapper: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', elevation: 2 },
  cardAccent: { width: 6, backgroundColor: '#F97316' },
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

  monthGridContainer: { flex: 1, backgroundColor: '#fff', padding: 16 },
  monthHeaderRow: { flexDirection: 'row', marginBottom: 12 },
  monthHeaderText: { flex: 1, textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: '500' },
  monthDaysWrapper: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  monthCellText: { fontSize: 14, color: '#1F2937' },
  monthSlotIndicator: { position: 'absolute', bottom: '15%', width: 24, height: 4, backgroundColor: '#93C5FD', borderRadius: 2 },

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
  createActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, marginRight: 8 },
  cancelBtnText: { color: '#4B5563', fontWeight: '600' },
  submitBtn: { flex: 2, padding: 14, alignItems: 'center', backgroundColor: '#F97316', borderRadius: 8, marginLeft: 8 },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModalContainer: { backgroundColor: '#fff', height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16 },
  filterSectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  checkboxLabel: { fontSize: 14, color: '#4B5563' },
  filterFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  resetBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, marginRight: 8 },
  resetBtnText: { color: '#4B5563', fontWeight: '600' },
  applyBtn: { flex: 2, padding: 14, alignItems: 'center', backgroundColor: '#F97316', borderRadius: 8, marginLeft: 8 },
  applyBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  modalActions: { flexDirection: 'row', marginTop: 20 }
});
