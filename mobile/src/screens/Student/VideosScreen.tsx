import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const VideoCard = React.memo(({ video, batchId, navigation }: any) => (
  <TouchableOpacity style={styles.videoCard} onPress={() => navigation.navigate('VideoPlayer', { videoId: video._id, batchId })}>
    <View style={styles.thumbnailPlaceholder}>
      <Text style={{color: COLORS.textOnPrimary, ...FONTS.bold}}>Play</Text>
    </View>
    <View style={styles.videoInfo}>
      <Text style={styles.videoTitle}>{video.title}</Text>
      <Text style={styles.videoSub}>Topic: {video.topic}</Text>
    </View>
  </TouchableOpacity>
));

export default function VideosScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/students/batches');
      setBatches(res.data);
      if (res.data.length > 0) {
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
      setVideos(res.data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batchId: string) => {
    setActiveBatchId(batchId);
    setExpandedTopic(null);
    fetchVideos(batchId);
  };

  const groupedVideos = videos.reduce((acc: any, v: any) => {
    if (!acc[v.topic]) acc[v.topic] = [];
    acc[v.topic].push(v);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Batch Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {batches.map(b => (
            <TouchableOpacity key={b._id} style={[styles.tab, activeBatchId === b._id && styles.activeTab]} onPress={() => handleBatchSelect(b._id)}>
              <Text style={[styles.tabText, activeBatchId === b._id && styles.activeTabText]}>
                {b.course_id?.title || `Batch ${b._id.toString().slice(-4)}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Videos List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <ScrollView style={styles.content}>
          {Object.keys(groupedVideos).map(topic => (
            <View key={topic} style={styles.accordionGroup}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedTopic(expandedTopic === topic ? null : topic)}>
                <Text style={styles.topicTitle}>{topic}</Text>
                <Text style={styles.topicCount}>{groupedVideos[topic].length} videos</Text>
              </TouchableOpacity>
              
              {expandedTopic === topic && (
                <View style={styles.accordionContent}>
                  {groupedVideos[topic].map((v: any) => (
                    <VideoCard key={v._id} video={v} batchId={activeBatchId} navigation={navigation} />
                  ))}
                </View>
              )}
            </View>
          ))}
          {Object.keys(groupedVideos).length === 0 && (
            <Text style={styles.emptyText}>No videos available for this batch.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsContainer: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border },
  tab: { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xl, borderBottomWidth: 2, borderColor: 'transparent' },
  activeTab: { borderColor: COLORS.primary },
  tabText: { ...FONTS.semiBold, color: COLORS.textMuted },
  activeTabText: { color: COLORS.primary },
  content: { padding: SPACING.lg },
  accordionGroup: { marginBottom: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.sm },
  accordionHeader: { padding: SPACING.lg, backgroundColor: COLORS.surfaceAlt, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topicTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.textPrimary },
  topicCount: { fontSize: 14, color: COLORS.textSecondary },
  accordionContent: { padding: SPACING.md },
  videoCard: { flexDirection: 'row', padding: SPACING.md, marginBottom: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  thumbnailPlaceholder: { width: 100, height: 60, backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  videoInfo: { flex: 1, marginLeft: SPACING.md, justifyContent: 'center' },
  videoTitle: { fontSize: 14, ...FONTS.bold, color: COLORS.textPrimary, marginBottom: 4 },
  videoSub: { fontSize: 12, color: COLORS.textSecondary },
  emptyText: { textAlign: 'center', marginTop: 40, color: COLORS.textMuted, ...FONTS.regular }
});
