import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView
} from 'react-native';
import api from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';

export default function PostAnnouncementScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [formData, setFormData] = useState({ batch_id: '', title: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'post' | 'history'>('post');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await api.get('/instructors/my-schedule');
      setBatches(res.data);
      if (res.data.length > 0) {
        setFormData(prev => ({ ...prev, batch_id: res.data[0]._id }));
      }
    } catch (e) {
      console.warn('Failed to fetch batches', e);
      Alert.alert('Error', 'Could not load your batches.');
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/announcements/my');
      setAnnouncements(res.data);
    } catch (e) {
      console.warn('Failed to fetch announcements', e);
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
    if (!formData.batch_id) return Alert.alert('Error', 'Please select a batch');
    if (!formData.title.trim()) return Alert.alert('Error', 'Please enter a title');
    if (!formData.message.trim()) return Alert.alert('Error', 'Please enter a message');

    setLoading(true);
    try {
      await api.post('/announcements', {
        batch_id: formData.batch_id,
        title: formData.title.trim(),
        message: formData.message.trim(),
      });
      Alert.alert('Success', 'Announcement posted successfully!', [
        {
          text: 'View History',
          onPress: () => {
            setFormData(prev => ({ ...prev, title: '', message: '' }));
            setActiveTab('history');
          }
        },
        {
          text: 'Post Another',
          style: 'cancel',
          onPress: () => setFormData(prev => ({ ...prev, title: '', message: '' }))
        }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'post' && styles.activeTab]}
          onPress={() => setActiveTab('post')}
        >
          <Icon name="add-circle-outline" size={16} color={activeTab === 'post' ? COLORS.primary : '#6B7280'} style={{ marginRight: 5 }} />
          <Text style={[styles.tabText, activeTab === 'post' && styles.activeTabText]}>Post New</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Icon name="time-outline" size={16} color={activeTab === 'history' ? COLORS.primary : '#6B7280'} style={{ marginRight: 5 }} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'post' ? (
        <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Announcement</Text>

            <Text style={styles.label}>Select Batch *</Text>
            {batchesLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 10 }} />
            ) : batches.length === 0 ? (
              <View style={styles.noBatchBox}>
                <Icon name="warning-outline" size={20} color="#F59E0B" />
                <Text style={styles.noBatchText}>No batches assigned to you.</Text>
              </View>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.batch_id}
                  onValueChange={(val) => setFormData({ ...formData, batch_id: val })}
                  style={{ width: '100%', height: 50, backgroundColor: 'transparent', borderWidth: 0 }}
                >
                  {batches.map(b => (
                    <Picker.Item
                      key={b._id}
                      label={b.name || b.course_id?.title || `Batch ${b._id.toString().slice(-4)}`}
                      value={b._id}
                    />
                  ))}
                </Picker>
              </View>
            )}

            <Text style={styles.label}>Announcement Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Class Rescheduled to Friday"
              value={formData.title}
              onChangeText={t => setFormData({ ...formData, title: t })}
              maxLength={100}
            />
            <Text style={styles.charCount}>{formData.title.length}/100</Text>

            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Type your full announcement here..."
              multiline
              numberOfLines={5}
              value={formData.message}
              onChangeText={t => setFormData({ ...formData, message: t })}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.btn, (loading || batches.length === 0) && styles.btnDisabled]}
              onPress={handlePost}
              disabled={loading || batches.length === 0}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="megaphone-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Post Announcement</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        loadingHistory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading announcements...</Text>
          </View>
        ) : (
          <FlatList
            data={announcements}
            keyExtractor={item => item._id}
            contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="megaphone-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No announcements yet</Text>
                <Text style={styles.emptySubtitle}>Post your first announcement to your students</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('post')}>
                  <Text style={styles.emptyBtnText}>Post Now</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyIconBg}>
                    <Icon name="megaphone" size={16} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.historyTitle}>{item.title}</Text>
                    <Text style={styles.historyMeta}>
                      {item.batch_id?.name || 'Unknown Batch'} · {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyMessage}>{item.message}</Text>
              </View>
            )}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  tabHeader: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontWeight: 'bold', color: '#6B7280', fontSize: 14 },
  activeTabText: { color: COLORS.primary },
  formScroll: { flex: 1 },
  card: { backgroundColor: '#fff', margin: 15, borderRadius: 12, padding: 20, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  pickerContainer: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 4, backgroundColor: '#F9FAFB' },
  noBatchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, marginBottom: 4 },
  noBatchText: { color: '#92400E', fontSize: 13, marginLeft: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 15, color: '#1F2937' },
  textArea: { height: 120 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  btn: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#9CA3AF' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 15 },
  emptySubtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn: { marginTop: 16, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold' },
  historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#F3F4F6' },
  historyHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  historyIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
  historyTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
  historyMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  historyMessage: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
});
