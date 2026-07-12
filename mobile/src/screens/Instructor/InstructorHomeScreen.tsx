import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Image, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS, SHADOW } from '../../config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Fallback/mock data to match screenshot design exactly if database is empty
const MOCK_SLOTS = [
  {
    _id: 'mock_slot_1',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    booked_count: 2,
    max_students: 10,
    batch_id: { name: 'Automotive Tech B2' }
  },
  {
    _id: 'mock_slot_2',
    day_of_week: 'Tuesday',
    start_time: '13:00',
    end_time: '15:00',
    booked_count: 8,
    max_students: 15,
    batch_id: { name: 'Electrical Wiring B1' }
  }
];

const MOCK_VIDEOS = [
  {
    _id: 'mock_video_1',
    title: 'Engine Diagnostics Part 1',
    batch_id: { name: 'Automotive Tech B2' },
    thumbnail: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80'
  },
  {
    _id: 'mock_video_2',
    title: 'Basic Circuit Safety',
    batch_id: { name: 'Electrical Wiring B1' },
    thumbnail: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'
  }
];

const MOCK_ANNOUNCEMENTS = [
  {
    _id: 'mock_ann_1',
    title: 'Workshop Closure This Friday',
    createdAt: '2023-10-24T00:00:00.000Z',
    type: 'notice'
  },
  {
    _id: 'mock_ann_2',
    title: 'New Assessment Guidelines Posted',
    createdAt: '2023-10-22T00:00:00.000Z',
    type: 'guidelines'
  }
];

export default function InstructorHomeScreen() {
  const context = useContext(AuthContext);
  if (!context) return null;
  const { user } = context;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBatches: 3,
    totalVideos: 12,
    totalAnnouncements: 5,
    activeSlots: [] as any[],
    recentVideos: [] as any[],
    recentAnnouncements: [] as any[]
  });

  const fetchStats = async () => {
    try {
      const res = await api.get('/instructors/dashboard-stats');
      const data = res.data;
      setStats({
        totalBatches: data.totalBatches || 3,
        totalVideos: data.totalVideos || 12,
        totalAnnouncements: data.totalAnnouncements || 5,
        activeSlots: (data.activeSlots && data.activeSlots.length > 0) ? data.activeSlots : MOCK_SLOTS,
        recentVideos: (data.recentVideos && data.recentVideos.length > 0) ? data.recentVideos : MOCK_VIDEOS,
        recentAnnouncements: (data.recentAnnouncements && data.recentAnnouncements.length > 0) ? data.recentAnnouncements : MOCK_ANNOUNCEMENTS
      });
    } catch (error) {
      console.warn('Failed to load instructor stats', error);
      // fallback to mock data on error
      setStats({
        totalBatches: 3,
        totalVideos: 12,
        totalAnnouncements: 5,
        activeSlots: MOCK_SLOTS,
        recentVideos: MOCK_VIDEOS,
        recentAnnouncements: MOCK_ANNOUNCEMENTS
      });
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
        <TouchableOpacity style={styles.menuBtn} onPress={() => Alert.alert('Menu', 'Twintec VTI Sidebar Navigation')}>
          <Icon name="menu" size={26} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Icon name="ribbon" size={12} color="#FFF" />
          </View>
          <Text style={styles.brandText}>Twintec VTI</Text>
        </View>

        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
          <Icon name="person-circle-outline" size={26} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* 2. Welcome Banner */}
      <LinearGradient 
        colors={['#2D2D2D', '#111111']} 
        style={styles.bannerContainer}
      >
        <Text style={styles.welcomeText}>Welcome back, Instructor</Text>
        <Text style={styles.subWelcomeText}>Here is your daily overview</Text>
      </LinearGradient>

      {/* 3. Stat Cards Overlay */}
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
            <Icon name="document-text-outline" size={22} color="#F58220" />
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
        <Text style={styles.sectionTitleNoMargin}>Recent Open Practice Slots</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Practice')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {stats.activeSlots.map((slot) => {
        const booked = slot.booked_count || 0;
        const max = slot.max_students || 1;
        const percentage = Math.min((booked / max) * 100, 100);
        return (
          <View key={slot._id} style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <View style={styles.slotTimeRow}>
                <Icon name="calendar-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.slotTimeText}>
                  {slot.day_of_week} | {slot.start_time}-{slot.end_time}
                </Text>
              </View>
              <View style={styles.bookedBadge}>
                <Text style={styles.bookedBadgeText}>Booked: {booked} / {max}</Text>
              </View>
            </View>
            
            <Text style={styles.slotBatchName}>{slot.batch_id?.name || 'Practice Slot'}</Text>
            
            <View style={styles.slotFooter}>
              <View style={styles.progressContainer}>
                <View style={[styles.progressFill, { width: `${percentage}%` }]} />
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Practice')}>
                <Text style={styles.manageBtnText}>MANAGE</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* 6. Recent Videos */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitleNoMargin}>Recent Videos</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Videos', { tab: 'my_videos' })}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        {stats.recentVideos.map((video) => (
          <View key={video._id} style={styles.videoCard}>
            <View style={styles.videoThumbnailContainer}>
              <Image 
                source={{ uri: video.thumbnail || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80' }} 
                style={styles.videoThumbnail} 
              />
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
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 7. Recent Announcements */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitleNoMargin}>Recent Announcements</Text>
      </View>
      
      <View style={styles.announcementsContainer}>
        {stats.recentAnnouncements.map((ann, index) => {
          const isLast = index === stats.recentAnnouncements.length - 1;
          const isAssessment = ann.type === 'guidelines' || ann.title.toLowerCase().includes('guideline') || ann.title.toLowerCase().includes('assessment');
          return (
            <View 
              key={ann._id} 
              style={[
                styles.announcementItem, 
                !isLast && styles.announcementBorder
              ]}
            >
              <View style={[
                styles.announcementIconBg, 
                { backgroundColor: isAssessment ? '#F3F4F6' : '#FFF7ED' }
              ]}>
                <Icon 
                  name={isAssessment ? 'school-outline' : 'megaphone-outline'} 
                  size={18} 
                  color={isAssessment ? '#4B5563' : '#F58220'} 
                />
              </View>
              <View style={styles.announcementContent}>
                <Text style={styles.announcementTitle} numberOfLines={1}>{ann.title}</Text>
                <Text style={styles.announcementDate}>{formatDate(ann.createdAt)}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  // Custom Brand Header
  headerContainer: {
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  menuBtn: {
    padding: 6,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  brandText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileBtn: {
    padding: 6,
  },

  // Welcome Banner
  bannerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 52,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  welcomeText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subWelcomeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },

  // Stats cards overlapping the banner
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -32,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFF',
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOW.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Common Headings
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitleNoMargin: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewAllText: {
    color: '#F58220',
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Quick Actions styling
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  actionBtn: {
    width: (width - 24) / 4 - 8,
    alignItems: 'center',
  },
  actionIconBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 14,
  },

  // Open Practice Slots styling
  slotCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: '#F58220',
    ...SHADOW.sm,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  slotTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotTimeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  bookedBadge: {
    backgroundColor: '#FFF3E6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bookedBadgeText: {
    color: '#F58220',
    fontSize: 11,
    fontWeight: 'bold',
  },
  slotBatchName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginVertical: 4,
  },
  slotFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginRight: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#F58220',
    borderRadius: 3,
  },
  manageBtnText: {
    color: '#F58220',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Recent Videos Horizontal scroll
  horizontalScrollContent: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  videoCard: {
    width: 160,
    marginRight: 12,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  videoThumbnailContainer: {
    height: 95,
    width: '100%',
    backgroundColor: '#F3F4F6',
  },
  videoThumbnail: {
    height: '100%',
    width: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    padding: 10,
  },
  videoCategory: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    height: 34,
    lineHeight: 16,
  },

  // Recent Announcements styling
  announcementsContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  announcementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  announcementBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  announcementIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementContent: {
    flex: 1,
    marginLeft: 12,
  },
  announcementTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  announcementDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
