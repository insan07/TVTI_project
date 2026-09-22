import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../../services/api';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/shared/ScreenHeader';
import { FONTS } from '../../config/theme';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const markAsRead = async (notification: any) => {
    if (!notification.is_read) {
      try {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, is_read: true } : n));
      } catch (e) {
        console.warn(e);
      }
    }

    // Navigate based on type
    if (notification.type === 'booking_confirmed' || notification.type === 'booking_rejected') {
      navigation.navigate('MyBookings');
    } else if (notification.type === 'new_video') {
      navigation.navigate('Videos');
    } else if (notification.type === 'schedule_change') {
      navigation.navigate('Schedule');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.warn(e);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'booking_confirmed': return { name: 'checkmark-circle', color: '#10B981' };
      case 'booking_rejected': return { name: 'close-circle', color: '#EF4444' };
      case 'new_video': return { name: 'videocam', color: '#2563EB' };
      case 'announcement': return { name: 'megaphone', color: '#F58220' };
      case 'schedule_change': return { name: 'calendar', color: '#8B5CF6' };
      default: return { name: 'notifications', color: '#6B7280' };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000); // in minutes
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const renderItem = ({ item }: { item: any }) => {
    const iconData = getIconForType(item.type);
    return (
      <TouchableOpacity
        style={[styles.card, !item.is_read && styles.unreadCard]}
        onPress={() => markAsRead(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: `${iconData.color}15` }]}>
          <Icon name={iconData.name as any} size={22} color={iconData.color} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, !item.is_read && styles.unreadText]}>{item.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread update${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
        showBack={true}
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn} activeOpacity={0.7}>
              <Text style={styles.markReadText}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {loading ? (
        <ActivityIndicator size="large" color="#F58220" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={i => i._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F58220']} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="notifications-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No notifications yet.</Text>
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
    paddingHorizontal: 12,
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
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
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
    marginTop: 5,
    ...FONTS.medium,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#F58220',
    marginLeft: 10,
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
