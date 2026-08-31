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
import {
  getOpenPracticeSlots,
  bookPracticeSlot,
  cancelPracticeBooking,
  getMyPracticeBookings,
} from '../../services/practiceService';
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

export default function PracticeSessionsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'book' | 'my_sessions'>('my_sessions');
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
    var day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1);
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
      setBatches(res.data || []);
      if (res.data && res.data.length > 0 && !selectedBatch) setSelectedBatch(res.data[0]._id);
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
      const data = await getOpenPracticeSlots({
        batchId: selectedBatch,
        weekStart: getLocalDateString(weekStart),
      });
      setSlots(data || []);
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
      setMyBookings(data || []);
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
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await cancelPracticeBooking(slotId);
            Alert.alert('Success', 'Booking cancelled');
            if (activeTab === 'my_sessions') fetchMyBookings();
            else fetchOpenSlots();
          } catch (e) {
            Alert.alert('Error', 'Failed to cancel booking');
          }
        },
      },
    ]);
  };

  const hasBookedThisWeek = slots.some((s) => s.already_booked);

  return (
    <View style={styles.container}>
      {/* Top Notification Bar */}
      <View style={[styles.topNotificationBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="notifications-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.contentPadding}>
          {/* Main Title */}
          <Text style={styles.pageTitle}>Practice Sessions</Text>

          {/* Warning Info Box */}
          <View style={styles.infoBanner}>
            <Icon name="information-circle-outline" size={20} color="#D97706" style={{ marginRight: 10 }} />
            <Text style={styles.infoBannerText}>
              One booking per week allowed to ensure fair access for all students.
            </Text>
          </View>

          {/* Tab Switcher Bar */}
          <View style={styles.tabSwitcherRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'book' && styles.tabButtonActive]}
              onPress={() => setActiveTab('book')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, activeTab === 'book' && styles.tabButtonTextActive]}>
                Book a Session
              </Text>
              {activeTab === 'book' && <View style={styles.activeTabUnderline} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'my_sessions' && styles.tabButtonActive]}
              onPress={() => setActiveTab('my_sessions')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, activeTab === 'my_sessions' && styles.tabButtonTextActive]}>
                My Sessions
              </Text>
              {activeTab === 'my_sessions' && <View style={styles.activeTabUnderline} />}
            </TouchableOpacity>
          </View>

          {/* TAB 1: BOOK A SESSION */}
          {activeTab === 'book' && (
            <View style={{ marginTop: SPACING.md }}>
              {/* Batch Selector */}
              {batches.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                  {batches.map((b) => (
                    <TouchableOpacity
                      key={b._id}
                      style={[styles.batchPill, selectedBatch === b._id ? styles.batchPillActive : styles.batchPillInactive]}
                      onPress={() => setSelectedBatch(b._id)}
                    >
                      <Text style={selectedBatch === b._id ? styles.batchPillTextActive : styles.batchPillTextInactive}>
                        {b.name || 'Batch'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {loading ? (
                <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 30 }} />
              ) : slots.length > 0 ? (
                slots.map((slot) => {
                  const isFull = slot.seats_available <= 0;
                  const disabled = isFull || (hasBookedThisWeek && !slot.already_booked);
                  const actualSlotDate = getSlotActualDate(slot.week_start_date, slot.day_of_week);
                  const dateString = actualSlotDate.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

                  return (
                    <View key={slot._id} style={styles.sessionCard}>
                      <View style={styles.sessionCardAccentBar} />
                      <View style={styles.sessionCardContent}>
                        <View style={styles.pillTagsRow}>
                          <View style={styles.practiceTypeTag}>
                            <Text style={styles.practiceTypeTagText}>PRACTICE SLOT</Text>
                          </View>
                          <View style={styles.coursePillTag}>
                            <Text style={styles.coursePillText}>
                              {slot.batch_id?.course_id?.title || 'Practice Session'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.sessionDateText}>{dateString}</Text>
                        <Text style={styles.sessionTimeText}>
                          {slot.start_time} – {slot.end_time}
                        </Text>

                        <View style={styles.instructorRow}>
                          <Icon name="person-outline" size={15} color="#666" style={{ marginRight: 4 }} />
                          <Text style={styles.instructorText}>
                            Inst. {slot.instructor_id?.name || 'Instructor'}
                          </Text>
                        </View>

                        {slot.already_booked ? (
                          <TouchableOpacity
                            style={styles.cancelOutlineButton}
                            onPress={() => handleCancelBooking(slot._id)}
                          >
                            <Text style={styles.cancelOutlineButtonText}>Cancel</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.bookSolidButton, disabled && styles.disabledButton]}
                            disabled={disabled}
                            onPress={() => handleBookSlot(slot._id)}
                          >
                            <Text style={styles.bookSolidButtonText}>
                              {isFull ? 'Full' : hasBookedThisWeek ? 'Already booked this week' : 'Book Session'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No open practice slots available.</Text>
              )}
            </View>
          )}

          {/* TAB 2: MY SESSIONS */}
          {activeTab === 'my_sessions' && (
            <View style={{ marginTop: SPACING.md }}>
              {loading ? (
                <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 30 }} />
              ) : myBookings.length > 0 ? (
                myBookings.map((booking) => {
                  const slot = booking.slot_id;
                  if (!slot) return null;
                  const actualSlotDate = getSlotActualDate(slot.week_start_date, slot.day_of_week);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isFuture = actualSlotDate >= today;

                  return (
                    <View key={booking._id} style={[styles.sessionCard, !isFuture && styles.pastSessionCard]}>
                      {isFuture && <View style={styles.sessionCardAccentBar} />}
                      <View style={styles.sessionCardContent}>
                        <View style={styles.pillTagsRow}>
                          <View style={[styles.coursePillTag, !isFuture && styles.pastPillTag]}>
                            <Text style={[styles.coursePillText, !isFuture && styles.pastPillText]}>
                              {slot.batch_id?.course_id?.title || 'Practice Session'}
                            </Text>
                          </View>
                          <View style={[styles.batchPillTag, !isFuture && styles.pastPillTag]}>
                            <Text style={[styles.batchPillTagText, !isFuture && styles.pastPillText]}>
                              {slot.batch_id?.name || 'Batch 01'}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.sessionDateText, !isFuture && styles.pastText]}>
                          {actualSlotDate.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short' })}
                          {!isFuture ? ' (Past)' : ''}
                        </Text>

                        <Text style={[styles.sessionTimeText, !isFuture && styles.pastText]}>
                          {slot.start_time} – {slot.end_time}
                        </Text>

                        <View style={styles.instructorRow}>
                          <Icon name="person-outline" size={15} color={isFuture ? '#666' : '#B0B0B0'} style={{ marginRight: 4 }} />
                          <Text style={[styles.instructorText, !isFuture && styles.pastText]}>
                            Inst. {slot.instructor_id?.name || 'Instructor'}
                          </Text>
                        </View>

                        {isFuture && (
                          <TouchableOpacity
                            style={styles.cancelOutlineButton}
                            onPress={() => handleCancelBooking(slot._id)}
                          >
                            <Text style={styles.cancelOutlineButtonText}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: '#888888', ...FONTS.regular, textAlign: 'center', marginTop: 30 }}>
                  No practice bookings found.
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  topNotificationBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  bellBtn: {
    padding: SPACING.xs,
  },
  scrollContent: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  pageTitle: {
    fontSize: 26,
    color: '#000000',
    ...FONTS.bold,
    marginBottom: SPACING.md,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  infoBannerText: {
    flex: 1,
    color: '#78350F',
    fontSize: 13,
    ...FONTS.regular,
    lineHeight: 18,
  },
  tabSwitcherRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    marginBottom: SPACING.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: 15,
    color: '#888888',
    ...FONTS.semiBold,
  },
  tabButtonTextActive: {
    color: '#F58220',
    ...FONTS.bold,
  },
  activeTabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: '#F58220',
    borderRadius: 1.5,
  },
  batchPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    marginRight: 8,
  },
  batchPillActive: {
    backgroundColor: '#000000',
  },
  batchPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  batchPillTextActive: {
    color: '#FFFFFF',
    ...FONTS.bold,
  },
  batchPillTextInactive: {
    color: '#555555',
    ...FONTS.medium,
  },
  weekPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  weekText: {
    fontSize: 14,
    color: '#1A1A1A',
    ...FONTS.bold,
  },
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  pastSessionCard: {
    backgroundColor: '#FFFFFF',
  },
  sessionCardAccentBar: {
    width: 5,
    backgroundColor: '#F58220',
  },
  sessionCardContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  pillTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  coursePillTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginRight: 8,
  },
  coursePillText: {
    fontSize: 12,
    color: '#333333',
    ...FONTS.bold,
  },
  practiceTypeTag: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginRight: 8,
  },
  practiceTypeTagText: {
    fontSize: 10.5,
    color: '#D97706',
    ...FONTS.bold,
    letterSpacing: 0.5,
  },
  batchPillTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  batchPillTagText: {
    fontSize: 12,
    color: '#666666',
    ...FONTS.medium,
  },
  pastPillTag: {
    backgroundColor: '#F9FAFB',
  },
  pastPillText: {
    color: '#B0B0B0',
  },
  sessionDateText: {
    fontSize: 18,
    color: '#1A1A1A',
    ...FONTS.bold,
    marginBottom: 4,
  },
  sessionTimeText: {
    fontSize: 16.5,
    color: '#B45309',
    ...FONTS.bold,
    marginBottom: SPACING.xs,
  },
  pastTimeText: {
    color: '#B0B0B0',
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  instructorText: {
    fontSize: 13.5,
    color: '#666666',
    ...FONTS.regular,
  },
  pastText: {
    color: '#B0B0B0',
  },
  cancelOutlineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FF5252',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelOutlineButtonText: {
    color: '#FF5252',
    fontSize: 14.5,
    ...FONTS.bold,
  },
  bookSolidButton: {
    backgroundColor: '#F58220',
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  bookSolidButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    ...FONTS.bold,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#999999',
    ...FONTS.regular,
  },
});

