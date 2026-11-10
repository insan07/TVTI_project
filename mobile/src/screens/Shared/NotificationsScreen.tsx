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
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import { FONTS } from '../../config/theme';
import { communicationTheme, COMMUNICATION_ACCENT } from '../../components/shared/communicationTheme';
import { notificationText } from '../../utils/notificationText';

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
  const theme = communicationTheme(isDark);
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

  const getTypeLabel = (type: string) => {
    const value = String(type || '').toLowerCase();
    if (PRACTICAL_TYPES.has(value)) return 'Practical';
    if (['batch_assigned', 'student_enrolled'].includes(value)) return 'Enrollment';
    if (['new_video', 'video_uploaded'].includes(value)) return 'Video';
    if (['material', 'material_uploaded'].includes(value)) return 'Material';
    if (value === 'announcement') return 'Announcement';
    if (['new_result', 'result_published'].includes(value)) return 'Result';
    if (value === 'certificate') return 'Certificate';
    if (value === 'payment') return 'Payment';
    if (['new_application', 'application_update'].includes(value)) return 'Admission';
    if (['account_status', 'admin_alert'].includes(value)) return 'Account';
    return 'Update';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (!dateString || Number.isNaN(date.getTime())) return '';
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.notificationRow, { borderBottomColor: theme.line }]}>
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.65}
        accessibilityRole="button"
        accessibilityLabel={`${item.is_read ? '' : 'Unread: '}${notificationText(item.title)}`}
      >
        <View style={styles.readIndicator}>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.info}>
          <View style={styles.metadata}>
            <Text style={[styles.metadataText, { color: theme.muted }]}>{getTypeLabel(item.type)}</Text>
            <Text style={[styles.metadataText, { color: theme.muted }]}>{formatTime(item.createdAt)}</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }, !item.is_read && styles.unreadTitle]} numberOfLines={2}>
            {notificationText(item.title)}
          </Text>
          <Text style={[styles.message, { color: theme.muted }]} numberOfLines={2}>{notificationText(item.message)}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => deleteNotification(item._id)}
        style={styles.deleteButton}
        accessibilityRole="button"
        accessibilityLabel={`Delete notification: ${notificationText(item.title)}`}
        activeOpacity={0.6}
      >
        <Icon name="close" size={18} color={theme.muted} />
      </TouchableOpacity>
    </View>
  );

  const emptyLabels: Record<FilterTab, string> = {
    all: 'No notifications yet.',
    unread: 'Nothing unread.',
    practical: 'No practical updates.',
    academic: 'No academic updates.',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.pageHeader}>
        <View style={styles.utilityBar}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate(userRole === 'admin' ? 'AdminApp' : userRole === 'instructor' ? 'InstructorApp' : 'StudentApp', { screen: 'Home' });
            }}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="arrow-back" size={23} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.utilityActions}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} style={styles.utilityButton} accessibilityRole="button" accessibilityLabel="Mark all notifications as read">
                <Icon name="checkmark-done-outline" size={23} color={COMMUNICATION_ACCENT} />
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity onPress={clearAllNotifications} style={styles.utilityButton} accessibilityRole="button" accessibilityLabel="Clear all notifications">
                <Icon name="trash-outline" size={20} color={theme.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={[styles.pageTitle, { color: theme.text }]}>Notifications</Text>
          {unreadCount > 0 && <Text style={[styles.unreadCount, { color: theme.muted }]}>{unreadCount} unread</Text>}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line }}
          contentContainerStyle={styles.filters}
        >
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'practical', label: 'Practical' },
            { key: 'academic', label: 'Academic' },
          ].map(tab => {
            const selected = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActiveFilter(tab.key as FilterTab)}
                style={[styles.filterTab, { borderBottomColor: selected ? COMMUNICATION_ACCENT : 'transparent' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterLabel, { color: selected ? theme.text : theme.muted }, selected && styles.filterLabelSelected]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={COMMUNICATION_ACCENT} /></View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredNotifications}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COMMUNICATION_ACCENT]} tintColor={COMMUNICATION_ACCENT} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="notifications-outline" size={28} color={theme.muted} />
              <Text style={[styles.emptyText, { color: theme.muted }]}>{emptyLabels[activeFilter]}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 4 },
  utilityBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 },
  backButton: { width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  utilityActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: -12 },
  utilityButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 12, marginTop: 8, marginBottom: 16 },
  pageTitle: { ...FONTS.semiBold, fontSize: 28, lineHeight: 38, letterSpacing: -0.8, flexGrow: 1 },
  unreadCount: { ...FONTS.regular, fontSize: 12, lineHeight: 18 },
  filters: { flexDirection: 'row', gap: 24 },
  filterTab: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2 },
  filterLabel: { ...FONTS.regular, fontSize: 13 },
  filterLabelSelected: { ...FONTS.semiBold },
  list: { flex: 1, width: '100%', maxWidth: 860, alignSelf: 'center' },
  listContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 4 },
  notificationRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  notificationContent: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 10, paddingVertical: 22 },
  readIndicator: { width: 6, paddingTop: 31, alignItems: 'center' },
  unreadDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COMMUNICATION_ACCENT },
  info: { flex: 1, minWidth: 0 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  metadataText: { ...FONTS.regular, fontSize: 11, lineHeight: 16 },
  title: { ...FONTS.medium, fontSize: 15, lineHeight: 22, letterSpacing: -0.15 },
  unreadTitle: { ...FONTS.semiBold },
  message: { ...FONTS.regular, fontSize: 13, lineHeight: 20, marginTop: 5 },
  deleteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 14 },
  emptyText: { ...FONTS.regular, fontSize: 14, textAlign: 'center' },
});
