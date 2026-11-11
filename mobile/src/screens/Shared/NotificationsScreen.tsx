import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Pressable, AppState, BackHandler } from 'react-native';
import api from '../../services/api';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import { FONTS } from '../../config/theme';
import { communicationTheme, COMMUNICATION_ACCENT } from '../../components/shared/communicationTheme';
import WhatsAppOptionsMenu, { MenuOption } from '../../components/shared/WhatsAppOptionsMenu';
import NotificationBellIcon from '../../components/shared/NotificationBellIcon';
import { notificationText } from '../../utils/notificationText';
import { groupNotificationsByDate, millisecondsUntilNotificationDayChange, notificationClockTime, NotificationEntry } from '../../utils/notificationDates';

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


type Confirmation = { title: string; message: string; onConfirm: () => void };

export default function NotificationsScreen() {
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const authContext = useContext(AuthContext) as any;
  const userRole = String(authContext?.userRole || authContext?.user?.role || 'student').toLowerCase();
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [dateClock, setDateClock] = useState(Date.now);
  const request = useRef(0);
  const mutating = useRef(false);
  const focused = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (mutating.current) { setRefreshing(false); return; }
    const current = ++request.current;
    setError(null);
    try {
      const res = await api.get('/notifications/my');
      if (current === request.current) { setNotifications(res.data || []); setDateClock(Date.now()); }
    } catch {
      if (current === request.current) setError('Notifications could not be loaded. Check your connection and try again.');
    } finally {
      if (current === request.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void fetchNotifications();
    return () => { focused.current = false; request.current += 1; };
  }, [fetchNotifications]));

  useEffect(() => {
    const timer = setTimeout(() => setDateClock(Date.now()), millisecondsUntilNotificationDayChange());
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { setDateClock(Date.now()); if (focused.current) void fetchNotifications(); }
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [dateClock, fetchNotifications]);

  useEffect(() => {
    const available = new Set(notifications.map(item => item._id));
    setSelectedIds(current => current.every(id => available.has(id)) ? current : current.filter(id => available.has(id)));
    if (notifications.length === 0) setSelecting(false);
  }, [notifications]);

  const cancelSelection = useCallback(() => { setSelecting(false); setSelectedIds([]); }, []);
  useFocusEffect(useCallback(() => {
    if (!selecting) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!mutating.current) cancelSelection();
      return true;
    });
    return () => subscription.remove();
  }, [selecting, cancelSelection]));

  const toggleSelection = (id: string) => {
    if (mutating.current) return;
    setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  };

  const onRefresh = () => { setRefreshing(true); void fetchNotifications(); };
  const mutate = async (task: () => Promise<unknown>, update: (items: NotificationEntry[]) => NotificationEntry[]) => {
    if (mutating.current) return false;
    mutating.current = true; request.current += 1;
    setBusy(true); setActionError(null); setRefreshing(false); setLoading(false);
    try {
      await task(); setNotifications(update); return true;
    } catch (failure: any) {
      setActionError(failure.response?.data?.message || 'That change could not be saved. Please try again.'); return false;
    } finally { mutating.current = false; setBusy(false); }
  };

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


  const setRead = (item: NotificationEntry, isRead: boolean) => mutate(
    () => api.put(`/notifications/${item._id}/read`, { is_read: isRead }),
    items => items.map(value => value._id === item._id ? { ...value, is_read: isRead } : value),
  );
  const handleNotificationPress = async (item: NotificationEntry) => {
    if (mutating.current) return;
    if (!item.is_read) await setRead(item, true);
    navigateToMappedFunction(item);
  };
  const deleteSelectedNotifications = () => {
    if (mutating.current || selectedIds.length === 0) return;
    const ids = [...selectedIds];
    setConfirmation({
      title: `Delete ${ids.length === 1 ? 'notification' : `${ids.length} notifications`}?`,
      message: `Only ${ids.length === 1 ? 'this notification' : 'the selected notifications'} will be deleted from your inbox.`,
      onConfirm: () => {
        setConfirmation(null);
        void mutate(() => api.post('/notifications/delete-selected', { ids }), items => items.filter(item => !ids.includes(item._id)))
          .then(saved => { if (saved) cancelSelection(); });
      },
    });
  };
  const clearAllNotifications = () => setConfirmation({
    title: 'Delete all notifications?', message: `All ${notifications.length} notifications will be deleted from your inbox.`,
    onConfirm: () => { setConfirmation(null); void mutate(() => api.delete('/notifications/clear-all'), () => []); },
  });
  const unreadCount = notifications.filter(item => !item.is_read).length;
  const sections = useMemo(() => groupNotificationsByDate(notifications, dateClock), [notifications, dateClock]);
  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length;
  const selectAll = () => { if (!mutating.current) setSelectedIds(allSelected ? [] : notifications.map(item => item._id)); };
  const inboxOptions: MenuOption[] = selecting ? [
    { id: 'select-all', label: allSelected ? 'Deselect all' : 'Select all', disabled: busy, onPress: selectAll },
    { id: 'delete-selected', label: 'Delete selected', destructive: true, disabled: busy || selectedIds.length === 0, onPress: deleteSelectedNotifications },
    { id: 'cancel-selection', label: 'Cancel selection', disabled: busy, onPress: cancelSelection },
  ] : [
    { id: 'select', label: 'Select notifications', disabled: busy || notifications.length === 0, onPress: () => { setSelectedIds([]); setSelecting(true); } },
    { id: 'read-all', label: 'Mark all as read', disabled: busy || unreadCount === 0,
      onPress: () => { void mutate(() => api.put('/notifications/mark-all-read'), items => items.map(item => ({ ...item, is_read: true }))); } },
    { id: 'delete-all', label: 'Delete all notifications', destructive: true, disabled: busy || notifications.length === 0, onPress: clearAllNotifications },
  ];
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


  const renderItem = ({ item }: { item: NotificationEntry }) => {
    const selected = selectedIds.includes(item._id);
    return <View style={[styles.notificationRow, { borderBottomColor: theme.line, backgroundColor: selecting && selected ? isDark ? '#30251B' : '#FFF1E3' : !item.is_read ? isDark ? 'rgba(245,130,32,0.035)' : '#FFFCF8' : theme.surface }]}>
      <TouchableOpacity style={styles.notificationContent} onPress={() => { if (selecting) toggleSelection(item._id); else void handleNotificationPress(item); }}
        onLongPress={() => { if (!selecting && !mutating.current) { setSelecting(true); setSelectedIds([item._id]); } }} disabled={busy} activeOpacity={0.7}
        accessibilityRole={selecting ? 'checkbox' : 'button'} accessibilityState={selecting ? { checked: selected, disabled: busy } : { disabled: busy }}
        accessibilityLabel={selecting ? `Select ${notificationText(item.title)}` : `${item.is_read ? '' : 'Unread: '}${notificationText(item.title)}`}>
        {selecting ? <View style={styles.selectionIcon}>
          <View style={[styles.checkbox, { borderColor: selected ? COMMUNICATION_ACCENT : theme.muted, backgroundColor: selected ? COMMUNICATION_ACCENT : 'transparent' }]}>
            {selected && <Icon name="checkmark" size={16} color="#FFFFFF" />}
          </View>
        </View> : <View style={[styles.typeIcon, { borderColor: item.is_read ? theme.line : isDark ? '#57402A' : '#F0DDC8' }]}>
          <NotificationBellIcon size={21} color={item.is_read ? theme.muted : COMMUNICATION_ACCENT} />
        </View>}
        <View style={styles.info}>
          <View style={styles.metadata}>
            <Text style={[styles.metadataText, { color: theme.muted }]}>{getTypeLabel(item.type || '')}</Text>
            <View style={styles.timeRow}>
              <Text style={[styles.metadataText, { color: theme.muted }]}>{notificationClockTime(item.createdAt)}</Text>
              {!item.is_read && <View style={styles.unreadDot} />}
            </View>
          </View>
          <Text style={[styles.title, { color: theme.text }, !item.is_read && styles.unreadTitle]} numberOfLines={2}>{notificationText(item.title)}</Text>
          <Text style={[styles.message, { color: theme.muted }]} numberOfLines={3}>{notificationText(item.message)}</Text>
        </View>
      </TouchableOpacity>
    </View>;
  };
  return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
    <View style={[styles.pageHeader, { borderBottomColor: theme.line }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={selecting ? 'Cancel selection' : 'Go back'} disabled={selecting && busy} style={styles.backButton} onPress={() => {
          if (selecting) { cancelSelection(); return; }
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate(userRole === 'admin' ? 'AdminApp' : userRole === 'instructor' ? 'InstructorApp' : 'StudentApp', { screen: 'Home' });
        }}><Icon name="chevron-back" size={24} color={theme.text} /></TouchableOpacity>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.pageTitle, { color: theme.text }]}>Notifications</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.subtitle, { color: theme.muted }]}>{selecting ? `${selectedIds.length} selected` : loading ? 'Loading updates…' : unreadCount ? `${unreadCount} unread` : 'All caught up'}</Text>
        </View>
        {busy && <ActivityIndicator size="small" color={COMMUNICATION_ACCENT} />}
        <WhatsAppOptionsMenu accessibilityLabel="Notification inbox options" options={inboxOptions} triggerIconColor={theme.text} />
      </View>
      {selecting && <View style={[styles.selectionBar, { borderTopColor: theme.line }]}>
        <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={allSelected ? 'Deselect all notifications' : 'Select all notifications'} accessibilityState={{ checked: allSelected, disabled: busy }} disabled={busy} style={styles.selectAll} onPress={selectAll}>
          <View style={[styles.checkbox, { borderColor: allSelected ? COMMUNICATION_ACCENT : theme.muted, backgroundColor: allSelected ? COMMUNICATION_ACCENT : 'transparent' }]}>
            {allSelected && <Icon name="checkmark" size={16} color="#FFFFFF" />}
          </View>
          <Text style={[styles.selectionLabel, { color: theme.text }]}>{allSelected ? 'Deselect all' : 'Select all'}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete selected notifications" accessibilityState={{ disabled: busy || selectedIds.length === 0 }}
          disabled={busy || selectedIds.length === 0} style={[styles.deleteSelected, (busy || selectedIds.length === 0) && { opacity: 0.4 }]} onPress={deleteSelectedNotifications}>
          <Icon name="trash-outline" size={18} color={isDark ? '#F87171' : '#B91C1C'} />
          <Text style={[styles.selectionLabel, { color: isDark ? '#F87171' : '#B91C1C' }]}>Delete</Text>
        </TouchableOpacity>
      </View>}
      {!!actionError && <View style={[styles.errorBanner, { borderColor: theme.line }]}>
        <Text accessibilityRole="alert" style={[styles.errorText, { color: theme.text }]}>{actionError}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Dismiss notification error" style={styles.dismiss} onPress={() => setActionError(null)}><Icon name="close" size={18} color={theme.muted} /></TouchableOpacity>
      </View>}
      {!!error && notifications.length > 0 && <Text accessibilityRole="alert" style={[styles.errorText, { color: theme.muted, marginBottom: 10 }]}>{error}</Text>}
    </View>
    {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={COMMUNICATION_ACCENT} /></View>
      : <SectionList style={styles.list} sections={sections} renderItem={renderItem} keyExtractor={item => item._id}
        extraData={{ selecting, selectedIds, busy, isDark }}
        stickySectionHeadersEnabled={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} enabled={!busy} colors={[COMMUNICATION_ACCENT]} tintColor={COMMUNICATION_ACCENT} />}
        renderSectionHeader={({ section }) => <View style={styles.dateHeader}>
          <Text accessibilityRole="header" style={[styles.dateTitle, { color: theme.text }]}>{section.title}</Text>
          <Text style={[styles.dateCount, { color: theme.muted }]}>{section.data.length}</Text>
        </View>}
        ListEmptyComponent={<View style={styles.empty}>
          <View style={[styles.emptyIcon, { borderColor: theme.line }]}>{error ? <Icon name="cloud-offline-outline" size={28} color={theme.muted} /> : <NotificationBellIcon size={30} color={COMMUNICATION_ACCENT} />}</View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{error ? 'Unable to load notifications' : 'No notifications yet'}</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>{error || 'New updates will appear here.'}</Text>
          {!!error && <TouchableOpacity accessibilityRole="button" style={styles.primaryButton} onPress={() => { setLoading(true); void fetchNotifications(); }}><Text style={styles.primaryText}>Try again</Text></TouchableOpacity>}
        </View>} />}
    <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => setConfirmation(null)}>
      <View style={styles.modalBackdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel deletion" style={StyleSheet.absoluteFill} onPress={() => setConfirmation(null)} />
        <View accessibilityViewIsModal style={[styles.confirmCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.confirmTitle, { color: theme.text }]}>{confirmation?.title}</Text>
          <Text style={[styles.confirmMessage, { color: theme.muted }]}>{confirmation?.message}</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity accessibilityRole="button" onPress={() => setConfirmation(null)} style={[styles.confirmButton, { borderColor: theme.line }]}><Text style={[styles.confirmButtonText, { color: theme.text }]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Confirm delete notification" onPress={() => confirmation?.onConfirm()} style={[styles.confirmButton, { borderColor: '#DC2626', backgroundColor: '#DC2626' }]}><Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12 },
  backButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  heading: { flex: 1, minWidth: 0 }, pageTitle: { ...FONTS.bold, fontSize: 22, lineHeight: 29, letterSpacing: -0.5 },
  subtitle: { ...FONTS.regular, fontSize: 12, lineHeight: 18, marginTop: 2 },
  list: { flex: 1, width: '100%', maxWidth: 860, alignSelf: 'center' }, listContent: { paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 22, paddingBottom: 8 },
  dateTitle: { ...FONTS.semiBold, fontSize: 13, lineHeight: 20, flex: 1 }, dateCount: { ...FONTS.regular, fontSize: 11 },
  notificationRow: { flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 10 },
  notificationContent: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 12, paddingVertical: 15, paddingHorizontal: 10 },
  typeIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  selectionIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4, marginBottom: 4 },
  selectAll: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
  selectionLabel: { ...FONTS.medium, fontSize: 13 },
  deleteSelected: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 },
  info: { flex: 1, minWidth: 0 }, metadata: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  metadataText: { ...FONTS.regular, fontSize: 10.5, lineHeight: 16 }, timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  unreadDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COMMUNICATION_ACCENT },
  title: { ...FONTS.medium, fontSize: 14.5, lineHeight: 21 }, unreadTitle: { ...FONTS.semiBold },
  message: { ...FONTS.regular, fontSize: 12.5, lineHeight: 19, marginTop: 4 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...FONTS.semiBold, fontSize: 17, textAlign: 'center' }, emptyText: { ...FONTS.regular, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  primaryButton: { paddingHorizontal: 18, minHeight: 42, justifyContent: 'center', borderRadius: 10, backgroundColor: COMMUNICATION_ACCENT, marginTop: 4 }, primaryText: { ...FONTS.semiBold, color: '#FFFFFF', fontSize: 13 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingLeft: 12, marginBottom: 10 },
  errorText: { ...FONTS.regular, fontSize: 12, lineHeight: 18, flex: 1 }, dismiss: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 },
  confirmCard: { width: '100%', maxWidth: 380, padding: 22, borderWidth: 1, borderRadius: 16 },
  confirmTitle: { ...FONTS.semiBold, fontSize: 18, lineHeight: 25 }, confirmMessage: { ...FONTS.regular, fontSize: 13, lineHeight: 21, marginTop: 10 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 22 }, confirmButton: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { ...FONTS.semiBold, fontSize: 13 },
});
