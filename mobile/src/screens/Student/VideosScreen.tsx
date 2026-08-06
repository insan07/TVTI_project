import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const VideoCard = React.memo(({ video, batchId, navigation }: any) => (
  <TouchableOpacity style={styles.videoCard} onPress={() => navigation.navigate('VideoPlayer', { videoId: video._id, batchId })}>
    <View style={styles.thumbnailPlaceholder}>
      <Icon name="play-circle" size={28} color="#FFF" />
    </View>
    <View style={styles.videoInfo}>
      <Text style={styles.videoTitle}>{video.title}</Text>
      <Text style={styles.videoSub}>Topic: {video.topic || 'General'}</Text>
    </View>
  </TouchableOpacity>
));

const MaterialCard = React.memo(({ material }: any) => {
  const openMaterial = () => {
    if (material.cloudinary_url) {
      Linking.openURL(material.cloudinary_url).catch(() => {
        Alert.alert('Error', 'Unable to open material link');
      });
    } else {
      Alert.alert('Error', 'Material file link not available');
    }
  };

  return (
    <TouchableOpacity style={styles.videoCard} onPress={openMaterial}>
      <View style={[styles.thumbnailPlaceholder, { backgroundColor: '#10B981' }]}>
        <Icon name="document-text" size={28} color="#FFF" />
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{material.title}</Text>
        <Text style={styles.videoSub}>Topic: {material.topic || 'General'}</Text>
        <Text style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>Tap to view / download document</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function VideosScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'videos' | 'materials'>('videos');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (activeBatchId) {
      fetchContent(activeBatchId, activeTab);
    }
  }, [activeTab]);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/students/batches');
      setBatches(res.data);
      if (res.data.length > 0) {
        setActiveBatchId(res.data[0]._id);
        fetchContent(res.data[0]._id, activeTab);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchContent = async (batchId: string, type: 'videos' | 'materials') => {
    setLoading(true);
    try {
      const endpoint = type === 'materials'
        ? `/students/batches/${batchId}/materials`
        : `/students/batches/${batchId}/videos`;
      const res = await api.get(endpoint);
      setItems(res.data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batchId: string) => {
    setActiveBatchId(batchId);
    setExpandedTopic(null);
    fetchContent(batchId, activeTab);
  };

  const groupedItems = items.reduce((acc: any, v: any) => {
    const t = v.topic || 'General';
    if (!acc[t]) acc[t] = [];
    acc[t].push(v);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Content Type Selector: Videos vs Materials */}
      <View style={styles.modeSwitchRow}>
        <TouchableOpacity
          style={[styles.modeSwitchBtn, activeTab === 'videos' && styles.modeSwitchBtnActive]}
          onPress={() => setActiveTab('videos')}
        >
          <Icon name="videocam-outline" size={16} color={activeTab === 'videos' ? '#FFF' : COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.modeSwitchText, activeTab === 'videos' && styles.modeSwitchTextActive]}>Videos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeSwitchBtn, activeTab === 'materials' && styles.modeSwitchBtnActive]}
          onPress={() => setActiveTab('materials')}
        >
          <Icon name="document-text-outline" size={16} color={activeTab === 'materials' ? '#FFF' : COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.modeSwitchText, activeTab === 'materials' && styles.modeSwitchTextActive]}>Study Materials</Text>
        </TouchableOpacity>
      </View>

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

      {/* Content List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <ScrollView style={styles.content}>
          {Object.keys(groupedItems).map(topic => (
            <View key={topic} style={styles.accordionGroup}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedTopic(expandedTopic === topic ? null : topic)}>
                <Text style={styles.topicTitle}>{topic}</Text>
                <Text style={styles.topicCount}>{groupedItems[topic].length} {activeTab === 'videos' ? 'videos' : 'materials'}</Text>
              </TouchableOpacity>
              
              {expandedTopic === topic && (
                <View style={styles.accordionContent}>
                  {groupedItems[topic].map((item: any) => (
                    activeTab === 'videos' ? (
                      <VideoCard key={item._id} video={item} batchId={activeBatchId} navigation={navigation} />
                    ) : (
                      <MaterialCard key={item._id} material={item} />
                    )
                  ))}
                </View>
              )}
            </View>
          ))}
          {Object.keys(groupedItems).length === 0 && (
            <Text style={styles.emptyText}>No {activeTab === 'videos' ? 'videos' : 'study materials'} available for this batch.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  modeSwitchRow: { flexDirection: 'row', padding: SPACING.md, gap: 10, backgroundColor: COLORS.surface },
  modeSwitchBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt },
  modeSwitchBtnActive: { backgroundColor: COLORS.primary },
  modeSwitchText: { ...FONTS.semiBold, fontSize: 13, color: COLORS.textSecondary },
  modeSwitchTextActive: { color: '#FFF' },
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
