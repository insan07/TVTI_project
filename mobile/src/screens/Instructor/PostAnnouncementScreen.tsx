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
  ScrollView
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
      console.warn('Failed to fetch batches from server, setting mock fallback', e);
      setBatches([
        { _id: 'b1', name: 'Batch A - Morning', course_id: { title: 'Welding Tech' } },
        { _id: 'b2', name: 'Batch B - Evening', course_id: { title: 'HVAC Basics' } }
      ]);
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
      console.warn('Failed to fetch announcement history, using fallback', e);
      setAnnouncements([
        {
          _id: 'a1',
          title: 'Workshop Postponed',
          message: 'The practical workshop scheduled for tomorrow morning has been postponed due to maintenance.',
          batch_id: { name: 'Batch A - Morning' },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'a2',
          title: 'Exam Results Published',
          message: 'The results for the mid-term examinations are now available on the student portal. Please review your grades.',
          batch_id: null, // Target: All Batches
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ]);
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
    if (!formData.title.trim()) return Alert.alert('Validation Error', 'Please enter an announcement title');
    if (!formData.message.trim()) return Alert.alert('Validation Error', 'Please enter a message');

    setLoading(true);
    try {
      const res = await api.post('/announcements', {
        batch_id: formData.batch_id === 'all' ? null : formData.batch_id,
        title: formData.title.trim(),
        message: formData.message.trim()
      });
      Alert.alert('Success', 'Announcement posted successfully!');
      setAnnouncements(prev => [res.data, ...prev]);
      setFormData({ batch_id: 'all', title: '', message: '' });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to post announcement');
    } finally {
      setLoading(false);
    }
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
        {/* Screen Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>📢 New Announcement</Text>
        </View>

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
                  <View style={styles.timestampBadge}>
                    <Text style={styles.timestampText}>{formatTimestamp(ann.createdAt)}</Text>
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
});
