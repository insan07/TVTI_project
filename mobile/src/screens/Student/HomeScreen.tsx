import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import ScreenBackground from '../../components/shared/ScreenBackground';

export default function HomeScreen({ unreadCount: passedUnreadCount }: { unreadCount?: number }) {
  const { user } = useContext(AuthContext) as any;
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();
  const [data, setData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localUnreadCount, setLocalUnreadCount] = useState<number | null>(null);
  const [bookmarkedLessons, setBookmarkedLessons] = useState<{ [key: string]: boolean }>({});
  const [instructorModalVisible, setInstructorModalVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [allAnnouncementsModalVisible, setAllAnnouncementsModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboard();
    }, [])
  );

  const fetchDashboard = async () => {
    try {
      const [res, notifRes, annRes] = await Promise.all([
        api.get('/students/home'),
        api.get('/notifications/unread-count').catch(() => null),
        api.get('/students/announcements').catch(() => null),
      ]);
      setData(res.data);
      const fetchedAnnouncements = annRes?.data || res.data?.announcements || [];
      setAnnouncements(fetchedAnnouncements);
      if (notifRes?.data && typeof notifRes.data.unread_count === 'number') {
        setLocalUnreadCount(notifRes.data.unread_count);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (route?.params?.openAnnouncements && announcements.length > 0) {
      const targetId = route?.params?.openAnnouncementId;
      if (targetId) {
        const matched = announcements.find((a: any) => String(a._id) === String(targetId));
        if (matched) {
          setSelectedAnnouncement(matched);
          return;
        }
      }
      setAllAnnouncementsModalVisible(true);
    }
  }, [route?.params?.openAnnouncements, route?.params?.openAnnouncementId, announcements]);

  const formatAnnouncementDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toggleBookmark = (lessonId: string) => {
    setBookmarkedLessons(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDark && { backgroundColor: '#0B0F19' }]}>
        <ScreenBackground />
        <ActivityIndicator size="large" color="#F58220" />
      </View>
    );
  }

  const unreadCount =
    localUnreadCount !== null
      ? localUnreadCount
      : passedUnreadCount !== undefined
        ? passedUnreadCount
        : data?.notifications?.filter((n: any) => !n.is_read).length || 0;

  // Upcoming Practical Details
  const nextPractice = data?.next_practice || data?.next_available_practice;
  
  const practicalTitle =
    data?.next_practice?.slot_id?.batch_id?.course_id?.title ||
    data?.next_available_practice?.batch_id?.course_id?.title ||
    'Course Details Loading...';
  
  const instructorData =
    data?.next_practice?.slot_id?.instructor_id ||
    data?.next_available_practice?.instructor_id;

  const instructorName = instructorData?.name || 'Instructor TBD';
  const avatarUrl =
    instructorData?.profile_photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=F3F4F6&color=9CA3AF`;
  const instructorEmail = instructorData?.email || 'N/A';
  const instructorPhone = instructorData?.phone || 'N/A';

  const slotData = data?.next_practice?.slot_id || data?.next_available_practice;

  const timeLocationText = slotData
    ? `${slotData.start_time || 'TBD'} • ${slotData.location || 'Location TBD'}`
    : 'Time & Location TBD';

  let pracMonth = '--';
  let pracDay = '--';
  const rawDate = slotData?.week_start_date;
  if (rawDate) {
    const match = String(rawDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const d = match
      ? new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 0, 0, 0, 0)
      : new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayOffset = daysArr.indexOf(slotData?.day_of_week);
      if (dayOffset !== -1) {
        d.setDate(d.getDate() + dayOffset);
      }
      pracMonth = d.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
      pracDay = String(d.getDate()).padStart(2, '0');
    }
  }

  // Fetch real theory lessons from backend if available, otherwise empty
  const theoryLessons = data?.theory_lessons || [];

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' }}>
      <ScreenBackground />
      {/* FIXED STICKY ENTIRE DARK HEADER CARD */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#090D16']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.stickyHeaderCard, { paddingTop: Math.max(insets.top + 8, 16) }]}
      >
        <View style={styles.glowOrbOrange} pointerEvents="none" />
        <View style={styles.glowOrbBlue} pointerEvents="none" />

        {/* Top Brand Logo & Notification Bar */}
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

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="notifications-outline" size={20} color="#FFF" />
              {unreadCount > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* SCROLLABLE MAIN CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentStyle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
        {/* ========================================================================= */}
        {/* SECTION 1: UPCOMING PRACTICAL (Conditionally Rendered) */}
        {/* ========================================================================= */}
        {nextPractice && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Upcoming Practical</Text>
            </View>

            <TouchableOpacity
              style={[styles.upcomingCard, isDark && styles.upcomingCardDark]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Schedule')}
            >
              {/* Top Row: Date Badge + Title/Time */}
              <View style={[styles.cardTopRow, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
                {/* Soft Peach Date Badge */}
                <View style={[styles.dateBadgeBox, isDark && styles.dateBadgeBoxDark]}>
                  <Text style={[styles.dateMonthText, isDark && { color: '#FB923C' }]}>{pracMonth}</Text>
                  <Text style={[styles.dateDayText, isDark && { color: '#FED7AA' }]}>{pracDay}</Text>
                </View>

                <View style={styles.cardDetailsColumn}>
                  <Text style={[styles.practicalTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                    {practicalTitle}
                  </Text>
                  <View style={styles.timeLocRow}>
                    <Icon name="time-outline" size={14} color={isDark ? '#FED7AA' : '#6B7280'} style={{ marginRight: 4 }} />
                    <Text style={[styles.timeLocText, isDark && { color: '#94A3B8' }]} numberOfLines={1}>
                      {timeLocationText}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Row: Instructor Avatar + View Slot Button */}
              <View style={styles.cardBottomRow}>
                <TouchableOpacity 
                  style={styles.instructorInfoRow} 
                  activeOpacity={0.7}
                  onPress={() => setInstructorModalVisible(true)}
                >
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.instructorAvatar}
                  />
                  <View style={styles.instructorTextColumn}>
                    <Text style={[styles.instructorName, isDark && { color: '#FFFFFF' }]}>{instructorName}</Text>
                    <Text style={[styles.instructorRole, isDark && { color: '#94A3B8' }]}>Course Instructor</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.viewSlotBtn, isDark && styles.viewSlotBtnDark]}
                  onPress={() => navigation.navigate('Schedule')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.viewSlotBtnText, isDark && { color: '#FFFFFF' }]}>{data?.next_practice ? 'View Slot' : 'Book Slot'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: RECENT THEORY LESSONS */}
        {/* ========================================================================= */}
        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Recent Theory Lessons</Text>
        </View>

        <View style={styles.lessonsListContainer}>
          {theoryLessons.map((lesson: any) => {
            const isBookmarked = !!bookmarkedLessons[lesson._id];
            let thumbUrl = lesson.thumbnail || null;
            if (!thumbUrl && lesson.cloudinary_url) {
              if (lesson.cloudinary_url.includes('youtube.com') || lesson.cloudinary_url.includes('youtu.be')) {
                const match = lesson.cloudinary_url.match(/[?&]v=([^&]+)/) || lesson.cloudinary_url.match(/youtu\.be\/([^?]+)/);
                if (match && match[1]) {
                  thumbUrl = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
                }
              } else if (lesson.cloudinary_url.includes('cloudinary.com')) {
                thumbUrl = lesson.cloudinary_url.replace(/\.[^/.]+$/, ".jpg");
              }
            }

            return (
              <TouchableOpacity
                key={lesson._id}
                style={[styles.lessonCard, isDark && styles.lessonCardDark]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Videos')}
              >
                {/* Thumbnail image with play button overlay */}
                <View style={styles.thumbnailWrapper}>
                  {thumbUrl ? (
                    <Image source={{ uri: thumbUrl }} style={styles.thumbnailImg} />
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Icon name={lesson.content_type === 'material' ? 'document-text' : 'videocam'} size={32} color={isDark ? '#64748B' : '#9CA3AF'} />
                    </View>
                  )}
                  {lesson.content_type !== 'material' && (
                    <View style={styles.playOverlayCircle}>
                      <Icon name="play" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
                    </View>
                  )}
                </View>

                {/* Lesson Info */}
                <View style={styles.lessonContentColumn}>
                  <View style={styles.tagDurationRow}>
                    <View style={[styles.tagBadgePill, isDark && styles.tagBadgePillDark]}>
                      <Text style={[styles.tagBadgeText, isDark && { color: '#CBD5E1' }]}>{(lesson.topic || 'General').toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.durationText, isDark && { color: '#94A3B8' }]}>{lesson.duration || '--:--'}</Text>
                  </View>

                  <Text style={[styles.lessonTitleText, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                    {lesson.title}
                  </Text>
                </View>

                {/* Bookmark Icon */}
                <TouchableOpacity
                  style={styles.bookmarkTouch}
                  onPress={() => toggleBookmark(lesson._id)}
                >
                  <Icon
                    name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={isBookmarked ? '#F58220' : isDark ? '#64748B' : '#A1A1AA'}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ========================================================================= */}
        {/* SECTION 3: RECENT ANNOUNCEMENTS */}
        {/* ========================================================================= */}
        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Announcements</Text>
          {announcements.length > 0 && (
            <TouchableOpacity onPress={() => setAllAnnouncementsModalVisible(true)} activeOpacity={0.7}>
              <Text style={styles.watchHistoryText}>View All ({announcements.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {announcements.length === 0 ? (
          <View style={[styles.emptyAnnouncementCard, isDark && styles.lessonCardDark]}>
            <Icon name="megaphone-outline" size={30} color={isDark ? '#64748B' : '#9CA3AF'} />
            <Text style={[styles.emptyAnnouncementText, isDark && { color: '#94A3B8' }]}>
              No announcements posted for your batch yet.
            </Text>
          </View>
        ) : (
          <View style={styles.announcementsList}>
            {announcements.slice(0, 3).map((ann: any) => (
              <TouchableOpacity
                key={ann._id}
                style={[styles.announcementCard, isDark && styles.lessonCardDark]}
                activeOpacity={0.85}
                onPress={() => setSelectedAnnouncement(ann)}
              >
                <View style={[styles.announcementIconBox, isDark && { backgroundColor: 'rgba(245, 130, 32, 0.16)' }]}>
                  <Icon name="megaphone-outline" size={20} color="#F58220" />
                </View>
                <View style={styles.announcementContentCol}>
                  <View style={styles.announcementTopMetaRow}>
                    <View
                      style={[
                        styles.announcementBatchBadge,
                        isDark && { backgroundColor: 'rgba(255,255,255,0.08)' },
                      ]}
                    >
                      <Text style={[styles.announcementBatchBadgeText, isDark && { color: '#FED7AA' }]}>
                        {ann.batch_id?.name || 'All Students'}
                      </Text>
                    </View>
                    <Text style={[styles.announcementDateText, isDark && { color: '#64748B' }]}>
                      {formatAnnouncementDate(ann.createdAt)}
                    </Text>
                  </View>
                  <Text style={[styles.announcementTitleText, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                    {ann.title}
                  </Text>
                  <Text style={[styles.announcementMsgPreview, isDark && { color: '#94A3B8' }]} numberOfLines={2}>
                    {ann.message}
                  </Text>
                  {ann.posted_by?.name && (
                    <Text style={[styles.announcementAuthorText, isDark && { color: '#64748B' }]}>
                      Posted by {ann.posted_by.name} ({ann.posted_by.role === 'admin' ? 'Admin' : 'Instructor'})
                    </Text>
                  )}
                </View>
                <Icon name="chevron-forward" size={18} color={isDark ? '#64748B' : '#9CA3AF'} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        </View>
      </ScrollView>

      {/* Single Announcement Detail Modal */}
      <Modal
        visible={!!selectedAnnouncement}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 460 }, isDark && styles.modalContentDark]}>
            <View style={[styles.modalHeader, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.announcementIconBox, { width: 36, height: 36, marginRight: 0 }]}>
                  <Icon name="megaphone" size={18} color="#F58220" />
                </View>
                <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                  Announcement Details
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedAnnouncement(null)}>
                <Icon name="close" size={24} color={isDark ? '#94A3B8' : '#4B5563'} />
              </TouchableOpacity>
            </View>

            {selectedAnnouncement && (
              <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 20 }}>
                <View style={[styles.announcementTopMetaRow, { marginBottom: 10 }]}>
                  <View
                    style={[
                      styles.announcementBatchBadge,
                      isDark && { backgroundColor: 'rgba(245, 130, 32, 0.18)' },
                    ]}
                  >
                    <Text style={[styles.announcementBatchBadgeText, isDark && { color: '#FED7AA' }]}>
                      {selectedAnnouncement.batch_id?.name || 'All Students'}
                    </Text>
                  </View>
                  <Text style={[styles.announcementDateText, isDark && { color: '#94A3B8' }]}>
                    {formatAnnouncementDate(selectedAnnouncement.createdAt)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.announcementTitleText,
                    { fontSize: 18, marginBottom: 10 },
                    isDark && { color: '#FFFFFF' },
                  ]}
                >
                  {selectedAnnouncement.title}
                </Text>

                <View
                  style={[
                    styles.modalInfoBox,
                    { marginBottom: 14 },
                    isDark && styles.modalInfoBoxDark,
                  ]}
                >
                  <Text
                    style={[
                      styles.announcementFullMessage,
                      isDark && { color: '#E2E8F0' },
                    ]}
                  >
                    {selectedAnnouncement.message}
                  </Text>
                </View>

                {selectedAnnouncement.posted_by?.name && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="person-circle-outline" size={18} color="#F58220" />
                    <Text style={[styles.announcementAuthorText, { marginTop: 0 }, isDark && { color: '#94A3B8' }]}>
                      Posted by {selectedAnnouncement.posted_by.name} (
                      {selectedAnnouncement.posted_by.role === 'admin' ? 'Admin' : 'Instructor'})
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* All Announcements Modal */}
      <Modal
        visible={allAnnouncementsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAllAnnouncementsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500, maxHeight: '82%' }, isDark && styles.modalContentDark]}>
            <View style={[styles.modalHeader, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>
                All Announcements ({announcements.length})
              </Text>
              <TouchableOpacity onPress={() => setAllAnnouncementsModalVisible(false)}>
                <Icon name="close" size={24} color={isDark ? '#94A3B8' : '#4B5563'} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              {announcements.map((ann: any) => (
                <TouchableOpacity
                  key={ann._id}
                  style={[styles.announcementCard, isDark && styles.lessonCardDark]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setAllAnnouncementsModalVisible(false);
                    setSelectedAnnouncement(ann);
                  }}
                >
                  <View style={[styles.announcementIconBox, isDark && { backgroundColor: 'rgba(245, 130, 32, 0.16)' }]}>
                    <Icon name="megaphone-outline" size={20} color="#F58220" />
                  </View>
                  <View style={styles.announcementContentCol}>
                    <View style={styles.announcementTopMetaRow}>
                      <View
                        style={[
                          styles.announcementBatchBadge,
                          isDark && { backgroundColor: 'rgba(255,255,255,0.08)' },
                        ]}
                      >
                        <Text style={[styles.announcementBatchBadgeText, isDark && { color: '#FED7AA' }]}>
                          {ann.batch_id?.name || 'All Students'}
                        </Text>
                      </View>
                      <Text style={[styles.announcementDateText, isDark && { color: '#64748B' }]}>
                        {formatAnnouncementDate(ann.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.announcementTitleText, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                      {ann.title}
                    </Text>
                    <Text style={[styles.announcementMsgPreview, isDark && { color: '#94A3B8' }]} numberOfLines={2}>
                      {ann.message}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Instructor Profile Modal */}
      <Modal visible={instructorModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={[styles.modalHeader, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>Instructor Profile</Text>
              <TouchableOpacity onPress={() => setInstructorModalVisible(false)}>
                <Icon name="close" size={24} color={isDark ? '#94A3B8' : '#4B5563'} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Image source={{ uri: avatarUrl }} style={styles.modalAvatar} />
              <Text style={[styles.modalName, isDark && { color: '#FFFFFF' }]}>{instructorName}</Text>
              <Text style={[styles.modalRole, isDark && { color: '#94A3B8' }]}>Course Instructor</Text>
              
              <View style={[styles.modalInfoBox, isDark && styles.modalInfoBoxDark]}>
                <View style={[styles.modalInfoRow, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
                  <Icon name="mail-outline" size={18} color="#FF5E14" />
                  <Text style={[styles.modalInfoText, isDark && { color: '#CBD5E1' }]}>{instructorEmail}</Text>
                </View>
                <View style={[styles.modalInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Icon name="call-outline" size={18} color="#FF5E14" />
                  <Text style={[styles.modalInfoText, isDark && { color: '#CBD5E1' }]}>{instructorPhone}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentStyle: {
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },

  /* DARK HEADER BANNER CONTAINER */
  stickyHeaderCard: {
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
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 8 },
    }),
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
  welcomeSection: {
    paddingTop: 16,
  },
  greeting: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13.5,
    ...FONTS.medium,
    marginBottom: 2,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 22,
    ...FONTS.extraBold,
  },
  regNumberText: {
    color: '#F58220', // Signature active navbar orange
    fontSize: 13.5,
    ...FONTS.extraBold,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  /* MAIN CONTENT AREA */
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },

  /* SECTION HEADER ROW */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    ...FONTS.extraBold,
    color: '#18181B',
  },
  campusBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  campusBadgeText: {
    fontSize: 12,
    ...FONTS.semiBold,
    color: '#4B5563',
  },
  watchHistoryText: {
    fontSize: 14,
    ...FONTS.bold,
    color: '#C2410C',
  },

  /* UPCOMING PRACTICAL CARD (EXACT MATCH TO DESIGN SCREENSHOT) */
  upcomingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      web: { boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.05)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateBadgeBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFEBDD', // Soft warm peach background matching screenshot
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dateMonthText: {
    fontSize: 11,
    ...FONTS.extraBold,
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  dateDayText: {
    fontSize: 20,
    ...FONTS.extraBold,
    color: '#7C2D12',
    marginTop: -1,
  },
  cardDetailsColumn: {
    flex: 1,
  },
  practicalTitle: {
    fontSize: 16,
    ...FONTS.extraBold,
    color: '#18181B',
  },
  timeLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeLocText: {
    fontSize: 13,
    color: '#6B7280',
    ...FONTS.medium,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  instructorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  instructorTextColumn: {
    justifyContent: 'center',
  },
  instructorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
  },
  instructorRole: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 1,
  },
  viewSlotBtn: {
    backgroundColor: '#E5E7EB', // Neutral grey pill button matching screenshot
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewSlotBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },

  /* RECENT THEORY LESSONS CARDS (EXACT MATCH TO DESIGN SCREENSHOT) */
  lessonsListContainer: {
    gap: 12,
  },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    }),
  },
  thumbnailWrapper: {
    width: 76,
    height: 76,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E22',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  playOverlayCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -14,
    marginLeft: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F58220', // Signature orange play button overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonContentColumn: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  tagDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagBadgePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  tagBadgeText: {
    fontSize: 10.5,
    ...FONTS.extraBold,
    color: '#374151',
    letterSpacing: 0.5,
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
    ...FONTS.medium,
  },
  lessonTitleText: {
    fontSize: 15.5,
    ...FONTS.extraBold,
    color: '#18181B',
    marginTop: 4,
  },
  bookmarkTouch: {
    padding: 8,
    marginLeft: 8,
  },
  announcementsList: {
    gap: 12,
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    }),
  },
  announcementIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  announcementContentCol: {
    flex: 1,
    marginRight: 8,
  },
  announcementTopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  announcementBatchBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  announcementBatchBadgeText: {
    fontSize: 10.5,
    ...FONTS.bold,
    color: '#EA580C',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  announcementDateText: {
    fontSize: 11,
    color: '#9CA3AF',
    ...FONTS.medium,
  },
  announcementTitleText: {
    fontSize: 15,
    ...FONTS.extraBold,
    color: '#18181B',
  },
  announcementMsgPreview: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
    lineHeight: 18,
    ...FONTS.regular,
  },
  announcementFullMessage: {
    fontSize: 14.5,
    color: '#374151',
    lineHeight: 22,
    ...FONTS.regular,
  },
  announcementAuthorText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 5,
    ...FONTS.medium,
  },
  emptyAnnouncementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyAnnouncementText: {
    marginTop: 8,
    fontSize: 13.5,
    color: '#9CA3AF',
    ...FONTS.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  modalName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalRole: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  modalInfoBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalInfoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  /* Glow Orbs & Theme Toggle */
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

  /* Dark Mode Variants */
  upcomingCardDark: {
    backgroundColor: '#141B26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  dateBadgeBoxDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  viewSlotBtnDark: {
    backgroundColor: '#FF5E14',
  },
  lessonCardDark: {
    backgroundColor: '#141B26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
      },
    }),
  },
  tagBadgePillDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalContentDark: {
    backgroundColor: '#141B26',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  modalInfoBoxDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
