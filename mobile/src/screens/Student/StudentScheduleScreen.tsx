import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getOpenPracticeSlots, bookPracticeSlot, cancelPracticeBooking } from '../../services/practiceService';
import api from '../../services/api';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { communicationTheme } from '../../components/shared/communicationTheme';
import { useTheme } from '../../context/ThemeContext';
import { loadScheduleSlots, hasWeeklyBooking } from '../../utils/studentSchedule';
import { isPracticalExpired, practicalBookingClosed } from '../../utils/practicalTime';
import usePracticalClock from '../../hooks/usePracticalClock';
import ScheduleOverview from '../../components/schedule/ScheduleOverview';
import ScheduleSlotCard from '../../components/schedule/ScheduleSlotCard';
import { scheduleToday, ScheduleViewMode } from '../../utils/scheduleViews';

export default function StudentScheduleScreen({ unreadCount }: { unreadCount?: number }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const [batches, setBatches] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('List');
  const [selectedDate, setSelectedDate] = useState<Date>(scheduleToday);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const now = usePracticalClock(slots);
  const actionPending = useRef(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [reloadBatches, setReloadBatches] = useState(0);
  const slotRequest = useRef(0);

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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadingBatches(true);
      setBatchError(null);
      api.get('/students/batches').then(res => {
        if (!active) return;
        const next = res.data || [];
        setBatches(next);
        setSelectedBatchId(previous => next.some((batch: any) => batch._id === previous) ? previous : null);
      }).catch(() => {
        if (active) setBatchError('Courses could not be loaded. Please try again.');
      }).finally(() => { if (active) setLoadingBatches(false); });
      return () => { active = false; slotRequest.current += 1; };
    }, [reloadBatches])
  );

  const fetchSlots = useCallback(async () => {
    const request = ++slotRequest.current;
    setLoading(true);
    setSlotError(null);
    setSlots([]);
    try {
      const data = await loadScheduleSlots(batches, selectedBatchId, getOpenPracticeSlots);
      if (request === slotRequest.current) setSlots(data);
    } catch {
      if (request === slotRequest.current) setSlotError('Practice sessions could not be loaded. Please try again.');
    } finally {
      if (request === slotRequest.current) setLoading(false);
    }
  }, [batches, selectedBatchId]);
  const refreshSlots = useRef(fetchSlots);
  refreshSlots.current = fetchSlots;

  useEffect(() => {
    if (!loadingBatches) void fetchSlots();
    return () => { slotRequest.current += 1; };
  }, [fetchSlots, loadingBatches]);

  const handleBookSlot = async (slotId: string) => {
    if (actionPending.current) return;
    actionPending.current = true; setActionBusy(true);
    try {
      await bookPracticeSlot(slotId);
      showAlert('Success', 'Practice session booked successfully!');
      void refreshSlots.current();
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to book slot');
      void refreshSlots.current();
    } finally { actionPending.current = false; setActionBusy(false); }
  };

  const handleCancelBooking = async (slotId: string) => {
    setCancelSlotId(slotId);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const confirmCancelBooking = async () => {
    if (actionPending.current) return;
    actionPending.current = true; setActionBusy(true);
    setCancelModalVisible(false);
    try {
      await cancelPracticeBooking(cancelSlotId, cancelReason);
      showAlert('Success', 'Cancellation requested successfully! Please wait for instructor approval.');
      void refreshSlots.current();
    } catch (e: any) {
      console.error('Cancellation error', e.response?.data || e.message);
      showAlert('Error', e.response?.data?.message || 'Failed to cancel booking');
    } finally { actionPending.current = false; setActionBusy(false); }
  };

  const renderStudentSlot = (slot: any) => {
    const expired = isPracticalExpired(slot, now);
    const full = slot.seats_available <= 0;
    const weekly = hasWeeklyBooking(slots, slot);
    const reason = slot.can_book === false ? slot.booking_block_reason
      : practicalBookingClosed(slot, now) ? 'Booking is closed for this session.'
      : weekly && !slot.already_booked ? 'Only one booking per batch per week is allowed.' : null;
    const disabled = expired || full || !!reason || actionBusy;
    return <ScheduleSlotCard key={slot._id} slot={slot} student now={now}>
      {expired ? null : full && !slot.already_booked ? <Text style={[styles.statusMessage, { color: theme.muted }]}>FULL</Text>
        : slot.already_booked ? slot.booking_status === 'cancellation_requested'
          ? <Text style={[styles.statusMessage, { color: '#D97706' }]}>Pending Cancellation</Text>
          : !slot.is_open ? <Text style={[styles.statusMessage, { color: theme.muted }]}>BOOKED (SLOT LOCKED)</Text>
          : <TouchableOpacity accessibilityRole="button" disabled={actionBusy} style={[styles.cancelBookingButton, { borderColor: '#EF4444', backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FFFFFF' }]}
              onPress={() => handleCancelBooking(slot._id)}><Text style={[styles.cancelBookingButtonText, { color: '#EF4444' }]}>Cancel Booking</Text></TouchableOpacity>
        : <TouchableOpacity accessibilityRole="button" style={[styles.bookSlotButton, disabled && { opacity: 0.45 }]} disabled={disabled} onPress={() => handleBookSlot(slot._id)}>
            <Text style={styles.bookSlotButtonText}>{actionBusy ? 'Please wait…' : reason ? 'Unavailable' : 'Book Slot'}</Text>
          </TouchableOpacity>}
      {!expired && !slot.already_booked && !!reason && <Text style={[styles.bookingHelp, { color: theme.muted }]}>{reason}</Text>}
    </ScheduleSlotCard>;
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#0B0F19' }]}>
      <ScreenBackground />
      <View style={{ paddingTop: Math.max(insets.top + 4, 10) }}>
        <ScreenHeader title="Schedule" subtitle="Timetable & practical slots" showBack={false} />
      </View>

      <ScheduleOverview batches={batches} selectedBatchId={selectedBatchId} onBatchSelect={setSelectedBatchId}
        viewMode={viewMode} selectedDate={selectedDate} onViewChange={setViewMode} onDateChange={setSelectedDate}
        slots={slots} renderSlot={renderStudentSlot} loading={loadingBatches || loading} error={batchError || slotError}
        onRetry={() => { if (batchError) setReloadBatches(value => value + 1); else void fetchSlots(); }}
        onRefresh={() => setReloadBatches(value => value + 1)}
        emptyMessage="Your timetable and practical booking slots will appear once an administrator assigns your batch." />

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
  statusMessage: { ...FONTS.bold, fontSize: 14, textAlign: 'center', marginTop: 16 },
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  bookingHelp: { ...FONTS.regular, fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  bookSlotButton: {
    backgroundColor: '#F58220',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.md,
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
    width: '100%',
    minHeight: 48,
    paddingVertical: 14, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#F58220', 
    borderRadius: 24 
  },
  submitBtnText: { 
    color: '#FFFFFF', 
    fontWeight: 'bold',
    fontSize: 15,
  }
});
