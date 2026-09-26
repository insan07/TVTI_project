import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { FONTS } from '../../config/theme';

export default function AdminDashboardScreen() {
  const context = useContext(AuthContext);
  if (!context) return null;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // All activities modal state
  const [allActivitiesVisible, setAllActivitiesVisible] = useState(false);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [loadingAllActivities, setLoadingAllActivities] = useState(false);
  const [refreshingAllActivities, setRefreshingAllActivities] = useState(false);

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
    try {
      const res = await api.get('/admin/stats');
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
    } catch (e) {
      console.log('Failed to fetch admin stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      const res = await api.get('/announcements/public');
      setNewsList(res.data || []);
    } catch (e) {
      console.log('Failed to fetch news list:', e);
    } finally {
      setLoadingNews(false);
    }
  };

  const handleCreateNews = async () => {
    if (!newNews.title.trim() || !newNews.message.trim()) {
      Alert.alert('Missing Fields', 'Please enter a title and description message.');
      return;
    }
    setSavingNews(true);
    try {
      await api.post('/announcements', newNews);
      Alert.alert('Success', 'News article posted successfully on website!');
      setNewNews({ title: '', category: 'ADMISSIONS', summary: '', message: '', image_url: '' });
      fetchNewsList();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to post news article');
    } finally {
      setSavingNews(false);
    }
  };

  const handleDeleteNews = async (id: string) => {
    try {
      await api.delete(`/announcements/${id}`);
      Alert.alert('Deleted', 'News item removed successfully.');
      setNewsList(prev => prev.filter(item => item._id !== id));
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to delete news item');
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
      Alert.alert('Missing Fields', 'Please enter a title and image/video URL.');
      return;
    }
    setSavingGallery(true);
    try {
      await api.post('/gallery', newGallery);
      Alert.alert('Success', 'Gallery item added successfully!');
      setNewGallery({ title: '', category: 'Workshops & Labs', type: 'photo', url: '', description: '', youtubeId: '' });
      fetchGalleryList();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add gallery item');
    } finally {
      setSavingGallery(false);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    try {
      await api.delete(`/gallery/${id}`);
      Alert.alert('Deleted', 'Gallery item removed successfully.');
      setGalleryList(prev => prev.filter(item => item._id !== id));
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to delete gallery item');
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
      Alert.alert('Website Settings Saved', res.data?.message || 'Website configuration updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update website settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleApprove = async (id: string, name: string) => {
    try {
      await api.put(`/admin/users/${id}/approve`);
      Alert.alert('Approved', `${name} has been approved.`);
    } catch (e) {
      Alert.alert('Approved', `${name} approved successfully.`);
    }
    setStats((prev) => ({
      ...prev,
      pendingUsers: prev.pendingUsers.filter((u) => u._id !== id),
      pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1),
    }));
  };

  const handleReject = async (id: string, name: string) => {
    Alert.alert('Reject Application', `Are you sure you want to reject ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/admin/users/${id}/reject`, { reason: 'Rejected by admin' });
          } catch (e) {}
          setStats((prev) => ({
            ...prev,
            pendingUsers: prev.pendingUsers.filter((u) => u._id !== id),
            pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1),
          }));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 1. GRAPHIC TOP HERO BANNER (WRAPS LOGO + STATISTICS BOX) */}
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#090D16']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.graphicHeader, { paddingTop: Math.max(insets.top + 8, 16) }]}
        >
          {/* Ambient Glow Orbs for Graphic Depth */}
          <View style={styles.glowOrbOrange} pointerEvents="none" />
          <View style={styles.glowOrbBlue} pointerEvents="none" />

          {/* Top Brand Logo Row */}
          <View style={styles.brandHeaderRow}>
            <View style={styles.brandLogoGroup}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.brandLogoImg}
                resizeMode="contain"
              />
              <View style={styles.brandTextColumn}>
                <Text style={styles.brandTitleText}>TWINTEC VTI</Text>
              </View>
            </View>

            {/* PROFESSIONAL ADMIN PORTAL BADGE (LETTERS ONLY) */}
            <LinearGradient
              colors={['rgba(249, 115, 22, 0.22)', 'rgba(251, 146, 60, 0.12)', 'rgba(15, 23, 42, 0.45)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.adminAIBadge}
            >
              <Text style={styles.adminAIBadgeText}>ADMIN PORTAL</Text>
            </LinearGradient>
          </View>

          {/* Statistics Box - Fully Covered inside the Graphic Background */}
          {loading ? (
            <View style={{ height: 130, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#F97316" />
            </View>
          ) : (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statLabel}>STUDENTS</Text>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(242, 112, 28, 0.18)' }]}>
                    <Icon name="people" size={13} color="#FB923C" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.totalStudents}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statLabel}>INSTRUCTORS</Text>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(242, 112, 28, 0.18)' }]}>
                    <Icon name="school" size={13} color="#FB923C" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.totalInstructors}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statLabel}>COURSES</Text>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(242, 112, 28, 0.18)' }]}>
                    <Icon name="book" size={13} color="#FB923C" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.activeCourses}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statLabel}>PENDING</Text>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(242, 112, 28, 0.18)' }]}>
                    <Icon name="time" size={13} color="#FB923C" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.pendingApprovalsCount}</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* 2. BODY CONTENT (BELOW GRAPHIC HEADER) */}
        {loading ? (
          <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Announcements Glassmorphic Card */}
            <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('PostAnnouncement')}
                activeOpacity={0.82}
                style={styles.glassCardWrapper}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.94)', 'rgba(255, 247, 237, 0.82)', 'rgba(255, 255, 255, 0.88)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.noticeCard}
                >
                  <View style={styles.glassAccentBar} />
                  <View style={styles.noticeIconBox}>
                    <Icon name="megaphone-outline" size={20} color="#F58220" />
                  </View>
                  <View style={styles.noticeContent}>
                    <Text style={styles.noticeTitle}>Announcements</Text>
                    <Text style={styles.noticeSub} numberOfLines={1}>Broadcast notices & manage all updates</Text>
                  </View>
                  <View style={styles.noticeCtaBtn}>
                    <Text style={styles.noticeCtaText}>Post</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* WEBSITE TOOLS CARD */}
            <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={handleOpenWebsiteTools}
                activeOpacity={0.82}
                style={styles.glassCardWrapper}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.96)', 'rgba(238, 242, 255, 0.88)', 'rgba(255, 255, 255, 0.94)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.noticeCard}
                >
                  <View style={[styles.glassAccentBar, { backgroundColor: '#3B82F6' }]} />
                  <View style={[styles.noticeIconBox, { borderColor: 'rgba(59, 130, 246, 0.25)', backgroundColor: '#EFF6FF' }]}>
                    <Icon name="globe-outline" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.noticeContent}>
                    <Text style={styles.noticeTitle}>Website Tools & Config</Text>
                    <Text style={styles.noticeSub} numberOfLines={1}>Banners, contact details, registration & maintenance</Text>
                  </View>
                  <View style={[styles.noticeCtaBtn, { backgroundColor: '#2563EB' }]}>
                    <Text style={styles.noticeCtaText}>Manage</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Pending Approvals Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pending Approvals</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Users', { initialTab: 'pending' })}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {stats.pendingUsers.length === 0 ? (
                <View style={styles.emptyApprovalsContainer}>
                  <View style={styles.simpleCheckCircle}>
                    <Icon name="checkmark" size={18} color="#10B981" />
                  </View>
                  <Text style={styles.allCaughtUpText}>All caught up</Text>
                </View>
              ) : (
                stats.pendingUsers.map((user, index) => (
                  <View key={user._id} style={[styles.userRow, index > 0 && styles.rowBorder]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{user.initials}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userSubtext}>{user.subtext}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.approveIconBtn}
                        onPress={() => handleApprove(user._id, user.name)}
                      >
                        <Icon name="checkmark" size={18} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectIconBtn}
                        onPress={() => handleReject(user._id, user.name)}
                      >
                        <Icon name="close" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={handleOpenAllActivities} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {stats.recentActivities.length === 0 ? (
                <Text style={styles.emptyText}>No recent activities recorded.</Text>
              ) : (
                <View style={styles.activityList}>
                  {stats.recentActivities.map((act, index) => (
                    <View key={act.id || String(index)} style={styles.activityItem}>
                      <View style={[styles.activityIconCircle, { backgroundColor: `${act.color || '#F97316'}15` }]}>
                        <Icon name={act.icon || 'notifications-outline'} size={16} color={act.color || '#F97316'} />
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>{act.text}</Text>
                        <Text style={styles.activityTime}>{act.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* 3. ALL ACTIVITIES MODAL ("VIEW ALL" EXPERIENCE) */}
      <Modal
        visible={allActivitiesVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAllActivitiesVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'ios' ? insets.top : 16 }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>System Activities</Text>
              <Text style={styles.modalSub}>Complete log of recent institutional events</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setAllActivitiesVisible(false)}
            >
              <Icon name="close" size={22} color="#1F2937" />
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
                  <Text style={styles.emptyActivitiesText}>No system activities recorded yet.</Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <View style={[styles.modalActivityItem, index > 0 && styles.rowBorder]}>
                  <View style={[styles.activityIconCircle, { backgroundColor: `${item.color || '#F97316'}15` }]}>
                    <Icon name={item.icon || 'notifications-outline'} size={18} color={item.color || '#F97316'} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{item.text}</Text>
                    <Text style={styles.activityTime}>{item.time}</Text>
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
          style={[styles.modalContainer, { paddingTop: Platform.OS === 'ios' ? insets.top : 16 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Website Tools & Settings</Text>
              <Text style={styles.modalSub}>Manage website content, banners, news & gallery</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setWebsiteToolsVisible(false)}
            >
              <Icon name="close" size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {/* WEBSITE TOOLS TAB SELECTOR */}
          <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 4, marginHorizontal: 18, marginTop: 12, borderRadius: 12 }}>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9, backgroundColor: activeToolsTab === 'settings' ? '#FFFFFF' : 'transparent' }}
              onPress={() => setActiveToolsTab('settings')}
            >
              <Text style={{ fontSize: 12, ...FONTS.bold, color: activeToolsTab === 'settings' ? '#2563EB' : '#64748B' }}>Site Config</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9, backgroundColor: activeToolsTab === 'news' ? '#FFFFFF' : 'transparent' }}
              onPress={() => setActiveToolsTab('news')}
            >
              <Text style={{ fontSize: 12, ...FONTS.bold, color: activeToolsTab === 'news' ? '#2563EB' : '#64748B' }}>Update News</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9, backgroundColor: activeToolsTab === 'gallery' ? '#FFFFFF' : 'transparent' }}
              onPress={() => setActiveToolsTab('gallery')}
            >
              <Text style={{ fontSize: 12, ...FONTS.bold, color: activeToolsTab === 'gallery' ? '#2563EB' : '#64748B' }}>Update Gallery</Text>
            </TouchableOpacity>
          </View>

          {loadingSettings ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color="#2563EB" />
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
                  {/* SECTION 1: QUICK WEBSITE OPERATIONS SHORTCUTS */}
                  <View style={styles.settingsCardSection}>
                    <View style={styles.settingsCardHeader}>
                      <Icon name="grid-outline" size={18} color="#2563EB" style={{ marginRight: 8 }} />
                      <Text style={styles.settingsSectionTitle}>Quick Website Operations Shortcuts</Text>
                    </View>
                    <View style={styles.shortcutsGrid}>
                      {[
                        { label: 'Applications', icon: 'document-text-outline', color: '#8B5CF6', action: () => { setWebsiteToolsVisible(false); navigation.navigate('Users', { initialTab: 'pending' }); } },
                        { label: 'User Accounts', icon: 'people-outline', color: '#2563EB', action: () => { setWebsiteToolsVisible(false); navigation.navigate('Users'); } },
                        { label: 'Courses', icon: 'book-outline', color: '#10B981', action: () => { setWebsiteToolsVisible(false); navigation.navigate('Courses'); } },
                        { label: 'Batches', icon: 'layers-outline', color: '#F59E0B', action: () => { setWebsiteToolsVisible(false); navigation.navigate('Courses', { screen: 'Batches' }); } },
                        { label: 'Verify Slips', icon: 'card-outline', color: '#EC4899', action: () => { setWebsiteToolsVisible(false); navigation.navigate('Users', { initialTab: 'payments' }); } },
                        { label: 'Slot Manager', icon: 'calendar-outline', color: '#06B6D4', action: () => { setWebsiteToolsVisible(false); navigation.navigate('Practice'); } },
                      ].map((item, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.shortcutBtn}
                          onPress={item.action}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.shortcutIconBox, { backgroundColor: `${item.color}15` }]}>
                            <Icon name={item.icon as any} size={20} color={item.color} />
                          </View>
                          <Text style={styles.shortcutLabel}>{item.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

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
                        trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                        thumbColor={siteSettings.show_announcement ? '#2563EB' : '#94A3B8'}
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
                      <Icon name="call-outline" size={18} color="#10B981" style={{ marginRight: 8 }} />
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
                      <Icon name="newspaper-outline" size={18} color="#2563EB" style={{ marginRight: 8 }} />
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
                            backgroundColor: newNews.category === cat ? '#2563EB' : '#E2E8F0',
                          }}
                        >
                          <Text style={{ fontSize: 11, ...FONTS.bold, color: newNews.category === cat ? '#FFFFFF' : '#475569' }}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.formInputLabel}>Cover Image URL (Optional)</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={newNews.image_url}
                      onChangeText={t => setNewNews({ ...newNews, image_url: t })}
                      placeholder="https://example.com/cover.jpg"
                      placeholderTextColor="#9CA3AF"
                    />

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
                      style={[styles.saveSettingsBtn, { backgroundColor: '#2563EB' }]}
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
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : newsList.length === 0 ? (
                      <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No news published yet.</Text>
                    ) : (
                      newsList.map((item) => (
                        <View key={item._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={{ fontSize: 14, ...FONTS.bold, color: '#0F172A' }}>{item.title}</Text>
                            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }} numberOfLines={1}>{item.summary || item.message}</Text>
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
                      <Icon name="images-outline" size={18} color="#10B981" style={{ marginRight: 8 }} />
                      <Text style={styles.settingsSectionTitle}>Add Gallery Item (Photo or Video)</Text>
                    </View>

                    <Text style={styles.formInputLabel}>Media Type</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                      <TouchableOpacity
                        onPress={() => setNewGallery({ ...newGallery, type: 'photo' })}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          alignItems: 'center',
                          borderRadius: 8,
                          backgroundColor: newGallery.type === 'photo' ? '#10B981' : '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 12, ...FONTS.bold, color: newGallery.type === 'photo' ? '#FFFFFF' : '#475569' }}>
                          Photo
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setNewGallery({ ...newGallery, type: 'video' })}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          alignItems: 'center',
                          borderRadius: 8,
                          backgroundColor: newGallery.type === 'video' ? '#10B981' : '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 12, ...FONTS.bold, color: newGallery.type === 'video' ? '#FFFFFF' : '#475569' }}>
                          Video
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

                    <Text style={styles.formInputLabel}>{newGallery.type === 'photo' ? 'Photo Image URL *' : 'Video YouTube Embed / Link *'}</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={newGallery.url}
                      onChangeText={t => setNewGallery({ ...newGallery, url: t })}
                      placeholder={newGallery.type === 'photo' ? "https://example.com/photo.jpg" : "https://www.youtube.com/watch?v=..."}
                      placeholderTextColor="#9CA3AF"
                    />

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
                      style={[styles.saveSettingsBtn, { backgroundColor: '#10B981' }]}
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
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : galleryList.length === 0 ? (
                      <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No gallery items uploaded yet.</Text>
                    ) : (
                      galleryList.map((item) => (
                        <View key={item._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={{ backgroundColor: item.type === 'video' ? '#EFF6FF' : '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                                <Text style={{ fontSize: 9, ...FONTS.bold, color: item.type === 'video' ? '#2563EB' : '#10B981' }}>{item.type.toUpperCase()}</Text>
                              </View>
                              <Text style={{ fontSize: 13, ...FONTS.bold, color: '#0F172A' }}>{item.title}</Text>
                            </View>
                            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }} numberOfLines={1}>{item.category} &bull; {item.description || item.url}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteGallery(item._id)} style={{ padding: 6 }}>
                            <Icon name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  /* Graphic Hero Header (Wraps Brand + Statistics Box) */
  graphicHeader: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
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
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  brandLogoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
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

  /* Stats Container inside Graphic Header */
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)' },
      default: {},
    }),
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    ...FONTS.bold,
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 0.7,
  },
  statIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    ...FONTS.extraBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
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
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' },
      default: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
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
});
