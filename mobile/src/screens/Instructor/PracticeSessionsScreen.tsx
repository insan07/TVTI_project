import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getMyPracticeSlots, createPracticeSlots, updatePracticeSlot, getSlotBookings } from '../../services/practiceService';
import api from '../../services/api';
import { COLORS } from '../../config/theme';

const PracticeSessionsScreen = () => {
  const [activeTab, setActiveTab] = useState<'my_slots' | 'open_slots'>('my_slots');
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // My Slots Tab State
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingsModalVisible, setBookingsModalVisible] = useState(false);
  const [slotBookings, setSlotBookings] = useState<any[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMaxStudents, setEditMaxStudents] = useState('');
  const [editEquipmentNote, setEditEquipmentNote] = useState('');

  // Open Slots Tab State
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [newSlots, setNewSlots] = useState([{ day_of_week: 'Monday', start_time: '09:00', end_time: '11:00', max_students: '5', equipment_note: '' }]);

  useEffect(() => {
    if (activeTab === 'my_slots') {
      fetchMySlots();
    } else {
      fetchBatches();
    }
  }, [activeTab, weekStart]);

  function getMonday(d: Date) {
    d = new Date(d);
    var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  }

  const changeWeek = (offset: number) => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setWeekStart(newDate);
  };

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchMySlots = async () => {
    setLoading(true);
    try {
      const data = await getMyPracticeSlots({ weekStart: getLocalDateString(weekStart) });
      setSlots(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load practice slots');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await api.get('/instructors/my-schedule');
      setBatches(res.data);
      if (res.data.length > 0 && !selectedBatch) setSelectedBatch(res.data[0]._id);
    } catch (e) {
      console.log('Error fetching batches', e);
    }
  };

  const toggleSlotStatus = async (slot: any) => {
    try {
      await updatePracticeSlot(slot._id, { is_open: !slot.is_open });
      fetchMySlots();
    } catch (e) {
      Alert.alert('Error', 'Failed to update slot status');
    }
  };

  const openBookingsModal = async (slot: any) => {
    try {
      const data = await getSlotBookings(slot._id);
      setSlotBookings(data);
      setSelectedSlot(slot);
      setBookingsModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch bookings');
    }
  };

  const openEditModal = (slot: any) => {
    setSelectedSlot(slot);
    setEditMaxStudents(slot.max_students.toString());
    setEditEquipmentNote(slot.equipment_note || '');
    setEditModalVisible(true);
  };

  const handleEditSlot = async () => {
    try {
      await updatePracticeSlot(selectedSlot._id, {
        max_students: parseInt(editMaxStudents, 10),
        equipment_note: editEquipmentNote,
      });
      setEditModalVisible(false);
      fetchMySlots();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update slot');
    }
  };

  const handleCreateSlots = async () => {
    if (!selectedBatch) return Alert.alert('Error', 'Select a batch first');
    try {
      setLoading(true);
      await createPracticeSlots({
        batch_id: selectedBatch,
        week_start_date: getLocalDateString(weekStart),
        slots: newSlots.map(s => ({ ...s, max_students: parseInt(s.max_students, 10) })) as any
      });
      
      Alert.alert(
        'Success',
        'Practice slots have been successfully created.',
        [
          { 
            text: 'View My Slots', 
            onPress: () => {
              setActiveTab('my_slots');
              setNewSlots([{ day_of_week: 'Monday', start_time: '09:00', end_time: '11:00', max_students: '5', equipment_note: '' }]);
            }
          },
          { 
            text: 'Create More', 
            style: 'cancel',
            onPress: () => {
              setNewSlots([{ day_of_week: 'Monday', start_time: '09:00', end_time: '11:00', max_students: '5', equipment_note: '' }]);
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to create slots');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity style={[styles.tab, activeTab === 'my_slots' && styles.activeTab]} onPress={() => setActiveTab('my_slots')}>
          <Text style={[styles.tabText, activeTab === 'my_slots' && styles.activeTabText]}>My Slots</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'open_slots' && styles.activeTab]} onPress={() => setActiveTab('open_slots')}>
          <Text style={[styles.tabText, activeTab === 'open_slots' && styles.activeTabText]}>Open Slots</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekPicker}>
        <TouchableOpacity onPress={() => changeWeek(-1)}><Icon name="chevron-back" size={24} color={COLORS.primary} /></TouchableOpacity>
        <Text style={styles.weekText}>Week of {getLocalDateString(weekStart)}</Text>
        <TouchableOpacity onPress={() => changeWeek(1)}><Icon name="chevron-forward" size={24} color={COLORS.primary} /></TouchableOpacity>
      </View>

      {activeTab === 'my_slots' ? (
        loading ? <ActivityIndicator size="large" style={{ marginTop: 20 }} color={COLORS.primary} /> :
        <ScrollView style={styles.content}>
          {slots.length === 0 ? <Text style={styles.emptyText}>No slots found for this week.</Text> :
            slots.map((slot) => (
              <View key={slot._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{slot.day_of_week} | {slot.start_time} - {slot.end_time}</Text>
                  <View style={[styles.badge, { backgroundColor: slot.is_open ? COLORS.success : COLORS.error }]}>
                    <Text style={styles.badgeText}>{slot.is_open ? 'Open' : 'Closed'}</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>Max Students: {slot.max_students} | Booked: {slot.booked_count}</Text>
                {slot.equipment_note ? <Text style={styles.cardSub}>Equipment: {slot.equipment_note}</Text> : null}
                
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openBookingsModal(slot)}>
                    <Text style={styles.actionText}>View Bookings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(slot)}>
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => toggleSlotStatus(slot)}>
                    <Text style={styles.actionText}>{slot.is_open ? 'Close' : 'Reopen'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          }
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.label}>Select Batch</Text>
          <View style={styles.pickerContainer}>
            {batches.map(b => (
              <TouchableOpacity key={b._id} style={[styles.batchBtn, selectedBatch === b._id && styles.activeBatchBtn]} onPress={() => setSelectedBatch(b._id)}>
                <Text style={selectedBatch === b._id ? styles.activeTabText : styles.tabText}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {newSlots.map((slot, index) => (
            <View key={index} style={styles.newSlotCard}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={styles.label}>Day of Week (e.g. Monday)</Text>
                {newSlots.length > 1 && (
                  <TouchableOpacity onPress={() => {
                    const n = [...newSlots];
                    n.splice(index, 1);
                    setNewSlots(n);
                  }}>
                    <Icon name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput style={styles.input} value={slot.day_of_week} onChangeText={(t) => { const n = [...newSlots]; n[index].day_of_week = t; setNewSlots(n); }} />
              
              <View style={styles.row}>
                <View style={{flex: 1, marginRight: 5}}>
                  <Text style={styles.label}>Start Time</Text>
                  <TextInput style={styles.input} value={slot.start_time} onChangeText={(t) => { const n = [...newSlots]; n[index].start_time = t; setNewSlots(n); }} placeholder="09:00" />
                </View>
                <View style={{flex: 1, marginLeft: 5}}>
                  <Text style={styles.label}>End Time</Text>
                  <TextInput style={styles.input} value={slot.end_time} onChangeText={(t) => { const n = [...newSlots]; n[index].end_time = t; setNewSlots(n); }} placeholder="11:00" />
                </View>
              </View>

              <Text style={styles.label}>Max Students</Text>
              <TextInput style={styles.input} value={slot.max_students} onChangeText={(t) => { const n = [...newSlots]; n[index].max_students = t; setNewSlots(n); }} keyboardType="numeric" />
              
              <Text style={styles.label}>Equipment Note</Text>
              <TextInput style={styles.input} value={slot.equipment_note} onChangeText={(t) => { const n = [...newSlots]; n[index].equipment_note = t; setNewSlots(n); }} placeholder="e.g. Bring safety goggles" />
            </View>
          ))}
          
          <TouchableOpacity style={styles.addBtn} onPress={() => setNewSlots([...newSlots, { day_of_week: 'Monday', start_time: '09:00', end_time: '11:00', max_students: '5', equipment_note: '' }])}>
            <Text style={styles.addBtnText}>+ Add Another Slot</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreateSlots} disabled={loading}>
            <Text style={styles.submitBtnText}>{loading ? 'Creating...' : 'Create Slots'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Bookings Modal */}
      <Modal visible={bookingsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bookings</Text>
            <FlatList 
              data={slotBookings}
              keyExtractor={item => item._id}
              renderItem={({item}) => (
                <View style={styles.bookingItem}>
                  <Text style={styles.bookingName}>{item.student_id?.name || 'Unknown'}</Text>
                  <Text style={styles.bookingPhone}>{item.student_id?.phone || item.student_id?.email || 'N/A'}</Text>
                </View>
              )}
              ListEmptyComponent={<Text>No bookings yet.</Text>}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setBookingsModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Slot</Text>
            <Text style={styles.label}>Max Students</Text>
            <TextInput style={styles.input} value={editMaxStudents} onChangeText={setEditMaxStudents} keyboardType="numeric" />
            <Text style={styles.label}>Equipment Note</Text>
            <TextInput style={styles.input} value={editEquipmentNote} onChangeText={setEditEquipmentNote} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleEditSlot}>
              <Text style={styles.submitBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setEditModalVisible(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabHeader: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2 },
  tab: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontWeight: 'bold', color: '#666' },
  activeTabText: { color: COLORS.primary },
  weekPicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', marginTop: 1 },
  weekText: { fontSize: 16, fontWeight: 'bold' },
  content: { padding: 15 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#666' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardSub: { color: '#666', marginBottom: 5 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  actionBtn: { padding: 5 },
  actionText: { color: COLORS.primary, fontWeight: 'bold' },
  label: { fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 5 },
  row: { flexDirection: 'row' },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  batchBtn: { padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, marginRight: 10, marginBottom: 10, backgroundColor: '#fff' },
  activeBatchBtn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  newSlotCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1 },
  addBtn: { padding: 15, alignItems: 'center', marginBottom: 15 },
  addBtnText: { color: COLORS.primary, fontWeight: 'bold' },
  submitBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 30 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, width: '90%', borderRadius: 8, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  bookingItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  bookingName: { fontWeight: 'bold' },
  bookingPhone: { color: '#666' },
  closeBtn: { marginTop: 15, padding: 10, alignItems: 'center' },
  closeBtnText: { color: '#666', fontWeight: 'bold' },
});

export default PracticeSessionsScreen;
