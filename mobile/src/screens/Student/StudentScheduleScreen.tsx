import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getOpenPracticeSlots, bookPracticeSlot, cancelPracticeBooking } from '../../services/practiceService';
import api from '../../services/api';
import { COLORS } from '../../config/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function StudentScheduleScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Generate next 14 days for the calendar
  const calendarDays = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchSlots();
    }
  }, [selectedBatch]);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/students/batches');
      setBatches(res.data);
      if (res.data.length > 0) {
        setSelectedBatch(res.data[0]);
      }
    } catch (e) {
      console.log('Error fetching batches', e);
    }
  };

  const fetchSlots = async () => {
    if (!selectedBatch) return;
    setLoading(true);
    try {
      // Fetch all slots for this batch (no weekStart query)
      const data = await getOpenPracticeSlots({ batchId: selectedBatch._id });
      setSlots(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async (slotId: string) => {
    try {
      await bookPracticeSlot(slotId);
      Alert.alert('Success', 'Practice session booked successfully!');
      fetchSlots();
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
          fetchSlots();
        } catch (e) {
          Alert.alert('Error', 'Failed to cancel booking');
        }
      }}
    ]);
  };

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayName = (d: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()];
  };

  const selectedDayName = getDayName(selectedDate);

  // Find classes for selected day
  const regularClasses = selectedBatch?.schedule_json?.days?.includes(selectedDayName.substring(0, 3)) 
    || selectedBatch?.schedule_json?.days?.includes(selectedDayName) 
    ? [{ type: 'class', title: selectedBatch?.course_id?.title || 'Regular Class', time: selectedBatch?.schedule_json?.time || 'TBD' }]
    : [];

  // Filter slots for selected date
  const selectedDateStr = getLocalDateString(selectedDate);
  const daySlots = slots.filter(s => {
    // Determine the exact date of this slot. s.week_start_date is a Monday.
    const weekStart = parseUTCDate(s.week_start_date);
    const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const diff = daysArr.indexOf(s.day_of_week);
    
    // Calculate the actual date of the slot
    const slotDate = new Date(weekStart);
    if (diff !== -1) {
      slotDate.setDate(slotDate.getDate() + diff);
    }
    
    return getLocalDateString(slotDate) === selectedDateStr;
  });

  const getSlotStatusColor = (slot: any) => {
    if (slot.already_booked) return COLORS.primary; // Booked by me (Blue)
    if (slot.seats_available <= 0) return COLORS.error; // Full (Red)
    return COLORS.success; // Available (Green)
  };

  // Helper to get dots for a calendar day
  const getDotsForDate = (date: Date) => {
    const dateStr = getLocalDateString(date);
    const dayName = getDayName(date);
    const dots: string[] = [];

    // Regular class
    if (selectedBatch?.schedule_json?.days?.includes(dayName.substring(0, 3)) || selectedBatch?.schedule_json?.days?.includes(dayName)) {
      dots.push('#6B7280'); // Gray dot for regular class
    }

    // Practice slots
    slots.forEach(s => {
      const weekStart = parseUTCDate(s.week_start_date);
      const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const diff = daysArr.indexOf(s.day_of_week);
      const slotDate = new Date(weekStart);
      if (diff !== -1) {
        slotDate.setDate(slotDate.getDate() + diff);
      }
      
      if (getLocalDateString(slotDate) === dateStr) {
        dots.push(getSlotStatusColor(s));
      }
    });

    return [...new Set(dots)]; // Unique dots
  };

  // Check if student has booked any slot in the exact week of the selected slot
  const hasBookedInWeek = (weekStartDateStr: string) => {
    return slots.some(s => s.already_booked && s.week_start_date === weekStartDateStr);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Batch Selector */}
      <View style={styles.batchContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {batches.map(b => (
            <TouchableOpacity key={b._id} style={[styles.batchBtn, selectedBatch?._id === b._id && styles.activeBatchBtn]} onPress={() => setSelectedBatch(b)}>
              <Text style={selectedBatch?._id === b._id ? styles.activeTabText : styles.tabText}>{b.name || 'Batch'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Calendar Strip */}
      <View style={styles.calendarStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
          {calendarDays.map((date, index) => {
            const isSelected = getLocalDateString(date) === getLocalDateString(selectedDate);
            const dots = getDotsForDate(date);
            return (
              <TouchableOpacity key={index} style={[styles.dayCard, isSelected && styles.dayCardActive]} onPress={() => setSelectedDate(date)}>
                <Text style={[styles.dayName, isSelected && styles.dayTextActive]}>{getDayName(date).substring(0, 3)}</Text>
                <Text style={[styles.dayNumber, isSelected && styles.dayTextActive]}>{date.getDate()}</Text>
                <View style={styles.dotsContainer}>
                  {dots.map((color, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: color }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#6B7280', width: 8, height: 8 }]} /><Text style={styles.legendText}>Class</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: COLORS.success, width: 8, height: 8 }]} /><Text style={styles.legendText}>Available</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: COLORS.primary, width: 8, height: 8 }]} /><Text style={styles.legendText}>Booked</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: COLORS.error, width: 8, height: 8 }]} /><Text style={styles.legendText}>Full</Text></View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.dateHeader}>{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

        {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 30}} /> : (
          <>
            {regularClasses.length === 0 && daySlots.length === 0 && (
              <Text style={styles.emptyText}>No classes or practice sessions scheduled for this day.</Text>
            )}

            {regularClasses.map((cls, i) => (
              <View key={`class-${i}`} style={styles.classCard}>
                <View style={styles.timeTag}>
                  <Text style={styles.timeText}>{cls.time}</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.courseTitle}>{cls.title}</Text>
                  <Text style={styles.infoText}>Regular Class</Text>
                  <View style={[styles.badge, { backgroundColor: '#6B7280' }]}>
                    <Text style={styles.badgeText}>Mandatory</Text>
                  </View>
                </View>
              </View>
            ))}

            {daySlots.map(slot => {
              const isFull = slot.seats_available <= 0;
              const bookedThisWeek = hasBookedInWeek(slot.week_start_date);
              const disabled = isFull || (bookedThisWeek && !slot.already_booked);
              const statusColor = getSlotStatusColor(slot);

              return (
                <View key={slot._id} style={[styles.slotCard, { borderLeftColor: statusColor }]}>
                  <View style={styles.slotHeader}>
                    <Text style={styles.slotTime}>{slot.start_time} - {slot.end_time}</Text>
                    <View style={[styles.badge, { backgroundColor: statusColor }]}>
                      <Text style={styles.badgeText}>
                        {slot.already_booked ? 'Booked' : isFull ? 'Full' : 'Available'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.slotInfo}>Instructor: {slot.instructor_id?.name || 'Unknown'}</Text>
                  <Text style={styles.slotInfo}>Seats: {slot.seats_available} / {slot.max_students} available</Text>
                  {slot.equipment_note ? <Text style={styles.slotInfo}>Note: {slot.equipment_note}</Text> : null}

                  {!slot.already_booked && (
                    <TouchableOpacity 
                      style={[styles.bookBtn, disabled && styles.disabledBookBtn]} 
                      disabled={disabled}
                      onPress={() => handleBookSlot(slot._id)}
                    >
                      <Text style={styles.bookBtnText}>
                        {isFull ? 'Session is Full' : bookedThisWeek ? 'Max 1 booking per week' : 'Book Practice Session'}
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
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  batchContainer: { padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  batchBtn: { paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, marginRight: 10, backgroundColor: '#fff' },
  activeBatchBtn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  tabText: { fontWeight: 'bold', color: '#666' },
  activeTabText: { color: COLORS.primary, fontWeight: 'bold' },
  calendarStrip: { backgroundColor: '#fff', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dayCard: { alignItems: 'center', justifyContent: 'center', width: 50, height: 65, borderRadius: 12, marginHorizontal: 5, backgroundColor: '#f9fafb' },
  dayCardActive: { backgroundColor: COLORS.primary },
  dayName: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  dayNumber: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  dayTextActive: { color: '#fff' },
  dotsContainer: { flexDirection: 'row', marginTop: 4, height: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 1 },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#fff' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  legendText: { fontSize: 11, color: '#6B7280', marginLeft: 4 },
  content: { padding: 15 },
  dateHeader: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#6B7280', fontStyle: 'italic' },
  
  classCard: { backgroundColor: '#fff', borderRadius: 12, elevation: 1, flexDirection: 'row', overflow: 'hidden', marginBottom: 15 },
  timeTag: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', width: 85 },
  timeText: { color: '#4B5563', fontWeight: 'bold', textAlign: 'center' },
  cardContent: { padding: 16, flex: 1 },
  courseTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  infoText: { color: '#6B7280', fontSize: 14 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  slotCard: { backgroundColor: '#fff', borderRadius: 12, elevation: 1, padding: 15, marginBottom: 15, borderLeftWidth: 4 },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  slotTime: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  slotInfo: { color: '#4B5563', fontSize: 14, marginBottom: 4 },
  bookBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  disabledBookBtn: { backgroundColor: '#D1D5DB' },
  bookBtnText: { color: '#fff', fontWeight: 'bold' }
});
