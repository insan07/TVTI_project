import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import api from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'pending' | 'students' | 'instructors';

export default function UserManagementScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Instructor Form
  const [instructorForm, setInstructorForm] = useState({ name: '', email: '', phone: '', password: '' });

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState<string | null>(null);
  const [assignBatchId, setAssignBatchId] = useState<string>('');
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchBatches();
  }, [activeTab]);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/admin/batches');
      setBatches(res.data);
      if(res.data.length > 0) setAssignBatchId(res.data[0]._id);
    } catch (e) {
      console.warn('Failed to fetch batches');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = '/admin/users';
      if (activeTab === 'pending') {
        url += '?role=student&status=pending';
      } else if (activeTab === 'students') {
        url += '?role=student&status=active';
      } else if (activeTab === 'instructors') {
        url += '?role=instructor';
      }
      const res = await api.get(url);
      setUsers(res.data);
    } catch (e: any) {
      console.warn('Failed to fetch users', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/admin/users/${id}/approve`);
      fetchUsers();
    } catch (e) {
      Alert.alert('Error', 'Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    Alert.alert('Reject', 'Are you sure you want to reject this registration?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          await api.put(`/admin/users/${id}/reject`, { reason: 'Rejected by admin' });
          fetchUsers();
        } catch (e) {
          Alert.alert('Error', 'Rejection failed');
        }
      }}
    ]);
  };

  const handleAssignBatch = async () => {
    if (!assignStudentId || !assignBatchId) return;
    try {
      await api.post(`/admin/batches/${assignBatchId}/enroll`, { studentIds: [assignStudentId] });
      Alert.alert('Success', 'Student assigned to batch successfully');
      setAssignModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Assignment failed');
    }
  };

  const handleDeactivate = async (id: string) => {
    Alert.alert('Deactivate', 'Are you sure you want to deactivate this user?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => {
        try {
          await api.put(`/admin/users/${id}/deactivate`);
          fetchUsers();
        } catch (e) {
          Alert.alert('Error', 'Deactivation failed');
        }
      }}
    ]);
  };

  const handleCreateInstructor = async () => {
    const { name, email, phone, password } = instructorForm;
    if (!name || !email || !password) {
      Alert.alert('Error', 'Name, email, and password are required');
      return;
    }

    try {
      await api.post('/admin/users/instructor', instructorForm);
      Alert.alert('Success', 'Instructor created successfully');
      setInstructorForm({ name: '', email: '', phone: '', password: '' });
      fetchUsers();
    } catch (e) {
      Alert.alert('Error', 'Failed to create instructor');
    }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const renderPendingRow = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.text}>{item.email}</Text>
      {item.nic ? <Text style={styles.text}>NIC: {item.nic}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleApprove(item._id)}>
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleReject(item._id)}>
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStudentRow = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.text}>{item.email}</Text>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <TouchableOpacity style={styles.deactivateBtnText} onPress={() => handleDeactivate(item._id)}>
          <Text style={{color: '#EF4444'}}>Deactivate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{marginTop: 10, padding: 4}} onPress={() => { setAssignStudentId(item._id); setAssignModalVisible(true); }}>
          <Text style={{color: '#10B981', fontWeight: 'bold'}}>Assign Batch</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInstructorRow = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name} {item.is_active ? '' : '(Inactive)'}</Text>
      <Text style={styles.text}>{item.email}</Text>
      {item.is_active && (
        <TouchableOpacity style={styles.deactivateBtnText} onPress={() => handleDeactivate(item._id)}>
          <Text style={{color: '#EF4444'}}>Deactivate</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.activeTab]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'students' && styles.activeTab]} onPress={() => setActiveTab('students')}>
          <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'instructors' && styles.activeTab]} onPress={() => setActiveTab('instructors')}>
          <Text style={[styles.tabText, activeTab === 'instructors' && styles.activeTabText]}>Instructors</Text>
        </TouchableOpacity>
      </View>

      {(activeTab === 'students' || activeTab === 'instructors') && (
        <TextInput 
          style={styles.search} 
          placeholder="Search by name or email..." 
          value={search} 
          onChangeText={setSearch} 
        />
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item._id}
          renderItem={activeTab === 'pending' ? renderPendingRow : activeTab === 'students' ? renderStudentRow : renderInstructorRow}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>No users found.</Text>}
        />
      )}

      {/* Instructor Creation Form (Bottom pinned) */}
      {activeTab === 'instructors' && (
        <View style={styles.instructorForm}>
          <Text style={styles.formTitle}>Add New Instructor</Text>
          <TextInput style={styles.input} placeholder="Name" value={instructorForm.name} onChangeText={v => setInstructorForm({...instructorForm, name: v})} />
          <TextInput style={styles.input} placeholder="Email" value={instructorForm.email} onChangeText={v => setInstructorForm({...instructorForm, email: v})} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Phone (Optional)" value={instructorForm.phone} onChangeText={v => setInstructorForm({...instructorForm, phone: v})} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={instructorForm.password} onChangeText={v => setInstructorForm({...instructorForm, password: v})} />
          <TouchableOpacity style={styles.addBtn} onPress={handleCreateInstructor}>
            <Text style={{color: '#fff', textAlign: 'center', fontWeight: 'bold'}}>Add Instructor</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Assign Batch Modal */}
      <Modal visible={assignModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign to Batch</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={assignBatchId} onValueChange={(v) => setAssignBatchId(v)}>
                {batches.map(b => (
                  <Picker.Item key={b._id} label={`${b.course_id?.title || 'Course'} (${b.name})`} value={b._id} />
                ))}
              </Picker>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)} style={styles.cancelBtn}>
                <Text style={{color: '#6B7280', fontWeight: 'bold'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAssignBatch} style={styles.confirmBtn}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  name: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  text: { color: '#6B7280', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12 },
  btn: { flex: 1, padding: 10, borderRadius: 6, alignItems: 'center', marginHorizontal: 4 },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#EF4444' },
  btnText: { color: '#fff', fontWeight: '600' },
  deactivateBtnText: { marginTop: 10, alignSelf: 'flex-start', padding: 4 },
  instructorForm: { backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderColor: '#E5E7EB' },
  formTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#1F2937' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 6, marginBottom: 10, backgroundColor: '#F9FAFB' },
  addBtn: { backgroundColor: '#2563EB', padding: 14, borderRadius: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1F2937' },
  pickerContainer: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { padding: 12, marginRight: 8 },
  confirmBtn: { backgroundColor: '#10B981', padding: 12, borderRadius: 6, paddingHorizontal: 20 }
});
