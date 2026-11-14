import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { communicationTheme } from '../shared/communicationTheme';
import { DatePickerModal, MonthPickerModal } from '../shared/DateTimePickerModals';
import { getSlotActualDate } from '../../utils/studentSchedule';
import { scheduleCalendarDates, scheduleDateKey, schedulePeriodLabel, scheduleToday, shiftScheduleDate, ScheduleViewMode } from '../../utils/scheduleViews';

type Props = { mode: Exclude<ScheduleViewMode, 'List'>; date: Date; slots: any[];
  onDateChange: (date: Date) => void; onViewChange: (mode: ScheduleViewMode) => void };
export default function ScheduleCalendar({ mode, date, slots, onDateChange, onViewChange }: Props) {
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const [pickDate, setPickDate] = useState(false);
  const [pickMonth, setPickMonth] = useState(false);
  const counts = new Map<string, number>();
  slots.forEach(slot => {
    const key = scheduleDateKey(getSlotActualDate(slot.week_start_date, slot.day_of_week));
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const today = scheduleDateKey(scheduleToday());
  const selectDate = (value: Date) => { onDateChange(value); onViewChange('Day'); };
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
    <View style={styles.navigator}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Previous ${mode.toLowerCase()}`} onPress={() => onDateChange(shiftScheduleDate(date, mode, -1))} style={styles.arrow}>
        <Icon name="chevron-back" size={21} color={theme.text} />
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={mode === 'Month' ? 'Choose schedule month' : 'Choose schedule date'}
        onPress={() => mode === 'Month' ? setPickMonth(true) : setPickDate(true)} style={styles.period}>
        <Text style={[styles.periodLabel, { color: theme.text }]}>{schedulePeriodLabel(mode, date)}</Text>
        <Icon name="chevron-down" size={13} color={theme.muted} />
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Next ${mode.toLowerCase()}`} onPress={() => onDateChange(shiftScheduleDate(date, mode, 1))} style={styles.arrow}>
        <Icon name="chevron-forward" size={21} color={theme.text} />
      </TouchableOpacity>
    </View>
    <View style={styles.summary}>
      <Text style={[styles.caption, { color: theme.muted }]}>{mode === 'Day' ? 'Daily schedule' : 'Tap a date to view its sessions'}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => onDateChange(scheduleToday())} style={styles.todayButton}>
        <Text style={styles.todayLabel}>Today</Text>
      </TouchableOpacity>
    </View>
    {mode !== 'Day' && <>
      <View style={styles.grid}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <View key={day} style={styles.column}><Text style={[styles.weekday, { color: theme.muted }]}>{day}</Text></View>)}
        {scheduleCalendarDates(mode, date).map(value => {
          const key = scheduleDateKey(value), count = counts.get(key) || 0;
          const selected = key === scheduleDateKey(date), current = key === today;
          const outside = mode === 'Month' && value.getMonth() !== date.getMonth();
          return <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{ selected }}
            accessibilityLabel={`${value.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${count} ${count === 1 ? 'session' : 'sessions'}`}
            onPress={() => selectDate(value)} style={styles.dayHit}>
            <View style={[styles.day, { borderColor: current || selected ? COLORS.secondary : 'transparent',
              backgroundColor: selected ? isDark ? 'rgba(245,130,32,0.16)' : '#FFF5EB' : 'transparent', opacity: outside ? 0.45 : 1 }]}>
              <Text style={[styles.dayNumber, { color: selected || current ? COLORS.secondary : theme.text }]}>{value.getDate()}</Text>
              <View style={styles.countRow}>{count > 0 && <><View style={styles.dot} /><Text style={[styles.count, { color: theme.muted }]}>{count}</Text></>}</View>
            </View>
          </TouchableOpacity>;
        })}
      </View>
    </>}
    <DatePickerModal visible={pickDate} onClose={() => setPickDate(false)} selectedDate={date} isDark={isDark} allowPastDates
      title="Choose schedule date" onSelectDate={onDateChange} />
    <MonthPickerModal visible={pickMonth} onClose={() => setPickMonth(false)} selectedYear={date.getFullYear()} selectedMonth={date.getMonth()}
      isDark={isDark} title="Choose schedule month" onSelectMonth={(year, month) => onDateChange(new Date(year, month, 1))} />
  </View>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 10 },
  navigator: { flexDirection: 'row', alignItems: 'center', gap: 4 }, arrow: { width: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  period: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  periodLabel: { ...FONTS.semiBold, fontSize: 14, lineHeight: 20, textAlign: 'center', flexShrink: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 6 },
  caption: { ...FONTS.regular, fontSize: 11, lineHeight: 16, flex: 1 },
  todayButton: { minHeight: 40, paddingHorizontal: 8, justifyContent: 'center' }, todayLabel: { ...FONTS.semiBold, fontSize: 12, color: COLORS.secondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }, column: { width: '14.285714%', alignItems: 'center', paddingVertical: 5 },
  weekday: { ...FONTS.medium, fontSize: 10 }, dayHit: { width: '14.285714%', padding: 2 },
  day: { minHeight: 47, borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 3 },
  dayNumber: { ...FONTS.semiBold, fontSize: 13 }, countRow: { height: 12, flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.secondary }, count: { ...FONTS.regular, fontSize: 9 },
});
