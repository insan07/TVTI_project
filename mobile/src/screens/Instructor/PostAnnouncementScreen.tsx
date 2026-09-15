import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Platform,
  Modal
} from 'react-native';
import api from '../../services/api';
import CustomDropdown from '../../components/shared/CustomDropdown';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';
import { AuthContext } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PostAnnouncementScreen() {
  const authContext = useContext(AuthContext);
  const userRole = authContext?.userRole;

  const [batches, setBatches] = useState<any[]>([]);
  const [formData, setFormData] = useState({ batch_id: 'all', title: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(true);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    onConfirm: () => {},
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
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to post announcement', undefined, 'error');
    } finally {
      setLoading(false);
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
      message: 'Are you sure you want to delete this announcement? This cannot be undone.',
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">


        {/* New Announcement Form Card */}
        <View style={styles.formCard}>
          {batchesLoading ? (
            <ActivityIndicator size="small" color="#000" style={{ marginVertical: 8 }} />
          ) : (
            <CustomDropdown
              placeholder="Choose a target batch..."
              iconName="megaphone-outline"
              items={[
                { label: 'All Batches (Global Announcement)', value: 'all', subtext: 'Visible to all enrolled students' },
                ...batches.map(b => ({
                  label: b.name || b.course_id?.title || 'Batch',
                  value: b._id,
                  subtext: b.course_id?.title ? `Course: ${b.course_id.title}` : undefined
                }))
              ]}
              selectedValue={formData.batch_id}
              onValueChange={val => setFormData({ ...formData, batch_id: val })}
              containerStyle={{ marginBottom: 16 }}
            />
          )}

          <Text style={styles.fieldLabel}>ANNOUNCEMENT TITLE</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Class Rescheduled"
            placeholderTextColor="#9CA3AF"
            value={formData.title}
            onChangeText={t => setFormData({ ...formData, title: t })}
          />

          <Text style={styles.fieldLabel}>MESSAGE</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Write the details of the announcement here..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={formData.message}
            onChangeText={t => setFormData({ ...formData, message: t })}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="send-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.postBtnText}>POST ANNOUNCEMENT</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Announcement History Section */}
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>Announcement History</Text>

          {loadingHistory ? (
            <ActivityIndicator size="small" color="#000" style={{ marginTop: 20 }} />
          ) : announcements.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No announcement history found.</Text>
          ) : (
            announcements.map(ann => (
              <View key={ann._id} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <Text style={styles.historyTitle}>{ann.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.timestampBadge}>
                      <Text style={styles.timestampText}>{formatTimestamp(ann.createdAt)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(ann._id)} style={{ marginLeft: 12, padding: 4 }}>
                      <Icon name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.historyBody}>{ann.message}</Text>

                <View style={styles.targetRow}>
                  {ann.batch_id ? (
                    <>
                      <Icon name="people-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                      <Text style={styles.targetText}>
                        Target: {ann.batch_id.name || ann.batch_id.course_id?.title || 'Batch'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Icon name="globe-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                      <Text style={styles.targetText}>Target: All Batches</Text>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

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
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  headerRow: {
    marginBottom: 14,
    marginTop: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  textArea: {
    height: 110,
  },
  postBtn: {
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  postBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  historySection: {
    marginTop: 4,
  },
  historySectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 14,
  },
  emptyHistoryText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  timestampBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timestampText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  historyBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 10,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
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
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.25)',
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
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8
  },
  popupMessage: {
    fontSize: 14,
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
    fontWeight: 'bold',
    fontSize: 14
  },
  popupConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  popupConfirmText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  popupSingleBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  popupSingleBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15
  }
});
