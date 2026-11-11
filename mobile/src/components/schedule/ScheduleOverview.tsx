import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { communicationTheme } from '../shared/communicationTheme';
import ScheduleCoursePicker from './ScheduleCoursePicker';
import ScheduleRegularClasses from './ScheduleRegularClasses';
import ScheduleCalendar from './ScheduleCalendar';
import { scheduleBatches } from '../../utils/studentSchedule';
import { regularBatchesForScheduleView, schedulePeriodLabel, scheduleToday, slotsForScheduleView, ScheduleViewMode } from '../../utils/scheduleViews';

type Props = {
  batches: any[]; selectedBatchId: string | null; onBatchSelect: (id: string | null) => void;
  slots: any[]; renderSlot: (slot: any) => React.ReactNode; loading?: boolean; error?: string | null;
  onRetry?: () => void; onRefresh?: () => void; refreshing?: boolean;
  onCreate?: () => void; onViewChange?: (mode: ScheduleViewMode) => void; onFilter?: () => void;
  viewMode?: ScheduleViewMode; selectedDate?: Date; onDateChange?: (date: Date) => void;
  emptyMessage?: string; regularBatches?: any[]; search?: string; onSearchChange?: (value: string) => void;
};
export default function ScheduleOverview(props: Props) {
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const [viewsOpen, setViewsOpen] = useState(false);
  const mode = props.viewMode || 'List';
  const date = props.selectedDate || scheduleToday();
  const visibleSlots = slotsForScheduleView(props.slots, mode, date);
  const visibleBatches = regularBatchesForScheduleView(scheduleBatches(props.regularBatches || props.batches, props.selectedBatchId), mode, date);
  const action = (label: string, icon: React.ComponentProps<typeof Icon>['name'], onPress: () => void, primary = false, accessibilityLabel?: string) =>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} onPress={onPress} style={[styles.action, { borderColor: theme.line, backgroundColor: primary ? COLORS.secondary : theme.surface }]}>
      <Icon name={icon} size={16} color={primary ? '#FFFFFF' : theme.text} /><Text style={[styles.actionText, { color: primary ? '#FFFFFF' : theme.text }]}>{label}</Text>
    </TouchableOpacity>;
  return <>
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
      refreshControl={props.onRefresh ? <RefreshControl refreshing={!!props.refreshing} onRefresh={props.onRefresh} tintColor={COLORS.secondary} /> : undefined}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {props.batches.length > 0 && <ScheduleCoursePicker batches={props.batches} selectedBatchId={props.selectedBatchId} onSelect={props.onBatchSelect} />}
        {(props.onCreate || props.onViewChange || props.onFilter) && <View style={styles.actions}>
          {props.onCreate && action('Create slot', 'add-outline', props.onCreate, true)}
          {props.onViewChange && action('Views', 'calendar-outline', () => setViewsOpen(true), false, `Change schedule view, current ${mode}`)}
          {props.onFilter && action('Filters', 'options-outline', props.onFilter)}
        </View>}
        {mode !== 'List' && props.onDateChange && props.onViewChange && <ScheduleCalendar mode={mode} date={date}
          slots={props.loading ? [] : props.slots} onDateChange={props.onDateChange} onViewChange={props.onViewChange} />}
        {props.onSearchChange && <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Icon name="search-outline" size={16} color={theme.muted} />
          <TextInput accessibilityLabel="Search schedule" placeholder="Search course, batch, instructor…" placeholderTextColor={theme.muted}
            value={props.search} onChangeText={props.onSearchChange} style={[styles.searchInput, { color: theme.text }]} />
        </View>}
        {props.loading ? <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 24 }} />
          : props.error ? <View style={styles.empty}>
            <Text accessibilityRole="alert" style={[styles.help, { color: theme.text }]}>{props.error}</Text>
            {props.onRetry && action('Try again', 'refresh-outline', props.onRetry)}
          </View>
          : props.batches.length === 0 ? <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Icon name="hourglass-outline" size={28} color={COLORS.secondary} />
            <Text style={[styles.heading, { color: theme.text }]}>No courses available</Text>
            <Text style={[styles.help, { color: theme.muted }]}>{props.emptyMessage || 'Your schedule will appear once a batch is assigned.'}</Text>
          </View> : <>
            <ScheduleRegularClasses batches={visibleBatches} />
            <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Practice Sessions &amp; Lab Slots</Text>
            {mode !== 'List' && <Text style={[styles.help, { color: theme.muted }]}>{schedulePeriodLabel(mode, date)} · {visibleSlots.length} {visibleSlots.length === 1 ? 'session' : 'sessions'}</Text>}
            <View>{visibleSlots.length ? visibleSlots.map(props.renderSlot)
              : <Text style={[styles.help, { color: theme.muted }]}>{mode === 'List' ? 'No practice sessions available.' : `No practice sessions scheduled for this ${mode.toLowerCase()}.`}</Text>}</View>
          </>}
      </View>
    </ScrollView>
    <Modal visible={viewsOpen} transparent animationType="fade" onRequestClose={() => setViewsOpen(false)}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close schedule views" style={StyleSheet.absoluteFill} onPress={() => setViewsOpen(false)} />
        <View accessibilityViewIsModal style={[styles.viewMenu, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.heading, { color: theme.text }]}>Schedule view</Text>
          {(['List', 'Month', 'Week', 'Day'] as const).map(option => <TouchableOpacity key={option} accessibilityRole="radio"
            accessibilityState={{ checked: mode === option }} accessibilityLabel={`${option} view`}
            onPress={() => { setViewsOpen(false); props.onViewChange?.(option); }} style={[styles.viewOption, { borderColor: theme.line }]}>
            <Text style={[styles.help, { color: mode === option ? COLORS.secondary : theme.text }]}>{option} view</Text>
            <Icon name={mode === option ? 'checkmark' : 'chevron-forward'} size={16} color={mode === option ? COLORS.secondary : theme.muted} />
          </TouchableOpacity>)}
        </View>
      </View>
    </Modal>
  </>;
}
export const scheduleOverviewStyles = StyleSheet.create({
  manageButton: { marginTop: 12, minHeight: 44, borderRadius: 12, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  manageButtonText: { ...FONTS.bold, fontSize: 14, color: '#FFFFFF' },
});
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 110 },
  content: { paddingHorizontal: 20, paddingTop: 10, width: '100%', maxWidth: 1100, alignSelf: 'center', gap: 10 },
  heading: { ...FONTS.bold, fontSize: 18 }, help: { ...FONTS.regular, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44 },
  searchInput: { ...FONTS.regular, fontSize: 13, flex: 1, minWidth: 0, paddingVertical: 10 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10 },
  actionText: { ...FONTS.semiBold, fontSize: 12 },
  empty: { alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 24, gap: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  viewMenu: { width: '100%', maxWidth: 380, padding: 18, borderWidth: 1, borderRadius: 14, gap: 12 },
  viewOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth },
});
