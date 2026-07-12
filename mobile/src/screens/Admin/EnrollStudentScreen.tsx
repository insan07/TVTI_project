import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../../services/api';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EnrollStudentScreen() {
  const route = useRoute<any>();
  const { batchId, capacity, enrolled } = route.params;

  const [activeStudents, setActiveStudents] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      setEnrolledStudents(eRes.data.map((e:any) => e.student_id));
      setActiveStudents(sRes.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch data');
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
    if (selectedIds.length === 0) return Alert.alert('Error', 'Select at least one student');
    if (enrolled + selectedIds.length > capacity) {
      return Alert.alert('Error', 'Capacity exceeded');
    }

    setSaving(true);
    try {
      await api.post(`/admin/batches/${batchId}/enroll`, { studentIds: selectedIds });
      Alert.alert('Success', 'Students enrolled successfully');
      setSelectedIds([]);
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to enroll');
    } finally {
      setSaving(false);
    }
  };

  const enrolledIds = enrolledStudents.map(s => s._id);
  const availableStudents = activeStudents.filter(s => !enrolledIds.includes(s._id) && (s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())));

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F3F4F6'}} edges={['top']}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enroll Students</Text>
        <Text style={styles.stats}>Capacity: {enrolledStudents.length} / {capacity}</Text>
      </View>

      <TextInput style={styles.search} placeholder="Search available students..." value={search} onChangeText={setSearch} />

      {loading ? <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 50}} /> : (
        <FlatList
          data={availableStudents}
          keyExtractor={i => i._id}
          getItemLayout={(data, index) => ({ length: 80, offset: 80 * index, index })}
          contentContainerStyle={{paddingBottom: 20}}
          renderItem={({item}) => (
            <TouchableOpacity style={styles.row} onPress={() => toggleSelect(item._id)}>
              <View style={[styles.checkbox, selectedIds.includes(item._id) && styles.checkboxActive]} />
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>No available students found.</Text>}
        />
      )}

      {selectedIds.length > 0 && (
        <View style={styles.footer}>
          <Text style={{fontWeight: 'bold'}}>{selectedIds.length} Selected</Text>
          <TouchableOpacity style={styles.btn} onPress={handleEnroll} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enroll Now</Text>}
          </TouchableOpacity>
        </View>
      )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  stats: { color: '#10B981', fontWeight: 'bold' },
  search: { backgroundColor: '#fff', padding: 12, margin: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, marginHorizontal: 10, marginBottom: 8, borderRadius: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#ccc', marginRight: 12 },
  checkboxActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  name: { fontWeight: 'bold', fontSize: 16 },
  email: { color: '#6B7280' },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
