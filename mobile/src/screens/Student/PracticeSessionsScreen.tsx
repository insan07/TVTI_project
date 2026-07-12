import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getOpenPracticeSlots, bookPracticeSlot, cancelPracticeBooking, getMyPracticeBookings } from '../../services/practiceService';
import api from '../../services/api';
import { COLORS } from '../../config/theme';

const parseUTCDate = (dateStr: string) => {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  return new Date(dateStr);
};

const getSlotActualDate = (weekStartDateStr: string, dayOfWeek: string) => {
  const weekStart = parseUTCDate(weekStartDateStr);
  const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const diff = daysArr.indexOf(dayOfWeek);
  const slotDate = new Date(weekStart);
  if (diff !== -1) {
    slotDate.setDate(slotDate.getDate() + diff);
  }
  return slotDate;
};

const PracticeSessionsScreen = () => {
  const [activeTab, setActiveTab] = useState<'book' | 'my_sessions'>('book');
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [slots, setSlots] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (activeTab === 'book' && selectedBatch) {
      fetchOpenSlots();
    } else if (activeTab === 'my_sessions') {
      fetchMyBookings();
    }
  }, [activeTab, weekStart, selectedBatch]);

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

  const fetchBatches = async () => {
    try {
      const res = await api.get('/students/batches');
      setBatches(res.data);
      if (res.data.length > 0 && !selectedBatch) setSelectedBatch(res.data[0]._id);
    } catch (e) {
      console.log('Error fetching batches', e);
    }
  };

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchOpenSlots = async () => {
    if (!selectedBatch) return;
    setLoading(true);
    try {
      const data = await getOpenPracticeSlots({ batchId: selectedBatch, weekStart: getLocalDateString(weekStart) });
      setSlots(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      const data = await getMyPracticeBookings();
      setMyBookings(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async (slotId: string) => {
    try {
      await bookPracticeSlot(slotId);
      Alert.alert('Success', 'Session booked successfully!');
      fetchOpenSlots();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to book slot');
    }
  };

  const handleCancelBooking = async (slotId: string) => {
    Alert.alert('Confirm', 'Are you sure you want to cancel this booking?', [
      { text: 'No' },
      { text: 'Yes', onPress: async () => {
        try {
          await cancelPracticeBooking(slotId);
          Alert.alert('Success', 'Booking cancelled');
          if (activeTab === 'my_sessions') fetchMyBookings();
          else fetchOpenSlots();
        } catch (e) {
          Alert.alert('Error', 'Failed to cancel booking');
        }
      }}
    ]);
  };

  const hasBookedThisWeek = slots.some(s => s.already_booked);

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity style={[styles.tab, activeTab === 'book' && styles.activeTab]} onPress={() => setActiveTab('book')}>
          <Text style={[styles.tabText, activeTab === 'book' && styles.activeTabText]}>Book a Session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'my_sessions' && styles.activeTab]} onPress={() => setActiveTab('my_sessions')}>
          <Text style={[styles.tabText, activeTab === 'my_sessions' && styles.activeTabText]}>My Sessions</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'book' ? (
        <>
          <View style={styles.batchContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {batches.map(b => (
                <TouchableOpacity key={b._id} style={[styles.batchBtn, selectedBatch === b._id && styles.activeBatchBtn]} onPress={() => setSelectedBatch(b._id)}>
                  <Text style={selectedBatch === b._id ? styles.activeTabText : styles.tabText}>{b.name || 'Batch'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.weekPicker}>
            <TouchableOpacity onPress={() => changeWeek(-1)}><Icon name="chevron-back" size={24} color={COLORS.primary} /></TouchableOpacity>
            <Text style={styles.weekText}>Week of {getLocalDateString(weekStart)}</Text>
            <TouchableOpacity onPress={() => changeWeek(1)}><Icon name="chevron-forward" size={24} color={COLORS.primary} /></TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {loading ? <ActivityIndicator size="large" color={COLORS.primary} /> :
              slots.length === 0 ? <Text style={styles.emptyText}>No open slots for this week.</Text> :
              slots.map((slot) => {
                const isFull = slot.seats_available <= 0;
                const disabled = isFull || (hasBookedThisWeek && !slot.already_booked);

                return (
                  <View key={slot._id} style={[styles.card, disabled && styles.disabledCard]}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{slot.day_of_week} | {slot.start_time} - {slot.end_time}</Text>
                      {slot.already_booked && (
                        <View style={styles.bookedBadge}>
                          <Text style={styles.badgeText}>Booked</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardSub}>Instructor: {slot.instructor_id?.name || 'Unknown'}</Text>
                    <Text style={styles.cardSub}>Seats: {slot.seats_available} / {slot.max_students} left</Text>
                    {slot.equipment_note ? <Text style={styles.cardSub}>Note: {slot.equipment_note}</Text> : null}
                    
                    {!slot.already_booked && (
                      <TouchableOpacity 
                        style={[styles.bookBtn, disabled && styles.disabledBookBtn]} 
                        disabled={disabled}
                        onPress={() => handleBookSlot(slot._id)}
                      >
                        <Text style={styles.bookBtnText}>
                          {isFull ? 'Full' : hasBookedThisWeek ? 'Already booked this week' : 'Book'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {slot.already_booked && (
                      <TouchableOpacity style={[styles.bookBtn, { backgroundColor: COLORS.error }]} onPress={() => handleCancelBooking(slot._id)}>
                        <Text style={styles.bookBtnText}>Cancel Booking</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            }
          </ScrollView>
        </>
      ) : (
        <ScrollView style={styles.content}>
          {loading ? <ActivityIndicator size="large" color={COLORS.primary} /> :
            myBookings.length === 0 ? <Text style={styles.emptyText}>No upcoming bookings.</Text> :
            myBookings.map((booking) => {
              const slot = booking.slot_id;
              if (!slot) return null;
              const actualSlotDate = getSlotActualDate(slot.week_start_date, slot.day_of_week);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isFuture = actualSlotDate >= today;
              return (
                <View key={booking._id} style={styles.card}>
                  <Text style={styles.cardTitle}>{slot.batch_id?.course_id?.title || 'Batch'} - {slot.day_of_week}</Text>
                  <Text style={styles.cardSub}>Date: {actualSlotDate.toLocaleDateString()}</Text>
                  <Text style={styles.cardSub}>Time: {slot.start_time} - {slot.end_time}</Text>
                  <Text style={styles.cardSub}>Instructor: {slot.instructor_id?.name}</Text>
                  {slot.equipment_note ? <Text style={styles.cardSub}>Note: {slot.equipment_note}</Text> : null}
                  
                  {isFuture && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelBooking(slot._id)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          }
        </ScrollView>
      )}
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
  batchContainer: { padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  batchBtn: { paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, marginRight: 10, backgroundColor: '#fff' },
  activeBatchBtn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  content: { padding: 15 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#666' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1 },
  disabledCard: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  bookedBadge: { backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardSub: { color: '#666', marginBottom: 5 },
  bookBtn: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 10 },
  disabledBookBtn: { backgroundColor: '#ccc' },
  bookBtnText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: { backgroundColor: COLORS.error, padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 10 },
  cancelBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default PracticeSessionsScreen;
