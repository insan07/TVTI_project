import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal, FlatList, RefreshControl
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getMyPracticeSlots, createPracticeSlots, updatePracticeSlot, getSlotBookings } from '../../services/practiceService';
import api from '../../services/api';
import { COLORS } from '../../config/theme';

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

const PracticeSessionsScreen = () => {
  const [activeTab, setActiveTab] = useState<'my_slots' | 'create'>('my_slots');
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Bookings modal
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingsModalVisible, setBookingsModalVisible] = useState(false);
  const [slotBookings, setSlotBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMaxStudents, setEditMaxStudents] = useState('');
  const [editEquipmentNote, setEditEquipmentNote] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Create tab
  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [newSlots, setNewSlots] = useState([
    { day_of_week: 'Monday', start_time: '09:00', end_time: '11:00', max_students: '10', equipment_note: '' }
  ]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (activeTab === 'my_slots') {
      fetchMySlots();
    } else {
      fetchBatches();
    }
  }, [activeTab, weekStart]);

  const changeWeek = (offset: number) => {
    const nd = new Date(weekStart);
    nd.setDate(nd.getDate() + offset * 7);
    setWeekStart(nd);
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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMySlots();
  };

  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await api.get('/instructors/my-schedule');
      setBatches(res.data);
      if (res.data.length > 0 && !selectedBatch) setSelectedBatch(res.data[0]._id);
    } catch (e) {
      console.warn('Error fetching batches', e);
    } finally {
      setBatchesLoading(false);
    }
  };

  const toggleSlotStatus = async (slot: any) => {
    Alert.alert(
      slot.is_open ? 'Close Slot?' : 'Reopen Slot?',
      `This will ${slot.is_open ? 'prevent' : 'allow'} new bookings for this slot.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updatePracticeSlot(slot._id, { is_open: !slot.is_open });
              fetchMySlots();
            } catch (e) {
              Alert.alert('Error', 'Failed to update slot status');
            }
          }
        }
      ]
    );
  };

  const openBookingsModal = async (slot: any) => {
    setSelectedSlot(slot);
    setBookingsModalVisible(true);
    setBookingsLoading(true);
    try {
      const data = await getSlotBookings(slot._id);
      setSlotBookings(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch bookings');
    } finally {
      setBookingsLoading(false);
    }
  };

  const openEditModal = (slot: any) => {
    setSelectedSlot(slot);
    setEditMaxStudents(slot.max_students.toString());
    setEditEquipmentNote(slot.equipment_note || '');
    setEditModalVisible(true);
  };

  const handleEditSlot = async () => {
    const max = parseInt(editMaxStudents, 10);
    if (!max || max < 1) return Alert.alert('Error', 'Max students must be at least 1');
    setEditSaving(true);
    try {
      await updatePracticeSlot(selectedSlot._id, {
        max_students: max,
        equipment_note: editEquipmentNote.trim(),
      });
      setEditModalVisible(false);
      fetchMySlots();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update slot');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateSlots = async () => {
    if (!selectedBatch) return Alert.alert('Error', 'Please select a batch first');
    for (const s of newSlots) {
      if (!s.day_of_week || !s.start_time || !s.end_time) {
        return Alert.alert('Error', 'Please fill in all required slot fields');
      }
      const maxN = parseInt(s.max_students, 10);
      if (!maxN || maxN < 1) return Alert.alert('Error', 'Max students must be at least 1');
    }
    setCreating(true);
    try {
      await createPracticeSlots({
        batch_id: selectedBatch,
        week_start_date: getLocalDateString(weekStart),
        slots: newSlots.map(s => ({ ...s, max_students: parseInt(s.max_students, 10) })) as any
      });
      Alert.alert('Success', `${newSlots.length} slot(s) created successfully!`, [
        {
          text: 'View Slots',
          onPress: () => {
            setActiveTab('my_slots');
            setNewSlots([{ day_of_week: 'Monday', start_time: '09:00', end_time: '11:00', max_students: '10', equipment_note: '' }]);
          }
        },
        {
          text: 'Create More', style: 'cancel',
          onPress: () => setNewSlots([{ day_of_week: 'Monday', start_time: '09:00', end_time: '11:00', max_students: '10', equipment_note: '' }])
        }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create slots');
    } finally {
      setCreating(false);
    }
  };

  const updateNewSlot = (index: number, field: string, value: string) => {
    const updated = [...newSlots];
    (updated[index] as any)[field] = value;
    setNewSlots(updated);
  };

  const removeSlot = (index: number) => {
    setNewSlots(newSlots.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabHeader}>
        <TouchableOpacity style={[styles.tab, activeTab === 'my_slots' && styles.activeTab]} onPress={() => setActiveTab('my_slots')}>
          <Icon name="list-outline" size={16} color={activeTab === 'my_slots' ? COLORS.primary : '#6B7280'} style={{ marginRight: 4 }} />
          <Text style={[styles.tabText, activeTab === 'my_slots' && styles.activeTabText]}>My Slots</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'create' && styles.activeTab]} onPress={() => setActiveTab('create')}>
          <Icon name="add-circle-outline" size={16} color={activeTab === 'create' ? COLORS.primary : '#6B7280'} style={{ marginRight: 4 }} />
          <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>Create Slots</Text>
        </TouchableOpacity>
      </View>

      {/* Week Picker */}
      <View style={styles.weekPicker}>
        <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.weekArrow}>
          <Icon name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.weekText}>Week of {getLocalDateString(weekStart)}</Text>
        <TouchableOpacity onPress={() => changeWeek(1)} style={styles.weekArrow}>
          <Icon name="chevron-forward" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* MY SLOTS TAB */}
      {activeTab === 'my_slots' ? (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading slots...</Text>
          </View>
        ) : (
          <FlatList
            data={slots}
            keyExtractor={item => item._id}
            contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="calendar-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No slots this week</Text>
                <Text style={styles.emptySubtitle}>Create practice slots for the week of {getLocalDateString(weekStart)}</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('create')}>
                  <Text style={styles.emptyBtnText}>Create Slots</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item: slot }) => {
              const booked = slot.booked_count || 0;
              const max = slot.max_students || 1;
              const pct = Math.min((booked / max) * 100, 100);
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{slot.day_of_week}</Text>
                      <Text style={styles.cardTime}>{slot.start_time} – {slot.end_time}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: slot.is_open ? '#D1FAE5' : '#FEE2E2' }]}>
                      <Text style={[styles.badgeText, { color: slot.is_open ? '#065F46' : '#991B1B' }]}>
                        {slot.is_open ? 'OPEN' : 'CLOSED'}
                      </Text>
                    </View>
                  </View>

                  {slot.batch_id?.name ? (
                    <Text style={styles.cardBatch}>📚 {slot.batch_id.name}</Text>
                  ) : null}
                  {slot.equipment_note ? (
                    <Text style={styles.cardNote}>📋 {slot.equipment_note}</Text>
                  ) : null}

                  <View style={styles.bookingRow}>
                    <Text style={styles.bookingText}>Booked: {booked} / {max}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openBookingsModal(slot)}>
                      <Icon name="people-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.actionText}>Bookings ({booked})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(slot)}>
                      <Icon name="create-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => toggleSlotStatus(slot)}>
                      <Icon name={slot.is_open ? 'lock-closed-outline' : 'lock-open-outline'} size={14} color={slot.is_open ? '#EF4444' : '#10B981'} />
                      <Text style={[styles.actionText, { color: slot.is_open ? '#EF4444' : '#10B981' }]}>
                        {slot.is_open ? 'Close' : 'Reopen'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : (
        /* CREATE TAB */
        <ScrollView style={styles.createScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Select Batch</Text>
          {batchesLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 10 }} />
          ) : batches.length === 0 ? (
            <View style={styles.noBatchBox}>
              <Icon name="warning-outline" size={20} color="#F59E0B" />
              <Text style={styles.noBatchText}>No batches assigned to you.</Text>
            </View>
          ) : (
            <View style={styles.batchPills}>
              {batches.map(b => (
                <TouchableOpacity
                  key={b._id}
                  style={[styles.batchPill, selectedBatch === b._id && styles.batchPillActive]}
                  onPress={() => setSelectedBatch(b._id)}
                >
                  <Text style={[styles.batchPillText, selectedBatch === b._id && styles.batchPillTextActive]}>
                    {b.name || b.course_id?.title || 'Batch'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>Slots for Week of {getLocalDateString(weekStart)}</Text>

          {newSlots.map((slot, index) => (
            <View key={index} style={styles.newSlotCard}>
              <View style={styles.newSlotHeader}>
                <Text style={styles.newSlotTitle}>Slot {index + 1}</Text>
                {newSlots.length > 1 && (
                  <TouchableOpacity onPress={() => removeSlot(index)}>
                    <Icon name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.label}>Day of Week *</Text>
              <View style={styles.dayPills}>
                {DAYS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayPill, slot.day_of_week === d && styles.dayPillActive]}
                    onPress={() => updateNewSlot(index, 'day_of_week', d)}
                  >
                    <Text style={[styles.dayPillText, slot.day_of_week === d && styles.dayPillTextActive]}>
                      {d.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.timeRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Start Time *</Text>
                  <TextInput
                    style={styles.input}
                    value={slot.start_time}
                    onChangeText={t => updateNewSlot(index, 'start_time', t)}
                    placeholder="09:00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>End Time *</Text>
                  <TextInput
                    style={styles.input}
                    value={slot.end_time}
                    onChangeText={t => updateNewSlot(index, 'end_time', t)}
                    placeholder="11:00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <Text style={styles.label}>Max Students *</Text>
              <TextInput
                style={styles.input}
                value={slot.max_students}
                onChangeText={t => updateNewSlot(index, 'max_students', t)}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Equipment Note (Optional)</Text>
              <TextInput
                style={styles.input}
                value={slot.equipment_note}
                onChangeText={t => updateNewSlot(index, 'equipment_note', t)}
                placeholder="e.g. Bring safety goggles"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.addMoreBtn}
            onPress={() => setNewSlots([...newSlots, { day_of_week: 'Monday', start_time: '09:00', end_time: '11:00', max_students: '10', equipment_note: '' }])}
          >
            <Icon name="add-circle-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.addMoreText}>Add Another Slot</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, (creating || batches.length === 0) && styles.submitBtnDisabled]}
            onPress={handleCreateSlots}
            disabled={creating || batches.length === 0}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Create {newSlots.length} Slot{newSlots.length > 1 ? 's' : ''}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Bookings Modal */}
      <Modal visible={bookingsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Bookings — {selectedSlot?.day_of_week} {selectedSlot?.start_time}–{selectedSlot?.end_time}
              </Text>
              <TouchableOpacity onPress={() => setBookingsModalVisible(false)}>
                <Icon name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {bookingsLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={slotBookings}
                keyExtractor={item => item._id}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Icon name="people-outline" size={40} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No bookings yet</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.bookingItem}>
                    <View style={styles.bookingAvatar}>
                      <Text style={styles.bookingAvatarText}>
                        {item.student_id?.name?.charAt(0)?.toUpperCase() || 'S'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookingName}>{item.student_id?.name || 'Unknown Student'}</Text>
                      <Text style={styles.bookingPhone}>{item.student_id?.phone || item.student_id?.email || 'N/A'}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: item.status === 'confirmed' ? '#D1FAE5' : '#FEE2E2' }]}>
                      <Text style={[styles.badgeText, { color: item.status === 'confirmed' ? '#065F46' : '#991B1B' }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Slot</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Max Students</Text>
            <TextInput
              style={styles.input}
              value={editMaxStudents}
              onChangeText={setEditMaxStudents}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Equipment Note</Text>
            <TextInput
              style={[styles.input, { marginBottom: 20 }]}
              value={editEquipmentNote}
              onChangeText={setEditEquipmentNote}
              placeholder="e.g. Bring safety goggles"
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleEditSlot} disabled={editSaving}>
              {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  tabHeader: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontWeight: 'bold', color: '#6B7280', fontSize: 14 },
  activeTabText: { color: COLORS.primary },
  weekPicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  weekArrow: { padding: 6 },
  weekText: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#9CA3AF' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 12 },
  emptySubtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
  emptyBtn: { marginTop: 14, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 2, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  cardTime: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  cardBatch: { fontSize: 13, color: '#374151', marginBottom: 4 },
  cardNote: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  bookingRow: { marginTop: 8, marginBottom: 4 },
  bookingText: { fontSize: 12, color: '#374151', marginBottom: 4, fontWeight: '500' },
  progressBar: { height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: COLORS.primary, borderRadius: 3 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  actionText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
  createScroll: { flex: 1, padding: 15 },
  sectionLabel: { fontSize: 15, fontWeight: 'bold', color: '#1F2937', marginTop: 8, marginBottom: 10 },
  batchPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  batchPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  batchPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  batchPillText: { color: '#374151', fontWeight: '500', fontSize: 13 },
  batchPillTextActive: { color: '#fff', fontWeight: 'bold' },
  noBatchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, marginBottom: 16 },
  noBatchText: { color: '#92400E', fontSize: 13, marginLeft: 8 },
  newSlotCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
  newSlotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  newSlotTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 14, color: '#1F2937' },
  dayPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  dayPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  dayPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayPillText: { color: '#374151', fontSize: 12, fontWeight: '500' },
  dayPillTextActive: { color: '#fff', fontWeight: 'bold' },
  timeRow: { flexDirection: 'row' },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, borderRadius: 10, marginBottom: 12 },
  addMoreText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  submitBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', flex: 1, marginRight: 10 },
  bookingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bookingAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  bookingAvatarText: { fontWeight: 'bold', color: '#1E3A8A' },
  bookingName: { fontWeight: 'bold', color: '#1F2937' },
  bookingPhone: { color: '#6B7280', fontSize: 12 },
});

export default PracticeSessionsScreen;
