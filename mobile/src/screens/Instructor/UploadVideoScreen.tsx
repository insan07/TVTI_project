import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Switch, FlatList } from 'react-native';
import api from '../../services/api';
import { Ionicons as Icon } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../../context/AuthContext';

export default function UploadVideoScreen() {
  const { user } = useContext(AuthContext) as any;
  const [batches, setBatches] = useState<any[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'my_videos'>('upload');
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const [formData, setFormData] = useState({
    batch_id: '',
    topic: '',
    new_topic: '',
    title: '',
    youtube_url: '',
    order_index: '0'
  });
  const [isVideoLink, setIsVideoLink] = useState(false);
  const [videoFile, setVideoFile] = useState<any>(null);
  const [notesFile, setNotesFile] = useState<any>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (activeTab === 'my_videos') {
      fetchMyVideos();
    }
  }, [activeTab]);

  const fetchMyVideos = async () => {
    setLoadingVideos(true);
    try {
      const res = await api.get('/instructors/videos');
      setMyVideos(res.data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await api.get('/instructors/my-schedule');
      setBatches(res.data);
      if (res.data.length > 0) {
        setFormData(prev => ({ ...prev, batch_id: res.data[0]._id }));
        fetchTopics(res.data[0]._id);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchTopics = async (batchId: string) => {
    try {
      const res = await api.get(`/instructors/batches/${batchId}/topics`);
      setTopics(res.data);
      if (res.data.length > 0) setFormData(prev => ({ ...prev, topic: res.data[0] }));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleBatchChange = (val: string) => {
    setFormData(prev => ({ ...prev, batch_id: val, topic: '', new_topic: '' }));
    fetchTopics(val);
  };

  const pickVideo = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      setVideoFile(res.assets[0]);
    }
  };

  const pickNotes = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      setNotesFile(res.assets[0]);
    }
  };

  const submit = async () => {
    const finalTopic = formData.new_topic || formData.topic;
    if (!formData.batch_id || !finalTopic || !formData.title) {
      return Alert.alert('Error', 'Please fill all required fields');
    }
    if (isVideoLink && !formData.youtube_url) return Alert.alert('Error', 'Provide a YouTube URL');
    if (!isVideoLink && !videoFile) return Alert.alert('Error', 'Select a video file to upload');

    setUploading(true);
    try {
      const data = new FormData();
      data.append('batch_id', formData.batch_id);
      data.append('topic', finalTopic);
      data.append('title', formData.title);
      data.append('order_index', formData.order_index);
      
      if (isVideoLink) {
        data.append('youtube_url', formData.youtube_url);
      } else if (videoFile) {
        data.append('video', {
          uri: videoFile.uri,
          name: videoFile.name,
          type: videoFile.mimeType || 'video/mp4'
        } as any);
      }

      if (notesFile) {
        data.append('notes', {
          uri: notesFile.uri,
          name: notesFile.name,
          type: notesFile.mimeType || 'application/pdf'
        } as any);
      }

      await api.post('/instructors/videos', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      Alert.alert('Success', 'Video uploaded successfully');
      setFormData({...formData, title: '', youtube_url: '', new_topic: '', order_index: '0'});
      setVideoFile(null);
      setNotesFile(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity style={[styles.tab, activeTab === 'upload' && styles.activeTab]} onPress={() => setActiveTab('upload')}>
          <Text style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>Upload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'my_videos' && styles.activeTab]} onPress={() => setActiveTab('my_videos')}>
          <Text style={[styles.tabText, activeTab === 'my_videos' && styles.activeTabText]}>My Videos</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'upload' ? (
        <ScrollView style={{flex: 1}}>
          <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload Course Material</Text>

        <Text style={styles.label}>Select Batch *</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={formData.batch_id} onValueChange={handleBatchChange}>
            {batches.map(b => <Picker.Item key={b._id} label={b.course_id?.title} value={b._id} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Select Topic *</Text>
        {topics.length > 0 && (
          <View style={styles.pickerContainer}>
            <Picker selectedValue={formData.topic} onValueChange={v => setFormData({...formData, topic: v, new_topic: ''})}>
              <Picker.Item label="-- Select existing topic --" value="" />
              {topics.map(t => <Picker.Item key={t} label={t} value={t} />)}
            </Picker>
          </View>
        )}
        <TextInput 
          style={styles.input} 
          placeholder="Or enter a new topic name" 
          value={formData.new_topic} 
          onChangeText={t => setFormData({...formData, new_topic: t, topic: ''})} 
        />

        <Text style={styles.label}>Video Title *</Text>
        <TextInput style={styles.input} placeholder="e.g. Introduction to Variables" value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Provide YouTube Link instead of File</Text>
          <Switch value={isVideoLink} onValueChange={setIsVideoLink} />
        </View>

        {isVideoLink ? (
          <TextInput style={styles.input} placeholder="https://youtube.com/watch?v=..." value={formData.youtube_url} onChangeText={t => setFormData({...formData, youtube_url: t})} />
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={pickVideo}>
            <Text style={{color: '#2563EB', fontWeight: 'bold'}}>{videoFile ? videoFile.name : '+ Select Video File'}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Order Index (Sort Order)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={formData.order_index} onChangeText={t => setFormData({...formData, order_index: t})} />

        <Text style={styles.label}>Attach Notes (PDF - Optional)</Text>
        <TouchableOpacity style={[styles.uploadBox, {borderColor: '#10B981', backgroundColor: '#ECFDF5'}]} onPress={pickNotes}>
          <Text style={{color: '#10B981', fontWeight: 'bold'}}>{notesFile ? notesFile.name : '+ Select PDF File'}</Text>
        </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={submit} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Material</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={{flex: 1, padding: 15}}>
          {loadingVideos ? <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 50}} /> : (
            <FlatList
              data={myVideos}
              keyExtractor={item => item._id}
              ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>You have not uploaded any videos yet.</Text>}
              renderItem={({item}) => (
                <View style={styles.videoCard}>
                  <Text style={styles.videoTitle}>{item.title}</Text>
                  <Text style={styles.videoTopic}>Topic: {item.topic}</Text>
                  <Text style={styles.videoBatch}>Batch: {item.batch_id?.name || 'Unknown Batch'}</Text>
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  card: { backgroundColor: '#fff', padding: 20, margin: 16, borderRadius: 12, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8 },
  pickerContainer: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 8, backgroundColor: '#F9FAFB' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  uploadBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#2563EB', backgroundColor: '#EFF6FF', padding: 20, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  btn: { backgroundColor: '#2563EB', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tabHeader: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2 },
  tab: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#2563EB' },
  tabText: { fontWeight: 'bold', color: '#666' },
  activeTabText: { color: '#2563EB' },
  videoCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1 },
  videoTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  videoTopic: { color: '#4B5563', marginTop: 4 },
  videoBatch: { color: '#6B7280', marginTop: 4, fontSize: 12 }
});
