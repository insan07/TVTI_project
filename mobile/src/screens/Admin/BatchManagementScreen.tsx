import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import api from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BatchManagementScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const filterCourseId = route.params?.courseId;

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    course_id: '', start_date: new Date(), end_date: new Date(), capacity: '30', instructor_ids: [],
    schedule_json: { days: [] }
  });
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, cRes, iRes] = await Promise.all([
        api.get('/admin/batches'),
        api.get('/courses/active'),
        api.get('/admin/users?role=instructor')
      ]);
      setBatches(bRes.data);
      setCourses(cRes.data);
      setInstructors(iRes.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ course_id: courses[0]?._id || '', start_date: new Date(), end_date: new Date(), capacity: '30', instructor_ids: [], schedule_json: { days: [] } });
    setModalVisible(true);
  };

  const openEditModal = (b: any) => {
    setEditingId(b._id);
    setFormData({
      course_id: b.course_id?._id || '',
      start_date: new Date(b.start_date),
      end_date: new Date(b.end_date),
      capacity: b.capacity.toString(),
      instructor_ids: b.instructor_ids.map((i:any)=>i._id),
      schedule_json: b.schedule_json || { days: [] }
    });
    setModalVisible(true);
  };

  const toggleDay = (day: string) => {
    const days = formData.schedule_json.days || [];
    if (days.includes(day)) {
      setFormData({...formData, schedule_json: { ...formData.schedule_json, days: days.filter((d:string) => d !== day) }});
    } else {
      setFormData({...formData, schedule_json: { ...formData.schedule_json, days: [...days, day] }});
    }
  };

  const saveBatch = async () => {
    setSaving(true);
    try {
      const payload = { ...formData, capacity: Number(formData.capacity) };
      if (editingId) {
        await api.put(`/admin/batches/${editingId}`, payload);
      } else {
        await api.post('/admin/batches', payload);
      }
      setModalVisible(false);
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Failed to save batch');
    } finally {
      setSaving(false);
    }
  };

  const renderBatch = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('EnrollStudent', { batchId: item._id, capacity: item.capacity, enrolled: item.enrolled_count })}>
      <Text style={styles.title}>{item.course_id?.title || 'Unknown Course'}</Text>
      <Text style={styles.text}>Starts: {new Date(item.start_date).toLocaleDateString()} | Ends: {new Date(item.end_date).toLocaleDateString()}</Text>
      <Text style={styles.text}>Instructor: {item.instructor_ids?.map((i:any)=>i.name).join(', ') || 'Unassigned'}</Text>
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>Enrolled: {item.enrolled_count} / {item.capacity}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
          <Text style={{color: '#2563EB', fontWeight: 'bold'}}>Edit</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const filteredBatches = filterCourseId 
    ? batches.filter(b => b.course_id?._id === filterCourseId)
    : batches;

  const courseName = filterCourseId ? courses.find(c => c._id === filterCourseId)?.title : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {filterCourseId && (
        <View style={styles.filterBanner}>
          <Text style={styles.filterText}>Showing batches for: {courseName || 'Selected Course'}</Text>
          <TouchableOpacity onPress={() => navigation.setParams({ courseId: null })}>
            <Text style={styles.clearFilterText}>Clear Filter</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading ? <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 50}} /> : (
        <FlatList data={filteredBatches} renderItem={renderBatch} keyExtractor={i => i._id} contentContainerStyle={{paddingBottom: 100}} ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>No batches found.</Text>} />
      )}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}><Text style={styles.fabText}>+</Text></TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Batch' : 'Create Batch'}</Text>
              
              <Text style={styles.label}>Course</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={formData.course_id} onValueChange={v => setFormData({...formData, course_id: v})}>
                  {courses.map(c => <Picker.Item key={c._id} label={c.title} value={c._id} />)}
                </Picker>
              </View>

              <Text style={styles.label}>Dates</Text>
              <View style={styles.row}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker('start')}>
                  <Text>Start: {formData.start_date.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker('end')}>
                  <Text>End: {formData.end_date.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
              {showPicker && (
                <DateTimePicker 
                  value={showPicker === 'start' ? formData.start_date : formData.end_date} 
                  mode="date" 
                  onChange={(e, d) => { setShowPicker(null); if (d) setFormData({...formData, [showPicker === 'start' ? 'start_date' : 'end_date']: d}); }} 
                />
              )}

              <Text style={styles.label}>Capacity</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={formData.capacity} onChangeText={t => setFormData({...formData, capacity: t})} />

              <Text style={styles.label}>Instructor</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={formData.instructor_ids[0]} onValueChange={v => setFormData({...formData, instructor_ids: [v]})}>
                  <Picker.Item label="Unassigned" value="" />
                  {instructors.map(i => <Picker.Item key={i._id} label={i.name} value={i._id} />)}
                </Picker>
              </View>

              <Text style={styles.label}>Schedule Days</Text>
              <View style={styles.daysRow}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                  <TouchableOpacity key={day} style={[styles.dayBadge, formData.schedule_json.days?.includes(day) && styles.dayBadgeActive]} onPress={() => toggleDay(day)}>
                    <Text style={{color: formData.schedule_json.days?.includes(day) ? '#fff' : '#000', fontSize: 12}}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.btn, {backgroundColor: '#6B7280'}]} onPress={() => setModalVisible(false)}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, {backgroundColor: '#10B981'}]} onPress={saveBatch} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  filterBanner: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#DBEAFE', padding: 12, borderBottomWidth: 1, borderColor: '#BFDBFE' },
  filterText: { color: '#1E40AF', fontWeight: 'bold' },
  clearFilterText: { color: '#DC2626', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 16, margin: 10, borderRadius: 8, elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  text: { color: '#4B5563', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' },
  statsText: { fontWeight: '600', color: '#10B981' },
  editBtn: { padding: 5 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2563EB', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  fabText: { fontSize: 30, color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  dateBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginHorizontal: 4, alignItems: 'center' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap' },
  dayBadge: { padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, margin: 4 },
  dayBadgeActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingBottom: 20 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
