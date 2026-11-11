import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Linking, Platform, Modal } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { API_URL } from '../../config/constants';
import { COLORS, FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import ScreenBackground from '../../components/shared/ScreenBackground';
import NotificationBellIcon from '../../components/shared/NotificationBellIcon';
import StudentHomeCard from '../../components/student/StudentHomeCard';
import AnnouncementRow, { Announcement } from '../../components/student/AnnouncementRow';
import { communicationTheme } from '../../components/shared/communicationTheme';
import { isPracticalExpired, practicalInstant } from '../../utils/practicalTime';
import usePracticalClock from '../../hooks/usePracticalClock';

type Dashboard = { activeSlots: any[]; recentVideos: any[]; recentAnnouncements: Announcement[] };
const EMPTY_DASHBOARD: Dashboard = { activeSlots: [], recentVideos: [], recentAnnouncements: [] };
const QUICK_ACTIONS = [
  { title: 'My Batches', icon: 'layers-outline', screen: 'MyBatches' },
  { title: 'Announcements', icon: 'megaphone-outline', screen: 'PostAnnouncement' },
  { title: 'My Students', icon: 'people-outline', screen: 'MyStudents' },
] as const;
const formatDate = (value?: string) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently';
const thumbnailFor = (upload: any) => {
  if (upload.thumbnail) return upload.thumbnail;
  const url = upload.cloudinary_url || upload.youtube_url || '';
  const match = url.match(/(?:[?&]v=|youtu\.be\/|youtube\.com\/(?:embed|shorts)\/)([\w-]{11})/);
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  return url.includes('cloudinary.com') && upload.content_type !== 'material' ? url.replace(/\.[^/.]+$/, '.jpg') : null;
};

export default function InstructorHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<Dashboard>(EMPTY_DASHBOARD);
  const [error, setError] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const request = useRef(0);
  const now = usePracticalClock(stats.activeSlots);
  const fetchDashboard = useCallback(async () => {
    const current = ++request.current;
    setError('');
    try {
      const [dashboard, notifications] = await Promise.all([
        api.get('/instructors/dashboard-stats'),
        api.get('/notifications/unread-count').catch(() => null),
      ]);
      if (current !== request.current) return;
      setStats({ activeSlots: dashboard.data.activeSlots || [], recentVideos: dashboard.data.recentVideos || [], recentAnnouncements: dashboard.data.recentAnnouncements || [] });
      if (typeof notifications?.data?.unread_count === 'number') setUnreadCount(notifications.data.unread_count);
    } catch {
      if (current === request.current) setError('Your home page could not be refreshed. Please try again.');
    } finally {
      if (current === request.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);
  useFocusEffect(useCallback(() => {
    void fetchDashboard();
    return () => { request.current += 1; };
  }, [fetchDashboard]));

  const openUpload = async (upload: any) => {
    let url = upload.cloudinary_url || upload.youtube_url;
    if (!url) { navigation.navigate('Uploads', { tab: 'my_videos' }); return; }
    if (url.startsWith('/uploads/') || url.startsWith('/api/files/')) url = `${API_URL.replace(/\/api\/?$/, '')}${url}`;
    try {
      if (Platform.OS === 'web') window.open(url, '_blank', 'noopener,noreferrer');
      else await Linking.openURL(url);
    } catch { setError('This upload could not be opened. Please try again from Uploads.'); }
  };
  const viewAll = (label: string, onPress: () => void) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} style={styles.headerAction} onPress={onPress}>
    <Text style={styles.link}>View all</Text>
  </TouchableOpacity>;
  const empty = (message: string, label: string, onPress: () => void) => <View style={styles.empty}>
    <Text style={[styles.emptyText, { color: theme.muted }]}>{message}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.emptyAction}>
      <Text style={styles.link}>{label}</Text><Icon name="arrow-forward" size={16} color={COLORS.secondary} />
    </TouchableOpacity>
  </View>;
  const slots = stats.activeSlots.filter(slot => !isPracticalExpired(slot, now)).sort((a, b) =>
    (practicalInstant(a, 'start') || 0) - (practicalInstant(b, 'start') || 0)).slice(0, 3);

  if (loading) return <View style={[styles.loading, { backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' }]}>
    <ScreenBackground /><ActivityIndicator size="large" color={COLORS.secondary} />
  </View>;

  return <View style={[styles.container, { backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' }]}>
    <ScreenBackground />
    <LinearGradient colors={['#0F172A', '#1E293B', '#090D16']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.stickyHeaderCard, { paddingTop: Math.max(insets.top + 8, 16) }]}>
      <View style={styles.glowOrbOrange} pointerEvents="none" /><View style={styles.glowOrbBlue} pointerEvents="none" />
      <View style={styles.brandHeaderRow}>
        <View style={styles.brandLogoGroup}>
          <Image source={require('../../../assets/logo.png')} style={styles.brandLogoImg} resizeMode="contain" />
          <Text style={styles.brandTitleText}>TWINTEC VTI</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} accessibilityRole="button" accessibilityLabel="View notifications" accessibilityHint={`${unreadCount} unread notifications`}
          onPress={() => navigation.navigate('Notifications')}>
          <NotificationBellIcon size={22} color="#FFFFFF" />{unreadCount > 0 && <View style={styles.badgeDot} />}
        </TouchableOpacity>
      </View>
    </LinearGradient>

    <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentStyle} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchDashboard(); }} colors={[COLORS.secondary]} tintColor={COLORS.secondary} />}>
      <View style={styles.mainContent}>
        {!!error && <View style={[styles.errorBanner, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text accessibilityRole="alert" style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry home page" style={styles.headerAction} onPress={() => { setRefreshing(true); void fetchDashboard(); }}><Text style={styles.link}>Retry</Text></TouchableOpacity>
        </View>}

        <StudentHomeCard title="Quick Actions" variant="communication">
          <View style={styles.actionsRow}>
            {QUICK_ACTIONS.map((action, index) => <TouchableOpacity key={action.screen} accessibilityRole="button" accessibilityLabel={action.title}
              onPress={() => navigation.navigate(action.screen)} activeOpacity={0.65}
              style={[styles.actionButton, index > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.line }]}>
              <View style={[styles.actionIcon, { backgroundColor: isDark ? '#30251B' : '#FFF1E5' }]}><Icon name={action.icon} size={22} color={COLORS.secondary} /></View>
              <Text style={[styles.actionLabel, { color: theme.text }]}>{action.title}</Text>
            </TouchableOpacity>)}
          </View>
        </StudentHomeCard>

        <StudentHomeCard title="Open Practice Slots" headerAction={viewAll('View all practice slots', () => navigation.navigate('Practice'))}>
          {slots.length === 0 ? empty('No open practice slots.', 'Create a slot', () => navigation.navigate('Practice')) : slots.map((slot, index) => {
            const time = practicalInstant(slot, 'start');
            const date = Number.isFinite(time) ? new Date(time) : null;
            const booked = slot.booked_count || 0, capacity = slot.max_students || 1;
            return <TouchableOpacity key={slot._id} accessibilityRole="button" accessibilityLabel={`Manage practice slot: ${slot.batch_id?.name || 'Practical session'}`}
              onPress={() => navigation.navigate('Practice')} activeOpacity={0.7}
              style={[styles.practicalRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
              <View style={styles.practicalTop}>
                <View style={[styles.dateBadge, isDark && styles.dateBadgeDark]}>
                  <Text style={[styles.dateMonth, isDark && { color: '#FB923C' }]}>{date ? date.toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', month: 'short' }).toUpperCase() : 'TBD'}</Text>
                  <Text style={[styles.dateDay, isDark && { color: '#FED7AA' }]}>{date ? date.toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit' }) : '–'}</Text>
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.practicalTitle, { color: theme.text }]} numberOfLines={2}>{slot.batch_id?.course_id?.title || slot.batch_id?.name || 'Practical session'}</Text>
                  {!!slot.batch_id?.course_id?.title && <Text style={[styles.detail, { color: theme.muted }]}>{slot.batch_id?.name}</Text>}
                  <View style={styles.timeRow}><Icon name="time-outline" size={14} color={theme.muted} /><Text style={[styles.detail, { color: theme.muted }]}>{slot.day_of_week} · {slot.start_time} – {slot.end_time}</Text></View>
                </View>
              </View>
              {!!slot.equipment_note && <Text style={[styles.detail, { color: theme.muted, marginTop: 12 }]} numberOfLines={2}>{slot.equipment_note}</Text>}
              <View style={[styles.practicalBottom, { borderTopColor: theme.line }]}>
                <View style={styles.capacityInfo}>
                  <Text style={[styles.detail, { color: theme.muted }]}>{booked} / {capacity} booked</Text>
                  <View style={[styles.progressTrack, { backgroundColor: isDark ? '#303A48' : '#E5E7EB' }]}><View style={[styles.progressFill, { width: `${Math.min(booked / capacity * 100, 100)}%` }]} /></View>
                </View>
                <View style={[styles.managePill, { backgroundColor: isDark ? '#FF5E14' : '#E5E7EB' }]}><Text style={[styles.manageText, { color: isDark ? '#FFFFFF' : '#1F2937' }]}>View slot</Text></View>
              </View>
            </TouchableOpacity>;
          })}
        </StudentHomeCard>

        <StudentHomeCard title="Recent Uploads" variant="communication" headerAction={viewAll('View all uploads', () => navigation.navigate('Uploads', { tab: 'my_videos' }))}>
          {stats.recentVideos.length === 0 ? empty('No uploads yet.', 'Upload content', () => navigation.navigate('Uploads', { tab: 'upload' })) : stats.recentVideos.slice(0, 3).map((upload, index) => {
            const thumbnail = thumbnailFor(upload);
            return <TouchableOpacity key={upload._id} accessibilityRole="button" accessibilityLabel={`Open upload: ${upload.title}`} activeOpacity={0.65}
              onPress={() => { void openUpload(upload); }} style={[styles.uploadRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
              <View style={styles.thumbnail}>
                {!!thumbnail && <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} />}
                <View style={styles.thumbnailOverlay}><Icon name={upload.content_type === 'material' ? 'document-text-outline' : 'play'} size={18} color={COLORS.secondary} /></View>
              </View>
              <View style={styles.rowContent}>
                {!!(upload.topic || upload.batch_id?.name) && <Text style={[styles.uploadMetadata, { color: theme.muted }]} numberOfLines={1}>{upload.topic || upload.batch_id.name}</Text>}
                <Text style={[styles.uploadTitle, { color: theme.text }]} numberOfLines={2}>{upload.title}</Text>
              </View>
              <Icon name="chevron-forward" size={17} color={theme.muted} />
            </TouchableOpacity>;
          })}
        </StudentHomeCard>

        <StudentHomeCard title="Announcements" variant="communication" headerAction={viewAll('View all announcements', () => navigation.navigate('PostAnnouncement'))}>
          {stats.recentAnnouncements.length === 0 ? empty('No announcements yet.', 'Post an announcement', () => navigation.navigate('PostAnnouncement')) : stats.recentAnnouncements.slice(0, 3).map((announcement, index) =>
            <AnnouncementRow key={announcement._id} announcement={announcement} dateLabel={formatDate(announcement.createdAt)} divided={index > 0} onPress={() => setSelectedAnnouncement(announcement)} />)}
        </StudentHomeCard>
      </View>
    </ScrollView>

    <Modal visible={!!selectedAnnouncement} transparent animationType="fade" onRequestClose={() => setSelectedAnnouncement(null)}>
      <View style={styles.modalOverlay}>
        <View accessibilityViewIsModal style={[styles.noticeDialog, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <View style={[styles.noticeDialogHeader, { borderBottomColor: theme.line }]}>
            <Text style={[styles.noticeDialogLabel, { color: theme.text }]}>Announcement</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close announcement" style={styles.noticeClose} onPress={() => setSelectedAnnouncement(null)}><Icon name="close" size={22} color={theme.text} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.noticeScroll} contentContainerStyle={styles.noticeBody}>
            <View style={styles.noticeMetadata}><Text style={[styles.detail, { color: theme.muted }]}>{formatDate(selectedAnnouncement?.createdAt)}</Text>{!!selectedAnnouncement?.batch_id?.name && <Text style={[styles.detail, { color: theme.muted }]}>{selectedAnnouncement.batch_id.name}</Text>}</View>
            <Text style={[styles.noticeTitle, { color: theme.text }]}>{selectedAnnouncement?.title}</Text>
            <Text style={[styles.noticeMessage, { color: theme.text }]}>{selectedAnnouncement?.message}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stickyHeaderCard: {
    paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden', position: 'relative', zIndex: 10, maxWidth: 1100, width: '100%', alignSelf: 'center',
    ...Platform.select({ web: { boxShadow: '0px 10px 28px rgba(15, 23, 42, 0.28)' }, default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 8 } }),
  },
  brandHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  brandLogoGroup: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 }, brandLogoImg: { width: 32, height: 32, marginRight: 10 },
  brandTitleText: { ...FONTS.extraBold, color: '#FFFFFF', fontSize: 18, letterSpacing: 0.8 },
  bellBtn: { position: 'relative', padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 14 },
  badgeDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary },
  glowOrbOrange: { position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(249, 115, 22, 0.16)' },
  glowOrbBlue: { position: 'absolute', bottom: -50, left: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(14, 165, 233, 0.12)' },
  scrollContent: { flex: 1 }, scrollContentStyle: { paddingBottom: 110 },
  mainContent: { paddingHorizontal: 20, paddingTop: 20, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  headerAction: { minHeight: 44, justifyContent: 'center' }, link: { ...FONTS.semiBold, fontSize: 12, color: COLORS.secondary },
  actionsRow: { flexDirection: 'row', paddingVertical: 18 }, actionButton: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 5, gap: 10 },
  actionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, actionLabel: { ...FONTS.semiBold, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  empty: { paddingVertical: 18 }, emptyText: { ...FONTS.regular, fontSize: 13, lineHeight: 20 }, emptyAction: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  practicalRow: { paddingVertical: 16 }, practicalTop: { flexDirection: 'row', alignItems: 'center' },
  dateBadge: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#FFEBDD', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  dateBadgeDark: { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.35)' },
  dateMonth: { ...FONTS.extraBold, fontSize: 11, color: '#C2410C', letterSpacing: 0.5 }, dateDay: { ...FONTS.extraBold, fontSize: 20, color: '#7C2D12', marginTop: -1 },
  rowContent: { flex: 1, minWidth: 0 }, practicalTitle: { ...FONTS.extraBold, fontSize: 16, lineHeight: 23 }, detail: { ...FONTS.regular, fontSize: 12, lineHeight: 19 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' },
  practicalBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  capacityInfo: { flex: 1, minWidth: 0 }, progressTrack: { height: 4, borderRadius: 2, marginTop: 7, overflow: 'hidden' }, progressFill: { height: 4, backgroundColor: COLORS.secondary, borderRadius: 2 },
  managePill: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }, manageText: { ...FONTS.bold, fontSize: 13 },
  uploadRow: { paddingVertical: 22, flexDirection: 'row', alignItems: 'center', gap: 12 }, thumbnail: { width: 72, height: 48, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.primary },
  thumbnailOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.16)', alignItems: 'center', justifyContent: 'center' },
  uploadMetadata: { ...FONTS.regular, fontSize: 11, lineHeight: 16, marginBottom: 6 }, uploadTitle: { ...FONTS.semiBold, fontSize: 15, lineHeight: 22, letterSpacing: -0.2 },
  errorBanner: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }, errorText: { ...FONTS.regular, fontSize: 13, lineHeight: 20, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  noticeDialog: { borderRadius: 22, borderWidth: 1, width: '100%', maxWidth: 600, maxHeight: '85%', overflow: 'hidden' },
  noticeDialogHeader: { paddingLeft: 24, paddingRight: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  noticeDialogLabel: { ...FONTS.semiBold, fontSize: 14 }, noticeClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  noticeScroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 }, noticeBody: { padding: 24 }, noticeMetadata: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 },
  noticeTitle: { ...FONTS.semiBold, fontSize: 24, lineHeight: 33, letterSpacing: -0.5 }, noticeMessage: { ...FONTS.regular, fontSize: 15, lineHeight: 25, marginTop: 20 },
});
