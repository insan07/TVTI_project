import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Switch, ScrollView } from 'react-native';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'all' | 'active' | 'archived';

export default function CourseManagementScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '', description: '', fee: '', duration_weeks: '', prerequisites: '', is_active: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/courses');
      setCourses(res.data);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCourseId(null);
    setFormData({ title: '', description: '', fee: '', duration_weeks: '', prerequisites: '', is_active: true });
    setModalVisible(true);
  };

  const openEditModal = (course: any) => {
    setEditingCourseId(course._id);
    setFormData({
      title: course.title,
      description: course.description,
      fee: course.fee.toString(),
      duration_weeks: course.duration_weeks.toString(),
      prerequisites: course.prerequisites || '',
      is_active: course.is_active
    });
    setModalVisible(true);
  };

  const saveCourse = async () => {
    if (!formData.title || !formData.fee || !formData.duration_weeks) {
      Alert.alert('Error', 'Title, Fee, and Duration are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        fee: Number(formData.fee),
        duration_weeks: Number(formData.duration_weeks)
      };

      if (editingCourseId) {
        await api.put(`/admin/courses/${editingCourseId}`, payload);
        Alert.alert('Success', 'Course updated');
      } else {
        await api.post('/admin/courses', payload);
        Alert.alert('Success', 'Course created');
      }
      setModalVisible(false);
      fetchCourses();
    } catch (e) {
      Alert.alert('Error', 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const archiveCourse = (id: string) => {
    Alert.alert('Archive Course', 'Are you sure you want to archive this course? It will no longer be enrollable.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: async () => {
        try {
          await api.put(`/admin/courses/${id}/archive`);
          fetchCourses();
        } catch (e) {
          Alert.alert('Error', 'Failed to archive course');
        }
      }}
    ]);
  };

  const filteredCourses = courses.filter(c => {
    const matchesTab = activeTab === 'all' || (activeTab === 'active' && c.is_active) || (activeTab === 'archived' && !c.is_active);
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const renderCourseItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={[styles.badge, item.is_active ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={styles.badgeText}>{item.is_active ? 'Active' : 'Archived'}</Text>
        </View>
      </View>
      <Text style={styles.text}>Fee: {item.fee} LKR | Duration: {item.duration_weeks} Weeks</Text>
      <Text style={styles.text}>Enrollments: {item.enrollment_count || 0}</Text>
      
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#8B5CF6' }]} onPress={() => navigation.navigate('Batches', { courseId: item._id })}>
          <Text style={styles.btnText}>Batches</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#2563EB' }]} onPress={() => openEditModal(item)}>
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>
        {item.is_active && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#F59E0B' }]} onPress={() => archiveCourse(item._id)}>
            <Text style={styles.btnText}>Archive</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.activeTab]} onPress={() => setActiveTab('all')}>
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'active' && styles.activeTab]} onPress={() => setActiveTab('active')}>
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'archived' && styles.activeTab]} onPress={() => setActiveTab('archived')}>
          <Text style={[styles.tabText, activeTab === 'archived' && styles.activeTabText]}>Archived</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.search} placeholder="Search courses..." value={search} onChangeText={setSearch} />

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={item => item._id}
          renderItem={renderCourseItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>No courses found.</Text>}
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Course Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editingCourseId ? 'Edit Course' : 'Add New Course'}</Text>
              
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />
              
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, {height: 80}]} multiline value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />
              
              <Text style={styles.label}>Fee (LKR)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={formData.fee} onChangeText={t => setFormData({...formData, fee: t})} />
              
              <Text style={styles.label}>Duration (Weeks)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={formData.duration_weeks} onChangeText={t => setFormData({...formData, duration_weeks: t})} />
              
              <Text style={styles.label}>Prerequisites</Text>
              <TextInput style={styles.input} value={formData.prerequisites} onChangeText={t => setFormData({...formData, prerequisites: t})} />
              
              <View style={styles.switchRow}>
                <Text style={styles.label}>Active Status</Text>
                <Switch value={formData.is_active} onValueChange={v => setFormData({...formData, is_active: v})} />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#6B7280', flex: 1, marginRight: 5 }]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981', flex: 1, marginLeft: 5 }]} onPress={saveCourse} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, borderBottomWidth: 1, borderColor: '#ddd' },
  tab: { flex: 1, padding: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: '#2563EB' },
  tabText: { color: '#6B7280', fontWeight: '600' },
  activeTabText: { color: '#2563EB' },
  search: { backgroundColor: '#fff', padding: 12, margin: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  card: { backgroundColor: '#fff', padding: 16, marginHorizontal: 10, marginBottom: 10, borderRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#D1FAE5' },
  badgeInactive: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  text: { color: '#4B5563', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12 },
  btn: { padding: 10, borderRadius: 6, alignItems: 'center', flex: 1, marginHorizontal: 4 },
  btnText: { color: '#fff', fontWeight: '600' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2563EB', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 } },
  fabText: { fontSize: 30, color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', marginTop: 20, paddingBottom: 20 }
});
