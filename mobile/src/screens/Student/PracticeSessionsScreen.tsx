import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
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
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { useTheme } from '../../context/ThemeContext';

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
  const { isDark } = useTheme();
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
    <View style={[styles.container, isDark && { backgroundColor: '#0B0F19' }]}>
      <ScreenBackground />
      <View style={{ paddingTop: Math.max(insets.top + 4, 10) }}>
        <ScreenHeader title="Practice Sessions" subtitle="Book and manage practical lab slots" />
      </View>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.contentPadding}>
          {/* Warning Info Box */}
          <View style={[styles.infoBanner, isDark && { backgroundColor: 'rgba(217, 119, 6, 0.12)', borderColor: 'rgba(245, 158, 11, 0.25)' }]}>
            <Icon name="information-circle-outline" size={20} color="#F59E0B" style={{ marginRight: 10 }} />
            <Text style={[styles.infoBannerText, isDark && { color: '#FCD34D' }]}>
              One booking per week allowed to ensure fair access for all students.
            </Text>
          </View>

          {/* Tab Switcher Bar */}
          <View style={styles.segmentedTrackContainer}>
            <View style={[styles.segmentedTrack, isDark && { backgroundColor: 'rgba(15, 23, 42, 0.85)', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <TouchableOpacity
                style={[styles.segmentedTab, activeTab === 'book' && (isDark ? { backgroundColor: '#F97316' } : styles.segmentedTabActive)]}
                onPress={() => setActiveTab('book')}
                activeOpacity={0.8}
              >
                <Icon
                  name={activeTab === 'book' ? 'calendar' : 'calendar-outline'}
                  size={16}
                  color={activeTab === 'book' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.segmentedTabText, activeTab === 'book' && styles.segmentedTabTextActive, activeTab !== 'book' && isDark && { color: '#94A3B8' }]}>
                  Book a Session
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentedTab, activeTab === 'my_sessions' && (isDark ? { backgroundColor: '#F97316' } : styles.segmentedTabActive)]}
                onPress={() => setActiveTab('my_sessions')}
                activeOpacity={0.8}
              >
                <Icon
                  name={activeTab === 'my_sessions' ? 'bookmark' : 'bookmark-outline'}
                  size={16}
                  color={activeTab === 'my_sessions' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.segmentedTabText, activeTab === 'my_sessions' && styles.segmentedTabTextActive, activeTab !== 'my_sessions' && isDark && { color: '#94A3B8' }]}>
                  My Sessions
                </Text>
              </TouchableOpacity>
            </View>
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
                      style={[
                        styles.batchPill,
                        selectedBatch === b._id
                          ? (isDark ? { backgroundColor: '#F97316' } : styles.batchPillActive)
                          : (isDark ? { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1 } : styles.batchPillInactive)
                      ]}
                      onPress={() => setSelectedBatch(b._id)}
                    >
                      <Text style={selectedBatch === b._id ? styles.batchPillTextActive : (isDark ? { color: '#94A3B8', ...FONTS.medium } : styles.batchPillTextInactive)}>
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
                    <View key={slot._id} style={[styles.sessionCard, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
                      <View style={styles.sessionCardAccentBar} />
                      <View style={styles.sessionCardContent}>
                        <View style={styles.pillTagsRow}>
                          <View style={[styles.practiceTypeTag, isDark && { backgroundColor: 'rgba(249, 115, 22, 0.18)', borderColor: 'rgba(249, 115, 22, 0.3)' }]}>
                            <Text style={[styles.practiceTypeTagText, isDark && { color: '#FB923C' }]}>PRACTICE SLOT</Text>
                          </View>
                          <View style={[styles.coursePillTag, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
                            <Text style={[styles.coursePillText, isDark && { color: '#E2E8F0' }]}>
                              {slot.batch_id?.course_id?.title || 'Practice Session'}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.sessionDateText, isDark && { color: '#FFFFFF' }]}>{dateString}</Text>
                        <Text style={[styles.sessionTimeText, isDark && { color: '#CBD5E1' }]}>
                          {slot.start_time} – {slot.end_time}
                        </Text>

                        <View style={styles.instructorRow}>
                          <Icon name="person-outline" size={15} color={isDark ? '#94A3B8' : '#666'} style={{ marginRight: 4 }} />
                          <Text style={[styles.instructorText, isDark && { color: '#94A3B8' }]}>
                            Inst. {slot.instructor_id?.name || 'Instructor'}
                          </Text>
                        </View>

                        {slot.already_booked ? (
                          <TouchableOpacity
                            style={[styles.cancelOutlineButton, isDark && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                            onPress={() => handleCancelBooking(slot._id)}
                          >
                            <Text style={[styles.cancelOutlineButtonText, isDark && { color: '#EF4444' }]}>Cancel</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.bookSolidButton, disabled && (isDark ? { backgroundColor: 'rgba(255, 255, 255, 0.08)' } : styles.disabledButton)]}
                            disabled={disabled}
                            onPress={() => handleBookSlot(slot._id)}
                          >
                            <Text style={[styles.bookSolidButtonText, disabled && isDark && { color: '#64748B' }]}>
                              {isFull ? 'Full' : hasBookedThisWeek ? 'Already booked this week' : 'Book Session'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.emptyText, isDark && { color: '#94A3B8' }]}>No open practice slots available.</Text>
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
                    <View key={booking._id} style={[styles.sessionCard, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' }, !isFuture && (isDark ? { opacity: 0.6 } : styles.pastSessionCard)]}>
                      {isFuture && <View style={styles.sessionCardAccentBar} />}
                      <View style={styles.sessionCardContent}>
                        <View style={styles.pillTagsRow}>
                          <View style={[styles.coursePillTag, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }, !isFuture && styles.pastPillTag]}>
                            <Text style={[styles.coursePillText, isDark && { color: '#E2E8F0' }, !isFuture && styles.pastPillText]}>
                              {slot.batch_id?.course_id?.title || 'Practice Session'}
                            </Text>
                          </View>
                          <View style={[styles.batchPillTag, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }, !isFuture && styles.pastPillTag]}>
                            <Text style={[styles.batchPillTagText, isDark && { color: '#CBD5E1' }, !isFuture && styles.pastPillText]}>
                              {slot.batch_id?.name || 'Batch 01'}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.sessionDateText, isDark && { color: '#FFFFFF' }, !isFuture && styles.pastText]}>
                          {actualSlotDate.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short' })}
                          {!isFuture ? ' (Past)' : ''}
                        </Text>

                        <Text style={[styles.sessionTimeText, isDark && { color: '#CBD5E1' }, !isFuture && styles.pastText]}>
                          {slot.start_time} – {slot.end_time}
                        </Text>

                        <View style={styles.instructorRow}>
                          <Icon name="person-outline" size={15} color={isFuture ? (isDark ? '#94A3B8' : '#666') : '#B0B0B0'} style={{ marginRight: 4 }} />
                          <Text style={[styles.instructorText, isDark && { color: '#94A3B8' }, !isFuture && styles.pastText]}>
                            Inst. {slot.instructor_id?.name || 'Instructor'}
                          </Text>
                        </View>

                        {isFuture && (
                          <TouchableOpacity
                            style={[styles.cancelOutlineButton, isDark && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                            onPress={() => handleCancelBooking(slot._id)}
                          >
                            <Text style={[styles.cancelOutlineButtonText, isDark && { color: '#EF4444' }]}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: isDark ? '#94A3B8' : '#888888', ...FONTS.regular, textAlign: 'center', marginTop: 30 }}>
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
  segmentedTrackContainer: {
    marginVertical: SPACING.md,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 26,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: 'inset 0px 1px 3px rgba(0, 0, 0, 0.04)' },
      default: {}
    }),
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 22,
  },
  segmentedTabActive: {
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
  segmentedTabText: {
    fontSize: 13.5,
    color: '#64748B',
    ...FONTS.semiBold,
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
    ...FONTS.bold,
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

