import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  Alert,
  Easing,
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
import { COLORS, FONTS, SPACING } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { communicationTheme } from '../../components/shared/communicationTheme';
import { studentCommunicationSurface } from '../../components/student/StudentHomeCard';
import UploadVideoPreview from '../../components/student/UploadVideoPreview';
import { formatUploadDate, getUploadThumbnail } from '../../utils/uploadLibrary';
import { useTheme } from '../../context/ThemeContext';
import {
  enableNativeScreenCaptureProtection,
  disableNativeScreenCaptureProtection,
} from '../../utils/screenCaptureProtection';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !(globalThis as any).nativeFabricUIManager) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function VideosScreen({ unreadCount }: { unreadCount?: number }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const cardSurface = [studentCommunicationSurface(isDark), styles.uploadSurface];

  const [activeFilter, setActiveFilter] = useState<'all' | 'videos' | 'pdf'>('all');
  const [filterWidth, setFilterWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const filterPosition = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const filterInitialized = useRef(false);
  const filterIndex = ['all', 'videos', 'pdf'].indexOf(activeFilter);
  const filterTabWidth = Math.max(0, (filterWidth - 8) / 3);
  const [batches, setBatches] = useState<any[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [courseModalVisible, setCourseModalVisible] = useState(false);

  const [videos, setVideos] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotion(enabled);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!filterInitialized.current || reduceMotion) {
      filterInitialized.current = true;
      filterPosition.setValue(filterIndex);
      contentOpacity.setValue(1);
      return;
    }

    contentOpacity.setValue(0.75);
    const animation = Animated.parallel([
      Animated.timing(filterPosition, {
        toValue: filterIndex,
        duration: 260,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [filterIndex, reduceMotion, filterPosition, contentOpacity]);

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
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
              style={[cardSurface, styles.compactCourseSelect]}
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
            <View style={[cardSurface, styles.compactFilterRow]}>
              <View
                accessibilityRole="tablist"
                style={styles.filterTrack}
                onLayout={event => setFilterWidth(event.nativeEvent.layout.width)}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.filterIndicator,
                    {
                      width: filterTabWidth,
                      opacity: filterWidth > 0 ? 1 : 0,
                      backgroundColor: isDark ? COLORS.secondary : COLORS.primary,
                      transform: [{ translateX: Animated.multiply(filterPosition, filterTabWidth + 4) }],
                    },
                  ]}
                />
              {([
                { key: 'all', label: 'All', icon: 'layers-outline' },
                { key: 'videos', label: 'Videos', icon: 'play-circle-outline' },
                { key: 'pdf', label: 'PDFs', icon: 'document-text-outline' },
              ] as const).map(filter => {
                const selected = activeFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    accessibilityRole="tab"
                    accessibilityLabel={filter.label}
                    accessibilityState={{ selected }}
                    activeOpacity={0.75}
                    style={styles.compactFilterPill}
                    onPress={() => setActiveFilter(filter.key)}
                  >
                    <Icon
                      name={filter.icon}
                      size={14}
                      color={selected ? '#FFFFFF' : theme.muted}
                    />
                    <Text style={[
                      styles.compactFilterText,
                      { color: selected ? isDark ? COLORS.primary : '#FFFFFF' : theme.muted },
                      selected && styles.compactFilterTextActive,
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              </View>
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
        <Animated.View style={[styles.contentPadding, { opacity: contentOpacity }]}>
          {loadingVideos || loadingMaterials ? (
            <View style={[cardSurface, styles.loadingCard]}>
              <ActivityIndicator size="large" color={COLORS.secondary} />
            </View>
          ) : batches.length === 0 ? (
            <View style={[cardSurface, styles.pendingBatchCard]}>
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
                <View key={topic} style={[cardSurface, styles.moduleSectionBox]}>
                  <TouchableOpacity
                    style={styles.moduleHeader}
                    accessibilityRole="button"
                    accessibilityLabel={`${topic}, ${moduleVideos.length} videos, ${moduleMaterials.length} documents`}
                    accessibilityState={{ expanded: isExpanded }}
                    activeOpacity={0.75}
                    onPress={() => toggleModule(topic)}
                  >
                    <View style={styles.moduleHeading}>
                      <Text style={styles.moduleTag}>MODULE {String(idx + 1).padStart(2, '0')}</Text>
                      <Text style={[styles.moduleTitle, { color: theme.text }]}>{topic}</Text>
                      <View style={styles.moduleMetadata}>
                        {hasVideos && showVideos && (
                          <View style={styles.moduleCount}>
                            <Icon name="play-circle-outline" size={14} color={COLORS.secondary} />
                            <Text style={[styles.moduleCountText, { color: theme.muted }]}>
                              {moduleVideos.length} {moduleVideos.length === 1 ? 'video' : 'videos'}
                            </Text>
                          </View>
                        )}
                        {hasMaterials && showPdfs && (
                          <View style={styles.moduleCount}>
                            <Icon name="document-text-outline" size={14} color={COLORS.secondary} />
                            <Text style={[styles.moduleCountText, { color: theme.muted }]}>
                              {moduleMaterials.length} {moduleMaterials.length === 1 ? 'document' : 'documents'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={[styles.moduleChevron, { borderColor: theme.line }]}>
                      <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={17} color={theme.text} />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View>
                      {showVideos && moduleVideos.map((video: any) => (
                        <TouchableOpacity
                          key={video._id}
                          style={[styles.videoLesson, { borderTopColor: theme.line }]}
                          accessibilityRole="button"
                          accessibilityLabel={`Open video: ${video.title}`}
                          activeOpacity={0.85}
                          onPress={() => navigation.navigate('VideoPlayer', {
                            videoId: video._id,
                            batchId: activeBatchId,
                          })}
                        >
                          <View style={styles.widescreenThumbWrapper}>
                            <UploadVideoPreview video={video} />
                            <LinearGradient
                              pointerEvents="none"
                              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']}
                              style={styles.thumbPlayOverlay}
                            >
                              <View style={styles.videoPlayButton}>
                                <Icon name="play" size={23} color="#FFFFFF" style={{ marginLeft: 3 }} />
                              </View>
                            </LinearGradient>
                            {!!video.duration && (
                              <View style={styles.durationPill}>
                                <Text style={styles.durationPillText}>{video.duration}</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.videoDetails}>
                            <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
                              {video.title}
                            </Text>
                            <View style={styles.videoFooter}>
                              <Text style={[styles.uploadDate, { color: theme.muted }]}>
                                {formatUploadDate(video.createdAt || video.uploaded_at)}
                              </Text>
                              {!!video.notes_url && (
                                <TouchableOpacity
                                  style={styles.notesAction}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Open notes for ${video.title}`}
                                  onPress={event => {
                                    event.stopPropagation();
                                    openPdfDocument(video.notes_url, `${video.title} (Notes)`);
                                  }}
                                >
                                  <Icon name="document-text-outline" size={15} color={COLORS.secondary} />
                                  <Text style={styles.notesActionText}>Notes</Text>
                                  <Icon name="open-outline" size={14} color={COLORS.secondary} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                      {showPdfs && moduleMaterials.map((material: any) => {
                        const thumbnail = getUploadThumbnail(material);
                        return (
                          <TouchableOpacity
                            key={material._id}
                            style={[styles.materialRow, { borderTopColor: theme.line }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Open document: ${material.title}`}
                            activeOpacity={0.75}
                            onPress={() => openPdfDocument(material.cloudinary_url, material.title)}
                          >
                            <View style={styles.materialIcon}>
                              {thumbnail ? (
                                <Image source={{ uri: thumbnail }} style={styles.materialThumbnail} />
                              ) : <Icon name="document-text-outline" size={23} color={COLORS.secondary} />}
                            </View>
                            <View style={styles.materialInfo}>
                              <Text style={[styles.materialTitle, { color: theme.text }]} numberOfLines={2}>
                                {material.title}
                              </Text>
                              <Text style={[styles.uploadDate, { color: theme.muted }]}>
                                {formatUploadDate(material.createdAt || material.uploaded_at)}
                              </Text>
                            </View>
                            <Icon name="arrow-forward" size={19} color={theme.text} style={styles.materialArrow} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={[cardSurface, styles.emptyMaterialsBox]}>
              <Icon name="folder-open-outline" size={44} color={isDark ? '#475569' : '#CBD5E1'} />
              <Text style={[styles.emptyStateText, isDark && { color: '#94A3B8' }]}>
                No video lectures or study materials available for this course yet.
              </Text>
            </View>
          )}
        </Animated.View>
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
            <View style={[cardSurface, styles.dropdownModalCard]}>
              <View style={[styles.dropdownHeader, { borderBottomColor: theme.line }]}>
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
                          cardSurface,
                          styles.courseOptionItem,
                          isSelected && styles.courseOptionItemSelected,
                          isSelected && isDark && styles.courseOptionItemSelectedDark,
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 14,
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
  uploadSurface: { borderRadius: 14 },
  compactFilterRow: {
    padding: 3,
    borderRadius: 12,
  },
  filterTrack: {
    flexDirection: 'row',
    gap: 4,
  },
  filterIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 8,
  },
  compactFilterPill: {
    flex: 1,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  compactFilterText: {
    ...FONTS.medium,
    fontSize: 11.5,
    lineHeight: 16,
  },
  compactFilterTextActive: { ...FONTS.semiBold },

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
    padding: 18,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 10,
  },
  courseOptionItemSelected: {
    backgroundColor: '#FFF5EB',
    borderColor: COLORS.secondary,
  },
  courseOptionItemSelectedDark: { backgroundColor: 'rgba(245, 130, 32, 0.12)' },
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

  moduleSectionBox: { marginBottom: 18 },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20 },
  moduleHeading: { flex: 1, minWidth: 0 },
  moduleTag: {
    ...FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: COLORS.secondary,
    marginBottom: 6,
  },
  moduleTitle: { ...FONTS.semiBold, fontSize: 18, lineHeight: 25, letterSpacing: -0.35 },
  moduleMetadata: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6, marginTop: 9 },
  moduleCount: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  moduleCountText: { ...FONTS.regular, fontSize: 11, lineHeight: 16 },
  moduleChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLesson: { borderTopWidth: StyleSheet.hairlineWidth },
  widescreenThumbWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#202020',
    overflow: 'hidden',
  },
  thumbPlayOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPill: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
  },
  durationPillText: { ...FONTS.medium, fontSize: 10, color: '#FFFFFF' },
  videoDetails: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  videoTitle: { ...FONTS.semiBold, fontSize: 16, lineHeight: 24, letterSpacing: -0.2 },
  videoFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    rowGap: 4,
    marginTop: 5,
  },
  uploadDate: { ...FONTS.regular, fontSize: 11, lineHeight: 18, flexShrink: 1 },
  notesAction: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36 },
  notesActionText: { ...FONTS.medium, fontSize: 12, color: COLORS.secondary },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  materialIcon: {
    width: 42,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(245,130,32,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  materialThumbnail: { width: '100%', height: '100%' },
  materialInfo: { flex: 1, minWidth: 0 },
  materialTitle: { ...FONTS.semiBold, fontSize: 14, lineHeight: 21, marginBottom: 4 },
  materialArrow: { transform: [{ rotate: '-45deg' }] },
  emptyMaterialsBox: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#888888',
    ...FONTS.regular,
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  pendingBatchCard: {
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingCard: { paddingVertical: 36, alignItems: 'center' },
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
