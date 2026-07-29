import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getOpenPracticeSlots, bookPracticeSlot, cancelPracticeBooking } from '../../services/practiceService';
import api from '../../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const parseUTCDate = (dateStr: string) => {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  return new Date(dateStr);
};

export default function StudentScheduleScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Generate next 14 days for the calendar strip
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
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await cancelPracticeBooking(slotId);
            Alert.alert('Success', 'Booking cancelled');
            fetchSlots();
          } catch (e) {
            Alert.alert('Error', 'Failed to cancel booking');
          }
        },
      },
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

  // Regular classes
  const regularClasses =
    selectedBatch?.schedule_json?.days?.includes(selectedDayName.substring(0, 3)) ||
    selectedBatch?.schedule_json?.days?.includes(selectedDayName)
      ? [
          {
            type: 'class',
            title: selectedBatch?.course_id?.title || 'Automotive Mechatronics',
            time: selectedBatch?.schedule_json?.time || '09:00 - 11:30',
            room: selectedBatch?.room || 'Room 302',
            instructor: selectedBatch?.instructor_ids?.[0]?.name || 'Dr. Alan Grant',
          },
        ]
      : [];

  // Slots for selected date
  const selectedDateStr = getLocalDateString(selectedDate);
  const daySlots = slots.filter((s) => {
    const weekStart = parseUTCDate(s.week_start_date);
    const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const diff = daysArr.indexOf(s.day_of_week);
    const slotDate = new Date(weekStart);
    if (diff !== -1) {
      slotDate.setDate(slotDate.getDate() + diff);
    }
    return getLocalDateString(slotDate) === selectedDateStr;
  });

  const hasBookedInWeek = (weekStartDateStr: string) => {
    return slots.some((s) => s.already_booked && s.week_start_date === weekStartDateStr);
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.topHeaderBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.navigate('Profile')}>
          <Icon name="menu-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Twintec VTI</Text>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="person-circle-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Main Title */}
        <View style={styles.pageTitleContainer}>
          <Text style={styles.pageTitle}>Schedule</Text>
        </View>

        {/* Batch Pills (if multiple batches) */}
        {batches.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.batchContainer}
          >
            {batches.map((b) => (
              <TouchableOpacity
                key={b._id}
                style={[styles.batchBtn, selectedBatch?._id === b._id && styles.activeBatchBtn]}
                onPress={() => setSelectedBatch(b)}
              >
                <Text style={selectedBatch?._id === b._id ? styles.activeTabText : styles.tabText}>
                  {b.name || 'Batch'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Horizontal Calendar Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarStripContainer}
        >
          {calendarDays.map((date, idx) => {
            const isSelected = getLocalDateString(date) === getLocalDateString(selectedDate);
            const dayAbbr = getDayName(date).substring(0, 3).toUpperCase();
            const dayNum = date.getDate();

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.dateCard, isSelected && styles.dateCardActive]}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateCardDay, isSelected && styles.dateCardDayActive]}>
                  {dayAbbr}
                </Text>
                <Text style={[styles.dateCardNum, isSelected && styles.dateCardNumActive]}>
                  {dayNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Content Body */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.contentPadding}>
            {/* Section 1: Classes */}
            <Text style={styles.sectionTitle}>Classes</Text>

            {regularClasses.length > 0 ? (
              regularClasses.map((cls, i) => (
                <View key={i} style={styles.classCard}>
                  <View style={styles.classCardAccentBar} />
                  <View style={styles.classCardContent}>
                    <View style={styles.classCardTopRow}>
                      <Text style={styles.classCourseTitle}>{cls.title}</Text>
                      <View style={styles.theoryBadge}>
                        <Text style={styles.theoryBadgeText}>THEORY</Text>
                      </View>
                    </View>
                    <View style={styles.classCardInfoRow}>
                      <Icon name="time-outline" size={15} color="#666" style={{ marginRight: 4 }} />
                      <Text style={styles.classCardInfoText}>{cls.time}</Text>
                      <Text style={styles.dotSeparator}>•</Text>
                      <Icon name="location-outline" size={15} color="#666" style={{ marginRight: 4 }} />
                      <Text style={styles.classCardInfoText}>{cls.room || 'Room 302'}</Text>
                    </View>
                    <View style={styles.classCardInfoRow}>
                      <Icon name="person-outline" size={15} color="#666" style={{ marginRight: 4 }} />
                      <Text style={styles.classCardInfoText}>{cls.instructor || 'Dr. Alan Grant'}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: '#888888', ...FONTS.regular, marginVertical: SPACING.md }}>
                No classes scheduled for this day.
              </Text>
            )}

            {/* Section 2: Practice Sessions */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Practice Sessions</Text>

            {daySlots.length > 0 ? (
              daySlots.map((slot) => {
                const isFull = slot.seats_available <= 0;
                const bookedThisWeek = hasBookedInWeek(slot.week_start_date);
                const disabled = isFull || (bookedThisWeek && !slot.already_booked);
                const seatsLeft = slot.seats_available;
                const maxSeats = slot.max_students || 10;
                const fillRatio = Math.max(0, Math.min(1, (maxSeats - seatsLeft) / maxSeats));

                return (
                  <View
                    key={slot._id}
                    style={[styles.practiceCard, isFull && styles.practiceCardFull]}
                  >
                    <View style={styles.practiceCardTopRow}>
                      <Text style={[styles.practiceTitle, isFull && styles.dimmedText]}>
                        {slot.batch_id?.course_id?.title || 'Practice Session'}
                      </Text>

                      {slot.already_booked ? (
                        <View style={styles.bookedBadge}>
                          <Icon
                            name="checkmark-circle-outline"
                            size={13}
                            color="#10B981"
                            style={{ marginRight: 3 }}
                          />
                          <Text style={styles.bookedBadgeText}>BOOKED</Text>
                        </View>
                      ) : isFull ? (
                        <Text style={styles.seatsLeftTextFull}>0 / {maxSeats} left</Text>
                      ) : (
                        <View style={styles.seatsProgressContainer}>
                          <Text style={styles.seatsLeftText}>
                            {seatsLeft} / {maxSeats} left
                          </Text>
                          <View style={styles.progressBarTrack}>
                            <View
                              style={[styles.progressBarFill, { width: `${fillRatio * 100}%` }]}
                            />
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={styles.practiceInfoRow}>
                      <Icon
                        name="time-outline"
                        size={15}
                        color={isFull ? '#B0B0B0' : '#666'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.practiceInfoText, isFull && styles.dimmedText]}>
                        {slot.day_of_week} | {slot.start_time} - {slot.end_time}
                      </Text>
                    </View>

                    <View style={styles.practiceInfoRow}>
                      <Icon
                        name="person-outline"
                        size={15}
                        color={isFull ? '#B0B0B0' : '#666'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.practiceInfoText, isFull && styles.dimmedText]}>
                        Inst. {slot.instructor_id?.name || 'Instructor'}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    {isFull ? (
                      <View style={styles.fullStatusContainer}>
                        <Text style={styles.fullText}>FULL</Text>
                      </View>
                    ) : slot.already_booked ? (
                      <TouchableOpacity
                        style={styles.cancelBookingButton}
                        onPress={() => handleCancelBooking(slot._id)}
                      >
                        <Text style={styles.cancelBookingButtonText}>Cancel Booking</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.bookSlotButton, disabled && styles.disabledButton]}
                        disabled={disabled}
                        onPress={() => handleBookSlot(slot._id)}
                      >
                        <Text style={styles.bookSlotButtonText}>
                          {bookedThisWeek ? 'Max 1 Booking / Week' : 'Book Slot'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={{ color: '#888888', ...FONTS.regular, marginVertical: SPACING.md }}>
                No practice sessions available for this day.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  topHeaderBar: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerIconButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    ...FONTS.bold,
  },
  scrollContent: {
    flex: 1,
  },
  pageTitleContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  pageTitle: {
    fontSize: 26,
    color: '#000000',
    ...FONTS.bold,
  },
  batchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  batchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: '#EAEAEA',
    marginRight: 10,
  },
  activeBatchBtn: {
    backgroundColor: COLORS.secondary,
  },
  tabText: {
    color: '#555555',
    ...FONTS.medium,
  },
  activeTabText: {
    color: '#FFFFFF',
    ...FONTS.bold,
  },
  calendarStripContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  dateCard: {
    width: 60,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...SHADOW.sm,
  },
  dateCardActive: {
    backgroundColor: '#000000',
    borderColor: '#F58220',
    borderWidth: 2,
  },
  dateCardDay: {
    fontSize: 11,
    color: '#777777',
    ...FONTS.bold,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dateCardDayActive: {
    color: '#FFFFFF',
  },
  dateCardNum: {
    fontSize: 19,
    color: '#1A1A1A',
    ...FONTS.bold,
  },
  dateCardNumActive: {
    color: '#FFFFFF',
  },
  contentPadding: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#1A1A1A',
    ...FONTS.bold,
    marginBottom: SPACING.md,
  },
  classCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  classCardAccentBar: {
    width: 5,
    backgroundColor: '#F58220',
  },
  classCardContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  classCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  classCourseTitle: {
    fontSize: 16.5,
    color: '#1A1A1A',
    ...FONTS.bold,
    flex: 1,
    marginRight: SPACING.xs,
  },
  theoryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  theoryBadgeText: {
    color: '#10B981',
    fontSize: 10.5,
    ...FONTS.bold,
    letterSpacing: 0.5,
  },
  classCardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  classCardInfoText: {
    fontSize: 13.5,
    color: '#666666',
    ...FONTS.regular,
  },
  dotSeparator: {
    color: '#999999',
    marginHorizontal: 6,
    fontSize: 12,
  },
  practiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  practiceCardFull: {
    backgroundColor: '#FAFAFA',
  },
  practiceCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  practiceTitle: {
    fontSize: 16.5,
    color: '#1A1A1A',
    ...FONTS.bold,
    flex: 1,
  },
  seatsProgressContainer: {
    alignItems: 'flex-end',
  },
  seatsLeftText: {
    fontSize: 12,
    color: '#333333',
    ...FONTS.bold,
    marginBottom: 4,
  },
  seatsLeftTextFull: {
    fontSize: 12,
    color: '#FF5252',
    ...FONTS.bold,
  },
  progressBarTrack: {
    width: 70,
    height: 5,
    backgroundColor: '#EAEAEA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F58220',
    borderRadius: 3,
  },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  bookedBadgeText: {
    color: '#10B981',
    fontSize: 11,
    ...FONTS.bold,
    letterSpacing: 0.5,
  },
  practiceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  practiceInfoText: {
    fontSize: 13.5,
    color: '#666666',
    ...FONTS.regular,
  },
  dimmedText: {
    color: '#B0B0B0',
  },
  bookSlotButton: {
    backgroundColor: '#F58220',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  bookSlotButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    ...FONTS.bold,
  },
  cancelBookingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#333333',
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  cancelBookingButtonText: {
    color: '#1A1A1A',
    fontSize: 14.5,
    ...FONTS.bold,
  },
  fullStatusContainer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingVertical: 6,
  },
  fullText: {
    color: '#FF5252',
    fontSize: 14,
    ...FONTS.bold,
    letterSpacing: 1,
  },
});

