import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getOpenPracticeSlots, bookPracticeSlot, cancelPracticeBooking } from '../../services/practiceService';
import api from '../../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { useTheme } from '../../context/ThemeContext';

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
  const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const diff = daysArr.indexOf(dayOfWeek);
  const slotDate = new Date(weekStart);
  if (diff !== -1) {
    slotDate.setDate(slotDate.getDate() + diff);
  }
  return slotDate;
};

export default function StudentScheduleScreen({ unreadCount }: { unreadCount?: number }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelSlotId, setCancelSlotId] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const [alertModal, setAlertModal] = useState<{ visible: boolean; title: string; message: string; onOk?: () => void }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    setAlertModal({ visible: true, title, message, onOk });
  };

  // Generate next 14 days for the calendar strip
  const calendarDays = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useFocusEffect(
    useCallback(() => {
      api.get('/students/batches').then(res => {
        setBatches(res.data || []);
        let currentBatch = selectedBatch;
        if (res.data && res.data.length > 0) {
          if (!currentBatch) {
            currentBatch = res.data[0];
            setSelectedBatch(currentBatch);
          } else {
            fetchSlots(currentBatch);
          }
        }
      }).catch(e => console.log('Error fetching batches', e));
    }, [selectedBatch])
  );

  // Still keep this to fetch when batch changes
  useEffect(() => {
    if (selectedBatch) {
      fetchSlots(selectedBatch);
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

  const fetchSlots = async (batch = selectedBatch) => {
    if (!batch) return;
    setLoading(true);
    try {
      const data = await getOpenPracticeSlots({ batchId: batch._id });
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
      showAlert('Success', 'Practice session booked successfully!');
      fetchSlots();
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to book slot');
    }
  };

  const handleCancelBooking = async (slotId: string) => {
    setCancelSlotId(slotId);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const confirmCancelBooking = async () => {
    setCancelModalVisible(false);
    try {
      await cancelPracticeBooking(cancelSlotId, cancelReason);
      showAlert('Success', 'Cancellation requested successfully! Please wait for instructor approval.');
      fetchSlots();
    } catch (e: any) {
      console.error('Cancellation error', e.response?.data || e.message);
      showAlert('Error', e.response?.data?.message || 'Failed to cancel booking');
    }
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
  const regularClasses = selectedBatch
    ? [
        {
          type: 'class',
          title: selectedBatch?.course_id?.title || 'Vocational Training Course',
          days: Array.isArray(selectedBatch?.schedule_json?.days)
            ? selectedBatch.schedule_json.days.join(', ')
            : (selectedBatch?.schedule_json?.days || 'Days TBD'),
          time: selectedBatch?.schedule_json?.time || 'Time TBD',
          room: selectedBatch?.room || 'Room TBD',
          instructor: selectedBatch?.instructor_ids?.[0]?.name || 'Instructor TBD',
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

  const courseTitle = selectedBatch?.course_id?.title || selectedBatch?.name || 'Select Course';

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#0B0F19' }]}>
      <ScreenBackground />
      {/* FIXED STICKY TOP HEADER */}
      <View style={{ paddingTop: Math.max(insets.top + 4, 10) }}>
        <ScreenHeader title="Schedule" subtitle="Timetable & practical slots" />

        {/* Sleek Compact Course Selector Header Bar */}
        <View style={styles.courseSelectContainer}>
          <TouchableOpacity
            style={[styles.compactCourseSelect, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' }]}
            activeOpacity={0.85}
            onPress={() => setCourseModalVisible(true)}
          >
            <View style={styles.courseSelectLeft}>
              <Text style={[styles.compactCourseTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                {courseTitle}
              </Text>
            </View>
            <Icon name="chevron-down" size={18} color={isDark ? '#94A3B8' : '#71717A'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>

        {/* Content Body */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.contentPadding}>
            {/* Section 1: Regular Classes (Blue Theme) */}
            <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Regular Classes</Text>

            {regularClasses.length > 0 ? (
              regularClasses.map((cls, i) => (
                <View key={i} style={[styles.classCard, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
                  <View style={styles.classCardAccentBar} />
                  <View style={styles.classCardContent}>
                    <View style={styles.classCardTopRow}>
                      <Text style={[styles.classCourseTitle, isDark && { color: '#FFFFFF' }]}>{cls.title}</Text>
                      <View style={[styles.theoryBadge, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                        <Text style={[styles.theoryBadgeText, isDark && { color: '#60A5FA' }]}>THEORY CLASS</Text>
                      </View>
                    </View>
                    <View style={styles.classCardInfoRow}>
                      <Icon name="calendar-outline" size={15} color="#3B82F6" style={{ marginRight: 4 }} />
                      <Text style={[styles.classCardInfoText, { fontWeight: 'bold', color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                        {cls.days}
                      </Text>
                      <Text style={[styles.dotSeparator, isDark && { color: '#64748B' }]}>•</Text>
                      <Icon name="time-outline" size={15} color="#3B82F6" style={{ marginRight: 4 }} />
                      <Text style={[styles.classCardInfoText, isDark && { color: '#94A3B8' }]}>{cls.time}</Text>
                    </View>
                    <View style={styles.classCardInfoRow}>
                      <Icon name="location-outline" size={15} color={isDark ? '#94A3B8' : '#666'} style={{ marginRight: 4 }} />
                      <Text style={[styles.classCardInfoText, isDark && { color: '#94A3B8' }]}>{cls.room || 'Room TBD'}</Text>
                      <Text style={[styles.dotSeparator, isDark && { color: '#64748B' }]}>•</Text>
                      <Icon name="person-outline" size={15} color={isDark ? '#94A3B8' : '#666'} style={{ marginRight: 4 }} />
                      <Text style={[styles.classCardInfoText, isDark && { color: '#94A3B8' }]}>{cls.instructor}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: isDark ? '#94A3B8' : '#888888', ...FONTS.regular, marginVertical: SPACING.md }}>
                No regular classes found for this batch.
              </Text>
            )}

            {/* Section 2: Practice Sessions (Orange Theme) */}
            <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }, { marginTop: SPACING.xl }]}>Practice Sessions & Lab Slots</Text>

            {slots.length > 0 ? (
              slots.map((slot) => {
                const isFull = slot.seats_available <= 0;
                const bookedThisWeek = hasBookedInWeek(slot.week_start_date);
                const disabled = isFull || (bookedThisWeek && !slot.already_booked);
                const seatsLeft = slot.seats_available;
                const maxSeats = slot.max_students || 10;
                const fillRatio = Math.max(0, Math.min(1, (maxSeats - seatsLeft) / maxSeats));
                const actualSlotDate = getSlotActualDate(slot.week_start_date, slot.day_of_week);
                const dateString = actualSlotDate.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

                return (
                  <View
                    key={slot._id}
                    style={[styles.practiceCard, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' }, isFull && (isDark ? { opacity: 0.6 } : styles.practiceCardFull)]}
                  >
                    <View style={styles.practiceCardTopRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <View style={[styles.practiceBadge, isDark && { backgroundColor: 'rgba(249, 115, 22, 0.18)' }]}>
                            <Text style={[styles.practiceBadgeText, isDark && { color: '#FB923C' }]}>PRACTICE SLOT</Text>
                          </View>
                        </View>
                        <Text style={[styles.practiceTitle, isDark && { color: '#FFFFFF' }, isFull && styles.dimmedText]}>
                          {slot.batch_id?.course_id?.title || 'Practice Session'}
                        </Text>
                      </View>

                      {slot.already_booked ? (
                        <View style={[styles.bookedBadge, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                          <Icon
                            name="checkmark-circle-outline"
                            size={13}
                            color="#10B981"
                            style={{ marginRight: 3 }}
                          />
                          <Text style={styles.bookedBadgeText}>BOOKED</Text>
                        </View>
                      ) : isFull ? (
                        <Text style={[styles.seatsLeftTextFull, isDark && { color: '#94A3B8' }]}>0 / {maxSeats} left</Text>
                      ) : (
                        <View style={styles.seatsProgressContainer}>
                          <Text style={[styles.seatsLeftText, isDark && { color: '#94A3B8' }]}>
                            {seatsLeft} / {maxSeats} left
                          </Text>
                          <View style={[styles.progressBarTrack, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                            <View
                              style={[styles.progressBarFill, { width: `${fillRatio * 100}%` }]}
                            />
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={styles.practiceInfoRow}>
                      <Icon
                        name="calendar-outline"
                        size={15}
                        color={isFull ? '#B0B0B0' : '#D97706'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.practiceDateText, isDark && { color: '#CBD5E1' }, isFull && styles.dimmedText]}>
                        {dateString}
                      </Text>
                    </View>

                    <View style={styles.practiceInfoRow}>
                      <Icon
                        name="time-outline"
                        size={15}
                        color={isFull ? '#B0B0B0' : (isDark ? '#94A3B8' : '#666')}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.practiceInfoText, isDark && { color: '#94A3B8' }, isFull && styles.dimmedText]}>
                        {slot.start_time} - {slot.end_time}
                      </Text>
                      <Text style={[styles.dotSeparator, isDark && { color: '#64748B' }]}>•</Text>
                      <Icon
                        name="person-outline"
                        size={15}
                        color={isFull ? '#B0B0B0' : (isDark ? '#94A3B8' : '#666')}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.practiceInfoText, isDark && { color: '#94A3B8' }, isFull && styles.dimmedText]}>
                        {slot.instructor_id?.name || 'Instructor TBD'}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    {isFull ? (
                      <View style={[styles.fullStatusContainer, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
                        <Text style={[styles.fullText, isDark && { color: '#94A3B8' }]}>FULL</Text>
                      </View>
                    ) : slot.already_booked ? (
                      slot.booking_status === 'cancellation_requested' ? (
                        <View style={[styles.cancelBookingButton, { borderColor: '#F59E0B' }, isDark && { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                          <Text style={[styles.cancelBookingButtonText, { color: '#F59E0B' }]}>Pending Cancellation</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.cancelBookingButton, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#EF4444' }]}
                          onPress={() => handleCancelBooking(slot._id)}
                        >
                          <Text style={styles.cancelBookingButtonText}>Cancel Booking</Text>
                        </TouchableOpacity>
                      )
                    ) : (
                      <TouchableOpacity
                        style={[styles.bookSlotButton, disabled && (isDark ? { backgroundColor: 'rgba(255, 255, 255, 0.08)' } : styles.disabledButton)]}
                        disabled={disabled}
                        onPress={() => handleBookSlot(slot._id)}
                      >
                        <Text style={[styles.bookSlotButtonText, disabled && isDark && { color: '#64748B' }]}>
                          {bookedThisWeek ? 'Max 1 Booking / Week' : 'Book Slot'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={{ color: isDark ? '#94A3B8' : '#888888', ...FONTS.regular, marginVertical: SPACING.md }}>
                No practice sessions available.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Course Selection Dropdown Modal */}
      <Modal
        visible={courseModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCourseModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCourseModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.dropdownModalCard, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <View style={[styles.dropdownHeader, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
                <Text style={[styles.dropdownTitle, isDark && { color: '#FFFFFF' }]}>Select Course</Text>
                <TouchableOpacity
                  onPress={() => setCourseModalVisible(false)}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={20} color={isDark ? '#94A3B8' : '#71717A'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {batches.length > 0 ? (
                  batches.map((batch) => {
                    const isSelected = batch._id === selectedBatch?._id;
                    const title = batch.course_id?.title || batch.name || 'Course';
                    const batchCode = batch.batch_code || batch.name || '';
                    return (
                      <TouchableOpacity
                        key={batch._id}
                        style={[
                          styles.courseOptionItem,
                          isDark && { backgroundColor: 'rgba(15, 23, 42, 0.75)', borderColor: 'rgba(255, 255, 255, 0.08)' },
                          isSelected && (isDark ? { backgroundColor: 'rgba(249, 115, 22, 0.18)', borderColor: '#F97316' } : styles.courseOptionItemSelected),
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedBatch(batch);
                          setCourseModalVisible(false);
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            style={[
                              styles.courseOptionText,
                              isDark && { color: '#FFFFFF' },
                              isSelected && styles.courseOptionTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          {batchCode ? (
                            <Text style={[styles.courseOptionSub, isDark && { color: '#94A3B8' }]}>Batch: {batchCode}</Text>
                          ) : null}
                        </View>
                        {isSelected ? (
                          <View style={styles.activeCheckCircle}>
                            <Icon name="checkmark" size={14} color="#FFFFFF" />
                          </View>
                        ) : (
                          <Icon name="chevron-forward" size={16} color={isDark ? '#64748B' : '#D4D4D8'} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ color: isDark ? '#94A3B8' : '#71717A', fontSize: 14 }}>No courses available</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Cancellation Reason Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCancelModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.1)' }, { maxWidth: 400 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>Cancel Booking</Text>
                  <TouchableOpacity onPress={() => setCancelModalVisible(false)} style={{ padding: 6 }}>
                    <Icon name="close" size={24} color={isDark ? '#94A3B8' : '#666'} />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 14, color: isDark ? '#94A3B8' : '#666', marginBottom: 15 }}>
                  Are you sure you want to cancel this practice session? Please provide a reason for the instructor.
                </Text>

                <TextInput
                  style={[
                    { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, height: 80, textAlignVertical: 'top', padding: 12, fontSize: 14, color: '#1F2937' },
                    isDark && { backgroundColor: 'rgba(15, 23, 42, 0.75)', borderColor: 'rgba(255, 255, 255, 0.12)', color: '#FFFFFF' }
                  ]}
                  placeholder="Reason for cancellation (optional)"
                  placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                  multiline
                  numberOfLines={3}
                  value={cancelReason}
                  onChangeText={setCancelReason}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
                  <TouchableOpacity
                    style={{ padding: 10, marginRight: 15 }}
                    onPress={() => setCancelModalVisible(false)}
                  >
                    <Text style={{ color: isDark ? '#94A3B8' : '#666', ...FONTS.bold }}>Keep Booking</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#F58220', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                    onPress={confirmCancelBooking}
                  >
                    <Text style={{ color: '#FFF', ...FONTS.bold }}>Submit Request</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ALERT MODAL */}
      <Modal visible={alertModal.visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>{alertModal.title}</Text>
            <Text style={{color: isDark ? '#94A3B8' : '#4B5563', marginBottom: 20}}>{alertModal.message}</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={() => { setAlertModal({...alertModal, visible: false}); if (alertModal.onOk) alertModal.onOk(); }}>
              <Text style={styles.submitBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  scrollContent: {
    flex: 1,
  },
  stickyHeader: {
    backgroundColor: '#F5F6F8',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  pageTitleContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    color: '#18181B',
    ...FONTS.extraBold,
    marginBottom: 12,
  },
  courseSelectContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  compactCourseSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    }),
  },
  courseSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  compactCourseTitle: {
    fontSize: 14.5,
    ...FONTS.bold,
    color: '#18181B',
  },

  /* DROPDOWN MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  dropdownModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    ...Platform.select({
      web: { boxShadow: '0px 12px 36px rgba(0, 0, 0, 0.16)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 10 },
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F6',
  },
  dropdownTitle: {
    fontSize: 18,
    ...FONTS.extraBold,
    color: '#18181B',
  },
  closeBtn: {
    padding: 4,
  },
  courseOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  courseOptionItemSelected: {
    backgroundColor: '#FFF5EB',
    borderColor: '#F58220',
  },
  courseOptionText: {
    fontSize: 14.5,
    ...FONTS.bold,
    color: '#374151',
  },
  courseOptionTextSelected: {
    color: '#F58220',
  },
  courseOptionSub: {
    fontSize: 12,
    ...FONTS.medium,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activeCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  classCardAccentBar: {
    width: 6,
    backgroundColor: '#2563EB',
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  theoryBadgeText: {
    color: '#1D4ED8',
    fontSize: 10.5,
    ...FONTS.bold,
    letterSpacing: 0.5,
  },
  practiceBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  practiceBadgeText: {
    color: '#D97706',
    fontSize: 10.5,
    ...FONTS.bold,
    letterSpacing: 0.5,
  },
  practiceDateText: {
    fontSize: 14.5,
    color: '#D97706',
    ...FONTS.bold,
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
  submitBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center', 
    backgroundColor: '#0F172A', 
    borderRadius: 24 
  },
  submitBtnText: { 
    color: '#FFFFFF', 
    fontWeight: 'bold' 
  },
});
