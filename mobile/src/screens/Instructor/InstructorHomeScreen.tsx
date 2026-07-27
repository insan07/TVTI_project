import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Image } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS, SHADOW } from '../../config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function InstructorHomeScreen() {
  const context = useContext(AuthContext);
  if (!context) return null;
  const { user } = context;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBatches: 0,
    totalVideos: 0,
    totalAnnouncements: 0,
    activeSlots: [] as any[],
    recentVideos: [] as any[],
    recentAnnouncements: [] as any[]
  });

  const fetchStats = async () => {
    try {
      const res = await api.get('/instructors/dashboard-stats');
      const data = res.data;
      setStats({
        totalBatches: data.totalBatches ?? 0,
        totalVideos: data.totalVideos ?? 0,
        totalAnnouncements: data.totalAnnouncements ?? 0,
        activeSlots: data.activeSlots || [],
        recentVideos: data.recentVideos || [],
        recentAnnouncements: data.recentAnnouncements || []
      });
    } catch (error) {
      console.warn('Failed to load instructor stats', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F58220" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F58220']} />}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Custom Brand Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Icon name="ribbon" size={12} color="#FFF" />
          </View>
          <Text style={styles.brandText}>Twintec VTI</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
          <Icon name="person-circle-outline" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* 2. Welcome Banner */}
      <LinearGradient colors={['#2D2D2D', '#111111']} style={styles.bannerContainer}>
        <Text style={styles.welcomeText}>Welcome back, {user?.name?.split(' ')[0] || 'Instructor'}</Text>
        <Text style={styles.subWelcomeText}>Here is your daily overview</Text>
      </LinearGradient>

      {/* 3. Stat Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalBatches}</Text>
          <Text style={styles.statLabel}>BATCHES</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalVideos}</Text>
          <Text style={styles.statLabel}>VIDEOS</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalAnnouncements}</Text>
          <Text style={styles.statLabel}>NOTICES</Text>
        </View>
      </View>

      {/* 4. Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Videos', { tab: 'upload' })}>
          <View style={styles.actionIconBg}>
            <Icon name="cloud-upload-outline" size={22} color="#F58220" />
          </View>
          <Text style={styles.actionText}>Upload Video</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Practice')}>
          <View style={styles.actionIconBg}>
            <Icon name="calendar-outline" size={22} color="#F58220" />
          </View>
          <Text style={styles.actionText}>Manage Slots</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MyStudents')}>
          <View style={styles.actionIconBg}>
            <Icon name="people-outline" size={22} color="#F58220" />
          </View>
          <Text style={styles.actionText}>My Students</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('PostAnnouncement')}>
          <View style={styles.actionIconBg}>
            <Icon name="megaphone-outline" size={22} color="#F58220" />
          </View>
          <Text style={styles.actionText}>Post Notice</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Recent Open Practice Slots */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitleNoMargin}>Open Practice Slots</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Practice')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {stats.activeSlots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="calendar-outline" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>No open practice slots</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Practice')}>
            <Text style={styles.emptyAction}>Create a slot →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        stats.activeSlots.map((slot) => {
          const booked = slot.booked_count || 0;
          const max = slot.max_students || 1;
          const percentage = Math.min((booked / max) * 100, 100);
          return (
            <View key={slot._id} style={styles.slotCard}>
              <View style={styles.slotHeader}>
                <View style={styles.slotTimeRow}>
                  <Icon name="calendar-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
                  <Text style={styles.slotTimeText}>
                    {slot.day_of_week} | {slot.start_time} - {slot.end_time}
                  </Text>
                </View>
                <View style={styles.bookedBadge}>
                  <Text style={styles.bookedBadgeText}>{booked} / {max} booked</Text>
                </View>
              </View>
              <Text style={styles.slotBatchName}>{slot.batch_id?.name || 'Practice Slot'}</Text>
              {slot.equipment_note ? (
                <Text style={styles.slotNote}>📋 {slot.equipment_note}</Text>
              ) : null}
              <View style={styles.slotFooter}>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressFill, { width: `${percentage}%` as any }]} />
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Practice')}>
                  <Text style={styles.manageBtnText}>MANAGE</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* 6. Recent Videos */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitleNoMargin}>Recent Videos</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Videos', { tab: 'my_videos' })}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {stats.recentVideos.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="videocam-outline" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>No videos uploaded yet</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Videos', { tab: 'upload' })}>
            <Text style={styles.emptyAction}>Upload your first video →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
          {stats.recentVideos.map((video) => (
            <View key={video._id} style={styles.videoCard}>
              <View style={styles.videoThumbnailContainer}>
                {video.thumbnail ? (
                  <Image source={{ uri: video.thumbnail }} style={styles.videoThumbnail} />
                ) : (
                  <View style={styles.videoThumbnailPlaceholder}>
                    <Icon name="videocam" size={28} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.playOverlay}>
                  <View style={styles.playCircle}>
                    <Icon name="play" size={16} color="#000" style={{ marginLeft: 2 }} />
                  </View>
                </View>
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoCategory} numberOfLines={1}>
                  {(video.batch_id?.name || 'Class Video').toUpperCase()}
                </Text>
                <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                {video.topic ? <Text style={styles.videoTopic} numberOfLines={1}>📌 {video.topic}</Text> : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 7. Recent Announcements */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitleNoMargin}>Recent Announcements</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PostAnnouncement')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {stats.recentAnnouncements.length === 0 ? (
        <View style={[styles.emptyCard, { marginBottom: 24 }]}>
          <Icon name="megaphone-outline" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>No announcements posted</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PostAnnouncement')}>
            <Text style={styles.emptyAction}>Post an announcement →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.announcementsContainer, { marginBottom: 24 }]}>
          {stats.recentAnnouncements.map((ann, index) => {
            const isLast = index === stats.recentAnnouncements.length - 1;
            const isAssessment = ann.title?.toLowerCase().includes('guideline') || ann.title?.toLowerCase().includes('assessment');
            return (
              <View key={ann._id} style={[styles.announcementItem, !isLast && styles.announcementBorder]}>
                <View style={[styles.announcementIconBg, { backgroundColor: isAssessment ? '#F3F4F6' : '#FFF7ED' }]}>
                  <Icon
                    name={isAssessment ? 'school-outline' : 'megaphone-outline'}
                    size={18}
                    color={isAssessment ? '#4B5563' : '#F58220'}
                  />
                </View>
                <View style={styles.announcementContent}>
                  <Text style={styles.announcementTitle} numberOfLines={1}>{ann.title}</Text>
                  <Text style={styles.announcementMeta}>
                    {ann.batch_id?.name ? `${ann.batch_id.name} · ` : ''}{formatDate(ann.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { marginTop: 12, color: '#9CA3AF', fontSize: 14 },
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  headerContainer: {
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  brandContainer: { flexDirection: 'row', alignItems: 'center' },
  logoBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#F58220',
    justifyContent: 'center', alignItems: 'center', marginRight: 6,
  },
  brandText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  profileBtn: { padding: 6 },

  bannerContainer: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 52,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  welcomeText: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subWelcomeText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 },

  statsContainer: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, marginTop: -32, marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFF', flex: 1, paddingVertical: 14,
    borderRadius: 12, marginHorizontal: 5, alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', ...SHADOW.sm,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', marginTop: 4 },

  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#111827',
    marginHorizontal: 16, marginTop: 16, marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginTop: 24, marginBottom: 12,
  },
  sectionTitleNoMargin: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  viewAllText: { color: '#F58220', fontWeight: 'bold', fontSize: 13 },

  actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  actionBtn: { width: (width - 24) / 4 - 8, alignItems: 'center' },
  actionIconBg: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFF7ED',
    borderWidth: 1, borderColor: '#FED7AA', justifyContent: 'center', alignItems: 'center',
  },
  actionText: { fontSize: 11, fontWeight: '600', color: '#374151', marginTop: 8, textAlign: 'center', lineHeight: 14 },

  emptyCard: {
    marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 10,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', ...SHADOW.sm,
  },
  emptyText: { color: '#9CA3AF', fontSize: 14, marginTop: 10 },
  emptyAction: { color: '#F58220', fontSize: 13, fontWeight: 'bold', marginTop: 8 },

  slotCard: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    borderLeftWidth: 4, borderLeftColor: '#F58220', ...SHADOW.sm,
  },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  slotTimeRow: { flexDirection: 'row', alignItems: 'center' },
  slotTimeText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  bookedBadge: { backgroundColor: '#FFF3E6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  bookedBadgeText: { color: '#F58220', fontSize: 11, fontWeight: 'bold' },
  slotBatchName: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginVertical: 4 },
  slotNote: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  slotFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  progressContainer: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginRight: 16, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#F58220', borderRadius: 3 },
  manageBtnText: { color: '#F58220', fontSize: 12, fontWeight: 'bold' },

  horizontalScrollContent: { paddingLeft: 16, paddingRight: 8 },
  videoCard: {
    width: 160, marginRight: 12, backgroundColor: '#FFF',
    borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', ...SHADOW.sm,
  },
  videoThumbnailContainer: { height: 95, width: '100%', backgroundColor: '#F3F4F6' },
  videoThumbnail: { height: '100%', width: '100%' },
  videoThumbnailPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  playCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' },
  videoInfo: { padding: 10 },
  videoCategory: { fontSize: 9, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 4 },
  videoTitle: { fontSize: 12, fontWeight: 'bold', color: '#1F2937', height: 34, lineHeight: 16 },
  videoTopic: { fontSize: 10, color: '#6B7280', marginTop: 2 },

  announcementsContainer: {
    marginHorizontal: 16, backgroundColor: '#FFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', ...SHADOW.sm,
  },
  announcementItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  announcementBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  announcementIconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  announcementContent: { flex: 1, marginLeft: 12 },
  announcementTitle: { fontSize: 13, fontWeight: 'bold', color: '#1F2937' },
  announcementMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
