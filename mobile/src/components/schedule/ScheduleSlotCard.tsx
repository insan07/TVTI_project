import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOW } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { getSlotActualDate } from '../../utils/studentSchedule';
import { isPracticalExpired } from '../../utils/practicalTime';
import { communicationTheme } from '../shared/communicationTheme';
import WhatsAppOptionsMenu, { MenuOption } from '../shared/WhatsAppOptionsMenu';

type Props = { slot: any; student?: boolean; now?: number; menuOptions?: MenuOption[]; children?: React.ReactNode };
export default function ScheduleSlotCard({ slot, student = false, now = Date.now(), menuOptions, children }: Props) {
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const expired = isPracticalExpired(slot, now);
  const capacity = slot.max_students || 1;
  const booked = student ? slot.seats_taken ?? Math.max(0, capacity - (slot.seats_available ?? capacity)) : slot.booked_count || 0;
  const remaining = Math.max(0, capacity - booked);
  const full = remaining === 0;
  const status = expired ? 'EXPIRED' : student ? slot.already_booked ? 'BOOKED' : null : !slot.is_open ? 'LOCKED' : full ? 'FULL' : 'OPEN';
  const positive = status === 'BOOKED' || status === 'OPEN';
  const muted = expired || full;
  const accent = muted ? theme.muted : '#D97706';
  const date = getSlotActualDate(slot.week_start_date, slot.day_of_week).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  return <View style={[styles.card, { backgroundColor: isDark ? '#141B26' : muted ? '#FAFAFA' : '#FFFFFF', borderColor: theme.line }]}>
    <View style={styles.header}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: expired ? theme.muted : theme.text }]}>{slot.batch_id?.course_id?.title || 'Course'}</Text>
        <Text style={[styles.batch, { color: theme.muted }]}>Batch: {slot.batch_id?.batch_code || slot.batch_id?.code || slot.batch_id?.name || 'Batch'}</Text>
      </View>
      <View style={styles.statusGroup}>
        {status ? <View style={[styles.badge, { backgroundColor: positive ? isDark ? 'rgba(16,185,129,0.15)' : '#E8F5E9' : isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
          {status === 'BOOKED' && <Icon name="checkmark-circle-outline" size={13} color="#10B981" />}
          <Text style={[styles.badgeText, { color: positive ? '#10B981' : theme.muted }]}>{status}</Text>
        </View> : <View style={styles.availability}>
          <Text style={[styles.small, { color: theme.muted }]}>{remaining} / {capacity} left</Text>
          <View style={[styles.smallTrack, { backgroundColor: theme.line }]}><View style={[styles.fill, { width: `${Math.min(100, booked / capacity * 100)}%` }]} /></View>
        </View>}
        {!student && !!menuOptions?.length && <WhatsAppOptionsMenu options={menuOptions} triggerIconSize={20} triggerIconColor={theme.text} />}
      </View>
    </View>
    <View style={styles.row}><Icon name="calendar-outline" size={15} color={accent} /><Text style={[styles.date, { color: accent }]}>{date}</Text></View>
    <View style={styles.row}>
      <Icon name="time-outline" size={15} color={theme.muted} /><Text style={[styles.info, { color: theme.muted }]}>{slot.start_time} – {slot.end_time}</Text>
      <Text style={{ color: theme.muted }}>·</Text><Icon name="person-outline" size={15} color={theme.muted} />
      <Text style={[styles.info, { color: theme.muted }]}>{slot.instructor_id?.name || 'Instructor TBD'}</Text>
    </View>
    {!!slot.location && <View style={styles.row}><Icon name="location-outline" size={15} color={theme.muted} /><Text style={[styles.info, { color: theme.muted }]}>{slot.location}</Text></View>}
    {!!slot.equipment_note && <Text style={[styles.note, { color: theme.muted }]}>{slot.equipment_note}</Text>}
    {!student && !expired && <View style={styles.capacity}>
      <Text style={[styles.small, { color: theme.muted }]}>{booked} / {capacity} booked</Text>
      <View style={[styles.track, { backgroundColor: theme.line }]}><View style={[styles.fill, { width: `${Math.min(100, booked / capacity * 100)}%` }]} /></View>
      {slot.pending_cancellation_count > 0 && <Text style={[styles.small, { color: isDark ? '#FBBF24' : '#B45309' }]}>{slot.pending_cancellation_count} pending cancellation {slot.pending_cancellation_count === 1 ? 'request' : 'requests'}</Text>}
    </View>}
    {children}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 10, ...SHADOW.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  heading: { flex: 1, minWidth: 0 }, title: { ...FONTS.bold, fontSize: 16.5, lineHeight: 23 },
  batch: { ...FONTS.medium, fontSize: 12, lineHeight: 18, marginTop: 4 },
  statusGroup: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 16 },
  badgeText: { ...FONTS.bold, fontSize: 10.5, letterSpacing: 0.5 },
  availability: { alignItems: 'flex-end', gap: 4 }, small: { ...FONTS.medium, fontSize: 11, lineHeight: 16 },
  smallTrack: { width: 70, height: 3, borderRadius: 2, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  date: { ...FONTS.bold, fontSize: 14.5, flexShrink: 1 }, info: { ...FONTS.regular, fontSize: 13.5, flexShrink: 1 },
  note: { ...FONTS.regular, fontSize: 12, lineHeight: 18, marginTop: 8 },
  capacity: { marginTop: 10, gap: 5 }, track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.secondary },
});
