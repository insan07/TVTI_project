import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
  Modal,
  Animated
} from 'react-native';
import api from '../../services/api';
import CustomDropdown from '../../components/shared/CustomDropdown';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../config/theme';
import { AuthContext } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../../components/shared/ScreenHeader';
import WhatsAppOptionsMenu from '../../components/shared/WhatsAppOptionsMenu';

export default function PostAnnouncementScreen() {
  const navigation = useNavigation<any>();
  const authContext = useContext(AuthContext);
  const userRole = authContext?.userRole;

  const [batches, setBatches] = useState<any[]>([]);
  const [formData, setFormData] = useState({ batch_id: 'all', title: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(true);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Compose & Edit Modal & 3-Dots Menu State
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Liquid FAB Animation State
  const wave1Anim = React.useRef(new Animated.Value(0)).current;
  const wave2Anim = React.useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    wave1Anim.setValue(0);
    wave2Anim.setValue(0);

    const animation = Animated.loop(
      Animated.parallel([
        Animated.timing(wave1Anim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(wave2Anim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const handleFabPressIn = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 5,
      tension: 100,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 80,
    }).start();
  };

  const wave1Scale = wave1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.55],
  });

  const wave1Opacity = wave1Anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.45, 0.25, 0],
  });

  const wave2Scale = wave2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const wave2Opacity = wave2Anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.35, 0.18, 0],
  });
  const [editFormData, setEditFormData] = useState({ batch_id: 'all', title: '', message: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Custom Confirmation & Alert Dialog Popup State
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    onOk?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (title: string, msg: string, onOk?: () => void, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertModal({
      visible: true,
      title,
      message: msg,
      type,
      onOk
    });
  };

  useEffect(() => {
    fetchBatches();
    fetchHistory();
  }, []);

  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      let res;
      if (userRole === 'admin') {
        res = await api.get('/admin/batches');
      } else {
        res = await api.get('/instructors/my-schedule');
      }
      setBatches(res.data || []);
    } catch (e) {
      console.warn('Failed to fetch batches from server', e);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/announcements/my');
      setAnnouncements(res.data || []);
    } catch (e) {
      console.warn('Failed to fetch announcement history', e);
      setAnnouncements([]);
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handlePost = async () => {
    if (!formData.title.trim()) return showAlert('Validation Error', 'Please enter an announcement title', undefined, 'error');
    if (!formData.message.trim()) return showAlert('Validation Error', 'Please enter a message', undefined, 'error');

    setLoading(true);
    try {
      const res = await api.post('/announcements', {
        batch_id: formData.batch_id === 'all' ? null : formData.batch_id,
        title: formData.title.trim(),
        message: formData.message.trim()
      });
      showAlert('Success', 'Announcement posted successfully!', undefined, 'success');
      setAnnouncements(prev => [res.data, ...prev]);
      setFormData({ batch_id: 'all', title: '', message: '' });
      setComposeModalVisible(false);
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to post announcement', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (ann: any) => {
    setEditItem(ann);
    const targetBatch = ann.batch_id?._id || ann.batch_id || 'all';
    setEditFormData({
      batch_id: targetBatch,
      title: ann.title || '',
      message: ann.message || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.title.trim()) return showAlert('Validation Error', 'Please enter an announcement title', undefined, 'error');
    if (!editFormData.message.trim()) return showAlert('Validation Error', 'Please enter a message', undefined, 'error');
    if (!editItem) return;

    setEditLoading(true);
    try {
      const res = await api.put(`/announcements/${editItem._id}`, {
        batch_id: editFormData.batch_id === 'all' ? null : editFormData.batch_id,
        title: editFormData.title.trim(),
        message: editFormData.message.trim()
      });
      showAlert('Success', 'Announcement updated successfully!', undefined, 'success');
      setAnnouncements(prev => prev.map(a => a._id === editItem._id ? res.data : a));
      setEditModalVisible(false);
      setEditItem(null);
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to update announcement', undefined, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const executeDelete = async (id: string) => {
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      showAlert('Success', 'Announcement successfully deleted.', undefined, 'success');
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to delete announcement', undefined, 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      visible: true,
      title: 'Delete Announcement',
      message: 'Are you sure you want to delete this announcement? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => void executeDelete(id)
    });
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0 && d.toDateString() === now.toDateString()) {
        return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (diffDays === 1) {
        return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (diffDays < 7) {
        return `${diffDays}d ago`;
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Today';
    }
  };

  const batchOptions = [
    { label: 'All Batches (Global Announcement)', value: 'all', subtext: 'Visible to all enrolled students' },
    ...batches.map(b => ({
      label: b.name || b.course_id?.title || 'Batch',
      value: b._id,
      subtext: b.course_id?.title ? `Course: ${b.course_id.title}` : undefined
    }))
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Stable Fixed Header Card */}
      <ScreenHeader
        title="Announcements"
        subtitle="Broadcast notices & updates to batches"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F58220']} />}
      >

        {/* Announcements List */}
        <View style={styles.listSection}>
          {loadingHistory ? (
            <ActivityIndicator size="small" color="#F58220" style={{ marginTop: 30 }} />
          ) : announcements.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="megaphone-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No Announcements Yet</Text>
              <Text style={styles.emptySub}>
                Publish updates, timetable changes, or alerts to your student batches.
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => setComposeModalVisible(true)}
                activeOpacity={0.8}
              >
                <Icon name="add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyCreateBtnText}>Create Announcement</Text>
              </TouchableOpacity>
            </View>
          ) : (
            announcements.map(ann => {
              const isMenuOpen = activeMenuId === ann._id;
              return (
                <View key={ann._id} style={[styles.announcementCard, isMenuOpen && { zIndex: 9999 }]}>
                  {/* Card Top Row: Title + Timestamp + 3-Dots Menu */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.cardTitle}>{ann.title}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={styles.timestampBadge}>
                        <Text style={styles.timestampText}>{formatTimestamp(ann.createdAt)}</Text>
                      </View>
                      <WhatsAppOptionsMenu
                        options={[
                          {
                            id: 'edit_announcement',
                            label: 'Edit',
                            onPress: () => handleOpenEdit(ann),
                          },
                          {
                            id: 'delete_announcement',
                            label: 'Delete',
                            destructive: true,
                            onPress: () => handleDelete(ann._id),
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Target & Author Badges */}
                  <View style={styles.metaRow}>
                    <View style={styles.targetBadge}>
                      <Icon
                        name={ann.batch_id ? "people-outline" : "globe-outline"}
                        size={13}
                        color="#F58220"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.targetBadgeText}>
                        {ann.batch_id ? (ann.batch_id.name || ann.batch_id.course_id?.title || 'Target Batch') : 'All Batches'}
                      </Text>
                    </View>
                    {ann.posted_by && (
                      <View style={styles.authorBadge}>
                        <Icon name="person-circle-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                        <Text style={styles.authorBadgeText}>
                          {ann.posted_by.name || 'Staff'} {ann.posted_by.role ? `(${ann.posted_by.role})` : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Message Body */}
                  <Text style={styles.cardBody}>{ann.message}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Floating Create Announcement Liquid FAB Button */}
      <View style={styles.liquidFabContainer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.liquidWaveRing,
            { transform: [{ scale: wave1Scale }], opacity: wave1Opacity }
          ]}
        />
        <Animated.View
          style={[
            styles.liquidWaveRingSecond,
            { transform: [{ scale: wave2Scale }], opacity: wave2Opacity }
          ]}
        />
        <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
          <TouchableOpacity
            style={styles.liquidFabButton}
            onPress={() => setComposeModalVisible(true)}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            activeOpacity={0.9}
          >
            <View style={styles.liquidGlassSheen} />
            <View style={styles.liquidInnerCore}>
              <Icon name="add" size={32} color="#FFFFFF" style={styles.liquidPlusIcon} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* CREATE / POST ANNOUNCEMENT MODAL */}
      <Modal
        visible={composeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setComposeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Post Announcement</Text>
                <Text style={styles.modalSubtitle}>Broadcast a notice to student batches</Text>
              </View>
              <TouchableOpacity
                onPress={() => setComposeModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {batchesLoading ? (
                <ActivityIndicator size="small" color="#F58220" style={{ marginVertical: 12 }} />
              ) : (
                <>
                  <Text style={styles.fieldLabel}>TARGET AUDIENCE</Text>
                  <CustomDropdown
                    placeholder="Choose target batch..."
                    iconName="megaphone-outline"
                    items={batchOptions}
                    selectedValue={formData.batch_id}
                    onValueChange={val => setFormData({ ...formData, batch_id: val })}
                    containerStyle={{ marginBottom: 14 }}
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>ANNOUNCEMENT TITLE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Schedule Revision for Web Development"
                placeholderTextColor="#9CA3AF"
                value={formData.title}
                onChangeText={t => setFormData({ ...formData, title: t })}
              />

              <Text style={styles.fieldLabel}>MESSAGE</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write the full details of your announcement here..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={formData.message}
                onChangeText={t => setFormData({ ...formData, message: t })}
                textAlignVertical="top"
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setComposeModalVisible(false)}
                  disabled={loading}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handlePost}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Icon name="send-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.modalSubmitText}>Publish Notice</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT ANNOUNCEMENT MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Announcement</Text>
                <Text style={styles.modalSubtitle}>Update content or audience for this notice</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>TARGET AUDIENCE</Text>
              <CustomDropdown
                placeholder="Choose target batch..."
                iconName="megaphone-outline"
                items={batchOptions}
                selectedValue={editFormData.batch_id}
                onValueChange={val => setEditFormData({ ...editFormData, batch_id: val })}
                containerStyle={{ marginBottom: 14 }}
              />

              <Text style={styles.fieldLabel}>ANNOUNCEMENT TITLE</Text>
              <TextInput
                style={styles.input}
                placeholder="Announcement Title"
                placeholderTextColor="#9CA3AF"
                value={editFormData.title}
                onChangeText={t => setEditFormData({ ...editFormData, title: t })}
              />

              <Text style={styles.fieldLabel}>MESSAGE</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write the full details..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={editFormData.message}
                onChangeText={t => setEditFormData({ ...editFormData, message: t })}
                textAlignVertical="top"
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setEditModalVisible(false)}
                  disabled={editLoading}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleSaveEdit}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Icon name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.modalSubmitText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CUSTOM IN-APP CONFIRMATION POPUP MODAL */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={[styles.popupIconCircle, { backgroundColor: confirmModal.type === 'danger' ? '#FEE2E2' : '#FEF3C7' }]}>
              <Icon
                name={confirmModal.type === 'danger' ? 'trash-outline' : 'alert-circle-outline'}
                size={28}
                color={confirmModal.type === 'danger' ? '#DC2626' : '#D97706'}
              />
            </View>
            <Text style={styles.popupTitle}>{confirmModal.title}</Text>
            <Text style={styles.popupMessage}>{confirmModal.message}</Text>
            <View style={styles.popupBtnRow}>
              <TouchableOpacity
                style={styles.popupCancelBtn}
                onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.popupCancelText}>{confirmModal.cancelText || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.popupConfirmBtn, { backgroundColor: confirmModal.type === 'danger' ? '#DC2626' : '#F58220' }]}
                onPress={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(prev => ({ ...prev, visible: false }));
                  if (action) action();
                }}
              >
                <Text style={styles.popupConfirmText}>{confirmModal.confirmText || 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM IN-APP ALERT POPUP MODAL */}
      <Modal
        visible={alertModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={[
              styles.popupIconCircle,
              { backgroundColor: alertModal.type === 'success' ? '#DCFCE7' : alertModal.type === 'error' ? '#FEE2E2' : '#EFF6FF' }
            ]}>
              <Icon
                name={
                  alertModal.type === 'success'
                    ? 'checkmark-circle-outline'
                    : alertModal.type === 'error'
                      ? 'close-circle-outline'
                      : 'information-circle-outline'
                }
                size={28}
                color={
                  alertModal.type === 'success'
                    ? '#16A34A'
                    : alertModal.type === 'error'
                      ? '#DC2626'
                      : '#2563EB'
                }
              />
            </View>
            <Text style={styles.popupTitle}>{alertModal.title}</Text>
            <Text style={styles.popupMessage}>{alertModal.message}</Text>
            <TouchableOpacity
              style={[
                styles.popupSingleBtn,
                { backgroundColor: alertModal.type === 'error' ? '#DC2626' : alertModal.type === 'success' ? '#16A34A' : '#F58220' }
              ]}
              onPress={() => {
                const action = alertModal.onOk;
                setAlertModal(prev => ({ ...prev, visible: false }));
                if (action) action();
              }}
            >
              <Text style={styles.popupSingleBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },

  /* Top Header Bar */
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 4,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...Platform.select({
      web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  headerTitle: {
    fontSize: 22,
    ...FONTS.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    ...FONTS.regular,
    color: '#64748B',
    marginTop: 2,
  },
  roundAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F58220',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(245, 130, 32, 0.35)' },
      default: {
        shadowColor: '#F58220',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },

  /* List Section */
  listSection: {
    marginTop: 2,
  },
  announcementCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.05), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    position: 'relative',
  },
  threeDotsBtn: {
    padding: 3,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenuContainer: {
    position: 'absolute',
    top: 28,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    width: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 9999,
    ...Platform.select({
      web: { boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.15)' },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionsMenuText: {
    fontSize: 13,
    color: '#334155',
    ...FONTS.semiBold,
  },
  cardTitle: {
    fontSize: 15.5,
    ...FONTS.bold,
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  timestampBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  timestampText: {
    fontSize: 11,
    color: '#64748B',
    ...FONTS.medium,
  },

  /* Meta Row */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 130, 32, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  targetBadgeText: {
    fontSize: 11.5,
    ...FONTS.medium,
    color: '#EA580C',
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  authorBadgeText: {
    fontSize: 11.5,
    ...FONTS.medium,
    color: '#64748B',
  },

  /* Card Body */
  cardBody: {
    fontSize: 13.5,
    ...FONTS.regular,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 14,
  },

  /* Card Action Row */
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 130, 32, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  cardEditText: {
    fontSize: 12,
    ...FONTS.semiBold,
    color: '#EA580C',
  },
  cardDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  cardDeleteText: {
    fontSize: 12,
    ...FONTS.semiBold,
    color: '#EF4444',
  },

  /* Empty State */
  emptyStateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    ...FONTS.bold,
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    ...FONTS.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F58220',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    ...FONTS.semiBold,
  },

  /* Modals (Compose & Edit) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    ...Platform.select({
      web: { boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.2)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    ...FONTS.bold,
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12.5,
    ...FONTS.regular,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 6,
  },
  fieldLabel: {
    fontSize: 11.5,
    ...FONTS.bold,
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    ...FONTS.regular,
    color: '#0F172A',
  },
  textArea: {
    height: 110,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#475569',
    fontSize: 13,
    ...FONTS.semiBold,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F58220',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    ...Platform.select({
      web: { boxShadow: '0px 2px 6px rgba(245, 130, 32, 0.3)' },
      default: {
        shadowColor: '#F58220',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    ...FONTS.bold,
  },

  // Custom Popup Dialog Modal Styles
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  popupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    elevation: 10
  },
  popupIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  popupTitle: {
    fontSize: 18,
    ...FONTS.bold,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8
  },
  popupMessage: {
    fontSize: 13.5,
    ...FONTS.regular,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
  },
  popupBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  popupCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  popupCancelText: {
    color: '#475569',
    ...FONTS.semiBold,
    fontSize: 13.5
  },
  popupConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  popupConfirmText: {
    color: '#FFFFFF',
    ...FONTS.bold,
    fontSize: 13.5
  },
  popupSingleBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  popupSingleBtnText: {
    color: '#FFFFFF',
    ...FONTS.bold,
    fontSize: 14.5
  },

  /* Liquid Glass FAB + Button Styles */
  liquidFabContainer: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 998,
  },
  liquidWaveRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 107, 0, 0.4)',
  },
  liquidWaveRingSecond: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 140, 0, 0.3)',
  },
  liquidFabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 8px 26px rgba(255, 107, 0, 0.55), inset 0px 2px 4px rgba(255, 255, 255, 0.4)' },
      default: {
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 10,
      },
    }),
  },
  liquidGlassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  liquidInnerCore: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  liquidPlusIcon: {
    ...Platform.select({
      web: { filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2))' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    }),
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F58220',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    marginBottom: 16,
  },
  uploadBoxText: {
    marginLeft: 12,
    fontSize: 13,
    ...FONTS.medium,
    color: '#6B7280',
    flex: 1,
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  attachmentBtnText: {
    marginLeft: 6,
    color: '#F58220',
    ...FONTS.semiBold,
    fontSize: 12.5,
  },
});
