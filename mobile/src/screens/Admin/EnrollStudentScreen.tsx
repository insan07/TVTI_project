import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../../services/api';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons as Icon } from '@expo/vector-icons';

export default function EnrollStudentScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={[styles.title, { flex: 1 }]}>Enroll Students</Text>
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                marginLeft: 8
              }}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Batches');
                }
              }}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back-outline" size={16} color="#1F2937" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1F2937' }}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  stats: { color: '#059669', fontWeight: 'bold' },
  search: { backgroundColor: '#fff', padding: 12, margin: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, marginHorizontal: 10, marginBottom: 8, borderRadius: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 12 },
  checkboxActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  name: { fontWeight: 'bold', fontSize: 16 },
  email: { color: '#6B7280' },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
