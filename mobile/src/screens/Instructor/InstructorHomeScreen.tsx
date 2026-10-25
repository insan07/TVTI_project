import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Image, Linking, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { API_URL } from '../../config/constants';
import { COLORS, SHADOW, FONTS } from '../../config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import ScreenBackground from '../../components/shared/ScreenBackground';

const { width } = Dimensions.get('window');

export default function InstructorHomeScreen() {
  const context = useContext(AuthContext);
  if (!context) return null;
  const { user } = context;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
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

  useFocusEffect(
    React.useCallback(() => {
      fetchStats();
    }, [])
  );

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
      <View style={[styles.loadingContainer, isDark && { backgroundColor: '#0B0F19' }]}>
        <ScreenBackground />
        <ActivityIndicator size="large" color="#FF5E14" />
        <Text style={[styles.loadingText, isDark && { color: '#94A3B8' }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' }}>
      <ScreenBackground />
      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5E14']} />}
        showsVerticalScrollIndicator={false}
      >


        {/* 1. GRAPHIC TOP HERO BANNER (WRAPS LOGO + STATISTICS BOX) */}
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#090D16']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.graphicHeader, { paddingTop: Math.max(insets.top + 8, 16) }]}
        >
          <View style={styles.glowOrbOrange} pointerEvents="none" />
          <View style={styles.glowOrbBlue} pointerEvents="none" />

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

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={toggleTheme}
                style={styles.themeToggleCapsule}
                activeOpacity={0.8}
                accessibilityLabel={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              >
                <Icon
                  name={isDark ? 'sunny-outline' : 'moon-outline'}
                  size={14}
                  color="#F59E0B"
                />
              </TouchableOpacity>

              <LinearGradient
                colors={['rgba(249, 115, 22, 0.22)', 'rgba(251, 146, 60, 0.12)', 'rgba(15, 23, 42, 0.45)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.adminAIBadge}
              >
                <Text style={styles.adminAIBadgeText}>INSTRUCTOR PORTAL</Text>
              </LinearGradient>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('MyStudents')}
              activeOpacity={0.8}
            >
              <View style={styles.statCardTop}>
                <Text style={styles.statLabel}>BATCHES</Text>
                <View style={styles.statIconBox}>
                  <Icon name="people" size={13} color="#FB923C" />
                </View>
              </View>
              <Text style={styles.statValue}>{stats.totalBatches}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Uploads', { tab: 'upload' })}
              activeOpacity={0.8}
            >
              <View style={styles.statCardTop}>
                <Text style={styles.statLabel}>UPLOADS</Text>
                <View style={styles.statIconBox}>
                  <Icon name="cloud-upload" size={13} color="#FB923C" />
                </View>
              </View>
              <Text style={styles.statValue}>{stats.totalVideos}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Practice')}
              activeOpacity={0.8}
            >
              <View style={styles.statCardTop}>
                <Text style={styles.statLabel}>PRACTICE SLOTS</Text>
                <View style={styles.statIconBox}>
                  <Icon name="calendar" size={13} color="#FB923C" />
                </View>
              </View>
              <Text style={styles.statValue}>{stats.activeSlots.length}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('PostAnnouncement')}
              activeOpacity={0.8}
            >
              <View style={styles.statCardTop}>
                <Text style={styles.statLabel}>NOTICES</Text>
                <View style={styles.statIconBox}>
                  <Icon name="megaphone" size={13} color="#FB923C" />
                </View>
              </View>
              <Text style={styles.statValue}>{stats.totalAnnouncements}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Announcements Glassmorphic Card */}
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('PostAnnouncement')}
            activeOpacity={0.82}
            style={[styles.glassCardWrapper, isDark && styles.glassCardWrapperDark]}
          >
            <LinearGradient
              colors={
                isDark
                  ? ['#1A2433', '#141B26', '#101722']
                  : ['rgba(255, 255, 255, 0.94)', 'rgba(255, 247, 237, 0.82)', 'rgba(255, 255, 255, 0.88)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.noticeCard, isDark && styles.noticeCardDark]}
            >
              <View style={styles.glassAccentBar} />
              <View style={[styles.noticeIconBox, isDark && styles.noticeIconBoxDark]}>
                <Icon name="megaphone-outline" size={20} color="#FF5E14" />
              </View>
              <View style={styles.noticeContent}>
                <Text style={[styles.noticeTitle, isDark && { color: '#FFFFFF' }]}>Announcements</Text>
                <Text style={[styles.noticeSub, isDark && { color: '#E2E8F0' }]} numberOfLines={1}>
                  Broadcast notices & manage all updates
                </Text>
              </View>
              <View style={styles.noticeCtaBtn}>
                <Text style={styles.noticeCtaText}>Post</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 4. Quick Actions */}
        <Text style={[styles.sectionTitleNoMargin, { marginHorizontal: 16, marginBottom: 12 }, isDark && { color: '#FFFFFF' }]}>
          Quick Actions
        </Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Uploads', { tab: 'upload' })}>
            <LinearGradient
              colors={
                isDark
                  ? ['#1A2433', '#141B26', '#101722']
                  : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 247, 237, 0.85)', 'rgba(255, 255, 255, 0.9)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.actionIconBg, isDark && styles.actionIconBgDark]}
            >
              <Icon name="cloud-upload-outline" size={24} color="#FF6500" />
            </LinearGradient>
            <Text style={[styles.actionText, isDark && { color: '#FFFFFF', fontWeight: 'bold' }]}>Upload Content</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Practice')}>
            <LinearGradient
              colors={
                isDark
                  ? ['#1A2433', '#141B26', '#101722']
                  : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 247, 237, 0.85)', 'rgba(255, 255, 255, 0.9)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.actionIconBg, isDark && styles.actionIconBgDark]}
            >
              <Icon name="calendar-outline" size={24} color="#FF6500" />
            </LinearGradient>
            <Text style={[styles.actionText, isDark && { color: '#FFFFFF', fontWeight: 'bold' }]}>Manage Slots</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MyStudents')}>
            <LinearGradient
              colors={
                isDark
                  ? ['#1A2433', '#141B26', '#101722']
                  : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 247, 237, 0.85)', 'rgba(255, 255, 255, 0.9)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.actionIconBg, isDark && styles.actionIconBgDark]}
            >
              <Icon name="people-outline" size={24} color="#FF6500" />
            </LinearGradient>
            <Text style={[styles.actionText, isDark && { color: '#FFFFFF', fontWeight: 'bold' }]}>My Students</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Recent Open Practice Slots */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitleNoMargin, isDark && { color: '#FFFFFF' }]}>Open Practice Slots</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Practice')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {stats.activeSlots.length === 0 ? (
          <View style={[styles.emptyCard, isDark && styles.emptyCardDark]}>
            <Icon name="calendar-outline" size={32} color={isDark ? '#524A42' : '#D1D5DB'} />
            <Text style={[styles.emptyText, isDark && { color: '#8A7D71' }]}>No open practice slots</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Practice')}>
              <Text style={styles.emptyAction}>Create a slot {'->'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          stats.activeSlots.map((slot) => {
            const booked = slot.booked_count || 0;
            const max = slot.max_students || 1;
            const percentage = Math.min((booked / max) * 100, 100);
            // Compute the actual date of the slot
            let slotDateStr = '';
            if (slot.week_start_date) {
              const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
              const ws = new Date(slot.week_start_date);
              const dayIdx = daysArr.indexOf(slot.day_of_week);
              if (dayIdx !== -1) ws.setDate(ws.getDate() + dayIdx);
              slotDateStr = ws.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            }

            return (
              <View key={slot._id} style={[styles.slotCard, isDark && styles.slotCardDark]}>
                <View style={styles.slotHeader}>
                  <View style={styles.slotTimeRow}>
                    <Icon name="calendar-outline" size={14} color={isDark ? '#FED7AA' : '#6B7280'} style={{ marginRight: 6 }} />
                    <Text style={[styles.slotTimeText, isDark && { color: '#E2E8F0', fontWeight: '600' }]}>
                      {slot.day_of_week}{slotDateStr ? `, ${slotDateStr}` : ''} | {slot.start_time} - {slot.end_time}
                    </Text>
                  </View>
                  <View style={[styles.bookedBadge, isDark && styles.bookedBadgeDark]}>
                    <Text style={[styles.bookedBadgeText, isDark && { color: '#FED7AA' }]}>{booked} / {max} booked</Text>
                  </View>
                </View>
                <Text style={[styles.slotBatchName, isDark && { color: '#FFFFFF' }]}>{slot.batch_id?.name || 'Practice Slot'}</Text>
                {slot.equipment_note ? (
                  <Text style={[styles.slotNote, isDark && { color: '#CBD5E1' }]}>Note: {slot.equipment_note}</Text>
                ) : null}
                <View style={styles.slotFooter}>
                  <View style={[styles.progressContainer, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.18)' }]}>
                    <View style={[styles.progressFill, { width: `${percentage}%` as any }]} />
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('Practice')}>
                    <Text style={[styles.manageBtnText, isDark && { color: '#FF7300' }]}>MANAGE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* 6. Recent Uploads */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitleNoMargin, isDark && { color: '#FFFFFF' }]}>Recent Uploads</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Uploads', { tab: 'my_videos' })}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {stats.recentVideos.length === 0 ? (
          <View style={[styles.emptyCard, isDark && styles.emptyCardDark]}>
            <Icon name="cloud-upload-outline" size={32} color={isDark ? '#524A42' : '#D1D5DB'} />
            <Text style={[styles.emptyText, isDark && { color: '#8A7D71' }]}>No uploads yet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Uploads', { tab: 'upload' })}>
              <Text style={styles.emptyAction}>Upload your first content {'->'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
            {stats.recentVideos.map((video) => {
              let thumbUrl = video.thumbnail || null;
              if (!thumbUrl && video.cloudinary_url) {
                if (video.cloudinary_url.includes('youtube.com') || video.cloudinary_url.includes('youtu.be')) {
                  const match = video.cloudinary_url.match(/[?&]v=([^&]+)/) || video.cloudinary_url.match(/youtu\.be\/([^?]+)/);
                  if (match && match[1]) {
                    thumbUrl = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
                  }
                } else if (video.cloudinary_url.includes('cloudinary.com')) {
                  thumbUrl = video.cloudinary_url.replace(/\.[^/.]+$/, ".jpg");
                }
              }

              return (
                <TouchableOpacity
                  key={video._id}
                  style={[styles.videoCard, isDark && styles.videoCardDark]}
                  onPress={() => {
                    let url = video.cloudinary_url || video.youtube_url;
                    if (!url && video.content_type === 'material') {
                      url = video.cloudinary_url; // Materials use cloudinary_url
                    }
                    if (url) {
                      if (url.startsWith('/uploads/') || url.startsWith('/api/files/')) {
                        url = `${API_URL.replace(/\/api\/?$/, '')}${url}`;
                      }
                      if (Platform.OS === 'web') {
                        window.open(url, '_blank');
                      } else {
                        Linking.openURL(url);
                      }
                    }
                  }}
                >
                  <View style={[styles.videoThumbnailContainer, video.content_type === 'material' ? (isDark ? { backgroundColor: 'rgba(16, 185, 129, 0.15)' } : { backgroundColor: '#ECFDF5' }) : (isDark ? { backgroundColor: '#101722' } : {})]}>
                    {thumbUrl ? (
                      <Image source={{ uri: thumbUrl }} style={styles.videoThumbnail} />
                    ) : (
                      <View style={styles.videoThumbnailPlaceholder}>
                        <Icon name={video.content_type === 'material' ? 'document-text' : 'videocam'} size={32} color={video.content_type === 'material' ? '#10B981' : (isDark ? '#6B5E51' : '#9CA3AF')} />
                      </View>
                    )}
                    {video.content_type !== 'material' && (
                      <View style={styles.playOverlay}>
                        <View style={styles.playCircle}>
                          <Icon name="play" size={16} color="#000" style={{ marginLeft: 2 }} />
                        </View>
                      </View>
                    )}
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={[styles.videoCategory, isDark && { color: '#FB923C' }]} numberOfLines={1}>
                      {(video.batch_id?.name || 'Class Video').toUpperCase()}
                    </Text>
                    <Text style={[styles.videoTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={2}>{video.title}</Text>
                    {video.topic ? <Text style={[styles.videoTopic, isDark && { color: '#94A3B8' }]} numberOfLines={1}>Topic: {video.topic}</Text> : null}
                  </View>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}

        {/* 7. Recent Announcements */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitleNoMargin, isDark && { color: '#FFFFFF' }]}>Recent Announcements</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PostAnnouncement')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {stats.recentAnnouncements.length === 0 ? (
          <View style={[styles.emptyCard, { marginBottom: 24 }, isDark && styles.emptyCardDark]}>
            <Icon name="megaphone-outline" size={32} color={isDark ? '#524A42' : '#D1D5DB'} />
            <Text style={[styles.emptyText, isDark && { color: '#8A7D71' }]}>No announcements posted</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PostAnnouncement')}>
              <Text style={styles.emptyAction}>Post an announcement {'->'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.announcementsContainer, { marginBottom: 24 }, isDark && styles.announcementsContainerDark]}>
            {stats.recentAnnouncements.map((ann, index) => {
              const isLast = index === stats.recentAnnouncements.length - 1;
              const isAssessment = ann.title?.toLowerCase().includes('guideline') || ann.title?.toLowerCase().includes('assessment');
              return (
                <View key={ann._id} style={[styles.announcementItem, !isLast && (isDark ? styles.announcementBorderDark : styles.announcementBorder)]}>
                  <View style={[styles.announcementIconBg, isDark ? (isAssessment ? { backgroundColor: 'rgba(255, 255, 255, 0.08)' } : { backgroundColor: 'rgba(255, 94, 20, 0.15)' }) : { backgroundColor: isAssessment ? '#F3F4F6' : '#FFF7ED' }]}>
                    <Icon
                      name={isAssessment ? 'school-outline' : 'megaphone-outline'}
                      size={18}
                      color={isAssessment ? (isDark ? '#CBD5E1' : '#4B5563') : '#FF5E14'}
                    />
                  </View>
                  <View style={styles.announcementContent}>
                    <Text style={[styles.announcementTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>{ann.title}</Text>
                    <Text style={[styles.announcementMeta, isDark && { color: '#CBD5E1' }]}>
                      {ann.batch_id?.name ? `${ann.batch_id.name} • ` : ''}{formatDate(ann.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
      },
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
    color: '#94A3B8',
    letterSpacing: 0.7,
  },
  statIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 94, 20, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    ...FONTS.extraBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
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

  actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, gap: 8 },
  actionBtn: { flex: 1, alignItems: 'center' },
  actionIconBg: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.9), inset 0 0 0 1px rgba(254, 215, 170, 0.45), 0 4px 12px rgba(245, 130, 32, 0.1)',
      },
      default: {
        shadowColor: '#F58220',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  actionText: {
    fontSize: 11.5,
    ...FONTS.semiBold,
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 14,
  },

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
  playOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
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
  themeToggleCapsule: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  themeToggleCapsuleLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  themeToggleCapsuleDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statCardDark: {
    backgroundColor: 'rgba(20, 27, 38, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  glassCardWrapperDark: {
    ...Platform.select({
      web: {
        boxShadow: '0 0 18px rgba(249, 115, 22, 0.28), 0 8px 24px -4px rgba(0, 0, 0, 0.6)',
      },
      default: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  noticeCardDark: {
    backgroundColor: '#141B26',
    borderWidth: 1.5,
    borderColor: '#F97316',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        boxShadow: '0 0 16px rgba(249, 115, 22, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)',
      },
      default: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  noticeIconBoxDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.5)',
    borderWidth: 1.2,
  },
  actionIconBgDark: {
    borderColor: '#F97316',
    borderWidth: 1.5,
    backgroundColor: '#141B26',
    ...Platform.select({
      web: {
        boxShadow: '0 0 14px rgba(249, 115, 22, 0.32), inset 0 0 8px rgba(249, 115, 22, 0.12)',
      },
      default: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  emptyCardDark: {
    backgroundColor: '#141B26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  slotCardDark: {
    backgroundColor: '#141B26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
      },
    }),
  },
  bookedBadgeDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.40)',
  },
  videoCardDark: {
    backgroundColor: '#141B26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
      },
    }),
  },
  announcementsContainerDark: {
    backgroundColor: '#141B26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  announcementBorderDark: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
});


