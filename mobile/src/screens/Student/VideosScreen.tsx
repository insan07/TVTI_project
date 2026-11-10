import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Alert, Image, LayoutAnimation,
  Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, UIManager, useWindowDimensions, View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { API_URL } from '../../config/constants';
import { COLORS, FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { communicationTheme } from '../../components/shared/communicationTheme';
import {
  formatUploadDate, getUploadThumbnail, groupUploadModules,
  uploadDocumentUrl, type UploadItem,
} from '../../utils/uploadLibrary';
import {
  enableNativeScreenCaptureProtection, disableNativeScreenCaptureProtection,
} from '../../utils/screenCaptureProtection';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !(globalThis as any).nativeFabricUIManager) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Filter = 'all' | 'videos' | 'pdf';
type Batch = { _id: string; name?: string; course_id?: { title?: string } };

export default function VideosScreen({ unreadCount = 0 }: { unreadCount?: number }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [videos, setVideos] = useState<UploadItem[]>([]);
  const [materials, setMaterials] = useState<UploadItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const activeBatchRef = useRef<string | null>(null);
  const focusedRef = useRef(false);
  const contentRequestRef = useRef(0);
  const batchRequestRef = useRef(0);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) reduceMotionRef.current = enabled;
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
      reduceMotionRef.current = enabled;
    });
    return () => { mounted = false; subscription.remove(); };
  }, []);

  const fetchContent = useCallback(async (batchId: string) => {
    const request = ++contentRequestRef.current;
    setLoadingContent(true);
    setLoadError(null);
    const [videoResult, materialResult] = await Promise.allSettled([
      api.get(`/students/batches/${batchId}/videos`),
      api.get(`/students/batches/${batchId}/materials`),
    ]);
    if (!focusedRef.current || request !== contentRequestRef.current) return;
    setVideos(videoResult.status === 'fulfilled' && Array.isArray(videoResult.value.data) ? videoResult.value.data : []);
    setMaterials(materialResult.status === 'fulfilled' && Array.isArray(materialResult.value.data) ? materialResult.value.data : []);
    if (videoResult.status === 'rejected' || materialResult.status === 'rejected') {
      setLoadError(videoResult.status === 'rejected' && materialResult.status === 'rejected'
        ? 'Unable to load uploads.' : 'Some uploads could not be loaded.');
    }
    setLoadingContent(false);
  }, []);

  const fetchBatches = useCallback(async () => {
    const request = ++batchRequestRef.current;
    setLoadingBatches(true);
    setLoadError(null);
    try {
      const response = await api.get('/students/batches');
      if (!focusedRef.current || request !== batchRequestRef.current) return;
      const nextBatches: Batch[] = Array.isArray(response.data) ? response.data : [];
      setBatches(nextBatches);
      const nextId = nextBatches.find(batch => batch._id === activeBatchRef.current)?._id || nextBatches[0]?._id || null;
      if (nextId !== activeBatchRef.current) setExpandedModules({});
      activeBatchRef.current = nextId;
      setActiveBatchId(nextId);
      if (nextId) await fetchContent(nextId);
      else {
        contentRequestRef.current += 1;
        setVideos([]);
        setMaterials([]);
        setLoadingContent(false);
      }
    } catch {
      if (focusedRef.current && request === batchRequestRef.current) setLoadError('Unable to load your courses.');
    } finally {
      if (focusedRef.current && request === batchRequestRef.current) setLoadingBatches(false);
    }
  }, [fetchContent]);

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    void enableNativeScreenCaptureProtection();
    void fetchBatches();
    return () => {
      focusedRef.current = false;
      contentRequestRef.current += 1;
      batchRequestRef.current += 1;
      void disableNativeScreenCaptureProtection();
    };
  }, [fetchBatches]));

  const selectBatch = (batchId: string) => {
    setCourseModalVisible(false);
    if (batchId === activeBatchRef.current) return;
    activeBatchRef.current = batchId;
    setActiveBatchId(batchId);
    setVideos([]);
    setMaterials([]);
    setExpandedModules({});
    void fetchContent(batchId);
  };

  const toggleModule = (key: string) => {
    if (!reduceMotionRef.current) LayoutAnimation.configureNext({
      duration: 180,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setExpandedModules(previous => ({ ...previous, [key]: !previous[key] }));
  };

  const openDocument = (rawUrl: string | undefined, title: string) => {
    if (!rawUrl) {
      Alert.alert('Document unavailable', 'This document is not available yet.');
      return;
    }
    navigation.navigate('PdfViewer', { pdfUrl: uploadDocumentUrl(rawUrl, API_URL), title });
  };

  const currentBatch = batches.find(batch => batch._id === activeBatchId);
  const modules = useMemo(() => groupUploadModules(videos, materials), [videos, materials]);
  const visibleModules = modules.filter(module => activeFilter === 'videos'
    ? module.videos.length > 0 : activeFilter === 'pdf' ? module.materials.length > 0 : true);
  const showVideos = activeFilter !== 'pdf';
  const showMaterials = activeFilter !== 'videos';
  const initialLoading = loadingBatches && batches.length === 0;

  const renderVideo = (video: UploadItem) => {
    const thumbnail = getUploadThumbnail(video);
    const date = formatUploadDate(video.createdAt || video.uploaded_at);
    return (
      <TouchableOpacity
        key={`video:${video._id}`}
        style={[styles.videoRow, { borderTopColor: theme.line }]}
        onPress={() => navigation.navigate('VideoPlayer', { videoId: video._id, batchId: activeBatchId })}
        activeOpacity={0.65}
        accessibilityRole="button"
        accessibilityLabel={`Open video: ${video.title}`}
      >
        <View style={[styles.thumbnail, wide && styles.thumbnailWide]}>
          {!!thumbnail && <Image source={{ uri: thumbnail }} style={styles.thumbnailImage} resizeMode="cover" />}
          <View style={styles.playOverlay}><Icon name="play" size={22} color={COLORS.secondary} /></View>
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>{video.title}</Text>
          <View style={styles.itemMetadata}>
            {!!date && <Text style={[styles.metadataText, { color: theme.muted }]}>{date}</Text>}
            {!!video.duration && <Text style={[styles.metadataText, { color: theme.muted }]}>{video.duration}</Text>}
          </View>
          {!!video.notes_url && (
            <TouchableOpacity
              onPress={event => { event.stopPropagation(); openDocument(video.notes_url, `${video.title} (Notes)`); }}
              style={styles.notesButton}
              accessibilityRole="button"
              accessibilityLabel={`Open notes for ${video.title}`}
              activeOpacity={0.65}
            >
              <Icon name="document-text-outline" size={14} color={COLORS.secondary} />
              <Text style={styles.notesText}>Notes</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMaterial = (material: UploadItem) => (
    <TouchableOpacity
      key={`material:${material._id}`}
      style={[styles.materialRow, { borderTopColor: theme.line }]}
      onPress={() => openDocument(material.cloudinary_url, material.title)}
      accessibilityRole="button"
      accessibilityLabel={`Open document: ${material.title}`}
      activeOpacity={0.65}
    >
      <Icon name="document-text-outline" size={25} color={COLORS.secondary} />
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>{material.title}</Text>
        <Text style={[styles.metadataText, { color: theme.muted, marginTop: 6 }]}>{formatUploadDate(material.createdAt || material.uploaded_at)}</Text>
      </View>
      <Icon name="arrow-forward" size={17} color={theme.muted} style={{ transform: [{ rotate: '-45deg' }] }} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.headerShell}>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={[styles.pageTitle, { color: theme.text }]}>Uploads</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} accessibilityRole="button" accessibilityLabel={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'} style={styles.notificationButton}>
            <Icon name="notifications-outline" size={23} color={theme.text} />
            {unreadCount > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>
        {batches.length > 0 && (
          <>
            <TouchableOpacity
              onPress={() => setCourseModalVisible(true)}
              style={[styles.courseSelector, { borderColor: theme.line }]}
              accessibilityRole="button"
              accessibilityLabel={`Select course. ${currentBatch?.course_id?.title || currentBatch?.name || 'Course'}`}
              accessibilityState={{ expanded: courseModalVisible }}
              activeOpacity={0.7}
            >
              <View style={styles.itemContent}>
                <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={2}>{currentBatch?.course_id?.title || currentBatch?.name || 'Select course'}</Text>
                {!!currentBatch?.name && <Text style={[styles.batchName, { color: theme.muted }]} numberOfLines={1}>{currentBatch.name}</Text>}
              </View>
              <Icon name="chevron-down" size={18} color={theme.muted} />
            </TouchableOpacity>
            <View style={[styles.filterRow, { borderBottomColor: theme.line }]}>
              {([
                { key: 'all', label: 'All', count: videos.length + materials.length },
                { key: 'videos', label: 'Videos', count: videos.length },
                { key: 'pdf', label: 'Materials', count: materials.length },
              ] as const).map(filter => {
                const selected = activeFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() => setActiveFilter(filter.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${filter.label}, ${filter.count} items`}
                    style={[styles.filterTab, { borderBottomColor: selected ? COLORS.secondary : 'transparent' }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterLabel, { color: selected ? theme.text : theme.muted }, selected && styles.selectedFilter]}>{filter.label}</Text>
                    <Text style={[styles.filterCount, { color: theme.muted }]}>{filter.count}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(120, insets.bottom + 104) }]}
        refreshControl={<RefreshControl refreshing={loadingBatches && batches.length > 0} onRefresh={() => void fetchBatches()} colors={[COLORS.secondary]} tintColor={COLORS.secondary} />}
      >
        <View style={styles.contentShell}>
          {!!loadError && (
            <View style={[styles.errorRow, { borderBottomColor: theme.line }]}>
              <Text style={[styles.emptyText, { color: theme.muted, flex: 1 }]}>{loadError}</Text>
              <TouchableOpacity onPress={() => void fetchBatches()} accessibilityRole="button" style={styles.retryButton}><Text style={styles.notesText}>Retry</Text></TouchableOpacity>
            </View>
          )}
          {initialLoading || loadingContent ? (
            <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.secondary} /></View>
          ) : batches.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No uploads yet</Text>
              <Text style={[styles.emptyText, { color: theme.muted }]}>Your uploads will appear once a batch is assigned.</Text>
            </View>
          ) : visibleModules.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>{activeFilter === 'videos' ? 'No videos yet' : activeFilter === 'pdf' ? 'No materials yet' : 'No uploads yet'}</Text>
            </View>
          ) : visibleModules.map(module => {
            const expanded = !!expandedModules[module.key];
            const position = modules.findIndex(item => item.key === module.key) + 1;
            const counts = [
              showVideos && module.videos.length ? `${module.videos.length} ${module.videos.length === 1 ? 'video' : 'videos'}` : '',
              showMaterials && module.materials.length ? `${module.materials.length} ${module.materials.length === 1 ? 'file' : 'files'}` : '',
            ].filter(Boolean).join(' · ');
            return (
              <View key={module.key} style={[styles.moduleSection, { borderBottomColor: theme.line }]}>
                <TouchableOpacity
                  onPress={() => toggleModule(module.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${module.title}, ${counts}`}
                  accessibilityState={{ expanded }}
                  style={styles.moduleHeader}
                  activeOpacity={0.65}
                >
                  <Text style={styles.moduleNumber}>{String(position).padStart(2, '0')}</Text>
                  <View style={styles.itemContent}>
                    <Text style={[styles.moduleTitle, { color: theme.text }]}>{module.title}</Text>
                    <Text style={[styles.metadataText, { color: theme.muted, marginTop: 5 }]}>{counts}</Text>
                  </View>
                  <Icon name={expanded ? 'remove' : 'add'} size={21} color={theme.muted} />
                </TouchableOpacity>
                {expanded && (
                  <View style={[styles.moduleBody, wide && styles.moduleBodyWide]}>
                    {showVideos && module.videos.map(renderVideo)}
                    {showMaterials && module.materials.map(renderMaterial)}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={courseModalVisible} transparent animationType="fade" onRequestClose={() => setCourseModalVisible(false)}>
        <View style={[styles.modalOverlay, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCourseModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close course picker" />
          <View accessibilityViewIsModal style={[styles.courseDialog, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <View style={[styles.dialogHeader, { borderBottomColor: theme.line }]}>
              <Text accessibilityRole="header" style={[styles.dialogTitle, { color: theme.text }]}>Select course</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close course picker" style={styles.closeButton}><Icon name="close" size={22} color={theme.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.dialogScroll} contentContainerStyle={styles.courseOptions}>
              {batches.map((batch, index) => {
                const selected = batch._id === activeBatchId;
                return (
                  <TouchableOpacity
                    key={batch._id}
                    onPress={() => selectBatch(batch._id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    activeOpacity={0.65}
                    style={[styles.courseOption, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}
                  >
                    <View style={styles.itemContent}>
                      <Text style={[styles.courseTitle, { color: theme.text }]}>{batch.course_id?.title || batch.name || 'Course'}</Text>
                      {!!batch.name && <Text style={[styles.batchName, { color: theme.muted }]}>{batch.name}</Text>}
                    </View>
                    {selected && <Icon name="checkmark" size={22} color={COLORS.secondary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerShell: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  pageTitle: { ...FONTS.semiBold, fontSize: 28, lineHeight: 38, letterSpacing: -0.8 },
  notificationButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  notificationDot: { position: 'absolute', width: 5, height: 5, borderRadius: 3, top: 9, right: 10, backgroundColor: COLORS.secondary },
  courseSelector: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 68, marginBottom: 18 },
  courseTitle: { ...FONTS.semiBold, fontSize: 15, lineHeight: 22, letterSpacing: -0.2 },
  batchName: { ...FONTS.regular, fontSize: 12, lineHeight: 18, marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 24, borderBottomWidth: StyleSheet.hairlineWidth },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, borderBottomWidth: 2 },
  filterLabel: { ...FONTS.regular, fontSize: 13 },
  selectedFilter: { ...FONTS.semiBold },
  filterCount: { ...FONTS.regular, fontSize: 11 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  contentShell: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: 24 },
  moduleSection: { borderBottomWidth: StyleSheet.hairlineWidth },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 24 },
  moduleNumber: { ...FONTS.medium, fontSize: 12, width: 24, color: COLORS.secondary, alignSelf: 'flex-start', marginTop: 4 },
  moduleTitle: { ...FONTS.semiBold, fontSize: 17, lineHeight: 25, letterSpacing: -0.3 },
  moduleBody: { paddingBottom: 12 },
  moduleBodyWide: { paddingLeft: 40 },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20, borderTopWidth: StyleSheet.hairlineWidth },
  thumbnail: { width: 96, aspectRatio: 16 / 10, backgroundColor: COLORS.primary, borderRadius: 7, overflow: 'hidden' },
  thumbnailWide: { width: 144 },
  thumbnailImage: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.16)', alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1, minWidth: 0 },
  itemTitle: { ...FONTS.semiBold, fontSize: 15, lineHeight: 23, letterSpacing: -0.2 },
  itemMetadata: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4, marginTop: 7 },
  metadataText: { ...FONTS.regular, fontSize: 11, lineHeight: 17 },
  notesButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, alignSelf: 'flex-start', marginTop: 2 },
  notesText: { ...FONTS.semiBold, fontSize: 12, color: COLORS.secondary },
  materialRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 22, borderTopWidth: StyleSheet.hairlineWidth },
  loading: { paddingVertical: 64, alignItems: 'center' },
  emptyState: { paddingVertical: 64, gap: 10 },
  emptyTitle: { ...FONTS.semiBold, fontSize: 17, lineHeight: 25 },
  emptyText: { ...FONTS.regular, fontSize: 13, lineHeight: 21 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  retryButton: { minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  courseDialog: { width: '100%', maxWidth: 560, maxHeight: '80%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 12, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth },
  dialogTitle: { ...FONTS.semiBold, fontSize: 16 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dialogScroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  courseOptions: { paddingHorizontal: 24 },
  courseOption: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20 },
});
