import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  Image,
  LayoutAnimation,
  UIManager,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import api from '../../services/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { useTheme } from '../../context/ThemeContext';
import {
  enableNativeScreenCaptureProtection,
  disableNativeScreenCaptureProtection,
} from '../../utils/screenCaptureProtection';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !(globalThis as any).nativeFabricUIManager) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatUploadedTime = (dateStr?: string) => {
  if (!dateStr) return 'Upload date unknown';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Uploaded recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Uploaded just now';
  if (diffHours < 24) return `Uploaded ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `Uploaded ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

  return `Uploaded on ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

export default function VideosScreen({ unreadCount }: { unreadCount?: number }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [activeFilter, setActiveFilter] = useState<'all' | 'videos' | 'pdf'>('all');
  const [batches, setBatches] = useState<any[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [courseModalVisible, setCourseModalVisible] = useState(false);

  const [videos, setVideos] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      enableNativeScreenCaptureProtection();
      api.get('/students/batches').then(res => {
        setBatches(res.data || []);
        if (res.data && res.data.length > 0) {
          const targetId = activeBatchId || res.data[0]._id;
          if (!activeBatchId) setActiveBatchId(targetId);
          fetchContent(targetId);
        }
      }).catch(e => console.warn('Failed to load batches:', e));
      return () => {
        disableNativeScreenCaptureProtection();
      };
    }, [activeBatchId])
  );

  // We can remove the old fetchBatches function as it's handled in useFocusEffect now

  const fetchContent = (batchId: string) => {
    fetchVideos(batchId);
    fetchMaterials(batchId);
  };

  const fetchVideos = async (batchId: string) => {
    setLoadingVideos(true);
    try {
      const res = await api.get(`/students/batches/${batchId}/videos`);
      setVideos(res.data || []);

      // Modules remain collapsed by default until user taps to expand
      setExpandedModules({});
    } catch (e) {
      console.warn('Failed to load videos:', e);
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchMaterials = async (batchId: string) => {
    setLoadingMaterials(true);
    try {
      const res = await api.get(`/students/batches/${batchId}/materials`);
      setMaterials(res.data || []);
    } catch (e) {
      console.warn('Failed to load materials:', e);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleBatchSelect = (batchId: string) => {
    setActiveBatchId(batchId);
    fetchContent(batchId);
  };

  const toggleModule = (modKey: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedModules((prev) => ({
      ...prev,
      [modKey]: !prev[modKey],
    }));
  };

  const openPdfDocument = (rawUrl: string, title: string) => {
    if (!rawUrl) {
      Alert.alert('Error', 'PDF URL not found');
      return;
    }
    let url = rawUrl;
    if (url.startsWith('/uploads/') || url.startsWith('/api/files/')) {
      url = `${API_URL.replace(/\/api\/?$/, '')}${url}`;
    }
    navigation.navigate('PdfViewer', { pdfUrl: url, title });
  };

  const currentBatch = batches.find((b) => b._id === activeBatchId);
  const courseTitle = currentBatch?.course_id?.title || 'Select Course';

  // Extract all unique modules/topics across both videos and materials in order
  const allModuleTopics: string[] = [];
  videos.forEach((v: any) => {
    const t = v.topic || 'General Module';
    if (!allModuleTopics.some((existing) => existing.toLowerCase().trim() === t.toLowerCase().trim())) {
      allModuleTopics.push(t);
    }
  });
  materials.forEach((m: any) => {
    const t = m.topic || 'General Module';
    if (!allModuleTopics.some((existing) => existing.toLowerCase().trim() === t.toLowerCase().trim())) {
      allModuleTopics.push(t);
    }
  });

  const getVideosForTopic = (topic: string) => {
    return videos.filter(
      (v: any) => (v.topic || 'General Module').toLowerCase().trim() === topic.toLowerCase().trim()
    );
  };

  const getMaterialsForTopic = (topic: string) => {
    return materials.filter(
      (m: any) => (m.topic || 'General Module').toLowerCase().trim() === topic.toLowerCase().trim()
    );
  };

  const showVideos = activeFilter === 'all' || activeFilter === 'videos';
  const showPdfs = activeFilter === 'all' || activeFilter === 'pdf';

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#0B0F19' }]}>
      <ScreenBackground />
      {/* FIXED STICKY TOP HEADER */}
      <View style={{ paddingTop: Math.max(insets.top + 4, 10) }}>
        <ScreenHeader title="Uploads" subtitle="Course videos & study materials" showBack={false} />

        {/* Top Controls Container (Course Selector & Filter Bar with consistent spacing) */}
        {batches.length > 0 && (
          <View style={styles.topControlsContainer}>
            {/* Course Selector Dropdown Pill */}
            <TouchableOpacity
              style={[styles.compactCourseSelect, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' }]}
              activeOpacity={0.85}
              onPress={() => setCourseModalVisible(true)}
            >
              <View style={styles.courseSelectLeft}>
                <Text style={[styles.compactCourseTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                  {courseTitle}
                </Text>
              </View>
              <Icon name="chevron-down" size={18} color={isDark ? '#94A3B8' : '#71717A'} />
            </TouchableOpacity>

            {/* Filter Bar Pills */}
            <View style={[styles.compactFilterRow, isDark && { backgroundColor: 'rgba(15, 23, 42, 0.85)', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <TouchableOpacity
                style={[styles.compactFilterPill, activeFilter === 'all' && (isDark ? { backgroundColor: '#F97316' } : styles.compactFilterPillActive)]}
                onPress={() => setActiveFilter('all')}
                activeOpacity={0.8}
              >
                <Icon
                  name="grid-outline"
                  size={13}
                  color={activeFilter === 'all' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#52525B')}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.compactFilterText, activeFilter === 'all' && styles.compactFilterTextActive, activeFilter !== 'all' && isDark && { color: '#94A3B8' }]}>
                  All ({videos.length + materials.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.compactFilterPill, activeFilter === 'videos' && (isDark ? { backgroundColor: '#F97316' } : styles.compactFilterPillActive)]}
                onPress={() => setActiveFilter('videos')}
                activeOpacity={0.8}
              >
                <Icon
                  name="play-circle-outline"
                  size={13}
                  color={activeFilter === 'videos' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#52525B')}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.compactFilterText, activeFilter === 'videos' && styles.compactFilterTextActive, activeFilter !== 'videos' && isDark && { color: '#94A3B8' }]}>
                  Videos ({videos.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.compactFilterPill, activeFilter === 'pdf' && (isDark ? { backgroundColor: '#F97316' } : styles.compactFilterPillActive)]}
                onPress={() => setActiveFilter('pdf')}
                activeOpacity={0.8}
              >
                <Icon
                  name="document-text-outline"
                  size={13}
                  color={activeFilter === 'pdf' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#52525B')}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.compactFilterText, activeFilter === 'pdf' && styles.compactFilterTextActive, activeFilter !== 'pdf' && isDark && { color: '#94A3B8' }]}>
                  PDFs ({materials.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.contentContainerStyle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentPadding}>
          {loadingVideos || loadingMaterials ? (
            <ActivityIndicator size="large" color="#F58220" style={{ marginVertical: 36 }} />
          ) : batches.length === 0 ? (
            <View style={[styles.pendingBatchCard, isDark && styles.pendingBatchCardDark, { marginTop: 16 }]}>
              <View style={styles.pendingBatchIconCircle}>
                <Icon name="hourglass-outline" size={28} color="#F58220" />
              </View>
              <Text style={[styles.pendingBatchTitle, isDark && { color: '#FFFFFF' }]}>
                Batch Assignment Pending
              </Text>
              <Text style={[styles.pendingBatchDesc, isDark && { color: '#94A3B8' }]}>
                Course videos, lecture notes, and study materials will be accessible here once an administrator assigns your batch.
              </Text>
            </View>
          ) : allModuleTopics.length > 0 ? (
            allModuleTopics.map((topic, idx) => {
              const moduleVideos = getVideosForTopic(topic);
              const moduleMaterials = getMaterialsForTopic(topic);

              const hasVideos = moduleVideos.length > 0;
              const hasMaterials = moduleMaterials.length > 0;

              // Filter check
              if (activeFilter === 'videos' && !hasVideos) return null;
              if (activeFilter === 'pdf' && !hasMaterials) return null;
              if (!hasVideos && !hasMaterials) return null;

              const isExpanded = !!expandedModules[topic];

              return (
                <View key={topic} style={styles.moduleSectionBox}>
                  {/* Module Accordion Header */}
                  <TouchableOpacity
                    style={[
                      styles.moduleHeader,
                      isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' },
                      { marginBottom: isExpanded ? 12 : 0 },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => toggleModule(topic)}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.moduleTag, isDark && { color: '#FB923C' }]}>MODULE {idx + 1}</Text>
                      <Text style={[styles.moduleTitle, isDark && { color: '#FFFFFF' }]}>{topic}</Text>
                      <View style={styles.moduleMetaBadgeRow}>
                        {hasVideos && showVideos ? (
                          <View style={styles.moduleMetaPill}>
                            <Icon name="play-circle" size={12} color="#F58220" style={{ marginRight: 3 }} />
                            <Text style={styles.moduleMetaPillText}>
                              {moduleVideos.length} {moduleVideos.length === 1 ? 'Video' : 'Videos'}
                            </Text>
                          </View>
                        ) : null}
                        {hasMaterials && showPdfs ? (
                          <View style={[styles.moduleMetaPill, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7' }]}>
                            <Icon name="document-text" size={12} color={isDark ? '#FBBF24' : '#B45309'} style={{ marginRight: 3 }} />
                            <Text style={[styles.moduleMetaPillText, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                              {moduleMaterials.length} {moduleMaterials.length === 1 ? 'PDF' : 'PDFs'}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Icon
                      name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={20}
                      color={isDark ? '#94A3B8' : '#1A1A1A'}
                    />
                  </TouchableOpacity>

                  {/* Expanded Module Content: Videos AND PDFs */}
                  {isExpanded && (
                    <View style={styles.moduleVideosContainer}>
                      {/* 1. Module Video Lectures */}
                      {hasVideos && showVideos && (
                        <View style={{ marginBottom: hasMaterials && showPdfs ? 16 : 0 }}>
                          {moduleVideos.map((v: any, vIdx: number) => {
                            let thumbUrl: string | null = null;
                            let isLocalVideo = false;
                            let localVideoUrl = '';

                            if (v.youtube_url) {
                              const match =
                                v.youtube_url.match(/[?&]v=([^&]+)/) ||
                                v.youtube_url.match(/youtu\.be\/([^?]+)/);
                              if (match && match[1]) {
                                thumbUrl = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
                              }
                            } else if (v.cloudinary_url) {
                              if (v.cloudinary_url.includes('cloudinary.com')) {
                                thumbUrl = v.cloudinary_url.replace(/\.[^/.]+$/, '.jpg');
                              } else if (v.cloudinary_url.startsWith('/uploads/')) {
                                isLocalVideo = true;
                                localVideoUrl = `${API_URL.replace(/\/api\/?$/, '')}${v.cloudinary_url}`;
                              }
                            }

                            if (!thumbUrl && !isLocalVideo) {
                              thumbUrl = null;
                            }

                            return (
                              <TouchableOpacity
                                key={v._id || vIdx}
                                style={[
                                  styles.youtubeVideoCard,
                                  isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' },
                                ]}
                                activeOpacity={0.88}
                                onPress={() =>
                                  navigation.navigate('VideoPlayer', {
                                    videoId: v._id,
                                    batchId: activeBatchId,
                                  })
                                }
                              >
                                {/* Widescreen 16:9 Thumbnail Header */}
                                <View style={styles.widescreenThumbWrapper}>
                                  {thumbUrl ? (
                                    <Image
                                      source={{ uri: thumbUrl }}
                                      style={styles.widescreenThumbImage}
                                      resizeMode="cover"
                                    />
                                  ) : isLocalVideo && Platform.OS === 'web' ? (
                                    (() => {
                                      const VideoElement = 'video' as any;
                                      return (
                                        <VideoElement
                                          src={localVideoUrl}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                          }}
                                          preload="metadata"
                                          controlsList="nodownload noplaybackrate noremoteplayback"
                                          disablePictureInPicture
                                          onContextMenu={(e: any) => e.preventDefault()}
                                          muted
                                        />
                                      );
                                    })()
                                  ) : (
                                    <View style={styles.placeholderThumbBox}>
                                      <Icon name="logo-youtube" size={48} color="#FF0000" />
                                    </View>
                                  )}

                                  {/* Central Play Button */}
                                  <View style={styles.thumbPlayOverlay}>
                                    <View style={styles.youtubePlayCircle}>
                                      <Icon name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
                                    </View>
                                  </View>

                                  {/* Duration Badge */}
                                  <View style={styles.durationPill}>
                                    <Text style={styles.durationPillText}>
                                      {v.duration || '--:--'}
                                    </Text>
                                  </View>
                                </View>

                                {/* Video Meta Info */}
                                <View style={styles.youtubeVideoMeta}>
                                  <View style={styles.metaHeaderRow}>
                                    <View style={[styles.topicBadgePill, isDark && { backgroundColor: 'rgba(249, 115, 22, 0.18)' }]}>
                                      <Text style={[styles.topicBadgeText, isDark && { color: '#FB923C' }]}>
                                        {(v.topic || 'LECTURE').toUpperCase()}
                                      </Text>
                                    </View>

                                    {/* Direct One-Tap PDF Notes Action */}
                                    {v.notes_url ? (
                                      <TouchableOpacity
                                        style={[styles.pdfBadgePill, isDark && { backgroundColor: 'rgba(245, 158, 11, 0.22)' }]}
                                        activeOpacity={0.7}
                                        onPress={(e: any) => {
                                          e?.stopPropagation?.();
                                          openPdfDocument(v.notes_url, `${v.title} (Notes)`);
                                        }}
                                      >
                                        <Icon
                                          name="document-text"
                                          size={12}
                                          color={isDark ? '#FBBF24' : '#B45309'}
                                          style={{ marginRight: 4 }}
                                        />
                                        <Text style={[styles.pdfBadgeText, isDark && { color: '#FBBF24' }]}>Open PDF</Text>
                                      </TouchableOpacity>
                                    ) : null}
                                  </View>

                                  <Text style={[styles.youtubeVideoTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={2}>
                                    {v.title}
                                  </Text>

                                  <View style={styles.youtubeChannelRow}>
                                    <Icon
                                      name="time-outline"
                                      size={14}
                                      color={isDark ? '#94A3B8' : '#71717A'}
                                      style={{ marginRight: 4 }}
                                    />
                                    <Text style={[styles.youtubeChannelText, isDark && { color: '#94A3B8' }]}>
                                      {formatUploadedTime(v.createdAt || v.uploaded_at)}
                                    </Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}

                      {/* 2. Module PDF Study Materials */}
                      {hasMaterials && showPdfs && (
                        <View style={styles.modulePdfsContainer}>
                          {hasVideos && showVideos && (
                            <View style={styles.moduleSubHeaderRow}>
                              <Icon name="document-text" size={15} color="#F58220" style={{ marginRight: 6 }} />
                              <Text style={[styles.moduleSubHeaderTitle, isDark && { color: '#CBD5E1' }]}>
                                Module PDF Study Notes ({moduleMaterials.length})
                              </Text>
                            </View>
                          )}
                          <View style={styles.materialsListContainer}>
                            {moduleMaterials.map((mat: any) => {
                              let thumbUrl = null;
                              if (mat.cloudinary_url && mat.cloudinary_url.includes('cloudinary.com')) {
                                thumbUrl = mat.cloudinary_url.replace(/\.[^/.]+$/, '.jpg');
                              }
                              return (
                                <View
                                  key={mat._id}
                                  style={[
                                    styles.materialCard,
                                    isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.materialIconCircle,
                                      isDark && { backgroundColor: 'rgba(249, 115, 22, 0.15)' },
                                      thumbUrl ? { backgroundColor: 'transparent' } : {},
                                    ]}
                                  >
                                    {thumbUrl ? (
                                      <Image
                                        source={{ uri: thumbUrl }}
                                        style={{ width: '100%', height: '100%', borderRadius: 12 }}
                                        resizeMode="cover"
                                      />
                                    ) : (
                                      <Icon name="document-text" size={26} color="#F58220" />
                                    )}
                                  </View>
                                  <View style={styles.materialInfo}>
                                    <Text style={[styles.materialTitle, isDark && { color: '#FFFFFF' }]}>
                                      {mat.title}
                                    </Text>
                                    <Text style={[styles.materialTopic, isDark && { color: '#94A3B8' }]}>
                                      Topic: {mat.topic || 'General'}
                                    </Text>
                                    <Text style={[styles.materialDate, isDark && { color: '#64748B' }]}>
                                      Posted: {new Date(mat.createdAt).toLocaleDateString()}
                                    </Text>
                                  </View>

                                  <TouchableOpacity
                                    style={styles.openPdfBtnWrapper}
                                    activeOpacity={0.8}
                                    onPress={() => openPdfDocument(mat.cloudinary_url, mat.title)}
                                  >
                                    <LinearGradient
                                      colors={['#F58220', '#D97706']}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 0 }}
                                      style={styles.openPdfBtn}
                                    >
                                      <Icon name="arrow-down-circle" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                                      <Text style={styles.openPdfBtnText}>Open PDF</Text>
                                    </LinearGradient>
                                  </TouchableOpacity>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={[styles.emptyMaterialsBox, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <Icon name="folder-open-outline" size={44} color={isDark ? '#475569' : '#CBD5E1'} />
              <Text style={[styles.emptyStateText, isDark && { color: '#94A3B8' }]}>
                No video lectures or study materials available for this course yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Course Selection Dropdown Modal */}
      <Modal
        visible={courseModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCourseModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCourseModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.dropdownModalCard, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <View style={[styles.dropdownHeader, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
                <Text style={[styles.dropdownTitle, isDark && { color: '#FFFFFF' }]}>Select Course</Text>
                <TouchableOpacity
                  onPress={() => setCourseModalVisible(false)}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={20} color={isDark ? '#94A3B8' : '#71717A'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {batches.length > 0 ? (
                  batches.map((batch) => {
                    const isSelected = batch._id === activeBatchId;
                    const title = batch.course_id?.title || batch.name || 'Course';
                    const batchCode = batch.batch_code || batch.code || '';
                    return (
                      <TouchableOpacity
                        key={batch._id}
                        style={[
                          styles.courseOptionItem,
                          isDark && { backgroundColor: 'rgba(15, 23, 42, 0.75)', borderColor: 'rgba(255, 255, 255, 0.08)' },
                          isSelected && (isDark ? { backgroundColor: 'rgba(249, 115, 22, 0.18)', borderColor: '#F97316' } : styles.courseOptionItemSelected),
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          handleBatchSelect(batch._id);
                          setCourseModalVisible(false);
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            style={[
                              styles.courseOptionText,
                              isDark && { color: '#FFFFFF' },
                              isSelected && styles.courseOptionTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          {batchCode ? (
                            <Text style={[styles.courseOptionSub, isDark && { color: '#94A3B8' }]}>Batch: {batchCode}</Text>
                          ) : null}
                        </View>
                        {isSelected ? (
                          <View style={styles.activeCheckCircle}>
                            <Icon name="checkmark" size={14} color="#FFFFFF" />
                          </View>
                        ) : (
                          <Icon name="chevron-forward" size={16} color={isDark ? '#64748B' : '#D4D4D8'} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ color: isDark ? '#94A3B8' : '#71717A', fontSize: 14 }}>No courses available</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topNotificationBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  bellBtn: {
    padding: SPACING.xs,
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  scrollContent: {
    flex: 1,
  },
  contentContainerStyle: {
    paddingBottom: 110,
  },
  stickyHeader: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: SPACING.lg,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  topControlsContainer: {
    paddingHorizontal: 20,
    marginTop: 14,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingTop: 14,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  mainTitle: {
    fontSize: 28,
    ...FONTS.extraBold,
    color: '#18181B',
    marginBottom: 16,
  },

  compactCourseSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    }),
  },
  courseSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  compactCourseTitle: {
    fontSize: 14.5,
    ...FONTS.extraBold,
    color: '#18181B',
  },
  compactFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 26,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 0,
    ...Platform.select({
      web: { boxShadow: 'inset 0px 1px 3px rgba(0, 0, 0, 0.04)' },
      default: {}
    }),
  },
  compactFilterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 22,
  },
  compactFilterPillActive: {
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
  compactFilterText: {
    fontSize: 12.5,
    ...FONTS.medium,
    color: '#64748B',
  },
  compactFilterTextActive: {
    color: '#FFFFFF',
    ...FONTS.bold,
  },

  /* DROPDOWN MODAL STYLES (MATCHING DESIGN SCREENSHOT EXACTLY) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  dropdownModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    ...Platform.select({
      web: { boxShadow: '0px 12px 36px rgba(0, 0, 0, 0.16)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 10 },
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F6',
  },
  dropdownTitle: {
    fontSize: 18,
    ...FONTS.extraBold,
    color: '#18181B',
  },
  closeBtn: {
    padding: 4,
  },
  courseOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  courseOptionItemSelected: {
    backgroundColor: '#FFF5EB',
    borderColor: '#F58220',
  },
  courseOptionText: {
    fontSize: 14.5,
    ...FONTS.bold,
    color: '#374151',
  },
  courseOptionTextSelected: {
    color: '#F58220',
  },
  courseOptionSub: {
    fontSize: 12,
    ...FONTS.medium,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activeCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
  },

  contentSectionGroup: {
    marginBottom: 10,
  },
  sectionHeadingTitle: {
    fontSize: 18,
    ...FONTS.extraBold,
    color: '#18181B',
    marginBottom: 14,
  },

  /* MODULE SECTION & ACCORDION */
  moduleSectionBox: {
    marginBottom: 14,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.03)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    }),
  },
  moduleTag: {
    fontSize: 11.5,
    color: '#B45309',
    ...FONTS.bold,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  moduleTitle: {
    fontSize: 17.5,
    color: '#1A1A1A',
    ...FONTS.extraBold,
  },
  moduleMetaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  moduleMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  moduleMetaPillText: {
    fontSize: 10.5,
    ...FONTS.bold,
    color: '#EA580C',
  },
  moduleVideosContainer: {
    paddingTop: 4,
  },
  modulePdfsContainer: {
    marginTop: 8,
    marginBottom: 6,
  },
  moduleSubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  moduleSubHeaderTitle: {
    fontSize: 13,
    ...FONTS.bold,
    color: '#475569',
  },

  /* YOUTUBE STYLE FULL THUMBNAIL VIDEO CARDS */
  youtubeVideoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    ...Platform.select({
      web: { boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
    }),
  },
  widescreenThumbWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#18181B',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  widescreenThumbImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPlayOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubePlayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(245, 130, 32, 0.5)' },
      default: { shadowColor: '#F58220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
    }),
  },
  durationPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    ...FONTS.bold,
  },
  youtubeVideoMeta: {
    padding: 16,
  },
  metaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topicBadgePill: {
    backgroundColor: '#FFF3E6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  topicBadgeText: {
    fontSize: 10,
    ...FONTS.extraBold,
    color: '#F58220',
    letterSpacing: 0.5,
  },
  pdfBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pdfBadgeText: {
    fontSize: 11,
    ...FONTS.bold,
    color: '#B45309',
  },
  youtubeVideoTitle: {
    fontSize: 16.5,
    ...FONTS.extraBold,
    color: '#18181B',
    lineHeight: 23,
    marginBottom: 6,
  },
  youtubeChannelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  youtubeChannelText: {
    fontSize: 12,
    color: '#71717A',
    ...FONTS.medium,
  },

  /* MATERIALS LIST */
  materialsListContainer: {
    gap: 12,
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOW.sm,
  },
  materialIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF3E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  materialInfo: {
    flex: 1,
    marginRight: 10,
  },
  materialTitle: {
    fontSize: 15.5,
    ...FONTS.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  materialTopic: {
    fontSize: 12,
    color: '#64748B',
    ...FONTS.medium,
  },
  materialDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  openPdfBtnWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  openPdfBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  openPdfBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    ...FONTS.bold,
  },
  emptyMaterialsBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyStateText: {
    color: '#888888',
    ...FONTS.regular,
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  pendingBatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.25)',
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    }),
  },
  pendingBatchCardDark: {
    backgroundColor: '#141B26',
    borderColor: 'rgba(245, 130, 32, 0.3)',
  },
  pendingBatchIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(245, 130, 32, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pendingBatchTitle: {
    fontSize: 16,
    ...FONTS.bold,
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  pendingBatchDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
  },
});
