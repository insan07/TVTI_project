import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FONTS, SHADOW } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { communicationTheme } from '../shared/communicationTheme';

export default function ScheduleRegularClasses({ batches }: { batches: any[] }) {
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Regular Classes</Text>
    {batches.length === 0 ? <Text style={[styles.help, { color: theme.muted }]}>No regular classes found.</Text>
      : batches.map(batch => <View key={batch._id} style={[styles.card, { backgroundColor: isDark ? '#141B26' : '#FFFFFF', borderColor: isDark ? theme.line : '#DBEAFE' }]}>
        <Text style={[styles.title, { color: theme.text }]}>{batch.course_id?.title || 'Course'}</Text>
        <Text style={[styles.batch, { color: theme.muted }]}>Batch: {batch.batch_code || batch.code || batch.name || 'Batch'}</Text>
        <View style={styles.row}>
          <Icon name="calendar-outline" size={15} color="#3B82F6" />
          <Text style={[styles.days, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>{Array.isArray(batch.schedule_json?.days) ? batch.schedule_json.days.join(', ') : batch.schedule_json?.days || 'Days TBD'}</Text>
          <Icon name="time-outline" size={15} color="#3B82F6" />
          <Text style={[styles.info, { color: theme.muted }]}>{batch.schedule_json?.time || 'Time TBD'}</Text>
        </View>
        <View style={styles.row}>
          <Icon name="location-outline" size={15} color={theme.muted} />
          <Text style={[styles.info, { color: theme.muted }]}>{batch.room || 'Room TBD'}</Text>
          <Icon name="person-outline" size={15} color={theme.muted} />
          <Text style={[styles.info, { color: theme.muted }]}>{batch.instructor_ids?.map((instructor: any) => instructor.name).filter(Boolean).join(', ') || 'Instructor TBD'}</Text>
        </View>
      </View>)}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 10 }, heading: { ...FONTS.bold, fontSize: 18 },
  card: { padding: 16, borderWidth: 1.5, borderRadius: 16, ...SHADOW.sm },
  title: { ...FONTS.bold, fontSize: 16.5, lineHeight: 23 },
  batch: { ...FONTS.medium, fontSize: 12, lineHeight: 18, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 6, rowGap: 4, marginTop: 6 },
  days: { ...FONTS.bold, fontSize: 13.5 }, info: { ...FONTS.regular, fontSize: 13.5, flexShrink: 1 },
  help: { ...FONTS.regular, fontSize: 14, lineHeight: 21 },
});
