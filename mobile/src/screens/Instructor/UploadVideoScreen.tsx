import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, FlatList, RefreshControl
} from 'react-native';
import api from '../../services/api';
import { Ionicons as Icon } from '@expo/vector-icons';
import CustomDropdown from '../../components/shared/CustomDropdown';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../../context/AuthContext';
import { useRoute } from '@react-navigation/native';
import { COLORS } from '../../config/theme';

export default function UploadVideoScreen() {
  const route = useRoute<any>();
  const { user } = useContext(AuthContext) as any;

  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [topics, setTopics] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'my_videos'>('upload');
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    if (route.params?.tab) setActiveTab(route.params.tab);
  }, [route.params]);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (activeTab === 'my_videos') fetchMyVideos();
  }, [activeTab]);

  const fetchMyVideos = async () => {
    setLoadingVideos(true);
    try {
      const res = await api.get('/instructors/videos');
      setMyVideos(res.data);
    } catch (e) {
      console.warn('Failed to load videos', e);
    } finally {
      setLoadingVideos(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyVideos();
  };

  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await api.get('/instructors/my-schedule');
      setBatches(res.data);
      if (res.data.length > 0) {
        setFormData(prev => ({ ...prev, batch_id: res.data[0]._id }));
        fetchTopics(res.data[0]._id);
      }
    } catch (e) {
      console.warn('Failed to load batches', e);
      Alert.alert('Error', 'Could not load your batches.');
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchTopics = async (batchId: string) => {
    try {
      const res = await api.get(`/instructors/batches/${batchId}/topics`);
      setTopics(res.data);
      if (res.data.length > 0) setFormData(prev => ({ ...prev, topic: res.data[0], new_topic: '' }));
      else setFormData(prev => ({ ...prev, topic: '', new_topic: '' }));
    } catch (e) {
      setTopics([]);
    }
  };

  const handleBatchChange = (val: string) => {
    setFormData(prev => ({ ...prev, batch_id: val, topic: '', new_topic: '' }));
    setTopics([]);
    fetchTopics(val);
  };

  const pickVideo = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
    if (!res.canceled && res.assets && res.assets.length > 0) setVideoFile(res.assets[0]);
  };

  const pickNotes = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!res.canceled && res.assets && res.assets.length > 0) setNotesFile(res.assets[0]);
  };

  const resetForm = () => {
    setFormData(prev => ({ ...prev, title: '', youtube_url: '', new_topic: '', topic: topics[0] || '', order_index: '0' }));
    setVideoFile(null);
    setNotesFile(null);
  };

  const submit = async () => {
    const finalTopic = formData.new_topic.trim() || formData.topic;
    if (!formData.batch_id) return Alert.alert('Error', 'Please select a batch');
    if (!finalTopic) return Alert.alert('Error', 'Please select or enter a topic');
    if (!formData.title.trim()) return Alert.alert('Error', 'Please enter a video title');
    if (isVideoLink && !formData.youtube_url.trim()) return Alert.alert('Error', 'Please provide a YouTube URL');
    if (!isVideoLink && !videoFile) return Alert.alert('Error', 'Please select a video file');

    setUploading(true);
    try {
      const data = new FormData();
      data.append('batch_id', formData.batch_id);
      data.append('topic', finalTopic);
      data.append('title', formData.title.trim());
      data.append('order_index', formData.order_index);

      if (isVideoLink) {
        data.append('youtube_url', formData.youtube_url.trim());
      } else if (videoFile) {
        data.append('video', { uri: videoFile.uri, name: videoFile.name, type: videoFile.mimeType || 'video/mp4' } as any);
      }

      if (notesFile) {
        data.append('notes', { uri: notesFile.uri, name: notesFile.name, type: notesFile.mimeType || 'application/pdf' } as any);
      }

      await api.post('/instructors/videos', data, { headers: { 'Content-Type': 'multipart/form-data' } });

      Alert.alert('Success', 'Video uploaded successfully!', [
        { text: 'View My Videos', onPress: () => { resetForm(); setActiveTab('my_videos'); } },
        { text: 'Upload Another', style: 'cancel', onPress: resetForm }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = (videoId: string, title: string) => {
    Alert.alert('Delete Video', `Delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/instructors/videos/${videoId}`);
            setMyVideos(prev => prev.filter(v => v._id !== videoId));
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete video');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabHeader}>
        <TouchableOpacity style={[styles.tab, activeTab === 'upload' && styles.activeTab]} onPress={() => setActiveTab('upload')}>
          <Icon name="cloud-upload-outline" size={16} color={activeTab === 'upload' ? COLORS.primary : '#6B7280'} style={{ marginRight: 5 }} />
          <Text style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>Upload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'my_videos' && styles.activeTab]} onPress={() => setActiveTab('my_videos')}>
          <Icon name="videocam-outline" size={16} color={activeTab === 'my_videos' ? COLORS.primary : '#6B7280'} style={{ marginRight: 5 }} />
          <Text style={[styles.tabText, activeTab === 'my_videos' && styles.activeTabText]}>My Videos</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'upload' ? (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Upload Course Material</Text>

            {/* Batch */}
            {batchesLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 10 }} />
            ) : batches.length === 0 ? (
              <View style={styles.noBatchBox}>
                <Icon name="warning-outline" size={20} color="#F59E0B" />
                <Text style={styles.noBatchText}>No batches assigned to you.</Text>
              </View>
            ) : (
              <CustomDropdown
                label="Select Batch *"
                placeholder="Select assigned batch..."
                iconName="layers-outline"
                items={batches.map(b => ({
                  label: b.name || b.course_id?.title || 'Batch',
                  value: b._id,
                  subtext: b.course_id?.title ? `Course: ${b.course_id.title}` : undefined
                }))}
                selectedValue={formData.batch_id}
                onValueChange={handleBatchChange}
              />
            )}

            {/* Topic */}
            {topics.length > 0 ? (
              <CustomDropdown
                label="Select Existing Topic"
                placeholder="Choose existing topic..."
                iconName="bookmarks-outline"
                items={[
                  { label: '-- Select existing topic --', value: '' },
                  ...topics.map(t => ({ label: t, value: t }))
                ]}
                selectedValue={formData.topic}
                onValueChange={v => setFormData({ ...formData, topic: v, new_topic: '' })}
              />
            ) : null}
            <TextInput
              style={styles.input}
              placeholder={topics.length > 0 ? 'Or enter a new topic name' : 'Enter topic name'}
              value={formData.new_topic}
              onChangeText={t => setFormData({ ...formData, new_topic: t, topic: '' })}
              placeholderTextColor="#9CA3AF"
            />

            {/* Title */}
            <Text style={styles.label}>Video Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Introduction to Engine Parts"
              value={formData.title}
              onChangeText={t => setFormData({ ...formData, title: t })}
              placeholderTextColor="#9CA3AF"
            />

            {/* YouTube or File toggle */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Use YouTube Link</Text>
                <Text style={styles.switchSubtext}>Toggle to provide a YouTube URL instead of uploading a file</Text>
              </View>
              <Switch value={isVideoLink} onValueChange={setIsVideoLink} trackColor={{ true: COLORS.primary }} />
            </View>

            {isVideoLink ? (
              <TextInput
                style={styles.input}
                placeholder="https://youtube.com/watch?v=..."
                value={formData.youtube_url}
                onChangeText={t => setFormData({ ...formData, youtube_url: t })}
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={pickVideo}>
                <Icon name={videoFile ? 'checkmark-circle' : 'cloud-upload-outline'} size={22} color={videoFile ? '#10B981' : COLORS.primary} />
                <Text style={[styles.uploadBoxText, { color: videoFile ? '#10B981' : COLORS.primary }]}>
                  {videoFile ? videoFile.name : '+ Select Video File'}
                </Text>
                {videoFile && (
                  <TouchableOpacity onPress={() => setVideoFile(null)} style={{ marginLeft: 8 }}>
                    <Icon name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}

            {/* Order Index */}
            <Text style={styles.label}>Sort Order (Order Index)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={formData.order_index}
              onChangeText={t => setFormData({ ...formData, order_index: t })}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />

            {/* PDF Notes */}
            <Text style={styles.label}>Attach Notes (PDF – Optional)</Text>
            <TouchableOpacity
              style={[styles.uploadBox, { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]}
              onPress={pickNotes}
            >
              <Icon name={notesFile ? 'document-text' : 'document-attach-outline'} size={22} color={notesFile ? '#10B981' : '#10B981'} />
              <Text style={[styles.uploadBoxText, { color: '#10B981' }]}>
                {notesFile ? notesFile.name : '+ Select PDF File'}
              </Text>
              {notesFile && (
                <TouchableOpacity onPress={() => setNotesFile(null)} style={{ marginLeft: 8 }}>
                  <Icon name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, (uploading || batches.length === 0) && styles.btnDisabled]}
              onPress={submit}
              disabled={uploading || batches.length === 0}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Submit Material</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {loadingVideos ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading videos...</Text>
            </View>
          ) : (
            <FlatList
              data={myVideos}
              keyExtractor={item => item._id}
              contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="videocam-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No videos uploaded yet</Text>
                  <Text style={styles.emptySubtitle}>Upload your first course video</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('upload')}>
                    <Text style={styles.emptyBtnText}>Upload Now</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.videoCard}>
                  <View style={styles.videoCardLeft}>
                    <View style={styles.videoIcon}>
                      <Icon name={item.youtube_url ? 'logo-youtube' : 'videocam'} size={22} color={item.youtube_url ? '#EF4444' : COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.videoMeta}>📌 {item.topic || 'No topic'}</Text>
                      <Text style={styles.videoMeta}>📚 {item.batch_id?.name || 'Unknown Batch'}</Text>
                      <Text style={styles.videoDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteVideo(item._id, item.title)} style={styles.deleteBtn}>
                    <Icon name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
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
  tabHeader: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontWeight: 'bold', color: '#6B7280', fontSize: 14 },
  activeTabText: { color: COLORS.primary },
  card: { backgroundColor: '#fff', margin: 15, borderRadius: 12, padding: 20, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 4, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  pickerContainer: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 4, backgroundColor: '#F9FAFB' },
  noBatchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, marginBottom: 4 },
  noBatchText: { color: '#92400E', fontSize: 13, marginLeft: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#1F2937', marginBottom: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8 },
  switchSubtext: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  uploadBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, backgroundColor: '#EFF6FF', padding: 16, borderRadius: 8, marginBottom: 4, gap: 8 },
  uploadBoxText: { fontSize: 14, fontWeight: 'bold', flex: 1 },
  btn: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#9CA3AF' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 15 },
  emptySubtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 6 },
  emptyBtn: { marginTop: 14, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold' },
  videoCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 14, elevation: 1, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#F3F4F6' },
  videoCardLeft: { flex: 1, flexDirection: 'row', gap: 12 },
  videoIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  videoTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  videoMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  videoDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  deleteBtn: { padding: 6, marginLeft: 8 },
});
