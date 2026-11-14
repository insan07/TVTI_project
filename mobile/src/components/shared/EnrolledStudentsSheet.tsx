import UserAvatar from './UserAvatar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { FONTS } from '../../config/theme';
import { usersSectionTheme } from './usersSectionTheme';
import { ManagementEmpty, ManagementSheet, managementStyles } from './CourseBatchUI';

type Student = { _id: string; name: string; registration_number?: string; profile_photo?: string };
type Props = { scope: 'course' | 'batch'; id: string; name: string; onClose: () => void };

export default function EnrolledStudentsSheet({ scope, id, name, onClose }: Props) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  const [students, setStudents] = useState<Student[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current; setLoading(true); setError(''); setStudents([]);
    try {
      const res = await api.get(`/admin/${scope === 'course' ? 'courses' : 'batches'}/${id}/enrolled-students`);
      if (current === request.current) setStudents(res.data);
    } catch (failure: any) {
      if (current === request.current) setError(failure.response?.data?.message || 'Enrolled students could not be loaded.');
    } finally { if (current === request.current) setLoading(false); }
  }, [scope, id]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);

  return <ManagementSheet visible title="Enrolled students" onClose={onClose}>
    <Text style={[managementStyles.title, { color: theme.text, marginBottom: 16 }]}>{name}</Text>
    {loading ? <ActivityIndicator color={theme.accent} style={{ marginVertical: 24 }} />
      : error ? <ManagementEmpty title="Unable to load students" message={error} retry={() => void load()} />
      : students.length === 0 ? <ManagementEmpty title="No enrolled students" message={`No students are enrolled in this ${scope} yet.`} />
      : <View>
        <View style={[styles.row, styles.tableHeader, { backgroundColor: theme.field }]}>
          <Text style={[styles.name, styles.heading, { color: theme.muted }]}>Name</Text>
          <Text style={[styles.registration, styles.heading, { color: theme.muted }]}>Registration no.</Text>
        </View>
        {students.map(student => <View key={student._id} style={[styles.row, { borderBottomColor: theme.line, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <View style={[styles.name, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}><UserAvatar user={student} size={32} /><Text selectable style={[styles.value, { color: theme.text, flex: 1 }]}>{student.name}</Text></View>
          <Text selectable style={[styles.registration, styles.value, { color: theme.text }]}>{student.registration_number || 'Not assigned'}</Text>
        </View>)}
      </View>}
  </ManagementSheet>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  tableHeader: { borderRadius: 10 }, name: { flex: 1.1, minWidth: 0 }, registration: { flex: 1, minWidth: 0 },
  heading: { ...FONTS.semiBold, fontSize: 12, lineHeight: 18 }, value: { ...FONTS.regular, fontSize: 13, lineHeight: 20 },
});
