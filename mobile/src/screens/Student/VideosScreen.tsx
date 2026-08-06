import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VideosScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [batches, setBatches] = useState<any[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    'Module 2': true,
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/students/batches');
      setBatches(res.data || []);
      if (res.data && res.data.length > 0) {
        setActiveBatchId(res.data[0]._id);
        fetchVideos(res.data[0]._id);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchVideos = async (batchId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/students/batches/${batchId}/videos`);
      setVideos(res.data || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batchId: string) => {
    setActiveBatchId(batchId);
    fetchVideos(batchId);
  };

  const toggleModule = (modKey: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modKey]: !prev[modKey],
    }));
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
      {/* Top Header Bar */}
      <View style={[styles.topHeaderBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.navigate('Profile')}>
          <Icon name="menu-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TVTI</Text>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.navigate('Profile')}>
          <Icon name="person-circle-outline" size={26} color="#FFFFFF" />
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

          {/* Modules Section */}
          {loading ? (
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
                              {v.duration ? (
                                <View style={styles.durationBadge}>
                                  <Text style={styles.durationText}>{v.duration}</Text>
                                </View>
                              ) : null}
                            </View>

                            <View style={styles.videoItemDetails}>
                              <Text style={styles.videoItemTitle}>{v.title}</Text>
                              {v.subtitle || v.description ? (
                                <Text style={styles.videoItemSubtitle} numberOfLines={1}>
                                  {v.subtitle || v.description}
                                </Text>
                              ) : null}

                              {v.progress ? (
                                <View style={styles.progressBarTrack}>
                                  <View style={[styles.progressBarFill, { width: `${v.progress}%` }]} />
                                </View>
                              ) : null}
                            </View>

                            {v.completed && (
                              <Icon name="checkmark-circle-outline" size={20} color="#10B981" style={{ marginLeft: 6 }} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={{ color: '#888888', ...FONTS.regular, textAlign: 'center', marginTop: 40 }}>
              No videos available for this batch.
            </Text>
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
  topHeaderBar: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerIconButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    ...FONTS.bold,
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
    paddingBottom: SPACING.xl,
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
    width: 96,
    height: 58,
    borderRadius: RADIUS.sm,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    ...FONTS.bold,
  },
  videoItemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  videoItemTitle: {
    fontSize: 15.5,
    color: '#1A1A1A',
    ...FONTS.bold,
    marginBottom: 2,
  },
  videoItemSubtitle: {
    fontSize: 13,
    color: '#666666',
    ...FONTS.regular,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#EAEAEA',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
    width: '85%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F58220',
    borderRadius: 2,
  },
});
