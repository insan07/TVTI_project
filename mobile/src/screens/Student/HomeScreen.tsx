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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen({ unreadCount: passedUnreadCount }: { unreadCount?: number }) {
  const { user } = useContext(AuthContext) as any;
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkedLessons, setBookmarkedLessons] = useState<{ [key: string]: boolean }>({});
  const [instructorModalVisible, setInstructorModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboard();
    }, [])
  );

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/students/home');
      setData(res.data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = (lessonId: string) => {
    setBookmarkedLessons(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F58220" />
      </View>
    );
  }

  const unreadCount =
    passedUnreadCount !== undefined
      ? passedUnreadCount
      : data?.notifications?.filter((n: any) => !n.is_read).length || 0;

  // Upcoming Practical Details
  const nextPractice = data?.next_practice;
  const nextClass = data?.next_class;
  const practicalTitle =
    data?.next_practice?.slot_id?.batch_id?.course_id?.title ||
    data?.next_class?.course_id?.title ||
    'Course Details Loading...';
  
  const instructorData =
    data?.next_practice?.slot_id?.instructor_id ||
    (data?.next_class?.instructor_ids && data?.next_class?.instructor_ids.length > 0
      ? data.next_class.instructor_ids[0]
      : null);

  const instructorName = instructorData?.name || 'Instructor TBD';
  const avatarUrl =
    instructorData?.profile_photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=F3F4F6&color=9CA3AF`;
  const instructorEmail = instructorData?.email || 'N/A';
  const instructorPhone = instructorData?.phone || 'N/A';

  const timeLocationText = nextPractice?.slot_id
    ? `${nextPractice.slot_id.start_time || 'TBD'} • ${nextPractice.slot_id.location || 'Location TBD'}`
    : 'Time & Location TBD';

  let pracMonth = '--';
  let pracDay = '--';
  const rawDate = nextPractice?.slot_id?.date || nextClass?.date;
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      pracMonth = d.toLocaleString('default', { month: 'short' }).toUpperCase();
      pracDay = d.getDate().toString();
    }
  }

  // Fetch real theory lessons from backend if available, otherwise empty
  const theoryLessons = data?.theory_lessons || [];

  return (
    <View style={styles.container}>
      {/* FIXED STICKY ENTIRE DARK HEADER CARD */}
      <View style={[styles.stickyHeaderCard, { paddingTop: Math.max(insets.top + 8, 16) }]}>
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

          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Icon name="notifications-outline" size={22} color="#FFF" />
            {unreadCount > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name || 'Student'}</Text>
          <Text style={styles.regNumberText}>
            REG NO : {user?.index_number || user?.nic || 'N/A'}
          </Text>
        </View>
      </View>

      {/* SCROLLABLE MAIN CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentStyle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
        {/* ========================================================================= */}
        {/* SECTION 1: UPCOMING PRACTICAL */}
        {/* ========================================================================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming Practical</Text>
        </View>

        <TouchableOpacity
          style={styles.upcomingCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Schedule')}
        >
          {/* Top Row: Date Badge + Title/Time */}
          <View style={styles.cardTopRow}>
            {/* Soft Peach Date Badge */}
            <View style={styles.dateBadgeBox}>
              <Text style={styles.dateMonthText}>{pracMonth}</Text>
              <Text style={styles.dateDayText}>{pracDay}</Text>
            </View>

            <View style={styles.cardDetailsColumn}>
              <Text style={styles.practicalTitle} numberOfLines={1}>
                {practicalTitle}
              </Text>
              <View style={styles.timeLocRow}>
                <Icon name="time-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.timeLocText} numberOfLines={1}>
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
                <Text style={styles.instructorName}>{instructorName}</Text>
                <Text style={styles.instructorRole}>Course Instructor</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewSlotBtn}
              onPress={() => navigation.navigate('Schedule')}
              activeOpacity={0.8}
            >
              <Text style={styles.viewSlotBtnText}>View Slot</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* ========================================================================= */}
        {/* SECTION 2: RECENT THEORY LESSONS */}
        {/* ========================================================================= */}
        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
          <Text style={styles.sectionTitle}>Recent Theory Lessons</Text>
        </View>

        <View style={styles.lessonsListContainer}>
          {theoryLessons.map(lesson => {
            const isBookmarked = !!bookmarkedLessons[lesson.id];
            return (
              <TouchableOpacity
                key={lesson.id}
                style={styles.lessonCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Videos')}
              >
                {/* Thumbnail image with play button overlay */}
                <View style={styles.thumbnailWrapper}>
                  <Image source={{ uri: lesson.thumbnail }} style={styles.thumbnailImg} />
                  <View style={styles.playOverlayCircle}>
                    <Icon name="play" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
                  </View>
                </View>

                {/* Lesson Info */}
                <View style={styles.lessonContentColumn}>
                  <View style={styles.tagDurationRow}>
                    <View style={styles.tagBadgePill}>
                      <Text style={styles.tagBadgeText}>{lesson.tag}</Text>
                    </View>
                    <Text style={styles.durationText}>{lesson.duration}</Text>
                  </View>

                  <Text style={styles.lessonTitleText} numberOfLines={1}>
                    {lesson.title}
                  </Text>
                </View>

                {/* Bookmark Icon */}
                <TouchableOpacity
                  style={styles.bookmarkTouch}
                  onPress={() => toggleBookmark(lesson.id)}
                >
                  <Icon
                    name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={isBookmarked ? '#F58220' : '#A1A1AA'}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
        </View>
      </ScrollView>

      {/* Instructor Profile Modal */}
      <Modal visible={instructorModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Instructor Profile</Text>
              <TouchableOpacity onPress={() => setInstructorModalVisible(false)}>
                <Icon name="close" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Image source={{ uri: avatarUrl }} style={styles.modalAvatar} />
              <Text style={styles.modalName}>{instructorName}</Text>
              <Text style={styles.modalRole}>Course Instructor</Text>
              
              <View style={styles.modalInfoBox}>
                <View style={styles.modalInfoRow}>
                  <Icon name="mail-outline" size={18} color="#6B7280" />
                  <Text style={styles.modalInfoText}>{instructorEmail}</Text>
                </View>
                <View style={[styles.modalInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Icon name="call-outline" size={18} color="#6B7280" />
                  <Text style={styles.modalInfoText}>{instructorPhone}</Text>
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
    backgroundColor: '#121214',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
    ...Platform.select({
      web: { boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.15)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
    }),
  },

  brandHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
});
