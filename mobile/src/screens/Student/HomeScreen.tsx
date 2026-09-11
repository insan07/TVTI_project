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
} from 'react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const parseUTCDate = (dateStr: string) => {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  return new Date(dateStr);
};

const getSlotActualDate = (weekStartDateStr: string, dayOfWeek: string) => {
  const weekStart = parseUTCDate(weekStartDateStr);
  const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const diff = daysArr.indexOf(dayOfWeek);
  const slotDate = new Date(weekStart);
  if (diff !== -1) {
    slotDate.setDate(slotDate.getDate() + diff);
  }
  return slotDate;
};

export default function HomeScreen({ unreadCount: passedUnreadCount }: { unreadCount?: number }) {
  const { user } = useContext(AuthContext) as any;
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  const unreadCount = passedUnreadCount !== undefined ? passedUnreadCount : (data?.notifications?.filter((n: any) => !n.is_read).length || 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>
      {/* Dark Header Container */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        {/* Header Top Notification Bar */}
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <Icon name="notifications-outline" size={24} color="#FFF" />
            {unreadCount > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
        </View>

        {/* Welcome Section with Avatar */}
        <View style={styles.welcomeSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={require('../../../assets/student_avatar.png')}
              style={styles.avatarImage}
            />
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name || 'Student'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Up Next Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Up Next</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {data?.next_class || data?.next_practice ? (
            <>
              {/* Up Next Card 1: Main Class */}
              {data?.next_class && (
                <TouchableOpacity
                  style={styles.upNextCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Schedule')}
                >
                  <View style={[styles.cardAccentBar, { backgroundColor: '#FF7043' }]} />
                  <View style={styles.cardMainContent}>
                    <View style={styles.cardRowTop}>
                      <View style={[styles.iconCircle, { backgroundColor: '#FFF3E6' }]}>
                        <Icon name="build-outline" size={22} color={COLORS.secondary} />
                      </View>
                      <View style={styles.cardTextDetails}>
                        <Text style={styles.courseTitle}>
                          {data.next_class.course_id?.title || 'Scheduled Class'}
                        </Text>
                        <View style={styles.infoRow}>
                          <Icon name="time-outline" size={15} color={COLORS.textMuted} style={styles.infoIcon} />
                          <Text style={styles.infoText}>
                            {data.next_class.schedule_json?.time
                              ? `Today, ${data.next_class.schedule_json.time}`
                              : 'Scheduled Today'}
                          </Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Icon name="location-outline" size={15} color={COLORS.textMuted} style={styles.infoIcon} />
                          <Text style={styles.infoText}>
                            {data.next_class.room || 'Main Workshop'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Up Next Card 2: Practice Session */}
              {data?.next_practice && (
                <TouchableOpacity
                  style={[styles.upNextCard, data?.next_class && { marginTop: SPACING.md }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Schedule')}
                >
                  <View style={[styles.cardAccentBar, { backgroundColor: '#10B981' }]} />
                  <View style={styles.cardMainContent}>
                    <View style={styles.cardRowTop}>
                      <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                        <Icon name="construct-outline" size={22} color="#10B981" />
                      </View>
                      <View style={styles.cardTextDetails}>
                        <View style={styles.titleBadgeRow}>
                          <Text style={[styles.courseTitle, { flex: 1, marginBottom: 0 }]}>
                            {data.next_practice.slot_id?.batch_id?.course_id?.title || 'Practice Session'}
                          </Text>
                          <View style={styles.confirmedBadge}>
                            <Text style={styles.confirmedBadgeText}>CONFIRMED</Text>
                          </View>
                        </View>
                        <View style={styles.infoRow}>
                          <Icon name="time-outline" size={15} color={COLORS.textMuted} style={styles.infoIcon} />
                          <Text style={styles.infoText}>
                            {data.next_practice.slot_id
                              ? `${data.next_practice.slot_id.day_of_week}, ${data.next_practice.slot_id.start_time}`
                              : 'Upcoming Session'}
                          </Text>
                        </View>
                        {data.next_practice.slot_id?.instructor_id?.name && (
                          <View style={styles.infoRow}>
                            <Icon name="person-outline" size={15} color={COLORS.textMuted} style={styles.infoIcon} />
                            <Text style={styles.infoText}>
                              Instructor: {data.next_practice.slot_id.instructor_id.name}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={[styles.upNextCard, { padding: SPACING.lg }]}>
              <Text style={{ color: '#888888', ...FONTS.regular, textAlign: 'center' }}>
                No upcoming classes or practice sessions scheduled.
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Videos')}
            >
              <View style={styles.actionIconCircle}>
                <Icon name="folder-open" size={26} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionLabel}>Uploads</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Schedule')}
            >
              <View style={styles.actionIconCircle}>
                <Icon name="calendar" size={26} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionLabel}>Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Results')}
            >
              <View style={styles.actionIconCircle}>
                <Icon name="clipboard" size={26} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionLabel}>Results</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCardContainer}>
            {data?.notifications && data.notifications.length > 0 ? (
              data.notifications.map((n: any, idx: number) => {
                const isLast = idx === data.notifications.length - 1;
                const titleLower = (n.title || '').toLowerCase();
                const msgLower = (n.message || '').toLowerCase();

                const isAnnouncement = titleLower.includes('announcement') || msgLower.includes('announcement');
                const isBooked = titleLower.includes('booked') || titleLower.includes('practice') || msgLower.includes('booked');
                const isCompleted = titleLower.includes('completed') || titleLower.includes('module') || msgLower.includes('completed');

                let iconName = 'notifications-outline';
                let iconColor = COLORS.textPrimary;
                let bgCircle = '#F0F0F0';

                if (isCompleted) {
                  iconName = 'checkmark-circle-outline';
                  iconColor = '#333333';
                  bgCircle = '#F0F0F0';
                } else if (isBooked) {
                  iconName = 'calendar-outline';
                  iconColor = COLORS.secondary;
                  bgCircle = '#FFF3E6';
                } else if (isAnnouncement) {
                  iconName = 'megaphone-outline';
                  iconColor = '#555555';
                  bgCircle = '#F0F0F0';
                }

                return (
                  <View key={n._id || idx} style={[styles.activityItem, !isLast && styles.activityItemBorder]}>
                    <View style={[styles.activityIconCircle, { backgroundColor: bgCircle }]}>
                      <Icon name={iconName as any} size={20} color={iconColor} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{n.message || n.title}</Text>
                      <Text style={styles.activityTime}>{new Date(n.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={{ color: '#888888', ...FONTS.regular, textAlign: 'center', paddingVertical: SPACING.md }}>
                No recent activity.
              </Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
  },
  headerContainer: {
    backgroundColor: '#121212',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl + 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  menuBtn: {
    padding: SPACING.xs,
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 28,
    height: 28,
    marginRight: SPACING.sm,
  },
  headerBrand: {
    color: '#FFF',
    fontSize: 18,
    ...FONTS.bold,
  },
  bellBtn: {
    position: 'relative',
    padding: SPACING.xs,
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#F58220',
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: '#F58220',
    overflow: 'hidden',
    marginRight: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  welcomeTextContainer: {
    justifyContent: 'center',
  },
  greeting: {
    color: '#A0A0A0',
    fontSize: 14,
    ...FONTS.regular,
    marginBottom: 2,
  },
  name: {
    color: '#FFF',
    fontSize: 24,
    ...FONTS.bold,
  },
  content: {
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xxl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#1A1A1A',
    ...FONTS.bold,
  },
  viewAllText: {
    fontSize: 14,
    color: '#F58220',
    ...FONTS.semiBold,
  },
  upNextCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  cardAccentBar: {
    width: 5,
  },
  cardMainContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  cardRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardTextDetails: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  courseTitle: {
    fontSize: 17,
    color: '#1A1A1A',
    ...FONTS.bold,
    marginBottom: SPACING.xs,
  },
  confirmedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.xs,
  },
  confirmedBadgeText: {
    color: '#10B981',
    fontSize: 11,
    ...FONTS.bold,
    letterSpacing: 0.4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 13.5,
    color: '#666666',
    ...FONTS.regular,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  quickActionCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  actionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF3E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    fontSize: 14,
    color: '#1A1A1A',
    ...FONTS.semiBold,
  },
  activityCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginTop: SPACING.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: '#1A1A1A',
    ...FONTS.medium,
    lineHeight: 20,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999999',
    ...FONTS.regular,
  },
});

