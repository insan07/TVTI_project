import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const parseUTCDate = (dateStr: string) => {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
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

export default function HomeScreen() {
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const unreadCount = data?.notifications?.filter((n: any) => !n.is_read).length || 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.headerContainer}>
        <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerLogoContainer}>
              <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.headerBrand}>Twintec VTI</Text>
            </View>
            <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
              <Icon name="notifications-outline" size={24} color="#FFF" />
              {unreadCount > 0 && <View style={styles.badge} />}
            </TouchableOpacity>
          </View>
          
          <View style={styles.welcomeSection}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.name}>{user.name}</Text>
              </View>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
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

      <View style={styles.content}>
        {/* Next Class Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Up Next</Text>
          {data?.next_class ? (
            <View style={styles.nextClassCard}>
              <View style={styles.accentBar} />
              <View style={styles.nextClassContent}>
                <Text style={styles.courseTitle}>{data.next_class.course_id?.title}</Text>
                
                <View style={styles.infoRow}>
                  <Icon name="calendar-outline" size={16} color={COLORS.textMuted} style={styles.infoIcon} />
                  <Text style={styles.infoText}>{data.next_class.schedule_json?.days?.join(', ') || 'TBD'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Icon name="person-outline" size={16} color={COLORS.textMuted} style={styles.infoIcon} />
                  <Text style={styles.infoText}>{data.next_class.instructor_ids?.map((i:any)=>i.name).join(', ') || 'TBD'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Icon name="time-outline" size={16} color={COLORS.textMuted} style={styles.infoIcon} />
                  <Text style={styles.infoText}>{data.next_class.schedule_json?.time || 'TBD'}</Text>
                </View>
                
                <TouchableOpacity onPress={() => navigation.navigate('Schedule')} style={styles.linkButton}>
                  <Text style={styles.linkText}>View Schedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>No upcoming classes.</Text>
          )}

          {data?.next_practice?.slot_id && (
            <View style={[styles.nextClassCard, { marginTop: SPACING.md }]}>
              <View style={[styles.accentBar, { backgroundColor: COLORS.success }]} />
              <View style={styles.nextClassContent}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Text style={styles.courseTitle}>Booked Practice Session</Text>
                  <View style={{backgroundColor: COLORS.success + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12}}>
                    <Text style={{color: COLORS.success, fontSize: 10, fontWeight: 'bold'}}>Confirmed</Text>
                  </View>
                </View>
                
                <Text style={[styles.infoText, {fontWeight: 'bold', marginBottom: 5, color: COLORS.textPrimary}]}>
                  {data.next_practice.slot_id.batch_id?.course_id?.title} - {data.next_practice.slot_id.batch_id?.name}
                </Text>
                
                <View style={styles.infoRow}>
                  <Icon name="calendar-outline" size={16} color={COLORS.textMuted} style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                    {getSlotActualDate(data.next_practice.slot_id.week_start_date, data.next_practice.slot_id.day_of_week).toLocaleDateString()} ({data.next_practice.slot_id.day_of_week})
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Icon name="time-outline" size={16} color={COLORS.textMuted} style={styles.infoIcon} />
                  <Text style={styles.infoText}>{data.next_practice.slot_id.start_time} - {data.next_practice.slot_id.end_time}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Icon name="person-outline" size={16} color={COLORS.textMuted} style={styles.infoIcon} />
                  <Text style={styles.infoText}>{data.next_practice.slot_id.instructor_id?.name || 'Instructor'}</Text>
                </View>
                
                <TouchableOpacity onPress={() => navigation.navigate('Schedule')} style={styles.linkButton}>
                  <Text style={[styles.linkText, {color: COLORS.success}]}>Manage Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.grid}>
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate('Videos')}>
              <View style={styles.iconCircle}>
                <Icon name="videocam" size={24} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionLabel}>Videos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate('Schedule')}>
              <View style={styles.iconCircle}>
                <Icon name="calendar" size={24} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionLabel}>Schedule</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate('Results')}>
              <View style={styles.iconCircle}>
                <Icon name="bar-chart" size={24} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionLabel}>Results</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {data?.notifications?.length > 0 ? (
            data.notifications.map((n:any) => (
              <View key={n._id} style={[styles.notifCard, !n.is_read && styles.notifUnread]}>
                <View style={styles.notifIconContainer}>
                  <Icon name="notifications" size={20} color={n.is_read ? COLORS.textMuted : COLORS.secondary} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={[styles.notifTitle, !n.is_read && { color: COLORS.textPrimary }]}>{n.title}</Text>
                  <Text style={styles.notifMsg} numberOfLines={2}>{n.message}</Text>
                  <Text style={styles.notifTime}>{new Date(n.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent activity.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
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
  badge: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
  },
  welcomeSection: {
    marginBottom: SPACING.md,
  },
  greeting: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    ...FONTS.regular,
    marginBottom: SPACING.xs,
  },
  name: {
    color: '#FFF',
    fontSize: 26,
    ...FONTS.bold,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  waveContainer: {
    backgroundColor: COLORS.background,
    marginTop: -1, 
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xxxl,
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: SPACING.lg,
  },
  nextClassCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  accentBar: {
    width: 4,
    backgroundColor: COLORS.secondary,
  },
  nextClassContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  courseTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  infoIcon: {
    marginRight: SPACING.sm,
    width: 16,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  linkButton: {
    marginTop: SPACING.md,
    alignSelf: 'flex-start',
  },
  linkText: {
    color: COLORS.secondary,
    ...FONTS.semiBold,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  notifUnread: {
    borderLeftColor: COLORS.secondary,
  },
  notifIconContainer: {
    marginRight: SPACING.md,
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.bold,
    marginBottom: 2,
  },
  notifMsg: {
    fontSize: 13,
    color: COLORS.textMuted,
    ...FONTS.regular,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONTS.regular,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
    ...FONTS.regular,
  }
});
