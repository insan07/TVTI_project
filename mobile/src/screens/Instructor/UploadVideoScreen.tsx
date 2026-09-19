import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, FlatList, RefreshControl, Platform, Linking, Modal, Image,
  Animated
} from 'react-native';
import api from '../../services/api';
import { Ionicons as Icon } from '@expo/vector-icons';
import CustomDropdown from '../../components/shared/CustomDropdown';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { API_URL } from '../../config/constants';
import { storage } from '../../utils/storage';
import { COLORS, FONTS } from '../../config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/shared/ScreenHeader';

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500MB

export default function UploadVideoScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [topics, setTopics] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'my_videos'>('my_videos');
  const [uploadMode, setUploadMode] = useState<'video' | 'material'>('video');
  const [videoSource, setVideoSource] = useState<'youtube' | 'file'>('youtube');
  const [listMode, setListMode] = useState<'video' | 'material'>('video');
  
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [myMaterials, setMyMaterials] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Custom Confirmation & Alert Dialog Popup State
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    onOk?: () => void;
  }>({ visible: false, title: '', message: '' });

  // Liquid FAB Animation State
  const wave1Anim = React.useRef(new Animated.Value(0)).current;
  const wave2Anim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createWaveAnimation = (animInfo: Animated.Value, delay: number = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(animInfo, {
              toValue: 1,
              duration: 2500,
              useNativeDriver: true,
            }),
            Animated.timing(animInfo, {
              toValue: 1,
              duration: 2500,
              useNativeDriver: true,
            })
          ])
        ])
      );
    };

    createWaveAnimation(wave1Anim).start();
    createWaveAnimation(wave2Anim, 1000).start();
  }, []);

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
      showAlert('Error', 'Could not load your batches.', undefined, 'error');
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

  const showAlert = (title: string, msg: string, onOk?: () => void, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertModal({
      visible: true,
      title,
      message: msg,
      type,
      onOk
    });
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
    if (!formData.batch_id) return showAlert('Error', 'Please select a target batch', undefined, 'error');
    if (!finalTopic) return showAlert('Error', 'Please select or enter a topic name', undefined, 'error');
    if (!formData.title.trim()) return showAlert('Error', `Please enter a ${uploadMode === 'video' ? 'video' : 'material'} title`, undefined, 'error');

    if (uploadMode === 'video') {
      if (videoSource === 'youtube') {
        if (!formData.youtube_url.trim()) return showAlert('Error', 'Please enter a YouTube video URL', undefined, 'error');
      } else {
        if (!videoFile) return showAlert('Error', 'Please select a video file (MP4, MOV)', undefined, 'error');
      }
    } else {
      if (!materialFile) return showAlert('Error', 'Please select a document file (PDF, DOC)', undefined, 'error');
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
        ? 'Video uploaded successfully! Instant notification sent to all enrolled students.'
        : 'Study material uploaded successfully! Instant notification sent to all enrolled students.';

      showAlert('SUCCESSFUL UPLOAD ✨', successMsg, () => {
        resetForm();
        setActiveTab('my_videos');
      }, 'success');
    } catch (e: any) {
      const backendMessage = e.response?.data?.message;
      const nativeMessage = e.message;
      showAlert('Upload Error', backendMessage || nativeMessage || 'Failed to upload content', undefined, 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteUpload = async (videoId: string) => {
    try {
      await api.delete(`/instructors/videos/${videoId}`);
      setMyVideos(prev => prev.filter(v => v._id !== videoId));
      setMyMaterials(prev => prev.filter(v => v._id !== videoId));
      showAlert('Deleted', 'Upload successfully removed.', undefined, 'success');
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to delete upload', undefined, 'error');
    }
  };

  const handleDeleteVideo = (videoId: string, title: string) => {
    setConfirmModal({
      visible: true,
      title: 'Delete Upload',
      message: `Are you sure you want to delete "${title}"? This cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => void deleteUpload(videoId)
    });
  };

  const currentList = listMode === 'video' ? myVideos : myMaterials;
  const currentLoading = listMode === 'video' ? loadingVideos : loadingMaterials;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Upload Content"
        subtitle="Publish video lessons & study materials"
      />

      {activeTab === 'upload' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A' }}>New Upload</Text>
              <TouchableOpacity onPress={() => setActiveTab('my_videos')} style={{ padding: 4, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, uploadMode === 'video' && styles.modeBtnActive]}
                onPress={() => { setUploadMode('video'); resetForm(); }}
              >
                <Text style={[styles.modeBtnText, uploadMode === 'video' && styles.modeBtnTextActive]}>Video Lecture</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, uploadMode === 'material' && styles.modeBtnActive]}
                onPress={() => { setUploadMode('material'); resetForm(); }}
              >
                <Text style={[styles.modeBtnText, uploadMode === 'material' && styles.modeBtnTextActive]}>Study Material</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Select Target Batch *</Text>
            {batchesLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
            ) : batches.length === 0 ? (
              <View style={styles.noBatchBox}>
                <Icon name="warning-outline" size={20} color="#F59E0B" />
                <Text style={styles.noBatchText}>No batches assigned to you.</Text>
              </View>
            ) : (
              <CustomDropdown
                placeholder="Choose batch..."
                iconName="school-outline"
                items={batches.map(b => ({
                  label: b.name || b.course_id?.title || 'Batch',
                  value: b._id,
                  subtext: b.course_id?.title ? `Course: ${b.course_id.title}` : undefined
                }))}
                selectedValue={formData.batch_id}
                onValueChange={handleBatchChange}
                containerStyle={{ marginBottom: 12 }}
              />
            )}

            <Text style={styles.label}>Topic / Chapter *</Text>
            {topics.length > 0 && (
              <CustomDropdown
                placeholder="Choose existing topic..."
                iconName="bookmark-outline"
                items={[
                  ...topics.map(t => ({ label: t, value: t })),
                  { label: '➕ Create New Topic...', value: '__new__' }
                ]}
                selectedValue={formData.new_topic ? '__new__' : formData.topic}
                onValueChange={val => {
                  if (val === '__new__') {
                    setFormData(prev => ({ ...prev, topic: '', new_topic: ' ' }));
                  } else {
                    setFormData(prev => ({ ...prev, topic: val, new_topic: '' }));
                  }
                }}
                containerStyle={{ marginBottom: 12 }}
              />
            )}

            {(topics.length === 0 || formData.new_topic !== '') && (
              <TextInput
                style={styles.input}
                placeholder="Enter new topic / chapter name"
                placeholderTextColor="#9CA3AF"
                value={formData.new_topic.trimStart()}
                onChangeText={t => setFormData(prev => ({ ...prev, new_topic: t }))}
              />
            )}

            <Text style={styles.label}>{uploadMode === 'video' ? 'Video' : 'Document'} Title *</Text>
            <TextInput
              style={styles.input}
              placeholder={uploadMode === 'video' ? 'e.g. Introduction to Engine Overhaul' : 'e.g. Chapter 1 Summary Notes'}
              placeholderTextColor="#9CA3AF"
              value={formData.title}
              onChangeText={t => setFormData(prev => ({ ...prev, title: t }))}
            />

            {uploadMode === 'video' && (
              <>
                <Text style={styles.label}>Video Source *</Text>
                <View style={styles.sourceSelectorRow}>
                  <TouchableOpacity
                    style={[styles.sourceBtn, videoSource === 'youtube' && styles.sourceBtnActive]}
                    onPress={() => setVideoSource('youtube')}
                  >
                    <Icon name="logo-youtube" size={16} color={videoSource === 'youtube' ? '#EF4444' : '#6B7280'} />
                    <Text style={[styles.sourceBtnText, videoSource === 'youtube' && styles.sourceBtnTextActive]}>
                      YouTube Link
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sourceBtn, videoSource === 'file' && styles.sourceBtnActive]}
                    onPress={() => setVideoSource('file')}
                  >
                    <Icon name="folder-open" size={16} color={videoSource === 'file' ? COLORS.primary : '#6B7280'} />
                    <Text style={[styles.sourceBtnText, videoSource === 'file' && styles.sourceBtnTextActive]}>
                      Upload File
                    </Text>
                  </TouchableOpacity>
                </View>

                {videoSource === 'youtube' ? (
                  <>
                    <Text style={styles.label}>YouTube Video URL *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="https://www.youtube.com/watch?v=..."
                      placeholderTextColor="#9CA3AF"
                      value={formData.youtube_url}
                      onChangeText={t => setFormData(prev => ({ ...prev, youtube_url: t }))}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Video File *</Text>
                    <TouchableOpacity style={styles.uploadBox} onPress={pickVideoFile}>
                      <Icon name="videocam-outline" size={24} color={COLORS.primary} />
                      <Text style={[styles.uploadBoxText, { color: videoFile ? '#1E3A8A' : '#6B7280' }]} numberOfLines={1}>
                        {videoFile ? `Selected: ${videoFile.name}` : 'Tap to select video file (MP4, MOV)'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <Text style={styles.label}>Attach PDF Notes (Optional)</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={pickNotesFile}>
                  <Icon name="document-text-outline" size={24} color={COLORS.primary} />
                  <Text style={[styles.uploadBoxText, { color: notesFile ? '#1E3A8A' : '#6B7280' }]} numberOfLines={1}>
                    {notesFile ? `Selected: ${notesFile.name}` : 'Tap to select PDF notes'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {uploadMode === 'material' && (
              <>
                <Text style={styles.label}>Select Document File (PDF, Word) *</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={pickMaterial}>
                  <Icon name="document-attach-outline" size={24} color={COLORS.primary} />
                  <Text style={[styles.uploadBoxText, { color: materialFile ? '#1E3A8A' : '#6B7280' }]} numberOfLines={1}>
                    {materialFile ? `Selected: ${materialFile.name}` : 'Tap to select file (PDF, DOC, DOCX)'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.btnWrapper, (uploading || batches.length === 0) && styles.btnDisabled]}
              onPress={submit}
              disabled={uploading || batches.length === 0}
            >
              <LinearGradient
                colors={[COLORS.primary, '#1E3A8A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>
                    {uploadMode === 'video' ? 'Post Video to Students' : 'Upload Material'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.modeRowList}>
            <TouchableOpacity
              style={[styles.modeBtn, listMode === 'video' && styles.modeBtnActive]}
              onPress={() => setListMode('video')}
            >
              <Text style={[styles.modeBtnText, listMode === 'video' && styles.modeBtnTextActive]}>Video Lectures ({myVideos.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, listMode === 'material' && styles.modeBtnActive]}
              onPress={() => setListMode('material')}
            >
              <Text style={[styles.modeBtnText, listMode === 'material' && styles.modeBtnTextActive]}>Documents ({myMaterials.length})</Text>
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
              contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
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
                  <TouchableOpacity 
                    style={styles.videoCardLeft}
                    onPress={() => {
                      let url = item.content_type === 'material' ? item.cloudinary_url : (item.cloudinary_url || item.youtube_url);
                      if (url && (url.startsWith('/uploads/') || url.startsWith('/api/files/'))) {
                        url = `${API_URL.replace(/\/api\/?$/, '')}${url}`;
                      }
                      if (url) {
                        if (Platform.OS === 'web') {
                          window.open(url, '_blank');
                        } else {
                          Linking.openURL(url);
                        }
                      }
                    }}
                  >
                    <View style={styles.videoIcon}>
                      {(() => {
                        let thumbUrl = null;
                        let isLocalVideo = false;
                        let localVideoUrl = '';

                        if (item.youtube_url) {
                          const match = item.youtube_url.match(/[?&]v=([^&]+)/) || item.youtube_url.match(/youtu\.be\/([^?]+)/);
                          if (match && match[1]) {
                            thumbUrl = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
                          }
                        } else if (item.cloudinary_url) {
                          if (item.cloudinary_url.includes('cloudinary.com')) {
                            // Cloudinary can generate thumbnails for videos and PDFs by changing the extension to .jpg
                            thumbUrl = item.cloudinary_url.replace(/\.[^/.]+$/, ".jpg");
                          } else if (item.cloudinary_url.startsWith('/uploads/')) {
                            if (item.content_type !== 'material') {
                              isLocalVideo = true;
                              localVideoUrl = `${API_URL.replace(/\/api\/?$/, '')}${item.cloudinary_url}`;
                            }
                          }
                        }
                        
                        if (thumbUrl) {
                          return (
                            <>
                              <Image source={{ uri: thumbUrl }} style={styles.thumbnailImage} resizeMode="cover" />
                              <View style={styles.thumbnailOverlay}>
                                <Icon
                                  name={item.content_type === 'material' ? 'document-text' : item.youtube_url ? 'logo-youtube' : 'videocam'}
                                  size={22}
                                  color="#FFFFFF"
                                />
                              </View>
                            </>
                          );
                        } else if (isLocalVideo && Platform.OS === 'web') {
                          const VideoElement = 'video' as any;
                          return (
                            <>
                              <VideoElement 
                                src={localVideoUrl} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }} 
                                preload="metadata" 
                                muted 
                              />
                              <View style={styles.thumbnailOverlay}>
                                <Icon
                                  name="videocam"
                                  size={22}
                                  color="#FFFFFF"
                                />
                              </View>
                            </>
                          );
                        }
                        return (
                          <Icon
                            name={item.content_type === 'material' ? 'document-text' : item.youtube_url ? 'logo-youtube' : 'videocam'}
                            size={22}
                            color={item.content_type === 'material' ? '#10B981' : item.youtube_url ? '#EF4444' : COLORS.primary}
                          />
                        );
                      })()}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.videoMeta}>Topic: {item.topic || 'No topic'}</Text>
                      <Text style={styles.videoMeta}>Batch: {item.batch_id?.name || 'Unknown Batch'}</Text>
                      <Text style={styles.videoDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => handleDeleteVideo(item._id, item.title)} style={styles.deleteBtn}>
                    <Icon name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}  
        </View>
      )}

      {/* CUSTOM IN-APP CONFIRMATION POPUP MODAL */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={[styles.popupIconCircle, { backgroundColor: confirmModal.type === 'danger' ? '#FEE2E2' : '#FEF3C7' }]}>
              <Icon
                name={confirmModal.type === 'danger' ? 'trash-outline' : 'alert-circle-outline'}
                size={28}
                color={confirmModal.type === 'danger' ? '#DC2626' : '#D97706'}
              />
            </View>
            <Text style={styles.popupTitle}>{confirmModal.title}</Text>
            <Text style={styles.popupMessage}>{confirmModal.message}</Text>
            <View style={styles.popupBtnRow}>
              <TouchableOpacity
                style={styles.popupCancelBtn}
                onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.popupCancelText}>{confirmModal.cancelText || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.popupConfirmBtn, { backgroundColor: confirmModal.type === 'danger' ? '#DC2626' : '#F58220' }]}
                onPress={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(prev => ({ ...prev, visible: false }));
                  if (action) action();
                }}
              >
                <Text style={styles.popupConfirmText}>{confirmModal.confirmText || 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM IN-APP ALERT POPUP MODAL */}
      <Modal
        visible={alertModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={[
              styles.popupIconCircle,
              { backgroundColor: alertModal.type === 'success' ? '#DCFCE7' : alertModal.type === 'error' ? '#FEE2E2' : '#EFF6FF' }
            ]}>
              <Icon
                name={
                  alertModal.type === 'success'
                    ? 'checkmark-circle-outline'
                    : alertModal.type === 'error'
                    ? 'close-circle-outline'
                    : 'information-circle-outline'
                }
                size={28}
                color={
                  alertModal.type === 'success'
                    ? '#16A34A'
                    : alertModal.type === 'error'
                    ? '#DC2626'
                    : '#2563EB'
                }
              />
            </View>
            <Text style={styles.popupTitle}>{alertModal.title}</Text>
            <Text style={styles.popupMessage}>{alertModal.message}</Text>
            <TouchableOpacity
              style={[
                styles.popupSingleBtn,
                { backgroundColor: alertModal.type === 'error' ? '#DC2626' : alertModal.type === 'success' ? '#16A34A' : '#F58220' }
              ]}
              onPress={() => {
                const action = alertModal.onOk;
                setAlertModal(prev => ({ ...prev, visible: false }));
                if (action) action();
              }}
            >
              <Text style={styles.popupSingleBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Liquid Glass FAB */}
      {activeTab === 'my_videos' && (
        <View style={styles.liquidFabContainer}>
          <Animated.View
            style={[
              styles.liquidWaveRing,
              {
                transform: [{ scale: wave1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
                opacity: wave1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
              }
            ]}
          />
          <Animated.View
            style={[
              styles.liquidWaveRingSecond,
              {
                transform: [{ scale: wave2Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
                opacity: wave2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
              }
            ]}
          />
          <TouchableOpacity
            style={styles.liquidFabButton}
            activeOpacity={0.85}
            onPress={() => setActiveTab('upload')}
          >
            <View style={styles.liquidGlassSheen} />
            <View style={styles.liquidInnerCore}>
              <Icon name="add" size={32} color="#FFFFFF" style={styles.liquidPlusIcon} />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 16,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...Platform.select({
      web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  headerTitle: {
    fontSize: 22,
    ...FONTS.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    ...FONTS.regular,
    color: '#64748B',
    marginTop: 2,
  },
  segmentedTrackContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 26,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: 'inset 0px 1px 3px rgba(0, 0, 0, 0.04)' },
      default: {}
    }),
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 22,
  },
  segmentedTabActive: {
    backgroundColor: '#0F172A',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(15, 23, 42, 0.22)' },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
        elevation: 4,
      }
    }),
  },
  segmentedTabText: {
    fontSize: 13.5,
    ...FONTS.semiBold,
    color: '#64748B',
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
    ...FONTS.bold,
  },
  card: {
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    }),
  },
  cardTitle: { fontSize: 18, ...FONTS.bold, color: '#0F172A', marginBottom: 14, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeRowList: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  modeBtnActive: { backgroundColor: '#F58220', borderColor: '#F58220' },
  modeBtnText: { ...FONTS.bold, color: '#475569', fontSize: 13 },
  modeBtnTextActive: { color: '#FFFFFF' },
  sourceSelectorRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 8 },
  sourceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  sourceBtnActive: { borderColor: '#F58220', backgroundColor: '#FFF7ED' },
  sourceBtnText: { fontSize: 12, ...FONTS.semiBold, color: '#475569' },
  sourceBtnTextActive: { color: '#F58220', ...FONTS.bold },
  label: { fontSize: 12.5, ...FONTS.bold, color: '#334155', marginTop: 14, marginBottom: 6, letterSpacing: 0.2 },
  noBatchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, marginBottom: 4 },
  noBatchText: { color: '#92400E', fontSize: 13, marginLeft: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 14, color: '#0F172A', marginBottom: 4, ...FONTS.regular },
  uploadBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#F58220', backgroundColor: '#FFF7ED', padding: 16, borderRadius: 8, marginBottom: 4, gap: 8 },
  uploadBoxText: { fontSize: 13, ...FONTS.bold, flex: 1 },
  btnWrapper: { borderRadius: 10, marginTop: 24, overflow: 'hidden' },
  btn: { flexDirection: 'row', padding: 15, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFFFFF', ...FONTS.bold, fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748B', ...FONTS.medium },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, ...FONTS.bold, color: '#0F172A', marginTop: 15 },
  emptySubtitle: { color: '#64748B', fontSize: 14, marginTop: 6, textAlign: 'center', ...FONTS.regular },
  emptyBtn: { marginTop: 16, backgroundColor: '#F58220', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyBtnText: { color: '#FFFFFF', ...FONTS.bold },
  videoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 14, padding: 16, elevation: 1, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    }),
  },
  videoCardLeft: { flex: 1, flexDirection: 'row', gap: 14 },
  videoIcon: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  thumbnailImage: { width: '100%', height: '100%', position: 'absolute' },
  thumbnailOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  videoTitle: { fontSize: 15, ...FONTS.bold, color: '#0F172A', marginBottom: 4, letterSpacing: -0.2 },
  videoMeta: { fontSize: 12.5, color: '#475569', marginTop: 2, ...FONTS.medium },
  videoDate: { fontSize: 11.5, color: '#94A3B8', marginTop: 4, ...FONTS.medium },
  deleteBtn: { padding: 6, marginLeft: 8 },

  // Custom Popup Dialog Modal Styles
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  popupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.25)',
    elevation: 10
  },
  popupIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8
  },
  popupMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
  },
  popupBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  popupCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  popupCancelText: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 14
  },
  popupConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  popupConfirmText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  popupSingleBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  popupSingleBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15
  },

  /* Liquid Glass FAB + Button Styles */
  liquidFabContainer: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 998,
  },
  liquidWaveRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 107, 0, 0.4)',
  },
  liquidWaveRingSecond: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 140, 0, 0.3)',
  },
  liquidFabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 8px 26px rgba(255, 107, 0, 0.55), inset 0px 2px 4px rgba(255, 255, 255, 0.4)' },
      default: {
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 10,
      },
    }),
  },
  liquidGlassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  liquidInnerCore: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  liquidPlusIcon: {
    ...Platform.select({
      web: { filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2))' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    }),
  },
});
