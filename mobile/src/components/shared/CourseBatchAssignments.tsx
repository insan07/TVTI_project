import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import api from '../../services/api';
import { FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';
import CustomDropdown from './CustomDropdown';

type Props = { courseIds: string[]; batchIds: string[]; onCoursesChange: (ids: string[]) => void; onBatchesChange: (ids: string[]) => void; readOnly?: boolean };
export default function CourseBatchAssignments({ courseIds, batchIds, onCoursesChange, onBatchesChange, readOnly = false }: Props) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  const [courses, setCourses] = useState<any[]>([]), [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [coursesRes, batchesRes] = await Promise.all([api.get('/courses/active'), api.get('/admin/batches')]); setCourses(coursesRes.data || []); setBatches(batchesRes.data || []); }
    catch { setError('Courses and batches could not be loaded. Please try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const batchCourse = (batch: any) => String(batch.course_id?._id || batch.course_id);
  const availableCourses = readOnly ? courseIds.map(id => courses.find(course => course._id === id) || { _id: id, title: batches.find(batch => batchCourse(batch) === id)?.course_id?.title || 'Assigned course' }) : courses;
  if (loading) return <ActivityIndicator color={theme.accent} style={{ marginVertical: 18 }} />;
  if (error) return <View style={styles.section}><Text accessibilityRole="alert" style={[styles.help, { color: theme.text }]}>{error}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Reload courses and batches" onPress={() => { void load(); }} style={styles.retry}><Text style={{ color: theme.accent }}>Try again</Text></TouchableOpacity></View>;
  return <View style={styles.section}>
    {!readOnly && <Text style={[styles.help, { color: theme.muted }]}>Choose each course and one active batch for it.</Text>}
    {availableCourses.length === 0 && <Text style={[styles.help, { color: theme.muted }]}>No active courses available.</Text>}
    {availableCourses.map(course => {
      const selected = courseIds.includes(course._id);
      const assigned = batches.find(batch => batchCourse(batch) === course._id && batchIds.includes(batch._id));
      const options = batches.filter(batch => batchCourse(batch) === course._id && batch.status === 'active' && (batch.enrolled_count < batch.capacity || batchIds.includes(batch._id)));
      return <View key={course._id} style={[styles.course, { borderColor: selected ? theme.accent : theme.line, backgroundColor: theme.surface }]}>
        <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={`Course ${course.title}`} accessibilityState={{ checked: selected, disabled: readOnly }} disabled={readOnly}
          style={styles.courseHeader} onPress={() => {
            onCoursesChange(selected ? courseIds.filter(id => id !== course._id) : [...courseIds, course._id]);
            if (selected) onBatchesChange(batchIds.filter(id => !batches.some(batch => batch._id === id && batchCourse(batch) === course._id)));
          }}>
          <View style={[styles.checkbox, { borderColor: selected ? theme.accent : theme.muted, backgroundColor: selected ? theme.accent : 'transparent' }]}>{selected && <Icon name="checkmark" size={14} color="#FFFFFF" />}</View>
          <Text style={[styles.title, { color: theme.text }]}>{course.title}</Text>
        </TouchableOpacity>
        {selected && (readOnly ? <Text style={[styles.help, { color: theme.muted }]}>Batch: {assigned?.name || 'No recorded batch assignment'}</Text> : <>
          <CustomDropdown appearance="management" label={`Batch for ${course.title}`} placeholder="Select a batch" selectedValue={assigned?._id || ''}
            items={options.map(batch => ({ value: batch._id, label: batch.name, subtext: `${batch.enrolled_count ?? 0} / ${batch.capacity} enrolled${batch.room ? ` · ${batch.room}` : ''}` }))}
            onValueChange={value => onBatchesChange([...batchIds.filter(id => !batches.some(batch => batch._id === id && batchCourse(batch) === course._id)), value])} />
          {options.length === 0 && <Text style={[styles.help, { color: theme.muted }]}>No active batch with available seats. Create a batch or increase its capacity before approval.</Text>}
        </>)}
      </View>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 10 }, help: { ...FONTS.regular, fontSize: 12, lineHeight: 19 }, course: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  courseHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 32 }, title: { ...FONTS.semiBold, fontSize: 14, lineHeight: 21, flex: 1 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, retry: { minHeight: 44, justifyContent: 'center' },
});
