import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { AssignedCourseBatch, getEnrolledCourses } from '../../utils/enrolledCourses';

type Props = {
  batches: AssignedCourseBatch[];
  hasAssignedBatch: boolean;
};

export default function EnrolledCoursesCard({ batches, hasAssignedBatch }: Props) {
  const { isDark } = useTheme();
  const courses = getEnrolledCourses(batches);
  const textColor = isDark ? '#FFFFFF' : COLORS.primary;
  const mutedColor = isDark ? '#A8ADB7' : '#64748B';

  return (
    <View style={[styles.card, isDark && styles.cardDark]} testID="enrolled-courses">
      <Text accessibilityRole="header" style={[styles.heading, { color: textColor }]}>Enrolled Courses</Text>
      {courses.length > 0 ? courses.map((course, index) => (
        <View key={course.id} style={[styles.courseRow, index > 0 && styles.rowDivider, isDark && styles.rowDividerDark]}>
          <Text style={[styles.courseTitle, { color: textColor }]}>{course.title}</Text>
          {course.batchNames.length > 0 && (
            <Text style={[styles.batchText, { color: mutedColor }]}>
              {course.batchNames.length === 1 ? 'Batch' : 'Batches'}: {course.batchNames.join(', ')}
            </Text>
          )}
        </View>
      )) : (
        <Text style={[styles.emptyText, { color: mutedColor }]}>
          {hasAssignedBatch ? 'Course details not available yet.' : 'No enrolled courses yet.'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.80)',
    paddingHorizontal: 18,
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 6px 24px -8px rgba(26, 26, 26, 0.10)' },
      default: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    }),
  },
  cardDark: { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.09)' },
  heading: { ...FONTS.bold, fontSize: 18, letterSpacing: -0.3, paddingTop: 20, paddingBottom: 8 },
  courseRow: { paddingVertical: 16 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  rowDividerDark: { borderTopColor: 'rgba(255, 255, 255, 0.10)' },
  courseTitle: { ...FONTS.semiBold, fontSize: 15, lineHeight: 22 },
  batchText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  emptyText: { fontSize: 13, lineHeight: 19, paddingVertical: 16 },
});
