import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import api from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

export default function PostAnnouncementScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [formData, setFormData] = useState({ batch_id: '', title: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'post' | 'history'>('post');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      // For instructors we use my-schedule, for admins we can use admin/batches
      // Assuming instructors mostly post announcements to their own batches
      const res = await api.get('/instructors/my-schedule');
      setBatches(res.data);
      if (res.data.length > 0) {
        setFormData(prev => ({ ...prev, batch_id: res.data[0]._id }));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/announcements/my');
      setAnnouncements(res.data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePost = async () => {
    if (!formData.batch_id || !formData.title || !formData.message) {
      return Alert.alert('Error', 'Please fill all fields');
    }
    setLoading(true);
    try {
      await api.post('/announcements', formData);
      Alert.alert('Success', 'Announcement posted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity style={[styles.tab, activeTab === 'post' && styles.activeTab]} onPress={() => setActiveTab('post')}>
          <Text style={[styles.tabText, activeTab === 'post' && styles.activeTabText]}>Post New</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'post' ? (
        <View style={styles.formContainer}>
          <Text style={styles.label}>Select Batch</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.batch_id}
          onValueChange={(val) => setFormData({...formData, batch_id: val})}
        >
          {batches.map(b => <Picker.Item key={b._id} label={b.course_id?.title || `Batch ${b._id.toString().slice(-4)}`} value={b._id} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Announcement Title</Text>
      <TextInput 
        style={styles.input} 
        placeholder="e.g. Class Rescheduled"
        value={formData.title}
        onChangeText={t => setFormData({...formData, title: t})}
      />

      <Text style={styles.label}>Message</Text>
      <TextInput 
        style={[styles.input, {height: 150, textAlignVertical: 'top'}]} 
        placeholder="Type your message here..."
        multiline
        value={formData.message}
        onChangeText={t => setFormData({...formData, message: t})}
      />

        <TouchableOpacity style={styles.btn} onPress={handlePost} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Post Announcement</Text>}
        </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.historyContainer}>
          {loadingHistory ? <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 50}} /> : (
            <FlatList
              data={announcements}
              keyExtractor={item => item._id}
              ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>You have not posted any announcements.</Text>}
              renderItem={({item}) => (
                <View style={styles.historyCard}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historyMessage}>{item.message}</Text>
                  <View style={styles.historyFooter}>
                    <Text style={styles.historyBatch}>Batch: {item.batch_id?.name || 'Unknown Batch'}</Text>
                    <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginTop: 12 },
  pickerContainer: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16 },
  btn: { backgroundColor: '#2563EB', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tabHeader: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2, marginHorizontal: -20, marginTop: -20, marginBottom: 15 },
  tab: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#2563EB' },
  tabText: { fontWeight: 'bold', color: '#666' },
  activeTabText: { color: '#2563EB' },
  formContainer: { flex: 1 },
  historyContainer: { flex: 1 },
  historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1, borderWidth: 1, borderColor: '#F3F4F6' },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  historyMessage: { color: '#4B5563', marginBottom: 12 },
  historyFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 },
  historyBatch: { color: '#6B7280', fontSize: 12 },
  historyDate: { color: '#6B7280', fontSize: 12 }
});
