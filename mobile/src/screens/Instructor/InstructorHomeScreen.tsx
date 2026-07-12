import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions } from 'react-native';

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
      setStats(res.data);
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

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.headerContainer}>
        <LinearGradient colors={[COLORS.primaryDark || '#1E3A8A', COLORS.primary]} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerLogoContainer}>
              <Text style={styles.headerBrand}>Twintec Instructor</Text>
            </View>
            <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
              <Icon name="notifications-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.welcomeSection}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.name}>{user?.name || 'Instructor'}</Text>
              </View>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{(user?.name || 'I').charAt(0).toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        
        <View style={styles.waveContainer}>
          <Svg height="40" width={width} viewBox={`0 0 ${width} 40`} preserveAspectRatio="none">
            <Path
              d={`M0,0 Q${width/2},40 ${width},0 L${width},0 L0,0 Z`}
              fill={COLORS.primary}
            />
          </Svg>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="people" size={28} color="#10B981" />
          <Text style={styles.statValue}>{stats.totalBatches}</Text>
          <Text style={styles.statLabel}>Assigned Batches</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="videocam" size={28} color="#3B82F6" />
          <Text style={styles.statValue}>{stats.totalVideos}</Text>
          <Text style={styles.statLabel}>Uploaded Videos</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="notifications" size={28} color="#F59E0B" />
          <Text style={styles.statValue}>{stats.totalAnnouncements}</Text>
          <Text style={styles.statLabel}>Announcements</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Videos')}>
          <View style={[styles.actionIconBg, { backgroundColor: '#DBEAFE' }]}>
            <Icon name="cloud-upload" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.actionText}>Upload Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Practice')}>
          <View style={[styles.actionIconBg, { backgroundColor: '#D1FAE5' }]}>
            <Icon name="calendar" size={24} color="#10B981" />
          </View>
          <Text style={styles.actionText}>Manage Slots</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MyStudents')}>
          <View style={[styles.actionIconBg, { backgroundColor: '#F3E8FF' }]}>
            <Icon name="people" size={24} color="#9333EA" />
          </View>
          <Text style={styles.actionText}>My Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Announcements')}>
          <View style={[styles.actionIconBg, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="megaphone" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.actionText}>Post Notice</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitleNoMargin}>Recent Videos</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Videos', { screen: 'my_videos' })}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      {stats.recentVideos && stats.recentVideos.length === 0 ? (
        <View style={styles.emptyCardSmall}>
          <Text style={styles.emptyTextSmall}>No videos uploaded yet.</Text>
        </View>
      ) : (
        stats.recentVideos && stats.recentVideos.map(video => (
          <View key={video._id} style={styles.miniCard}>
            <Icon name="play-circle" size={24} color="#3B82F6" style={{marginRight: 10}} />
            <View style={{flex: 1}}>
              <Text style={styles.miniCardTitle} numberOfLines={1}>{video.title}</Text>
              <Text style={styles.miniCardSub}>{video.batch_id?.name || 'Unknown'}</Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitleNoMargin}>Recent Announcements</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Announcements', { screen: 'history' })}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      {stats.recentAnnouncements && stats.recentAnnouncements.length === 0 ? (
        <View style={styles.emptyCardSmall}>
          <Text style={styles.emptyTextSmall}>No announcements posted yet.</Text>
        </View>
      ) : (
        stats.recentAnnouncements && stats.recentAnnouncements.map(ann => (
          <View key={ann._id} style={styles.miniCard}>
            <Icon name="megaphone" size={24} color="#F59E0B" style={{marginRight: 10}} />
            <View style={{flex: 1}}>
              <Text style={styles.miniCardTitle} numberOfLines={1}>{ann.title}</Text>
              <Text style={styles.miniCardSub}>{new Date(ann.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, {marginTop: 15}]}>Recent Open Practice Slots</Text>
      {stats.activeSlots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="calendar-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>You haven't opened any practice slots recently.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Practice')}>
            <Text style={styles.emptyBtnText}>Create Slot</Text>
          </TouchableOpacity>
        </View>
      ) : (
        stats.activeSlots.map(slot => (
          <View key={slot._id} style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <Text style={styles.slotTitle}>{slot.day_of_week} | {slot.start_time} - {slot.end_time}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Open</Text>
              </View>
            </View>
            <Text style={styles.slotBatch}>{slot.batch_id?.name || 'Unknown Batch'}</Text>
            <View style={styles.slotFooter}>
              <Text style={styles.slotDetail}>Booked: {slot.booked_count} / {slot.max_students}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Practice')}>
                <Text style={styles.slotAction}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  headerContainer: { backgroundColor: '#F3F4F6' },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLogoContainer: { flexDirection: 'row', alignItems: 'center' },
  headerBrand: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  bellBtn: { padding: 4 },
  welcomeSection: { marginBottom: 10 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 },
  name: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  waveContainer: { backgroundColor: '#F3F4F6', marginTop: -1 },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: -15, zIndex: 10 },
  statCard: { backgroundColor: '#fff', flex: 1, padding: 15, borderRadius: 12, marginHorizontal: 5, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginHorizontal: 20, marginTop: 25, marginBottom: 15 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 25, marginBottom: 15 },
  sectionTitleNoMargin: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  viewAllText: { color: '#2563EB', fontWeight: 'bold', fontSize: 14 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15 },
  actionBtn: { backgroundColor: '#fff', flex: 1, padding: 12, borderRadius: 12, marginHorizontal: 5, alignItems: 'center', elevation: 2 },
  actionIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 11, fontWeight: '600', color: '#4B5563', textAlign: 'center' },
  emptyCard: { backgroundColor: '#fff', padding: 30, marginHorizontal: 20, borderRadius: 12, alignItems: 'center', elevation: 1 },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 15, marginBottom: 20 },
  emptyCardSmall: { backgroundColor: '#fff', padding: 15, marginHorizontal: 20, borderRadius: 12, alignItems: 'center', elevation: 1 },
  emptyTextSmall: { color: '#6B7280', fontSize: 13 },
  miniCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10, padding: 12, borderRadius: 12, elevation: 1, flexDirection: 'row', alignItems: 'center' },
  miniCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  miniCardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  emptyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold' },
  slotCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 15, padding: 16, borderRadius: 12, elevation: 1 },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  slotTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  badge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },
  slotBatch: { color: '#6B7280', fontSize: 14, marginBottom: 12 },
  slotFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  slotDetail: { color: '#4B5563', fontWeight: '500' },
  slotAction: { color: COLORS.primary, fontWeight: 'bold' }
});
