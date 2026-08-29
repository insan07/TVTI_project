import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';

export default function VideosScreen({ unreadCount }: { unreadCount?: number }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'videos' | 'materials'>('videos');
  const [batches, setBatches] = useState<any[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  
  const [videos, setVideos] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/students/batches');
      setBatches(res.data || []);
      if (res.data && res.data.length > 0) {
        const firstId = res.data[0]._id;
        setActiveBatchId(firstId);
        fetchContent(firstId);
      }
    } catch (e) {
      console.warn('Failed to load batches:', e);
    }
  };

  const fetchContent = (batchId: string) => {
    fetchVideos(batchId);
    fetchMaterials(batchId);
  };

  const fetchVideos = async (batchId: string) => {
    setLoadingVideos(true);
    try {
      const res = await api.get(`/students/batches/${batchId}/videos`);
      setVideos(res.data || []);
      
      // Auto-expand first topic
      if (res.data && res.data.length > 0) {
        const firstTopic = res.data[0].topic || 'General Module';
        setExpandedModules((prev) => ({ ...prev, [firstTopic]: true }));
      }
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
    navigation.navigate('PdfViewer', { pdfUrl: rawUrl, title });
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

  return (
    <View style={styles.container}>
      {/* Top Notification Bar */}
      <View style={[styles.topNotificationBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="notifications-outline" size={24} color="#1A1A1A" />
          {unreadCount && unreadCount > 0 ? <View style={styles.badgeDot} /> : null}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.contentPadding}>
          {/* Select Course Section */}
          <Text style={styles.selectLabel}>Select Course</Text>
          <TouchableOpacity
            style={styles.courseSelectBox}
            activeOpacity={0.8}
            onPress={() => {
              if (batches.length > 1) {
                const currIdx = batches.findIndex((b) => b._id === activeBatchId);
                const nextBatch = batches[(currIdx + 1) % batches.length];
                if (nextBatch) handleBatchSelect(nextBatch._id);
              }
            }}
          >
            <Text style={styles.courseSelectTitle}>{courseTitle}</Text>
            <Icon name="chevron-down-outline" size={20} color="#555" />
          </TouchableOpacity>

          {/* Select Batch Section */}
          <Text style={styles.selectLabel}>Select Batch</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.batchPillsContainer}
          >
            {batches.length > 0 ? (
              batches.map((b, idx) => {
                const isActive = activeBatchId === b._id;
                return (
                  <TouchableOpacity
                    key={b._id}
                    style={[styles.batchPill, isActive ? styles.batchPillActive : styles.batchPillInactive]}
                    onPress={() => handleBatchSelect(b._id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.batchPillText, isActive ? styles.batchPillTextActive : styles.batchPillTextInactive]}>
                      {b.name || `Batch 0${idx + 1}`}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={{ color: '#888888', ...FONTS.regular, paddingVertical: 4 }}>
                No batches assigned.
              </Text>
            )}
          </ScrollView>

          {/* Main Content Tabs: Videos vs Study Materials (PDFs) */}
          <View style={styles.tabToggleBar}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'videos' && styles.toggleBtnActive]}
              onPress={() => setActiveTab('videos')}
              activeOpacity={0.8}
            >
              <Icon name="play-circle" size={18} color={activeTab === 'videos' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
              <Text style={[styles.toggleBtnText, activeTab === 'videos' && styles.toggleBtnTextActive]}>
                Videos ({videos.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'materials' && styles.toggleBtnActive]}
              onPress={() => setActiveTab('materials')}
              activeOpacity={0.8}
            >
              <Icon name="document-text" size={18} color={activeTab === 'materials' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
              <Text style={[styles.toggleBtnText, activeTab === 'materials' && styles.toggleBtnTextActive]}>
                PDF Notes ({materials.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1: Video Lectures */}
          {activeTab === 'videos' ? (
            loadingVideos ? (
              <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 40 }} />
            ) : Object.keys(groupedVideos).length > 0 ? (
              Object.keys(groupedVideos).map((topic, idx) => {
                const isExpanded = expandedModules[topic] !== false;
                return (
                  <View key={topic} style={styles.moduleAccordionCard}>
                    <TouchableOpacity
                      style={styles.moduleHeader}
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
                      <View style={styles.moduleContent}>
                        {groupedVideos[topic].map((v: any, vIdx: number) => {
                          const isLast = vIdx === groupedVideos[topic].length - 1;
                          return (
                            <TouchableOpacity
                              key={v._id || vIdx}
                              style={[styles.videoItemRow, !isLast && styles.videoItemBorder]}
                              activeOpacity={0.8}
                              onPress={() => navigation.navigate('VideoPlayer', { videoId: v._id, batchId: activeBatchId })}
                            >
                              <View style={styles.thumbnailBox}>
                                <Icon name="play-circle" size={24} color="#FFFFFF" />
                              </View>

                              <View style={styles.videoItemDetails}>
                                <Text style={styles.videoItemTitle}>{v.title}</Text>
                                {v.notes_url ? (
                                  <Text style={styles.hasPdfTag}>📄 Includes PDF Study Notes</Text>
                                ) : null}
                              </View>
                              <Icon name="chevron-forward" size={18} color="#94A3B8" />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyStateText}>
                No video lectures available for this batch.
              </Text>
            )
          ) : (
            /* Tab 2: PDF Study Materials */
            loadingMaterials ? (
              <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 40 }} />
            ) : materials.length > 0 ? (
              <View style={styles.materialsListContainer}>
                {materials.map((mat) => (
                  <View key={mat._id} style={styles.materialCard}>
                    <View style={styles.materialIconCircle}>
                      <Icon name="document-text" size={26} color="#F58220" />
                    </View>
                    <View style={styles.materialInfo}>
                      <Text style={styles.materialTitle}>{mat.title}</Text>
                      <Text style={styles.materialTopic}>Topic: {mat.topic || 'General'}</Text>
                      <Text style={styles.materialDate}>
                        Posted: {new Date(mat.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.openPdfBtn}
                      activeOpacity={0.8}
                      onPress={() => openPdfDocument(mat.cloudinary_url, mat.title)}
                    >
                      <Icon name="arrow-down-circle" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.openPdfBtnText}>Open PDF</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyMaterialsBox}>
                <Icon name="document-text-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>
                  No PDF study materials posted yet for this batch.
                </Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
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
  contentPadding: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  selectLabel: {
    fontSize: 12.5,
    color: '#666666',
    ...FONTS.medium,
    marginBottom: 6,
  },
  courseSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  courseSelectTitle: {
    fontSize: 16,
    color: '#1A1A1A',
    ...FONTS.bold,
    flex: 1,
    marginRight: SPACING.sm,
    lineHeight: 22,
  },
  batchPillsContainer: {
    paddingBottom: SPACING.lg,
  },
  batchPill: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchPillActive: {
    backgroundColor: '#000000',
  },
  batchPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  batchPillText: {
    fontSize: 13.5,
  },
  batchPillTextActive: {
    color: '#FFFFFF',
    ...FONTS.bold,
  },
  batchPillTextInactive: {
    color: '#555555',
    ...FONTS.medium,
  },
  tabToggleBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: SPACING.xl,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#0F172A',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  moduleAccordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
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
    ...FONTS.bold,
  },
  moduleContent: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.lg,
  },
  videoItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  videoItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  thumbnailBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  videoItemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  videoItemTitle: {
    fontSize: 15,
    color: '#1A1A1A',
    ...FONTS.bold,
    marginBottom: 2,
  },
  hasPdfTag: {
    fontSize: 11.5,
    color: '#F58220',
    ...FONTS.semiBold,
    marginTop: 2,
  },
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  materialTopic: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  materialDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  openPdfBtn: {
    backgroundColor: '#F58220',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  openPdfBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
