import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, FlatList, RefreshControl, Platform
} from 'react-native';
import api from '../../services/api';
import { Ionicons as Icon } from '@expo/vector-icons';
import CustomDropdown from '../../components/shared/CustomDropdown';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute } from '@react-navigation/native';
import { API_URL } from '../../config/constants';
import { storage } from '../../utils/storage';
import { COLORS } from '../../config/theme';

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500MB

export default function UploadVideoScreen() {
  const route = useRoute<any>();

  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [topics, setTopics] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'my_videos'>('upload');
  const [uploadMode, setUploadMode] = useState<'video' | 'material'>('video');
  const [videoSource, setVideoSource] = useState<'youtube' | 'file'>('youtube');
  const [listMode, setListMode] = useState<'video' | 'material'>('video');
  
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [myMaterials, setMyMaterials] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    batch_id: '',
    topic: '',
    new_topic: '',
    title: '',
    youtube_url: '',
    order_index: '0'
  });

  const [videoFile, setVideoFile] = useState<any>(null);
  const [notesFile, setNotesFile] = useState<any>(null);
  const [materialFile, setMaterialFile] = useState<any>(null);

  useEffect(() => {
    if (route.params?.tab) setActiveTab(route.params.tab);
  }, [route.params]);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (activeTab === 'my_videos') {
      if (listMode === 'video') fetchMyVideos();
      else fetchMyMaterials();
    }
  }, [activeTab, listMode]);

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

  const fetchMyMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const res = await api.get('/instructors/materials');
      setMyMaterials(res.data);
    } catch (e) {
      console.warn('Failed to load materials', e);
    } finally {
      setLoadingMaterials(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (listMode === 'video') fetchMyVideos();
    else fetchMyMaterials();
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

  const pickVideoFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['video/*', 'video/mp4', 'video/quicktime', 'video/x-msvideo', '*/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setVideoFile(res.assets[0]);
      }
    } catch (e) {
      console.warn('Error picking video file', e);
    }
  };

  const pickNotesFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', '*/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setNotesFile(res.assets[0]);
      }
    } catch (e) {
      console.warn('Error picking notes file', e);
    }
  };

  const pickMaterial = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '*/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setMaterialFile(res.assets[0]);
      }
    } catch (e) {
      console.warn('Error picking document', e);
    }
  };

  const resetForm = () => {
    setFormData(prev => ({ ...prev, title: '', youtube_url: '', new_topic: '', topic: topics[0] || '', order_index: '0' }));
    setVideoFile(null);
    setNotesFile(null);
    setMaterialFile(null);
  };

  const showAlert = (title: string, msg: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, msg, [
        { text: 'OK', onPress: onOk }
      ]);
    }
  };

  const appendFileToFormData = (formData: FormData, fieldName: string, fileAsset: any) => {
    if (!fileAsset) return;

    if (Platform.OS === 'web') {
      if (fileAsset.file instanceof File || fileAsset.file instanceof Blob) {
        formData.append(fieldName, fileAsset.file, fileAsset.name || `${fieldName}_${Date.now()}`);
      } else {
        formData.append(fieldName, fileAsset as any);
      }
    } else {
      const fileObj = {
        uri: Platform.OS === 'ios' ? fileAsset.uri.replace('file://', '') : fileAsset.uri,
        name: fileAsset.name || `${fieldName}_${Date.now()}`,
        type: fileAsset.mimeType || fileAsset.type || (fieldName === 'video' ? 'video/mp4' : 'application/pdf'),
      };
      formData.append(fieldName, fileObj as any);
    }
  };

  const submit = async () => {
    const finalTopic = formData.new_topic.trim() || formData.topic;
    if (!formData.batch_id) return showAlert('Error', 'Please select a target batch');
    if (!finalTopic) return showAlert('Error', 'Please select or enter a topic name');
    if (!formData.title.trim()) return showAlert('Error', `Please enter a ${uploadMode === 'video' ? 'video' : 'material'} title`);

    if (uploadMode === 'video') {
      if (videoSource === 'youtube') {
        if (!formData.youtube_url.trim()) return showAlert('Error', 'Please enter a YouTube video URL');
      } else {
        if (!videoFile) return showAlert('Error', 'Please select a video file (MP4, MOV)');
      }
    } else {
      if (!materialFile) return showAlert('Error', 'Please select a document file (PDF, DOC)');
    }

    setUploading(true);
    try {
      const data = new FormData();
      data.append('batch_id', formData.batch_id);
      data.append('topic', finalTopic);
      data.append('title', formData.title.trim());
      data.append('order_index', formData.order_index || '0');

      if (uploadMode === 'video') {
        if (videoSource === 'youtube') {
          data.append('youtube_url', formData.youtube_url.trim());
        } else if (videoFile) {
          appendFileToFormData(data, 'video', videoFile);
        }

        if (notesFile) {
          appendFileToFormData(data, 'notes', notesFile);
        }

        await api.post('/instructors/videos', data);
      } else {
        appendFileToFormData(data, 'material', materialFile);

        await api.post('/instructors/materials', data);
      }

      const successMsg = uploadMode === 'video'
        ? '🎉 Video uploaded successfully to Cloudinary!\nInstant notification sent to all enrolled students.'
        : '🎉 Study material uploaded successfully!\nInstant notification sent to all enrolled students.';

      showAlert('SUCCESSFUL UPLOAD ✨', successMsg, () => {
        resetForm();
        setActiveTab('my_videos');
      });
    } catch (e: any) {
      const backendMessage = e.response?.data?.message;
      const nativeMessage = e.message;
      showAlert('Upload Error', backendMessage || nativeMessage || 'Failed to upload content');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = (videoId: string, title: string) => {
    Alert.alert('Delete Upload', `Delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/instructors/videos/${videoId}`);
            setMyVideos(prev => prev.filter(v => v._id !== videoId));
            setMyMaterials(prev => prev.filter(v => v._id !== videoId));
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete upload');
          }
        }
      }
    ]);
  };

  const currentList = listMode === 'video' ? myVideos : myMaterials;
  const currentLoading = listMode === 'video' ? loadingVideos : loadingMaterials;

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity style={[styles.tab, activeTab === 'upload' && styles.activeTab]} onPress={() => setActiveTab('upload')}>
          <Icon name="cloud-upload-outline" size={16} color={activeTab === 'upload' ? COLORS.primary : '#6B7280'} style={{ marginRight: 5 }} />
          <Text style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>Upload Portal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'my_videos' && styles.activeTab]} onPress={() => setActiveTab('my_videos')}>
          <Icon name="layers-outline" size={16} color={activeTab === 'my_videos' ? COLORS.primary : '#6B7280'} style={{ marginRight: 5 }} />
          <Text style={[styles.tabText, activeTab === 'my_videos' && styles.activeTabText]}>My Uploads</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'upload' ? (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lecturer Video & Study Notes Upload</Text>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, uploadMode === 'video' && styles.modeBtnActive]}
                onPress={() => { setUploadMode('video'); resetForm(); }}
              >
                <Text style={[styles.modeBtnText, uploadMode === 'video' && styles.modeBtnTextActive]}>🎥 Video Lecture</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, uploadMode === 'material' && styles.modeBtnActive]}
                onPress={() => { setUploadMode('material'); resetForm(); }}
              >
                <Text style={[styles.modeBtnText, uploadMode === 'material' && styles.modeBtnTextActive]}>📄 Study Material</Text>
              </TouchableOpacity>
            </View>

            {batchesLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 10 }} />
            ) : batches.length === 0 ? (
              <View style={styles.noBatchBox}>
                <Icon name="warning-outline" size={20} color="#F59E0B" />
                <Text style={styles.noBatchText}>No batches assigned to you.</Text>
              </View>
            ) : (
              <CustomDropdown
                label="Select Target Batch *"
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
              placeholder={topics.length > 0 ? 'Or enter a new topic name' : 'Enter topic name (e.g. Engine Diagnostics)'}
              value={formData.new_topic}
              onChangeText={t => setFormData({ ...formData, new_topic: t, topic: '' })}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>{uploadMode === 'video' ? 'Video Lecture Title *' : 'Material Title *'}</Text>
            <TextInput
              style={styles.input}
              placeholder={uploadMode === 'video' ? 'e.g. Engine Repair Demonstration Part 1' : 'e.g. Wiring Diagram Manual'}
              value={formData.title}
              onChangeText={t => setFormData({ ...formData, title: t })}
              placeholderTextColor="#9CA3AF"
            />

            {uploadMode === 'video' ? (
              <>
                <Text style={styles.label}>Select Video Source:</Text>
                <View style={styles.sourceSelectorRow}>
                  <TouchableOpacity
                    style={[styles.sourceBtn, videoSource === 'youtube' && styles.sourceBtnActive]}
                    onPress={() => setVideoSource('youtube')}
                  >
                    <Icon name="logo-youtube" size={16} color={videoSource === 'youtube' ? '#EF4444' : '#6B7280'} />
                    <Text style={[styles.sourceBtnText, videoSource === 'youtube' && styles.sourceBtnTextActive]}>YouTube Link</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sourceBtn, videoSource === 'file' && styles.sourceBtnActive]}
                    onPress={() => setVideoSource('file')}
                  >
                    <Icon name="cloud-upload" size={16} color={videoSource === 'file' ? COLORS.primary : '#6B7280'} />
                    <Text style={[styles.sourceBtnText, videoSource === 'file' && styles.sourceBtnTextActive]}>Video File (Cloudinary)</Text>
                  </TouchableOpacity>
                </View>

                {videoSource === 'youtube' ? (
                  <>
                    <Text style={styles.label}>YouTube Video URL *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="https://youtube.com/watch?v=..."
                      value={formData.youtube_url}
                      onChangeText={t => setFormData({ ...formData, youtube_url: t })}
                      autoCapitalize="none"
                      placeholderTextColor="#9CA3AF"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Pick Video File (MP4 / MOV) *</Text>
                    <TouchableOpacity style={styles.uploadBox} onPress={pickVideoFile}>
                      <Icon name={videoFile ? 'checkmark-circle' : 'videocam-outline'} size={24} color={videoFile ? '#10B981' : COLORS.primary} />
                      <Text style={[styles.uploadBoxText, { color: videoFile ? '#10B981' : COLORS.primary }]}>
                        {videoFile ? videoFile.name : '+ Select Video File from Storage'}
                      </Text>
                      {videoFile && (
                        <TouchableOpacity onPress={() => setVideoFile(null)} style={{ marginLeft: 8 }}>
                          <Icon name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <Text style={styles.label}>Optional Attached PDF Notes:</Text>
                <TouchableOpacity style={[styles.uploadBox, { backgroundColor: '#F8FAFC' }]} onPress={pickNotesFile}>
                  <Icon name={notesFile ? 'checkmark-circle' : 'document-attach-outline'} size={20} color={notesFile ? '#10B981' : '#64748B'} />
                  <Text style={[styles.uploadBoxText, { color: notesFile ? '#10B981' : '#64748B' }]}>
                    {notesFile ? notesFile.name : '+ Attach Study Notes PDF'}
                  </Text>
                  {notesFile && (
                    <TouchableOpacity onPress={() => setNotesFile(null)} style={{ marginLeft: 8 }}>
                      <Icon name="close-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Select Study Document *</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={pickMaterial}>
                  <Icon name={materialFile ? 'checkmark-circle' : 'document-attach-outline'} size={22} color={materialFile ? '#10B981' : COLORS.primary} />
                  <Text style={[styles.uploadBoxText, { color: materialFile ? '#10B981' : COLORS.primary }]}>
                    {materialFile ? materialFile.name : '+ Select PDF / DOC File'}
                  </Text>
                  {materialFile && (
                    <TouchableOpacity onPress={() => setMaterialFile(null)} style={{ marginLeft: 8 }}>
                      <Icon name="close-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.label}>Sort Order Index</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={formData.order_index}
              onChangeText={t => setFormData({ ...formData, order_index: t })}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              style={[styles.btn, (uploading || batches.length === 0) && styles.btnDisabled]}
              onPress={submit}
              disabled={uploading || batches.length === 0}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>
                    {uploadMode === 'video' ? 'Upload Video to Cloudinary' : 'Upload Material Document'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.modeRowList}>
            <TouchableOpacity style={[styles.modeBtn, listMode === 'video' && styles.modeBtnActive]} onPress={() => setListMode('video')}>
              <Text style={[styles.modeBtnText, listMode === 'video' && styles.modeBtnTextActive]}>Videos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, listMode === 'material' && styles.modeBtnActive]} onPress={() => setListMode('material')}>
              <Text style={[styles.modeBtnText, listMode === 'material' && styles.modeBtnTextActive]}>Materials</Text>
            </TouchableOpacity>
          </View>

          {currentLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading {listMode === 'video' ? 'videos' : 'materials'}...</Text>
            </View>
          ) : (
            <FlatList
              data={currentList}
              keyExtractor={item => item._id}
              contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name={listMode === 'video' ? 'videocam-outline' : 'document-text-outline'} size={64} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No {listMode === 'video' ? 'videos' : 'materials'} uploaded yet</Text>
                  <Text style={styles.emptySubtitle}>Upload your first {listMode === 'video' ? 'course video' : 'document material'}</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('upload')}>
                    <Text style={styles.emptyBtnText}>Upload Now</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.videoCard}>
                  <View style={styles.videoCardLeft}>
                    <View style={styles.videoIcon}>
                      <Icon
                        name={item.content_type === 'material' ? 'document-text' : item.youtube_url ? 'logo-youtube' : 'videocam'}
                        size={22}
                        color={item.content_type === 'material' ? '#10B981' : item.youtube_url ? '#EF4444' : COLORS.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.videoMeta}>Topic: {item.topic || 'No topic'}</Text>
                      <Text style={styles.videoMeta}>Batch: {item.batch_id?.name || 'Unknown Batch'}</Text>
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
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeRowList: { flexDirection: 'row', gap: 8, padding: 15, paddingBottom: 0 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#E5E7EB', alignItems: 'center' },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeBtnText: { fontWeight: '700', color: '#374151', fontSize: 13 },
  modeBtnTextActive: { color: '#fff' },
  sourceSelectorRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 6 },
  sourceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  sourceBtnActive: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  sourceBtnText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  sourceBtnTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  noBatchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, marginBottom: 4 },
  noBatchText: { color: '#92400E', fontSize: 13, marginLeft: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#1F2937', marginBottom: 4 },
  uploadBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, backgroundColor: '#EFF6FF', padding: 16, borderRadius: 8, marginBottom: 4, gap: 8 },
  uploadBoxText: { fontSize: 13, fontWeight: 'bold', flex: 1 },
  btn: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#9CA3AF' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 15 },
  emptySubtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 6, textAlign: 'center' },
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
