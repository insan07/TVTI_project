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

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
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
      api.get('/students/batches').then(res => {
        setBatches(res.data || []);
        if (res.data && res.data.length > 0) {
          const targetId = activeBatchId || res.data[0]._id;
          if (!activeBatchId) setActiveBatchId(targetId);
          fetchContent(targetId);
        }
      }).catch(e => console.warn('Failed to load batches:', e));
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

  // Group videos by topic/module
  const groupedVideos = videos.reduce((acc: any, v: any) => {
    const topic = v.topic || 'General Module';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(v);
    return acc;
  }, {});

  const showVideos = activeFilter === 'all' || activeFilter === 'videos';
  const showPdfs = activeFilter === 'all' || activeFilter === 'pdf';

  return (
    <View style={styles.container}>
      {/* FIXED STICKY TOP HEADER */}
      <View style={[styles.stickyHeader, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        {/* Main Heading */}
        <Text style={styles.mainTitle}>Uploads</Text>

        {/* Course Selector Dropdown Pill */}
        <TouchableOpacity
          style={styles.compactCourseSelect}
          activeOpacity={0.85}
          onPress={() => setCourseModalVisible(true)}
        >
          <View style={styles.courseSelectLeft}>
            <Text style={styles.compactCourseTitle} numberOfLines={1}>
              {courseTitle}
            </Text>
          </View>
          <Icon name="chevron-down" size={18} color="#71717A" />
        </TouchableOpacity>

        {/* Filter Bar Pills */}
        <View style={styles.compactFilterRow}>
          <TouchableOpacity
            style={[styles.compactFilterPill, activeFilter === 'all' && styles.compactFilterPillActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.8}
          >
            <Icon
              name="grid-outline"
              size={13}
              color={activeFilter === 'all' ? '#FFFFFF' : '#52525B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.compactFilterText, activeFilter === 'all' && styles.compactFilterTextActive]}>
              All ({videos.length + materials.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.compactFilterPill, activeFilter === 'videos' && styles.compactFilterPillActive]}
            onPress={() => setActiveFilter('videos')}
            activeOpacity={0.8}
          >
            <Icon
              name="play-circle-outline"
              size={13}
              color={activeFilter === 'videos' ? '#FFFFFF' : '#52525B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.compactFilterText, activeFilter === 'videos' && styles.compactFilterTextActive]}>
              Videos ({videos.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.compactFilterPill, activeFilter === 'pdf' && styles.compactFilterPillActive]}
            onPress={() => setActiveFilter('pdf')}
            activeOpacity={0.8}
          >
            <Icon
              name="document-text-outline"
              size={13}
              color={activeFilter === 'pdf' ? '#FFFFFF' : '#52525B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.compactFilterText, activeFilter === 'pdf' && styles.compactFilterTextActive]}>
              PDFs ({materials.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.contentContainerStyle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentPadding}>

          {/* SECTION 1: VIDEO LECTURES (YOUTUBE WIDESCREEN THUMBNAILS) */}
          {showVideos && (
            <View style={styles.contentSectionGroup}>
              {activeFilter === 'all' && (
                <Text style={styles.sectionHeadingTitle}>Video Lectures</Text>
              )}

              {loadingVideos ? (
                <ActivityIndicator size="large" color="#F58220" style={{ marginVertical: 30 }} />
              ) : Object.keys(groupedVideos).length > 0 ? (
                Object.keys(groupedVideos).map((topic, idx) => {
                  const isExpanded = !!expandedModules[topic];
                  return (
                    <View key={topic} style={styles.moduleSectionBox}>
                      <TouchableOpacity
                        style={[styles.moduleHeader, { marginBottom: isExpanded ? 12 : 0 }]}
                        activeOpacity={0.8}
                        onPress={() => toggleModule(topic)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.moduleTag}>MODULE {idx + 1}</Text>
                          <Text style={styles.moduleTitle}>{topic}</Text>
                        </View>
                        <Icon
                          name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                          size={20}
                          color="#1A1A1A"
                        />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.moduleVideosContainer}>
                          {groupedVideos[topic].map((v: any, vIdx: number) => {
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
                              thumbUrl = null; // Will fall through to placeholder icon
                            }

                            return (
                              <TouchableOpacity
                                key={v._id || vIdx}
                                style={styles.youtubeVideoCard}
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
                                    <View style={styles.topicBadgePill}>
                                      <Text style={styles.topicBadgeText}>
                                        {(v.topic || 'LECTURE').toUpperCase()}
                                      </Text>
                                    </View>

                                    {v.notes_url ? (
                                      <View style={styles.pdfBadgePill}>
                                        <Icon
                                          name="document-text"
                                          size={12}
                                          color="#B45309"
                                          style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.pdfBadgeText}>PDF Notes</Text>
                                      </View>
                                    ) : null}
                                  </View>

                                  <Text style={styles.youtubeVideoTitle} numberOfLines={2}>
                                    {v.title}
                                  </Text>

                                  <View style={styles.youtubeChannelRow}>
                                    <Icon
                                      name="time-outline"
                                      size={14}
                                      color="#71717A"
                                      style={{ marginRight: 4 }}
                                    />
                                    <Text style={styles.youtubeChannelText}>
                                      {formatUploadedTime(v.createdAt || v.uploaded_at)}
                                    </Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyMaterialsBox}>
                  <Icon name="play-circle-outline" size={44} color="#CBD5E1" />
                  <Text style={styles.emptyStateText}>
                    No video lectures available for this course.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* SECTION 2: PDF STUDY MATERIALS */}
          {showPdfs && (
            <View style={styles.contentSectionGroup}>
              {activeFilter === 'all' && (
                <Text style={[styles.sectionHeadingTitle, { marginTop: showVideos ? 24 : 0 }]}>
                  PDF Study Notes
                </Text>
              )}

              {loadingMaterials ? (
                <ActivityIndicator size="large" color="#F58220" style={{ marginVertical: 30 }} />
              ) : materials.length > 0 ? (
                <View style={styles.materialsListContainer}>
                  {materials.map((mat) => {
                    let thumbUrl = null;
                    if (mat.cloudinary_url && mat.cloudinary_url.includes('cloudinary.com')) {
                      thumbUrl = mat.cloudinary_url.replace(/\.[^/.]+$/, ".jpg");
                    }
                    return (
                    <View key={mat._id} style={styles.materialCard}>
                      <View style={[styles.materialIconCircle, thumbUrl ? { backgroundColor: 'transparent' } : {}]}>
                        {thumbUrl ? (
                          <Image source={{ uri: thumbUrl }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                        ) : (
                          <Icon name="document-text" size={26} color="#F58220" />
                        )}
                      </View>
                      <View style={styles.materialInfo}>
                        <Text style={styles.materialTitle}>{mat.title}</Text>
                        <Text style={styles.materialTopic}>Topic: {mat.topic || 'General'}</Text>
                        <Text style={styles.materialDate}>
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
              ) : (
                <View style={styles.emptyMaterialsBox}>
                  <Icon name="document-text-outline" size={44} color="#CBD5E1" />
                  <Text style={styles.emptyStateText}>
                    No PDF study materials posted yet for this course.
                  </Text>
                </View>
              )}
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
            <View style={styles.dropdownModalCard}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Select Course</Text>
                <TouchableOpacity
                  onPress={() => setCourseModalVisible(false)}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={20} color="#71717A" />
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
                          isSelected && styles.courseOptionItemSelected,
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
                              isSelected && styles.courseOptionTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          {batchCode ? (
                            <Text style={styles.courseOptionSub}>Batch: {batchCode}</Text>
                          ) : null}
                        </View>
                        {isSelected ? (
                          <View style={styles.activeCheckCircle}>
                            <Icon name="checkmark" size={14} color="#FFFFFF" />
                          </View>
                        ) : (
                          <Icon name="chevron-forward" size={16} color="#D4D4D8" />
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#71717A', fontSize: 14 }}>No courses available</Text>
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
  contentPadding: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
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
    marginBottom: 12,
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  compactFilterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  compactFilterPillActive: {
    backgroundColor: '#18181B',
    borderColor: '#18181B',
  },
  compactFilterText: {
    fontSize: 12,
    ...FONTS.medium,
    color: '#52525B',
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
    marginBottom: 12,
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
  moduleVideosContainer: {
    paddingTop: 4,
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
    ...StyleSheet.absoluteFillObject,
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
});
