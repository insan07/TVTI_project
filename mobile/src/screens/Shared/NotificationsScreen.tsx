import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import api from '../../services/api';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import { FONTS } from '../../config/theme';

type FilterTab = 'all' | 'unread' | 'practical' | 'academic';

const PRACTICAL_TYPES = new Set([
  'practice_slots',
  'session_booked',
  'booking_confirmed',
  'booking_rejected',
  'booking_cancelled',
  'cancellation_approved',
  'cancellation_rejected',
  'schedule_change',
]);

const ACADEMIC_TYPES = new Set([
  'new_video',
  'video_uploaded',
  'material',
  'material_uploaded',
  'new_result',
  'result_published',
  'certificate',
  'announcement',
  'batch_assigned',
  'student_enrolled',
]);

export default function NotificationsScreen() {
  const { isDark } = useTheme();
  const authContext = useContext(AuthContext) as any;
  const userRole = String(authContext?.userRole || authContext?.user?.role || 'student').toLowerCase();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/my');
      setNotifications(res.data || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const navigateToMappedFunction = (notification: any) => {
    const type = String(notification?.type || '').toLowerCase();
    const link = String(notification?.link || '').toLowerCase();

    if (userRole === 'admin') {
      if (type === 'new_application' || type === 'application_update' || type === 'application') {
        navigation.navigate('AdminApp', { screen: 'Users', params: { initialActivity: 'applications' } });
        return;
      }
      if (type === 'payment') {
        navigation.navigate('AdminApp', { screen: 'Users', params: { initialActivity: 'payments' } });
        return;
      }
      if (type === 'account_status' || type === 'user') {
        navigation.navigate('AdminApp', { screen: 'Users' });
        return;
      }
      if (PRACTICAL_TYPES.has(type)) {
        navigation.navigate('AdminApp', { screen: 'Practice' });
        return;
      }
      if (type === 'batch_assigned' || type === 'student_enrolled' || type === 'new_video' || type === 'material') {
        navigation.navigate('AdminApp', { screen: 'Courses' });
        return;
      }
      if (type === 'announcement') {
        navigation.navigate('PostAnnouncement');
        return;
      }
      if (link.includes('user') || link.includes('application')) {
        navigation.navigate('AdminApp', { screen: 'Users' });
      } else if (link.includes('slot') || link.includes('practice') || link.includes('schedule')) {
        navigation.navigate('AdminApp', { screen: 'Practice' });
      } else if (link.includes('course') || link.includes('batch')) {
        navigation.navigate('AdminApp', { screen: 'Courses' });
      } else if (link.includes('announcement')) {
        navigation.navigate('PostAnnouncement');
      } else if (link.includes('profile')) {
        navigation.navigate('AdminApp', { screen: 'Profile' });
      }
      return;
    }

    if (userRole === 'instructor') {
      if (PRACTICAL_TYPES.has(type)) {
        navigation.navigate('InstructorApp', { screen: 'Practice' });
        return;
      }
      if (type === 'new_video' || type === 'video_uploaded' || type === 'material' || type === 'material_uploaded') {
        navigation.navigate('InstructorApp', { screen: 'Uploads' });
        return;
      }
      if (type === 'announcement') {
        navigation.navigate('InstructorApp', { screen: 'PostAnnouncement' });
        return;
      }
      if (type === 'batch_assigned' || type === 'student_enrolled' || type === 'new_result') {
        navigation.navigate('MyStudents');
        return;
      }
      if (type === 'account_status' || type === 'general') {
        navigation.navigate('InstructorApp', { screen: 'Profile' });
        return;
      }
      if (link.includes('slot') || link.includes('practice') || link.includes('schedule')) {
        navigation.navigate('InstructorApp', { screen: 'Practice' });
      } else if (link.includes('student')) {
        navigation.navigate('MyStudents');
      } else if (link.includes('video') || link.includes('upload')) {
        navigation.navigate('InstructorApp', { screen: 'Uploads' });
      } else if (link.includes('announcement')) {
        navigation.navigate('InstructorApp', { screen: 'PostAnnouncement' });
      } else if (link.includes('profile')) {
        navigation.navigate('InstructorApp', { screen: 'Profile' });
      }
      return;
    }

    // Default: Student role navigation mapping
    if (PRACTICAL_TYPES.has(type) || type === 'batch_assigned') {
      navigation.navigate('StudentApp', { screen: 'Schedule' });
      return;
    }
    if (type === 'new_video' || type === 'video_uploaded' || type === 'material' || type === 'material_uploaded') {
      navigation.navigate('StudentApp', { screen: 'Videos' });
      return;
    }
    if (type === 'new_result' || type === 'result_published' || type === 'certificate') {
      navigation.navigate('Results');
      return;
    }
    if (type === 'announcement') {
      navigation.navigate('StudentApp', {
        screen: 'Home',
        params: {
          openAnnouncements: true,
          openAnnouncementId: notification?.related_id ? String(notification.related_id) : undefined,
        },
      });
      return;
    }
    if (type === 'payment' || type === 'application_update' || type === 'account_status') {
      navigation.navigate('StudentApp', { screen: 'Profile' });
      return;
    }

    if (link.includes('schedule') || link.includes('slot')) {
      navigation.navigate('StudentApp', { screen: 'Schedule' });
    } else if (link.includes('video')) {
      navigation.navigate('StudentApp', { screen: 'Videos' });
    } else if (link.includes('result') || link.includes('certificate')) {
      navigation.navigate('Results');
    } else if (link.includes('profile') || link.includes('payment')) {
      navigation.navigate('StudentApp', { screen: 'Profile' });
    } else if (link.includes('announcement') || link.includes('home')) {
      navigation.navigate('StudentApp', { screen: 'Home' });
    }
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.is_read) {
      try {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications(prev => prev.map(n => (n._id === notification._id ? { ...n, is_read: true } : n)));
      } catch (e) {
        console.warn(e);
      }
    }

    navigateToMappedFunction(notification);
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.warn(e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (e) {
      console.warn(e);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
    } catch (e) {
      console.warn(e);
    }
  };

  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'practice_slots':
        return { name: 'calendar', color: '#F58220', label: 'Practice Slot', actionText: 'View Slots' };
      case 'session_booked':
      case 'booking_confirmed':
        return { name: 'checkmark-circle', color: '#10B981', label: 'Slot Booking', actionText: 'View Schedule' };
      case 'booking_rejected':
      case 'booking_cancelled':
        return { name: 'close-circle', color: '#EF4444', label: 'Booking Cancellation', actionText: 'Manage Slot' };
      case 'cancellation_approved':
        return { name: 'checkmark-done-circle', color: '#10B981', label: 'Cancellation Approved', actionText: 'View Schedule' };
      case 'cancellation_rejected':
        return { name: 'alert-circle', color: '#F59E0B', label: 'Cancellation Declined', actionText: 'View Schedule' };
      case 'schedule_change':
        return { name: 'time', color: '#8B5CF6', label: 'Schedule Update', actionText: 'View Schedule' };
      case 'batch_assigned':
      case 'student_enrolled':
        return { name: 'people', color: '#06B6D4', label: 'Batch Enrollment', actionText: 'Open Batch' };
      case 'new_video':
      case 'video_uploaded':
        return { name: 'videocam', color: '#2563EB', label: 'Video Lecture', actionText: 'Watch Video' };
      case 'material':
      case 'material_uploaded':
        return { name: 'document-text', color: '#6366F1', label: 'Study Material', actionText: 'Open Material' };
      case 'announcement':
        return { name: 'megaphone', color: '#F58220', label: 'Announcement', actionText: 'View Notice' };
      case 'new_result':
      case 'result_published':
        return { name: 'ribbon', color: '#10B981', label: 'Exam Result', actionText: 'View Result' };
      case 'certificate':
        return { name: 'school', color: '#D97706', label: 'Certification', actionText: 'View Transcript' };
      case 'payment':
        return { name: 'card', color: '#10B981', label: 'Fee & Payment', actionText: 'View Payment' };
      case 'new_application':
      case 'application_update':
        return { name: 'person-add', color: '#EC4899', label: 'Admission', actionText: 'View Details' };
      case 'account_status':
      case 'admin_alert':
        return { name: 'shield-checkmark', color: '#3B82F6', label: 'Account Alert', actionText: 'View Account' };
      default:
        return { name: 'notifications', color: '#64748B', label: 'General', actionText: 'Open' };
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter(n => !n.is_read);
    }
    if (activeFilter === 'practical') {
      return notifications.filter(n => PRACTICAL_TYPES.has(String(n.type || '').toLowerCase()));
    }
    if (activeFilter === 'academic') {
      return notifications.filter(n => ACADEMIC_TYPES.has(String(n.type || '').toLowerCase()));
    }
    return notifications;
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderItem = ({ item }: { item: any }) => {
    const meta = getTypeMeta(item.type);
    return (
      <TouchableOpacity
        style={[
          styles.card,
          isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' },
          !item.is_read && (isDark ? styles.unreadCardDark : styles.unreadCard),
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.iconBox, { backgroundColor: `${meta.color}18` }]}>
          <Icon name={meta.name as any} size={22} color={meta.color} />
        </View>
        <View style={styles.info}>
          <View style={styles.topMetaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: `${meta.color}18` }]}>
              <Text style={[styles.categoryBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={[styles.time, isDark && { color: '#64748B' }]}>{formatTime(item.createdAt)}</Text>
          </View>
          <Text
            style={[
              styles.title,
              isDark && { color: '#FFFFFF' },
              !item.is_read && (isDark ? { color: '#FFA05C' } : styles.unreadText),
            ]}
          >
            {item.title}
          </Text>
          <Text style={[styles.message, isDark && { color: '#94A3B8' }]} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.bottomActionRow}>
            <View style={styles.actionLinkRow}>
              <Text style={[styles.actionLinkText, { color: meta.color }]}>{meta.actionText}</Text>
              <Icon name="arrow-forward" size={12} color={meta.color} />
            </View>
            <TouchableOpacity
              onPress={() => deleteNotification(item._id)}
              style={styles.deleteIconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="trash-outline" size={15} color={isDark ? '#64748B' : '#94A3B8'} />
            </TouchableOpacity>
          </View>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#0B0F19' }]} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread update${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
        showBack={true}
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn} activeOpacity={0.7}>
                <Text style={styles.markReadText}>Mark all read</Text>
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={clearAllNotifications}
                style={[styles.clearBtn, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                activeOpacity={0.7}
              >
                <Icon name="trash-outline" size={14} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Filter Bar */}
      <View style={styles.filterBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBarContent}>
          {[
            { key: 'all', label: `All (${notifications.length})` },
            { key: 'unread', label: `Unread (${unreadCount})` },
            { key: 'practical', label: 'Practical Slots' },
            { key: 'academic', label: 'Courses & Notices' },
          ].map(tab => {
            const isSelected = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterChip,
                  isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255,255,255,0.08)' },
                  isSelected && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(tab.key as FilterTab)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isDark && { color: '#94A3B8' },
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#F58220" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderItem}
          keyExtractor={i => i._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F58220']} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 80 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="notifications-outline" size={48} color={isDark ? '#64748B' : '#9CA3AF'} />
              <Text style={[styles.emptyText, isDark && { color: '#94A3B8' }]}>
                {activeFilter === 'all' ? 'No notifications yet.' : `No ${activeFilter} notifications found.`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  markReadBtn: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    backgroundColor: 'rgba(245, 130, 32, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.25)',
  },
  markReadText: {
    color: '#EA580C',
    fontSize: 12,
    ...FONTS.semiBold,
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  filterBarWrapper: {
    paddingVertical: 8,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  filterChipText: {
    fontSize: 12,
    color: '#475569',
    ...FONTS.semiBold,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  unreadCardDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    marginTop: 2,
  },
  info: {
    flex: 1,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    ...FONTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 15,
    color: '#0F172A',
    ...FONTS.semiBold,
  },
  unreadText: {
    ...FONTS.bold,
    color: '#0F172A',
  },
  message: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 3,
    ...FONTS.regular,
    lineHeight: 18,
  },
  time: {
    color: '#94A3B8',
    fontSize: 11,
    ...FONTS.medium,
  },
  bottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLinkText: {
    fontSize: 12,
    ...FONTS.semiBold,
  },
  deleteIconBtn: {
    padding: 2,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#F58220',
    marginLeft: 8,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    ...FONTS.regular,
  },
});
