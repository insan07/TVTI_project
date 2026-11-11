import React, { useState, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  FlatList,
  Platform,
  TextInput,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, FONTS } from '../../config/theme';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import ScreenBackground from '../../components/shared/ScreenBackground';
import NotificationBellIcon from '../../components/shared/NotificationBellIcon';
import StudentHomeCard from '../../components/student/StudentHomeCard';
import { communicationTheme } from '../../components/shared/communicationTheme';

export default function AdminDashboardScreen() {
  const context = useContext(AuthContext);
  if (!context) return null;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [homeError, setHomeError] = useState('');
  const dashboardRequest = useRef(0);
  const processingUser = useRef(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [rejectUser, setRejectUser] = useState<{ id: string; name: string } | null>(null);

  // All activities modal state
  const [allActivitiesVisible, setAllActivitiesVisible] = useState(false);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [loadingAllActivities, setLoadingAllActivities] = useState(false);
  const [refreshingAllActivities, setRefreshingAllActivities] = useState(false);

  // Popup Acknowledgement Modal State
  const [ackModal, setAckModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'danger';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });

  const showAck = (title: string, message: string, type: 'success' | 'info' | 'warning' | 'danger' = 'success') => {
    setAckModal({
      visible: true,
      title,
      message,
      type,
    });
  };

  const getFullImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    const baseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  // Website Tools Modal state
  const [websiteToolsVisible, setWebsiteToolsVisible] = useState(false);
  const [activeToolsTab, setActiveToolsTab] = useState<'settings' | 'news' | 'gallery'>('settings');
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [siteSettings, setSiteSettings] = useState({
    site_title: 'Twintec VTI',
    announcement_banner: 'Admissions are OPEN for 2026 batches! Register now to secure your seat.',
    show_announcement: true,
    contact_phone: '+94 77 123 4567',
    contact_email: 'info@twintec.edu.lk',
    whatsapp_number: '+94771234567',
    address: 'Twintec VTI Main Campus, Sri Lanka',
    registration_open: true,
    maintenance_mode: false,
    maintenance_message: 'The website is undergoing scheduled maintenance. Please check back shortly.',
  });

  // News State
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [savingNews, setSavingNews] = useState(false);
  const [newNews, setNewNews] = useState({
    title: '',
    category: 'ADMISSIONS',
    summary: '',
    message: '',
    image_url: '',
  });

  // Gallery State
  const [galleryList, setGalleryList] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);
  const [newGallery, setNewGallery] = useState({
    title: '',
    category: 'Workshops & Labs',
    type: 'photo' as 'photo' | 'video',
    url: '',
    description: '',
    youtubeId: '',
  });

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalInstructors: 0,
    activeCourses: 0,
    pendingApprovalsCount: 0,
    pendingUsers: [] as any[],
    recentActivities: [] as any[],
  });

  const fetchDashboardData = async () => {
    const current = ++dashboardRequest.current;
    setHomeError('');
    try {
      const res = await api.get('/admin/stats');
      if (current !== dashboardRequest.current) return;
      const data = res.data;
      setStats({
        totalStudents: data.totalStudents ?? 0,
        totalInstructors: data.totalInstructors ?? 0,
        activeCourses: data.activeCourses ?? 0,
        pendingApprovalsCount: data.pendingApprovalsCount ?? 0,
        pendingUsers: (data.pendingUsers || []).map((u: any) => ({
          _id: u._id,
          name: u.name,
          subtext: u.email || 'Applicant',
          initials: u.name
            ? u.name
                .trim()
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()
            : 'U',
        })),
        recentActivities: (data.recentActivities || []).slice(0, 5),
      });

      try {
        const notifRes = await api.get('/notifications/unread-count');
        if (current === dashboardRequest.current && typeof notifRes.data?.unread_count === 'number') setUnreadCount(notifRes.data.unread_count);
      } catch (err) {
        // ignore notification error
      }
    } catch (e) {
      console.log('Failed to fetch admin stats:', e);
      if (current === dashboardRequest.current) setHomeError('Your home page could not be refreshed. Please try again.');
    } finally {
      if (current === dashboardRequest.current) { setLoading(false); setRefreshing(false); }
    }
  };

  const fetchAllActivities = async () => {
    setLoadingAllActivities(true);
    try {
      const res = await api.get('/admin/activities?limit=50');
      setAllActivities(res.data || []);
    } catch (e) {
      console.log('Failed to fetch all activities:', e);
    } finally {
      setLoadingAllActivities(false);
      setRefreshingAllActivities(false);
    }
  };

  const handleOpenAllActivities = () => {
    setAllActivitiesVisible(true);
    fetchAllActivities();
  };

  const fetchSiteSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await api.get('/admin/settings');
      if (res.data) {
        setSiteSettings(prev => ({
          ...prev,
          ...res.data,
        }));
      }
    } catch (e) {
      console.log('Failed to fetch site settings:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchNewsList = async () => {
    setLoadingNews(true);
    try {
      const res = await api.get('/news');
      setNewsList(res.data || []);
    } catch (e) {
      console.log('Failed to fetch news list:', e);
    } finally {
      setLoadingNews(false);
    }
  };

  const handleCreateNews = async () => {
    if (!newNews.title.trim() || !newNews.message.trim()) {
      showAck('Missing Information', 'Please enter a title and description content for the news article.', 'warning');
      return;
    }
    setSavingNews(true);
    try {
      await api.post('/news', {
        title: newNews.title,
        category: newNews.category,
        summary: newNews.summary,
        content: newNews.message,
        image_url: newNews.image_url,
      });
      showAck(
        'News Article Published!',
        `The news article "${newNews.title}" has been published live to the public website!`,
        'success'
      );
      setNewNews({ title: '', category: 'ADMISSIONS', summary: '', message: '', image_url: '' });
      fetchNewsList();
    } catch (e: any) {
      showAck('Publish Error', e.response?.data?.message || 'Failed to post news article', 'danger');
    } finally {
      setSavingNews(false);
    }
  };

  const handleDeleteNews = async (id: string) => {
    try {
      await api.delete(`/news/${id}`);
      showAck('News Item Removed', 'The selected news article has been deleted from the website.', 'info');
      setNewsList(prev => prev.filter(item => item._id !== id));
    } catch (e: any) {
      showAck('Delete Error', e.response?.data?.message || 'Failed to delete news item', 'danger');
    }
  };

  const fetchGalleryList = async () => {
    setLoadingGallery(true);
    try {
      const res = await api.get('/gallery');
      setGalleryList(res.data || []);
    } catch (e) {
      console.log('Failed to fetch gallery list:', e);
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleCreateGallery = async () => {
    if (!newGallery.title.trim() || !newGallery.url.trim()) {
      showAck('Missing Information', 'Please enter a title and image/video URL.', 'warning');
      return;
    }
    setSavingGallery(true);
    try {
      await api.post('/gallery', newGallery);
      showAck(
        'Gallery Item Added!',
        `"${newGallery.title}" has been added and published to the website photo & video gallery!`,
        'success'
      );
      setNewGallery({ title: '', category: 'Workshops & Labs', type: 'photo', url: '', description: '', youtubeId: '' });
      fetchGalleryList();
    } catch (e: any) {
      showAck('Upload Error', e.response?.data?.message || 'Failed to add gallery item', 'danger');
    } finally {
      setSavingGallery(false);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    try {
      await api.delete(`/gallery/${id}`);
      showAck('Gallery Item Removed', 'The selected media item has been removed from the website gallery.', 'info');
      setGalleryList(prev => prev.filter(item => item._id !== id));
    } catch (e: any) {
      showAck('Delete Error', e.response?.data?.message || 'Failed to delete gallery item', 'danger');
    }
  };

  const [uploadingNewsImg, setUploadingNewsImg] = useState(false);
  const [uploadingGalleryImg, setUploadingGalleryImg] = useState(false);

  const handlePickNewsImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingNewsImg(true);

        const formData = new FormData();
        if (Platform.OS === 'web') {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          formData.append('image', blob, 'news_image.jpg');
        } else {
          formData.append('image', {
            uri: asset.uri,
            name: 'news_image.jpg',
            type: 'image/jpeg',
          } as any);
        }

        const res = await api.post('/admin/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data && res.data.url) {
          setNewNews(prev => ({ ...prev, image_url: res.data.url }));
          showAck('Photo Uploaded', 'Cover photo attached from device successfully!', 'success');
        }
      }
    } catch (e: any) {
      showAck('Upload Failed', e.message || 'Failed to upload photo', 'danger');
    } finally {
      setUploadingNewsImg(false);
    }
  };

  const handlePickGalleryPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingGalleryImg(true);

        const formData = new FormData();
        if (Platform.OS === 'web') {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          formData.append('image', blob, 'gallery_photo.jpg');
        } else {
          formData.append('image', {
            uri: asset.uri,
            name: 'gallery_photo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        const res = await api.post('/admin/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data && res.data.url) {
          setNewGallery(prev => ({ ...prev, url: res.data.url }));
          showAck('Photo Uploaded', 'Gallery photo uploaded from device successfully!', 'success');
        }
      }
    } catch (e: any) {
      showAck('Upload Failed', e.message || 'Failed to upload gallery photo', 'danger');
    } finally {
      setUploadingGalleryImg(false);
    }
  };

  const handleOpenWebsiteTools = () => {
    setWebsiteToolsVisible(true);
    fetchSiteSettings();
    fetchNewsList();
    fetchGalleryList();
  };

  const handleSaveWebsiteSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await api.put('/admin/settings', siteSettings);
      showAck(
        'Website Settings Saved',
        res.data?.message || 'Website configuration and live announcement ticker updated successfully!',
        'success'
      );
    } catch (e: any) {
      showAck('Update Error', e.response?.data?.message || 'Failed to update website settings.', 'danger');
    } finally {
      setSavingSettings(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
      return () => { dashboardRequest.current += 1; };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const updateApproval = async (id: string, name: string, reject = false) => {
    if (processingUser.current) return;
    processingUser.current = true; setProcessingUserId(id);
    try {
      await api.put(`/admin/users/${id}/${reject ? 'reject' : 'approve'}`, reject ? { reason: 'Rejected by admin' } : undefined);
      setStats(prev => ({ ...prev, pendingUsers: prev.pendingUsers.filter(user => user._id !== id), pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1) }));
      showAck(reject ? 'Application rejected' : 'Approved', `${name} has been ${reject ? 'rejected' : 'approved'}.`, 'success');
    } catch (failure: any) {
      showAck('Unable to update application', failure.response?.data?.message || 'The change could not be saved. Please try again.', 'danger');
    } finally { processingUser.current = false; setProcessingUserId(null); }
  };

  const handleApprove = (id: string, name: string) => navigation.navigate('Users', { initialActivity: 'applications', approveStudentId: id, approveStudentName: name });
  const handleReject = (id: string, name: string) => setRejectUser({ id, name });

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' }}>
      <ScreenBackground />
      <LinearGradient colors={['#0F172A', '#1E293B', '#090D16']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.graphicHeader, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <View style={styles.glowOrbOrange} pointerEvents="none" /><View style={styles.glowOrbBlue} pointerEvents="none" />
        <View style={styles.brandHeaderRow}>
          <View style={styles.brandLogoGroup}>
            <Image source={require('../../../assets/logo.png')} style={styles.brandLogoImg} resizeMode="contain" />
            <Text style={styles.brandTitleText}>TWINTEC VTI</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')} accessibilityRole="button" accessibilityLabel="View notifications" accessibilityHint={`${unreadCount} unread notifications`}>
            <NotificationBellIcon size={22} color="#FFFFFF" />{unreadCount > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.secondary]} tintColor={COLORS.secondary} />} showsVerticalScrollIndicator={false}>
        <View style={styles.homeContent}>
          {loading ? <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 40 }} /> : <>
            {!!homeError && <View style={[styles.homeError, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <Text accessibilityRole="alert" style={[styles.homeErrorText, { color: theme.text }]}>{homeError}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry home page" style={styles.homeHeaderAction} onPress={onRefresh}><Text style={styles.homeLink}>Retry</Text></TouchableOpacity>
            </View>}

            <StudentHomeCard title="Quick Actions" variant="communication">
              <View style={styles.homeActions}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Announcements" style={styles.homeActionButton} activeOpacity={0.65} onPress={() => navigation.navigate('PostAnnouncement')}>
                  <View style={[styles.homeActionIcon, { backgroundColor: isDark ? '#30251B' : '#FFF1E5' }]}><Icon name="megaphone-outline" size={22} color={COLORS.secondary} /></View>
                  <Text style={[styles.homeActionLabel, { color: theme.text }]}>Announcements</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Website tools" style={[styles.homeActionButton, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.line }]} activeOpacity={0.65} onPress={handleOpenWebsiteTools}>
                  <View style={[styles.homeActionIcon, { backgroundColor: isDark ? '#30251B' : '#FFF1E5' }]}><Icon name="globe-outline" size={22} color={COLORS.secondary} /></View>
                  <Text style={[styles.homeActionLabel, { color: theme.text }]}>Website Tools</Text>
                </TouchableOpacity>
              </View>
            </StudentHomeCard>

            <StudentHomeCard title="Pending Approvals" variant="communication" headerAction={
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="View all pending approvals" style={styles.homeHeaderAction} onPress={() => navigation.navigate('Users', { initialTab: 'pending' })}><Text style={styles.homeLink}>View all</Text></TouchableOpacity>
            }>
              {stats.pendingUsers.length === 0 ? <View style={styles.homeEmpty}><Text style={[styles.homeEmptyText, { color: theme.muted }]}>{homeError ? 'Pending approvals are unavailable. Refresh to try again.' : 'All caught up. No pending approvals.'}</Text></View> : stats.pendingUsers.map((user, index) =>
                <View key={user._id} style={[styles.homeUserRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
                  <View style={[styles.homeAvatar, { backgroundColor: isDark ? '#30251B' : '#FFF1E5' }]}><Text style={styles.homeAvatarText}>{user.initials}</Text></View>
                  <View style={styles.homeUserInfo}>
                    <Text style={[styles.homeRowTitle, { color: theme.text }]} numberOfLines={2}>{user.name}</Text>
                    <Text style={[styles.homeMetadata, { color: theme.muted }]} numberOfLines={1}>{user.subtext}</Text>
                  </View>
                  <View style={styles.homeApprovalActions}>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Approve ${user.name}`} disabled={processingUserId !== null}
                      style={[styles.homeApprovalButton, { backgroundColor: isDark ? '#14352D' : '#ECFDF5' }, processingUserId !== null && { opacity: 0.5 }]} onPress={() => handleApprove(user._id, user.name)}>
                      {processingUserId === user._id ? <ActivityIndicator size="small" color="#10B981" /> : <Icon name="checkmark" size={19} color={isDark ? '#6EE7B7' : '#047857'} />}
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Reject ${user.name}`} disabled={processingUserId !== null}
                      style={[styles.homeApprovalButton, { backgroundColor: isDark ? '#3B2023' : '#FEF2F2' }, processingUserId !== null && { opacity: 0.5 }]} onPress={() => handleReject(user._id, user.name)}><Icon name="close" size={19} color={isDark ? '#FCA5A5' : '#B91C1C'} /></TouchableOpacity>
                  </View>
                </View>)}
            </StudentHomeCard>

            <StudentHomeCard title="Recent Activities" variant="communication" headerAction={
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="View all activities" style={styles.homeHeaderAction} onPress={handleOpenAllActivities}><Text style={styles.homeLink}>View all</Text></TouchableOpacity>
            }>
              {stats.recentActivities.length === 0 ? <View style={styles.homeEmpty}><Text style={[styles.homeEmptyText, { color: theme.muted }]}>No recent activities recorded.</Text></View> : stats.recentActivities.map((activity, index) =>
                <View key={activity.id || String(index)} style={[styles.homeActivityRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
                  <View style={[styles.homeActivityIcon, { borderColor: theme.line }]}><Icon name={activity.icon || 'time-outline'} size={19} color={theme.muted} /></View>
                  <View style={styles.homeActivityContent}>
                    <Text style={[styles.homeMetadata, { color: theme.muted }]}>{activity.time}</Text>
                    <Text style={[styles.homeActivityText, { color: theme.text }]}>{activity.text}</Text>
                  </View>
                </View>)}
            </StudentHomeCard>

            <StudentHomeCard title="Institution Overview" variant="communication" headerAction={
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Toggle institution overview" accessibilityState={{ expanded: overviewExpanded }} style={styles.homeOverviewToggle} onPress={() => setOverviewExpanded(value => !value)}>
                <Text style={styles.homeLink}>{overviewExpanded ? 'Hide' : 'Show'}</Text><Icon name={overviewExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.secondary} />
              </TouchableOpacity>
            }>
              {overviewExpanded ? [
                { title: 'Students', value: stats.totalStudents, icon: 'people-outline' },
                { title: 'Instructors', value: stats.totalInstructors, icon: 'school-outline' },
                { title: 'Courses', value: stats.activeCourses, icon: 'book-outline' },
                { title: 'Pending approvals', value: stats.pendingApprovalsCount, icon: 'time-outline' },
              ].map((metric, index) => <View key={metric.title} style={[styles.homeMetricRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
                <Icon name={metric.icon as React.ComponentProps<typeof Icon>['name']} size={19} color={theme.muted} />
                <Text style={[styles.homeMetricLabel, { color: theme.text }]}>{metric.title}</Text>
                <Text style={[styles.homeMetricValue, { color: theme.text }]}>{metric.value}</Text>
              </View>) : <View style={styles.homeEmpty}><Text style={[styles.homeEmptyText, { color: theme.muted }]}>Students, instructors, courses and pending approvals.</Text></View>}
            </StudentHomeCard>
          </>}
        </View>
      </ScrollView>

      <Modal visible={!!rejectUser} transparent animationType="fade" onRequestClose={() => setRejectUser(null)}>
        <View style={styles.homeConfirmOverlay}>
          <View accessibilityViewIsModal style={[styles.homeConfirmCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.homeConfirmTitle, { color: theme.text }]}>Reject application?</Text>
            <Text style={[styles.homeEmptyText, { color: theme.muted }]}>Are you sure you want to reject {rejectUser?.name}?</Text>
            <View style={styles.homeConfirmActions}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel rejection" style={[styles.homeConfirmButton, { borderColor: theme.line }]} onPress={() => setRejectUser(null)}><Text style={[styles.homeLink, { color: theme.text }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Confirm rejection" style={[styles.homeConfirmButton, { borderColor: '#B91C1C', backgroundColor: '#B91C1C' }]} onPress={() => { const user = rejectUser; setRejectUser(null); if (user) void updateApproval(user.id, user.name, true); }}><Text style={[styles.homeLink, { color: '#FFFFFF' }]}>Reject</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* 3. ALL ACTIVITIES MODAL ("VIEW ALL" EXPERIENCE) */}
      <Modal
        visible={allActivitiesVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAllActivitiesVisible(false)}
      >
        <View style={[styles.modalContainer, isDark && { backgroundColor: '#141B26' }, { paddingTop: Platform.OS === 'ios' ? insets.top : 16 }]}>
          <View style={[styles.modalHeader, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <View>
              <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>System Activities</Text>
              <Text style={[styles.modalSub, isDark && { color: '#94A3B8' }]}>Complete log of recent institutional events</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close activities"
              style={[styles.modalCloseBtn, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}
              onPress={() => setAllActivitiesVisible(false)}
            >
              <Icon name="close" size={22} color={isDark ? '#FFFFFF' : '#1F2937'} />
            </TouchableOpacity>
          </View>

          {loadingAllActivities ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          ) : (
            <FlatList
              data={allActivities}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingAllActivities}
                  onRefresh={() => {
                    setRefreshingAllActivities(true);
                    fetchAllActivities();
                  }}
                  colors={['#F97316']}
                />
              }
              contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
              ListEmptyComponent={
                <View style={styles.modalCenter}>
                  <Icon name="time-outline" size={48} color="#D1D5DB" />
                  <Text style={[styles.emptyActivitiesText, isDark && { color: '#94A3B8' }]}>No system activities recorded yet.</Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <View style={[styles.modalActivityItem, index > 0 && (isDark ? styles.rowBorderDark : styles.rowBorder)]}>
                  <View style={[styles.activityIconCircle, { backgroundColor: `${item.color || '#F97316'}15` }]}>
                    <Icon name={item.icon || 'notifications-outline'} size={18} color={item.color || '#F97316'} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityText, isDark && { color: '#FFFFFF' }]}>{item.text}</Text>
                    <Text style={[styles.activityTime, isDark && { color: '#94A3B8' }]}>{item.time}</Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* 4. WEBSITE TOOLS & CONFIGURATION MODAL */}
      <Modal
        visible={websiteToolsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setWebsiteToolsVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, isDark && { backgroundColor: '#141B26' }, { paddingTop: Platform.OS === 'ios' ? insets.top : 16 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <View>
              <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>Website Tools & Settings</Text>
              <Text style={[styles.modalSub, isDark && { color: '#94A3B8' }]}>Manage website content, banners, news & gallery</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close website tools"
              style={[styles.modalCloseBtn, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}
              onPress={() => setWebsiteToolsVisible(false)}
            >
              <Icon name="close" size={22} color={isDark ? '#FFFFFF' : '#1F2937'} />
            </TouchableOpacity>
          </View>

          {/* WEBSITE TOOLS TAB SELECTOR */}
          <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : '#F1F5F9', padding: 4, marginHorizontal: 18, marginTop: 12, borderRadius: 12 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Website site configuration"
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9, backgroundColor: activeToolsTab === 'settings' ? (isDark ? '#1E293B' : '#FFFFFF') : 'transparent' }}
              onPress={() => setActiveToolsTab('settings')}
            >
              <Text style={{ fontSize: 12, ...FONTS.bold, color: activeToolsTab === 'settings' ? '#F58220' : (isDark ? '#94A3B8' : '#64748B') }}>Site Config</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Website news"
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9, backgroundColor: activeToolsTab === 'news' ? (isDark ? '#1E293B' : '#FFFFFF') : 'transparent' }}
              onPress={() => setActiveToolsTab('news')}
            >
              <Text style={{ fontSize: 12, ...FONTS.bold, color: activeToolsTab === 'news' ? '#F58220' : (isDark ? '#94A3B8' : '#64748B') }}>Update News</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Website gallery"
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9, backgroundColor: activeToolsTab === 'gallery' ? (isDark ? '#1E293B' : '#FFFFFF') : 'transparent' }}
              onPress={() => setActiveToolsTab('gallery')}
            >
              <Text style={{ fontSize: 12, ...FONTS.bold, color: activeToolsTab === 'gallery' ? '#F58220' : (isDark ? '#94A3B8' : '#64748B') }}>Update Gallery</Text>
            </TouchableOpacity>
          </View>

          {loadingSettings ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color="#F58220" />
              <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>Loading website settings...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {activeToolsTab === 'settings' && (
                <>
                  {/* SECTION 2: ANNOUNCEMENT BANNER & TICKER */}
                  <View style={styles.settingsCardSection}>
                    <View style={styles.settingsCardHeader}>
                      <Icon name="megaphone-outline" size={18} color="#F58220" style={{ marginRight: 8 }} />
                      <Text style={styles.settingsSectionTitle}>Announcement Banner & Ticker</Text>
                    </View>

                    <View style={styles.switchRow}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={styles.switchLabel}>Show Banner Ticker on Website</Text>
                        <Text style={styles.switchSub}>Displays top alert message banner for all website visitors</Text>
                      </View>
                      <Switch
                        value={siteSettings.show_announcement}
                        onValueChange={val => setSiteSettings({ ...siteSettings, show_announcement: val })}
                        trackColor={{ false: '#E2E8F0', true: '#FED7AA' }}
                        thumbColor={siteSettings.show_announcement ? '#F58220' : '#94A3B8'}
                      />
                    </View>

                    <Text style={styles.formInputLabel}>Announcement Banner Text</Text>
                    <TextInput
                      style={[styles.formTextInput, { height: 75, textAlignVertical: 'top' }]}
                      multiline
                      value={siteSettings.announcement_banner}
                      onChangeText={t => setSiteSettings({ ...siteSettings, announcement_banner: t })}
                      placeholder="e.g. Admissions are OPEN for 2026 batches! Register now."
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* SECTION 3: PUBLIC CONTACT & HOTLINE DETAILS */}
                  <View style={styles.settingsCardSection}>
                    <View style={styles.settingsCardHeader}>
                      <Icon name="call-outline" size={18} color="#F58220" style={{ marginRight: 8 }} />
                      <Text style={styles.settingsSectionTitle}>Website Contact & Support Details</Text>
                    </View>

                    <Text style={styles.formInputLabel}>Official Support Phone Number</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={siteSettings.contact_phone}
                      onChangeText={t => setSiteSettings({ ...siteSettings, contact_phone: t })}
                      placeholder="+94 77 123 4567"
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.formInputLabel}>Support Email Address</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={siteSettings.contact_email}
                      onChangeText={t => setSiteSettings({ ...siteSettings, contact_email: t })}
                      placeholder="info@twintec.edu.lk"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.formInputLabel}>WhatsApp Hotline Number</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={siteSettings.whatsapp_number}
                      onChangeText={t => setSiteSettings({ ...siteSettings, whatsapp_number: t })}
                      placeholder="+94771234567"
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.formInputLabel}>Physical Campus Address</Text>
                    <TextInput
                      style={[styles.formTextInput, { height: 60, textAlignVertical: 'top' }]}
                      multiline
                      value={siteSettings.address}
                      onChangeText={t => setSiteSettings({ ...siteSettings, address: t })}
                      placeholder="Main Campus Address"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* SECTION 4: REGISTRATION & MAINTENANCE MODE */}
                  <View style={styles.settingsCardSection}>
                    <View style={styles.settingsCardHeader}>
                      <Icon name="shield-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                      <Text style={styles.settingsSectionTitle}>Registration & Maintenance Settings</Text>
                    </View>

                    <View style={styles.switchRow}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={styles.switchLabel}>Public Student Registration</Text>
                        <Text style={styles.switchSub}>Allow new students to submit registration applications online</Text>
                      </View>
                      <Switch
                        value={siteSettings.registration_open}
                        onValueChange={val => setSiteSettings({ ...siteSettings, registration_open: val })}
                        trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }}
                        thumbColor={siteSettings.registration_open ? '#10B981' : '#94A3B8'}
                      />
                    </View>

                    <View style={[styles.switchRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={styles.switchLabel}>Enable Website Maintenance Mode</Text>
                        <Text style={styles.switchSub}>Show maintenance alert notice to visitors</Text>
                      </View>
                      <Switch
                        value={siteSettings.maintenance_mode}
                        onValueChange={val => setSiteSettings({ ...siteSettings, maintenance_mode: val })}
                        trackColor={{ false: '#E2E8F0', true: '#FECDD3' }}
                        thumbColor={siteSettings.maintenance_mode ? '#EF4444' : '#94A3B8'}
                      />
                    </View>

                    {siteSettings.maintenance_mode && (
                      <View style={{ marginTop: 14 }}>
                        <Text style={styles.formInputLabel}>Maintenance Notice Message</Text>
                        <TextInput
                          style={[styles.formTextInput, { height: 65, textAlignVertical: 'top' }]}
                          multiline
                          value={siteSettings.maintenance_message}
                          onChangeText={t => setSiteSettings({ ...siteSettings, maintenance_message: t })}
                          placeholder="Maintenance message..."
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    )}
                  </View>

                  {/* SAVE SETTINGS BUTTON */}
                  <TouchableOpacity
                    style={styles.saveSettingsBtn}
                    onPress={handleSaveWebsiteSettings}
                    disabled={savingSettings}
                    activeOpacity={0.85}
                  >
                    {savingSettings ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.saveSettingsBtnText}>Save Website Settings</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* TAB 2: UPDATE NEWS & ANNOUNCEMENTS */}
              {activeToolsTab === 'news' && (
                <View>
                  <View style={styles.settingsCardSection}>
                    <View style={styles.settingsCardHeader}>
                      <Icon name="newspaper-outline" size={18} color="#F58220" style={{ marginRight: 8 }} />
                      <Text style={styles.settingsSectionTitle}>Post New Website News & Article</Text>
                    </View>

                    <Text style={styles.formInputLabel}>News Title *</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={newNews.title}
                      onChangeText={t => setNewNews({ ...newNews, title: t })}
                      placeholder="e.g. 2026 Batch Admissions Open"
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.formInputLabel}>Category</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {['ADMISSIONS', 'GRADUATION', 'FACILITIES', 'NEWS'].map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setNewNews({ ...newNews, category: cat })}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: newNews.category === cat ? '#F58220' : '#E2E8F0',
                          }}
                        >
                          <Text style={{ fontSize: 11, ...FONTS.bold, color: newNews.category === cat ? '#FFFFFF' : '#475569' }}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.formInputLabel}>News Cover Photo</Text>
                    <View style={{ marginBottom: 12 }}>
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#FFF7ED',
                          borderWidth: 1.5,
                          borderColor: '#FFEDD5',
                          borderStyle: 'dashed',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 10,
                          marginBottom: 8,
                        }}
                        onPress={handlePickNewsImage}
                        disabled={uploadingNewsImg}
                      >
                        {uploadingNewsImg ? (
                          <ActivityIndicator size="small" color="#F58220" />
                        ) : (
                          <>
                            <Icon name="camera-outline" size={20} color="#F58220" style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 13, ...FONTS.bold, color: '#F58220' }}>
                              {newNews.image_url ? 'Change Photo from Device' : 'Upload Photo from Device'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {newNews.image_url ? (
                        <View style={{ position: 'relative', marginTop: 6, borderRadius: 10, overflow: 'hidden', height: 110, backgroundColor: '#F1F5F9' }}>
                          <Image
                            source={{ uri: getFullImageUrl(newNews.image_url) }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={() => setNewNews(prev => ({ ...prev, image_url: '' }))}
                            style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 14 }}
                          >
                            <Icon name="close" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TextInput
                          style={styles.formTextInput}
                          value={newNews.image_url}
                          onChangeText={t => setNewNews({ ...newNews, image_url: t })}
                          placeholder="Or paste photo web link URL..."
                          placeholderTextColor="#9CA3AF"
                        />
                      )}
                    </View>

                    <Text style={styles.formInputLabel}>Short Summary</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={newNews.summary}
                      onChangeText={t => setNewNews({ ...newNews, summary: t })}
                      placeholder="Brief 1-sentence summary"
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.formInputLabel}>Detailed Message / Content *</Text>
                    <TextInput
                      style={[styles.formTextInput, { height: 80, textAlignVertical: 'top' }]}
                      multiline
                      value={newNews.message}
                      onChangeText={t => setNewNews({ ...newNews, message: t })}
                      placeholder="Type news details..."
                      placeholderTextColor="#9CA3AF"
                    />

                    <TouchableOpacity
                      style={[styles.saveSettingsBtn, { backgroundColor: '#F58220' }]}
                      onPress={handleCreateNews}
                      disabled={savingNews}
                    >
                      {savingNews ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Icon name="paper-plane-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.saveSettingsBtnText}>Publish News to Website</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* CURRENT NEWS LIST */}
                  <View style={styles.settingsCardSection}>
                    <Text style={[styles.settingsSectionTitle, { marginBottom: 12 }]}>Live Website News ({newsList.length})</Text>
                    {loadingNews ? (
                      <ActivityIndicator size="small" color="#F58220" />
                    ) : newsList.length === 0 ? (
                      <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No news published yet.</Text>
                    ) : (
                      newsList.map((item) => (
                        <View key={item._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                            {item.image_url ? (
                              <Image
                                source={{ uri: getFullImageUrl(item.image_url) }}
                                style={{ width: 42, height: 42, borderRadius: 8, marginRight: 10, backgroundColor: '#F1F5F9' }}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={{ width: 42, height: 42, borderRadius: 8, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                <Icon name="newspaper-outline" size={20} color="#F58220" />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, ...FONTS.bold, color: '#0F172A' }}>{item.title}</Text>
                              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }} numberOfLines={1}>{item.summary || item.content || item.message}</Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteNews(item._id)} style={{ padding: 6 }}>
                            <Icon name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* TAB 3: UPDATE GALLERY (PHOTOS & VIDEOS) */}
              {activeToolsTab === 'gallery' && (
                <View>
                  <View style={styles.settingsCardSection}>
                    <View style={styles.settingsCardHeader}>
                      <Icon name="images-outline" size={18} color="#F58220" style={{ marginRight: 8 }} />
                      <Text style={styles.settingsSectionTitle}>Add Gallery Item (Photo or Video)</Text>
                    </View>

                    <Text style={styles.formInputLabel}>Media Type</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                      <TouchableOpacity
                        onPress={() => setNewGallery({ ...newGallery, type: 'photo' })}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          alignItems: 'center',
                          borderRadius: 8,
                          backgroundColor: newGallery.type === 'photo' ? '#F58220' : '#E2E8F0',
                          flexDirection: 'row',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name="image-outline" size={16} color={newGallery.type === 'photo' ? '#FFFFFF' : '#475569'} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, ...FONTS.bold, color: newGallery.type === 'photo' ? '#FFFFFF' : '#475569' }}>
                          Upload Photo
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setNewGallery({ ...newGallery, type: 'video' })}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          alignItems: 'center',
                          borderRadius: 8,
                          backgroundColor: newGallery.type === 'video' ? '#0F172A' : '#E2E8F0',
                          flexDirection: 'row',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name="logo-youtube" size={16} color={newGallery.type === 'video' ? '#FFFFFF' : '#475569'} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, ...FONTS.bold, color: newGallery.type === 'video' ? '#FFFFFF' : '#475569' }}>
                          YouTube Video
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.formInputLabel}>Title *</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={newGallery.title}
                      onChangeText={t => setNewGallery({ ...newGallery, title: t })}
                      placeholder={newGallery.type === 'photo' ? "e.g. Micro-soldering Workshop" : "e.g. Domestic Wiring Demonstration"}
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.formInputLabel}>Category</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={newGallery.category}
                      onChangeText={t => setNewGallery({ ...newGallery, category: t })}
                      placeholder="e.g. Workshops & Labs, Practical Sessions, Certificates & Events"
                      placeholderTextColor="#9CA3AF"
                    />

                    {newGallery.type === 'photo' ? (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={styles.formInputLabel}>Gallery Photo File *</Text>
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FFF7ED',
                            borderWidth: 1.5,
                            borderColor: '#FFEDD5',
                            borderStyle: 'dashed',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 10,
                            marginBottom: 8,
                          }}
                          onPress={handlePickGalleryPhoto}
                          disabled={uploadingGalleryImg}
                        >
                          {uploadingGalleryImg ? (
                            <ActivityIndicator size="small" color="#F58220" />
                          ) : (
                            <>
                              <Icon name="cloud-upload-outline" size={20} color="#F58220" style={{ marginRight: 8 }} />
                              <Text style={{ fontSize: 13, ...FONTS.bold, color: '#F58220' }}>
                                {newGallery.url ? 'Change Photo from Device' : 'Choose Photo from Device'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>

                        {newGallery.url ? (
                          <View style={{ position: 'relative', marginTop: 4, borderRadius: 10, overflow: 'hidden', height: 110, backgroundColor: '#F1F5F9' }}>
                            <Image
                              source={{ uri: getFullImageUrl(newGallery.url) }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                            <TouchableOpacity
                              onPress={() => setNewGallery(prev => ({ ...prev, url: '' }))}
                              style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 14 }}
                            >
                              <Icon name="close" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TextInput
                            style={styles.formTextInput}
                            value={newGallery.url}
                            onChangeText={t => setNewGallery({ ...newGallery, url: t })}
                            placeholder="Or paste photo web link URL..."
                            placeholderTextColor="#9CA3AF"
                          />
                        )}
                      </View>
                    ) : (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={styles.formInputLabel}>YouTube Video Link / URL *</Text>
                        <TextInput
                          style={styles.formTextInput}
                          value={newGallery.url}
                          onChangeText={t => setNewGallery({ ...newGallery, url: t })}
                          placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                          placeholderTextColor="#9CA3AF"
                        />
                        {/* Auto Extract Youtube Thumbnail Preview */}
                        {(() => {
                          const match = newGallery.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                          const ytId = match ? match[1] : null;
                          if (ytId) {
                            return (
                              <View style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 120, backgroundColor: '#000000', marginTop: 6, alignItems: 'center', justifyContent: 'center' }}>
                                <Image
                                  source={{ uri: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
                                  style={{ width: '100%', height: '100%', opacity: 0.85 }}
                                  resizeMode="cover"
                                />
                                <View style={{ position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF0000', alignItems: 'center', justifyContent: 'center' }}>
                                  <Icon name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
                                </View>
                              </View>
                            );
                          }
                          return null;
                        })()}
                      </View>
                    )}

                    <Text style={styles.formInputLabel}>Description</Text>
                    <TextInput
                      style={[styles.formTextInput, { height: 60, textAlignVertical: 'top' }]}
                      multiline
                      value={newGallery.description}
                      onChangeText={t => setNewGallery({ ...newGallery, description: t })}
                      placeholder="Brief description of the photo or video..."
                      placeholderTextColor="#9CA3AF"
                    />

                    <TouchableOpacity
                      style={[styles.saveSettingsBtn, { backgroundColor: '#F58220' }]}
                      onPress={handleCreateGallery}
                      disabled={savingGallery}
                    >
                      {savingGallery ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Icon name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.saveSettingsBtnText}>Add to Website Gallery</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* CURRENT GALLERY LIST */}
                  <View style={styles.settingsCardSection}>
                    <Text style={[styles.settingsSectionTitle, { marginBottom: 12 }]}>Live Website Gallery Items ({galleryList.length})</Text>
                    {loadingGallery ? (
                      <ActivityIndicator size="small" color="#F58220" />
                    ) : galleryList.length === 0 ? (
                      <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No gallery items uploaded yet.</Text>
                    ) : (
                      galleryList.map((item) => {
                        const match = item.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                        const ytId = item.youtubeId || (match ? match[1] : null);
                        const thumbUrl = item.type === 'video' && ytId
                          ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                          : getFullImageUrl(item.url);

                        return (
                          <View key={item._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                              {thumbUrl ? (
                                <Image
                                  source={{ uri: thumbUrl }}
                                  style={{ width: 44, height: 44, borderRadius: 8, marginRight: 10, backgroundColor: '#F1F5F9' }}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: item.type === 'video' ? '#0F172A' : '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                  <Icon name={item.type === 'video' ? 'logo-youtube' : 'image-outline'} size={20} color={item.type === 'video' ? '#FFFFFF' : '#F58220'} />
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <View style={{ backgroundColor: item.type === 'video' ? '#0F172A' : '#FFF7ED', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4, marginRight: 6 }}>
                                    <Text style={{ fontSize: 8.5, ...FONTS.bold, color: item.type === 'video' ? '#FFFFFF' : '#F58220' }}>{item.type?.toUpperCase() || 'PHOTO'}</Text>
                                  </View>
                                  <Text style={{ fontSize: 13, ...FONTS.bold, color: '#0F172A' }} numberOfLines={1}>{item.title}</Text>
                                </View>
                                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }} numberOfLines={1}>{item.category} &bull; {item.description || item.url}</Text>
                              </View>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteGallery(item._id)} style={{ padding: 6 }}>
                              <Icon name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* POPUP ACKNOWLEDGEMENT MODAL OVERLAY */}
      <Modal
        visible={ackModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAckModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: theme.surface,
            borderRadius: 24,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
            borderWidth: 1,
            borderColor: theme.line
          }}>
            
            {/* Glowing Circle Icon Badge */}
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: ackModal.type === 'success' ? '#DCFCE7' : ackModal.type === 'warning' ? '#FEF3C7' : ackModal.type === 'danger' ? '#FEE2E2' : '#DBEAFE',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 2,
              borderColor: ackModal.type === 'success' ? '#86EFAC' : ackModal.type === 'warning' ? '#FDE68A' : ackModal.type === 'danger' ? '#FCA5A5' : '#BFDBFE',
            }}>
              <Icon
                name={
                  ackModal.type === 'success'
                    ? 'checkmark-circle'
                    : ackModal.type === 'warning'
                    ? 'warning'
                    : ackModal.type === 'danger'
                    ? 'alert-circle'
                    : 'information-circle'
                }
                size={34}
                color={
                  ackModal.type === 'success'
                    ? '#16A34A'
                    : ackModal.type === 'warning'
                    ? '#D97706'
                    : ackModal.type === 'danger'
                    ? '#DC2626'
                    : '#F58220'
                }
              />
            </View>

            {/* Title */}
            <Text style={{ fontSize: 18, ...FONTS.bold, color: theme.text, textAlign: 'center', marginBottom: 8 }}>
              {ackModal.title}
            </Text>

            {/* Message */}
            <Text style={{ fontSize: 13.5, color: theme.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
              {ackModal.message}
            </Text>

            {/* Dismiss Button */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Dismiss admin message"
              onPress={() => setAckModal(prev => ({ ...prev, visible: false }))}
              style={{
                width: '100%',
                backgroundColor: ackModal.type === 'danger' ? '#DC2626' : '#F58220',
                minHeight: 48,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#F58220',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 3,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  homeContent: { paddingHorizontal: 20, paddingTop: 20, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  homeHeaderAction: { minHeight: 44, justifyContent: 'center' }, homeLink: { ...FONTS.semiBold, fontSize: 12, color: COLORS.secondary },
  homeActions: { flexDirection: 'row', paddingVertical: 18 }, homeActionButton: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 8, gap: 10 },
  homeActionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, homeActionLabel: { ...FONTS.semiBold, fontSize: 12, lineHeight: 18, textAlign: 'center', width: '100%', flexShrink: 1 },
  homeEmpty: { paddingVertical: 18 }, homeEmptyText: { ...FONTS.regular, fontSize: 13, lineHeight: 20 },
  homeUserRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 12, paddingVertical: 22 },
  homeAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, homeAvatarText: { ...FONTS.semiBold, color: COLORS.secondary, fontSize: 12 },
  homeUserInfo: { flex: 1, minWidth: 100 }, homeRowTitle: { ...FONTS.semiBold, fontSize: 15, lineHeight: 22, letterSpacing: -0.2 },
  homeMetadata: { ...FONTS.regular, fontSize: 11, lineHeight: 16, marginTop: 4 },
  homeApprovalActions: { flexDirection: 'row', gap: 8, marginLeft: 'auto' }, homeApprovalButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  homeActivityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 22 },
  homeActivityIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  homeActivityContent: { flex: 1, minWidth: 0 }, homeActivityText: { ...FONTS.medium, fontSize: 15, lineHeight: 23, marginTop: 5, letterSpacing: -0.2 },
  homeOverviewToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  homeMetricRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 }, homeMetricLabel: { ...FONTS.medium, flex: 1, fontSize: 14, lineHeight: 22 }, homeMetricValue: { ...FONTS.semiBold, fontSize: 20 },
  homeError: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }, homeErrorText: { ...FONTS.regular, fontSize: 13, lineHeight: 20, flex: 1 },
  homeConfirmOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  homeConfirmCard: { width: '100%', maxWidth: 380, borderWidth: 1, borderRadius: 22, padding: 24, gap: 14 }, homeConfirmTitle: { ...FONTS.semiBold, fontSize: 20, lineHeight: 28 },
  homeConfirmActions: { flexDirection: 'row', gap: 10, marginTop: 8 }, homeConfirmButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  /* Graphic Hero Header */
  graphicHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 10,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 10px 28px rgba(15, 23, 42, 0.28)' },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  glowOrbOrange: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(249, 115, 22, 0.16)',
  },
  glowOrbBlue: {
    position: 'absolute',
    bottom: -50,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
  brandHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  brandLogoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  brandLogoImg: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  brandTextColumn: {
    justifyContent: 'center',
    height: 32,
  },
  brandTitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    ...FONTS.extraBold,
    letterSpacing: 0.8,
  },
  bellBtn: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F58220',
  },

  adminAIBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 14px rgba(249, 115, 22, 0.25)',
      },
      default: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  adminAIBadgeText: {
    color: '#FED7AA',
    fontSize: 10.5,
    ...FONTS.extraBold,
    letterSpacing: 1.2,
  },

  /* Secondary dashboard metrics */
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  statCard: {
    backgroundColor: '#F8FAFC',
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    ...FONTS.bold,
    color: '#64748B',
    letterSpacing: 0.7,
  },
  statIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    ...FONTS.extraBold,
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  overviewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  overviewTitleContainer: {
    flex: 1,
  },
  overviewSubtext: {
    color: '#6B7280',
    fontSize: 12,
    ...FONTS.regular,
    marginTop: 3,
  },

  /* Announcements Glassmorphic Card */
  glassCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px -4px rgba(245, 130, 32, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#F58220',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  noticeCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.9), inset 0 0 0 1px rgba(254, 215, 170, 0.45)',
      },
    }),
  },
  glassAccentBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: '#F58220',
  },
  noticeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(245, 130, 32, 0.12), inset 0 1px 1px rgba(255, 255, 255, 1)',
      },
      default: {
        shadowColor: '#F58220',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  noticeContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  noticeTitle: {
    fontSize: 15,
    ...FONTS.bold,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  noticeSub: {
    fontSize: 12,
    ...FONTS.regular,
    color: '#64748B',
    marginTop: 2,
  },
  noticeCtaBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F58220',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 9,
    ...Platform.select({
      web: {
        boxShadow: '0px 3px 8px rgba(245, 130, 32, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
      },
      default: {
        shadowColor: '#F58220',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  noticeCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    ...FONTS.bold,
    letterSpacing: 0.2,
  },

  /* Section Cards */
  sectionCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    ...FONTS.bold,
    color: '#111827',
  },
  viewAllText: {
    color: '#F97316',
    ...FONTS.semiBold,
    fontSize: 13,
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    ...FONTS.regular,
    paddingVertical: 10,
    fontSize: 13,
  },

  /* Empty Approvals State (Clean, minimal) */
  emptyApprovalsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  simpleCheckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  allCaughtUpText: {
    fontSize: 14,
    ...FONTS.semiBold,
    color: '#4B5563',
  },

  /* Pending Approvals */
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    ...FONTS.bold,
    color: '#4B5563',
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 15,
    ...FONTS.bold,
    color: '#1F2937',
  },
  userSubtext: {
    fontSize: 13,
    ...FONTS.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approveIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rejectIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Recent Activities */
  activityList: {
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#1F2937',
    ...FONTS.semiBold,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
    ...FONTS.regular,
    marginTop: 3,
  },

  /* Modal Styles */
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    ...FONTS.bold,
    color: '#111827',
  },
  modalSub: {
    fontSize: 13,
    ...FONTS.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyActivitiesText: {
    fontSize: 14,
    color: '#9CA3AF',
    ...FONTS.regular,
    marginTop: 12,
    fontStyle: 'italic',
  },
  modalActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },

  /* Website Tools Modal Styles */
  settingsCardSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  settingsSectionTitle: {
    fontSize: 15,
    ...FONTS.bold,
    color: '#0F172A',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shortcutBtn: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shortcutIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shortcutLabel: {
    fontSize: 11,
    ...FONTS.bold,
    color: '#334155',
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    ...FONTS.bold,
    color: '#1E293B',
  },
  switchSub: {
    fontSize: 12,
    ...FONTS.regular,
    color: '#64748B',
    marginTop: 2,
  },
  formInputLabel: {
    fontSize: 13,
    ...FONTS.semiBold,
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  formTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    ...FONTS.regular,
    marginBottom: 10,
  },
  saveSettingsBtn: {
    backgroundColor: '#F58220',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(245, 130, 32, 0.35)' },
      default: {
        shadowColor: '#F58220',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 4,
      },
    }),
  },
  saveSettingsBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    ...FONTS.bold,
  },
  glassCardWrapperDark: {
    borderColor: 'rgba(249, 115, 22, 0.3)',
    shadowColor: '#000',
  },
  noticeCardDark: {
    backgroundColor: '#141B26',
    borderColor: 'rgba(249, 115, 22, 0.25)',
  },
  noticeIconBoxDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  sectionCardDark: {
    backgroundColor: '#141B26',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
  },
  statCardDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rowBorderDark: {
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
});
