import React, { useState, useEffect, useContext, useRef } from 'react';
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
import StudentHomeCard, { studentHomeCardStyles } from '../../components/student/StudentHomeCard';
import AnnouncementRow from '../../components/student/AnnouncementRow';
import { communicationTheme } from '../../components/shared/communicationTheme';
import { migrateLegacyLessonPins } from '../../services/theoryLessonPins';
import { showToast } from '../../components/shared/Toast';

export default function HomeScreen({ unreadCount: passedUnreadCount }: { unreadCount?: number }) {
  const { user } = useContext(AuthContext) as any;
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();
  const communication = communicationTheme(isDark);
  const [data, setData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localUnreadCount, setLocalUnreadCount] = useState<number | null>(null);
  const [pinningLessonId, setPinningLessonId] = useState<string | null>(null);
  const pinRequestRef = useRef(false);
  const lessonRevisionRef = useRef(0);
  const [instructorModalVisible, setInstructorModalVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [allAnnouncementsModalVisible, setAllAnnouncementsModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboard();
    }, [user?._id])
  );

  const fetchDashboard = async () => {
    try {
      await migrateLegacyLessonPins(user?._id).catch(error => console.warn('Unable to migrate lesson pins:', error));
      const lessonRevision = lessonRevisionRef.current;
      const [res, notifRes, annRes] = await Promise.all([
        api.get('/students/home'),
        api.get('/notifications/unread-count').catch(() => null),
        api.get('/students/announcements').catch(() => null),
      ]);
      setData((previous: any) => lessonRevision === lessonRevisionRef.current
        ? res.data
        : { ...res.data, theory_lessons: previous?.theory_lessons || [] });
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

  const toggleBookmark = async (lesson: any) => {
    if (pinRequestRef.current) return;
    pinRequestRef.current = true;
    lessonRevisionRef.current += 1;
    setPinningLessonId(lesson._id);
    try {
      const response = await api.patch(`/students/videos/${lesson._id}/pin`, { pinned: !lesson.is_pinned });
      lessonRevisionRef.current += 1;
      setData((previous: any) => ({ ...previous, theory_lessons: response.data.theory_lessons }));
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Unable to save your pinned video. Please try again.', 'error');
    } finally {
      pinRequestRef.current = false;
      setPinningLessonId(null);
    }
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

  // Batch Assignment Status
  const hasAssignedBatch = data?.has_assigned_batch !== false && (
    (data?.assigned_batches && data.assigned_batches.length > 0) ||
    !!data?.next_class ||
    !!data?.next_practice
  );

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

  // The server reserves top slots for saved pins and fills the rest by last access.
  const theoryLessons = (data?.theory_lessons || [])
    .filter((lesson: any) => lesson.content_type === 'video')
    .slice(0, 3);

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
        {hasAssignedBatch && nextPractice && (
          <StudentHomeCard title="Upcoming Practical">
            <TouchableOpacity
              style={styles.upcomingCard}
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
          </StudentHomeCard>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: RECENT THEORY LESSONS */}
        {/* ========================================================================= */}
        {hasAssignedBatch && (
          <StudentHomeCard
            title="Recent Theory Lessons"
            variant="communication"
          >
            {theoryLessons.length > 0 ? <View>
              {theoryLessons.map((lesson: any, index: number) => {
                const isBookmarked = lesson.is_pinned === true;
                let thumbUrl = lesson.thumbnail || null;
                if (!thumbUrl && lesson.cloudinary_url) {
                  if (lesson.cloudinary_url.includes('youtube.com') || lesson.cloudinary_url.includes('youtu.be')) {
                    const match = lesson.cloudinary_url.match(/(?:[?&]v=|youtu\.be\/|youtube\.com\/(?:embed|shorts)\/)([\w-]{11})/);
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
                    style={[styles.lessonRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: communication.line }]}
                    activeOpacity={0.65}
                    accessibilityRole="button"
                    accessibilityLabel={`Open video: ${lesson.title}`}
                    onPress={() => navigation.navigate('VideoPlayer', {
                      videoId: lesson._id,
                      batchId: lesson.batch_id?._id || lesson.batch_id,
                    })}
                  >
                    <View style={styles.thumbnailWrapper}>
                      {thumbUrl && <Image source={{ uri: thumbUrl }} style={styles.thumbnailImg} />}
                      <View style={styles.lessonPlayOverlay}>
                        <Icon name="play" size={16} color={COLORS.secondary} />
                      </View>
                    </View>
                    <View style={styles.lessonContentColumn}>
                      {!!(lesson.topic || lesson.duration) && (
                        <View style={styles.lessonMetadata}>
                          {lesson.topic && <Text style={[styles.lessonTopic, { color: communication.muted }]} numberOfLines={1}>{lesson.topic}</Text>}
                          {!!lesson.duration && <Text style={[styles.lessonDuration, { color: communication.muted }]}>{lesson.duration}</Text>}
                        </View>
                      )}
                      <Text style={[styles.lessonTitleText, { color: communication.text }]} numberOfLines={2}>
                        {lesson.title}
                      </Text>
                    </View>

                    {/* Persistent pin control */}
                    <TouchableOpacity
                      style={styles.bookmarkTouch}
                      accessibilityRole="button"
                      accessibilityLabel={`${isBookmarked ? 'Unpin' : 'Pin'} video: ${lesson.title}`}
                      accessibilityState={{ disabled: pinningLessonId !== null, busy: pinningLessonId === lesson._id }}
                      disabled={pinningLessonId !== null}
                      onPress={event => {
                        event.stopPropagation();
                        void toggleBookmark(lesson);
                      }}
                    >
                      {pinningLessonId === lesson._id ? <ActivityIndicator size="small" color={COLORS.secondary} /> : <Icon
                        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                        size={20}
                        color={isBookmarked ? COLORS.secondary : isDark ? '#64748B' : '#A1A1AA'}
                      />}
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View> : (
              <View style={styles.recentLessonsEmpty}>
                <Text style={[styles.recentLessonsEmptyText, { color: communication.muted }]}>
                  Recently opened videos appear here.
                </Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Videos')} style={styles.browseVideosButton}>
                  <Text style={styles.browseVideosText}>Browse videos</Text>
                  <Icon name="arrow-forward" size={16} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>
            )}
          </StudentHomeCard>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: RECENT ANNOUNCEMENTS */}
        {/* ========================================================================= */}
        <StudentHomeCard
          title="Announcements"
          variant="communication"
          headerAction={announcements.length > 0 ? (
            <TouchableOpacity
              onPress={() => setAllAnnouncementsModalVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View all announcements"
              style={styles.viewAllButton}
            >
              <Text style={styles.watchHistoryText}>View all</Text>
            </TouchableOpacity>
          ) : undefined}
        >

        {announcements.length === 0 ? (
          <View style={styles.emptyAnnouncementCard}>
            <Text style={[styles.emptyAnnouncementText, { color: communication.muted }]}>No announcements yet.</Text>
          </View>
        ) : announcements.slice(0, 3).map((announcement: any, index: number) => (
          <AnnouncementRow
            key={announcement._id}
            announcement={announcement}
            dateLabel={formatAnnouncementDate(announcement.createdAt)}
            divided={index > 0}
            onPress={() => setSelectedAnnouncement(announcement)}
          />
        ))}
        </StudentHomeCard>
        </View>
      </ScrollView>

      {/* Announcement reading view */}
      <Modal
        visible={!!selectedAnnouncement}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.noticeDialog, { backgroundColor: communication.surface, borderColor: communication.line }]}>
            <View style={[styles.noticeDialogHeader, { borderBottomColor: communication.line }]}>
              <Text style={[styles.noticeDialogLabel, { color: communication.text }]}>Announcement</Text>
              <TouchableOpacity
                onPress={() => setSelectedAnnouncement(null)}
                accessibilityRole="button"
                accessibilityLabel="Close announcement"
                style={styles.noticeClose}
              >
                <Icon name="close" size={22} color={communication.text} />
              </TouchableOpacity>
            </View>
            {selectedAnnouncement && (
              <ScrollView style={styles.noticeDialogScroll} contentContainerStyle={styles.noticeBody}>
                <View style={styles.noticeMetadata}>
                  <Text style={[styles.noticeMetadataText, { color: communication.muted }]}>{formatAnnouncementDate(selectedAnnouncement.createdAt)}</Text>
                  {selectedAnnouncement.batch_id?.name && (
                    <Text style={[styles.noticeMetadataText, { color: communication.muted }]}>{selectedAnnouncement.batch_id.name}</Text>
                  )}
                </View>
                <Text style={[styles.noticeTitle, { color: communication.text }]}>{selectedAnnouncement.title}</Text>
                <Text style={[styles.noticeMessage, { color: communication.text }]} selectable>{selectedAnnouncement.message}</Text>
                {selectedAnnouncement.posted_by?.name && (
                  <View style={[styles.noticeByline, { borderTopColor: communication.line }]}>
                    <Text style={[styles.noticeMetadataText, { color: communication.muted }]}>{selectedAnnouncement.posted_by.name}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Announcement archive */}
      <Modal
        visible={allAnnouncementsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAllAnnouncementsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.noticeDialog, { backgroundColor: communication.surface, borderColor: communication.line }]}>
            <View style={[styles.noticeDialogHeader, { borderBottomColor: communication.line }]}>
              <Text style={[styles.noticeDialogLabel, { color: communication.text }]}>Announcements</Text>
              <TouchableOpacity
                onPress={() => setAllAnnouncementsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close announcements"
                style={styles.noticeClose}
              >
                <Icon name="close" size={22} color={communication.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.noticeDialogScroll} contentContainerStyle={styles.noticeArchive}>
              {announcements.map((announcement: any, index: number) => (
                <AnnouncementRow
                  key={announcement._id}
                  announcement={announcement}
                  dateLabel={formatAnnouncementDate(announcement.createdAt)}
                  divided={index > 0}
                  onPress={() => {
                    setAllAnnouncementsModalVisible(false);
                    setSelectedAnnouncement(announcement);
                  }}
                />
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
    fontSize: 12,
    ...FONTS.semiBold,
    color: COLORS.secondary,
  },

  /* UPCOMING PRACTICAL CONTENT */
  viewAllButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  lessonRow: {
    paddingVertical: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upcomingCard: {
    paddingVertical: 16,
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
    minWidth: 0,
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
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  instructorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexBasis: 160,
  },
  instructorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  instructorTextColumn: {
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
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

  /* RECENT THEORY LESSONS */
  thumbnailWrapper: {
    width: 72,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  lessonPlayOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonContentColumn: {
    flex: 1,
    minWidth: 0,
  },
  lessonMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  lessonTopic: { ...FONTS.regular, fontSize: 11, lineHeight: 16, flexShrink: 1 },
  lessonDuration: { ...FONTS.regular, fontSize: 11, lineHeight: 16 },
  lessonTitleText: {
    ...FONTS.semiBold,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  bookmarkTouch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  recentLessonsEmpty: {
    paddingVertical: 18,
  },
  recentLessonsEmptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  browseVideosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  browseVideosText: {
    ...FONTS.semiBold,
    fontSize: 13,
    color: COLORS.secondary,
  },
  emptyAnnouncementCard: {
    paddingVertical: 24,
  },
  emptyAnnouncementText: {
    ...FONTS.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  noticeDialog: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  noticeDialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 12,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noticeDialogLabel: { ...FONTS.semiBold, fontSize: 14 },
  noticeClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  noticeDialogScroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  noticeBody: { padding: 24 },
  noticeArchive: { paddingHorizontal: 24 },
  noticeMetadata: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 },
  noticeMetadataText: { ...FONTS.regular, fontSize: 12, lineHeight: 18 },
  noticeTitle: { ...FONTS.semiBold, fontSize: 24, lineHeight: 33, letterSpacing: -0.5 },
  noticeMessage: { ...FONTS.regular, fontSize: 15, lineHeight: 25, marginTop: 20 },
  noticeByline: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 18, marginTop: 26 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    ...studentHomeCardStyles.surface,
    width: '100%',
    maxWidth: 400,
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
  dateBadgeBoxDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  viewSlotBtnDark: {
    backgroundColor: '#FF5E14',
  },
  modalContentDark: {
    ...studentHomeCardStyles.surfaceDark,
  },
  modalInfoBoxDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
