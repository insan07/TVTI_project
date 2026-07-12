import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../../services/api';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

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
      setNotifications(res.data);
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
      case 'announcement': return { name: 'megaphone', color: '#F59E0B' };
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
      >
        <View style={[styles.iconBox, { backgroundColor: `${iconData.color}20` }]}>
          <Icon name={iconData.name as any} size={24} color={iconData.color} />
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

  if (loading) return <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markReadText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={i => i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>No notifications.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  markReadText: { color: '#2563EB', fontWeight: 'bold' },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, marginBottom: 8, borderRadius: 12, elevation: 1, alignItems: 'center' },
  unreadCard: { backgroundColor: '#EFF6FF' },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  info: { flex: 1 },
  title: { fontSize: 16, color: '#1F2937' },
  unreadText: { fontWeight: 'bold' },
  message: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  time: { color: '#9CA3AF', fontSize: 11, marginTop: 6 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginLeft: 10 }
});
