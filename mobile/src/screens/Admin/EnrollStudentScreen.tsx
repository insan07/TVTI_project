import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../../services/api';
import { FONTS } from '../../config/theme';
import ManagementDialog from '../../components/shared/ManagementDialog';
import { usersSectionTheme } from '../../components/shared/usersSectionTheme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { useTheme } from '../../context/ThemeContext';

import { Ionicons as Icon } from '@expo/vector-icons';

export default function EnrollStudentScreen() {
  const { isDark } = useTheme();
  const design = usersSectionTheme(isDark);
  const styles = useMemo(() => createStyles(usersSectionTheme(isDark)), [isDark]);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { batchId, capacity, enrolled } = route.params;

  const [activeStudents, setActiveStudents] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, title: '', message: '', type: 'info' });
  const showMessage = (title: string, message: string) => setFeedback({ visible: true, title, message, type: title === 'Success' ? 'success' : title === 'Error' ? 'error' : 'info' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eRes, sRes] = await Promise.all([
        api.get(`/admin/batches/${batchId}/students`),
        api.get('/admin/users?role=student&status=active')
      ]);
      setEnrolledStudents(eRes.data.filter((e:any) => e.status !== 'dropped').map((e:any) => e.student_id));
      setActiveStudents(sRes.data);
    } catch (e) {
      showMessage('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleEnroll = async () => {
    if (selectedIds.length === 0) return showMessage('Error', 'Select at least one student');
    if (enrolledStudents.length + selectedIds.length > capacity) {
      return showMessage('Error', 'Capacity exceeded');
    }

    setSaving(true);
    try {
      await api.post(`/admin/batches/${batchId}/enroll`, { studentIds: selectedIds });
      showMessage('Success', 'Students enrolled successfully');
      setSelectedIds([]);
      fetchData();
    } catch (e: any) {
      showMessage('Error', e.response?.data?.message || 'Failed to enroll');
    } finally {
      setSaving(false);
    }
  };

  const enrolledIds = enrolledStudents.map(s => s._id);
  const availableStudents = activeStudents.filter(s => !enrolledIds.includes(s._id) && (s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())));

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: isDark ? design.surface : design.field}} edges={['top', 'bottom']}>
      <ScreenBackground />
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, isDark && { backgroundColor: 'transparent' }]}>
          <ScreenHeader plainBack

            title="Enroll Students"
            subtitle={`Capacity: ${enrolledStudents.length} / ${capacity} Enrolled`}
            showBack={true}
          />

          <TextInput
            style={[styles.search, isDark && { backgroundColor: design.surface, borderColor: design.line, color: design.text }]}
            placeholder="Search available students..."
            placeholderTextColor={design.muted}
            value={search}
            onChangeText={setSearch}
          />

          {loading ? <ActivityIndicator size="large" color={design.accent} style={{marginTop: 50}} /> : (
            <FlatList
              data={availableStudents}
              keyExtractor={i => i._id}
              contentContainerStyle={{paddingBottom: 100}}
              renderItem={({item}) => (
                <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={`Select ${item.name}`} accessibilityState={{ checked: selectedIds.includes(item._id), disabled: saving }} disabled={saving} style={[styles.row, isDark && { backgroundColor: design.surface, borderColor: design.line, borderWidth: 1 }]}
                  onPress={() => toggleSelect(item._id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isDark && { borderColor: design.line }, selectedIds.includes(item._id) && [styles.checkboxActive, { backgroundColor: design.accent, borderColor: design.accent }]]} />
                  <View>
                    <Text style={[styles.name, isDark && { color: design.text }]}>{item.name}</Text>
                    <Text style={[styles.email, isDark && { color: design.muted }]}>{item.email}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[{textAlign: 'center', marginTop: 20, color: design.muted}, isDark && { color: design.muted }]}>No available students found.</Text>}
            />
          )}

          {selectedIds.length > 0 && (
            <View style={[styles.footer, isDark && { backgroundColor: design.surface, borderColor: design.line }]}>
              <Text style={[{fontWeight: 'bold', color: design.text}, isDark && { color: design.text }]}>{selectedIds.length} Selected</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Enroll selected students" style={[styles.btn, { backgroundColor: design.accent }]} onPress={handleEnroll} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="person-add-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnText}>Enroll Now</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      <ManagementDialog visible={feedback.visible} title={feedback.title} message={feedback.message} type={feedback.type} onConfirm={() => setFeedback(prev => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}

const createStyles = (design: ReturnType<typeof usersSectionTheme>) => StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center', backgroundColor: 'transparent' },
  header: { padding: 20, backgroundColor: design.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: FONTS.bold.fontFamily,  fontSize: 20, fontWeight: 'bold' },
  stats: { color: design.success, fontWeight: 'bold' },
  search: { backgroundColor: design.surface, padding: 12, marginHorizontal: 20, marginTop: 14, marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: design.line , minHeight: 44, },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: design.surface, padding: 16, marginHorizontal: 20, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: design.line },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: design.line, marginRight: 12 },
  checkboxActive: { backgroundColor: design.accent, borderColor: design.accent },
  name: { fontFamily: FONTS.bold.fontFamily,  fontWeight: 'bold', fontSize: 16 },
  email: { color: design.muted },
  footer: { padding: 20, backgroundColor: design.surface, borderTopWidth: 1, borderColor: design.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: {
    backgroundColor: design.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minHeight: 44,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0,
  },
  btnText: { fontFamily: FONTS.bold.fontFamily,  color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
