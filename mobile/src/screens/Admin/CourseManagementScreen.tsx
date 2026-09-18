import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  ScrollView,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';

import ScreenHeader from '../../components/shared/ScreenHeader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Tab = 'all' | 'active' | 'archived';

export default function CourseManagementScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const headerAnim = useRef(new Animated.Value(1)).current;
  const isHeaderVisibleRef = useRef(true);
  const lastScrollY = useRef(0);
  const navigation = useNavigation<any>();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isSearchFocused) return;
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (currentY <= 15) {
      if (!isHeaderVisibleRef.current) {
        isHeaderVisibleRef.current = true;
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }).start();
      }
    } else if (diff > 8 && currentY > 35) {
      if (isHeaderVisibleRef.current) {
        isHeaderVisibleRef.current = false;
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: false,
        }).start();
      }
    } else if (diff < -8) {
      if (!isHeaderVisibleRef.current) {
        isHeaderVisibleRef.current = true;
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }).start();
      }
    }
    lastScrollY.current = currentY;
  };

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fee: '',
    duration_weeks: '',
    prerequisites: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);

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
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(wave2Anim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
        ]),
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

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/courses');
      setCourses(res.data);
    } catch (e: any) {
      console.warn('Failed to fetch courses from server', e);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCourseId(null);
    setFormData({
      title: '',
      description: '',
      fee: '',
      duration_weeks: '',
      prerequisites: '',
      is_active: true
    });
    setModalVisible(true);
  };

  const openEditModal = (course: any) => {
    setEditingCourseId(course._id);
    setFormData({
      title: course.title || '',
      description: course.description || '',
      fee: course.fee ? course.fee.toString() : '0',
      duration_weeks: course.duration_weeks ? course.duration_weeks.toString() : '4',
      prerequisites: course.prerequisites || '',
      is_active: course.is_active ?? true
    });
    setModalVisible(true);
  };

  const saveCourse = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Course title is required');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return;
    }
    const feeVal = Number(formData.fee);
    if (isNaN(feeVal) || feeVal <= 0) {
      Alert.alert('Validation Error', 'Fee must be a valid positive number');
      return;
    }
    const durationVal = Number(formData.duration_weeks);
    if (isNaN(durationVal) || durationVal <= 0) {
      Alert.alert('Validation Error', 'Duration must be a valid positive number of weeks');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        fee: feeVal,
        duration_weeks: durationVal
      };

      if (editingCourseId) {
        await api.put(`/admin/courses/${editingCourseId}`, payload);
        Alert.alert('Success', 'Course updated successfully');
      } else {
        await api.post('/admin/courses', payload);
        Alert.alert('Success', 'Course created successfully');
      }
      setModalVisible(false);
      fetchCourses();
    } catch (e: any) {
      console.warn('API Error saving course:', e);
      const serverMsg = e.response?.data?.message;
      Alert.alert('Error', serverMsg || 'Failed to save course. Please check inputs.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && c.is_active) ||
      (activeTab === 'archived' && !c.is_active);
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const renderCourseCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.archivedBadge]}>
          <Text style={[styles.statusBadgeText, item.is_active ? styles.activeBadgeText : styles.archivedBadgeText]}>
            {item.is_active ? 'ACTIVE' : 'ARCHIVED'}
          </Text>
        </View>
      </View>

      <Text style={styles.descriptionText}>{item.description}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="people-outline" size={15} color="#6B7280" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>Enrollments: {item.enrollment_count || 0}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="time-outline" size={15} color="#6B7280" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>{item.duration_weeks || 0} Weeks</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editOutlineBtn} onPress={() => openEditModal(item)}>
          <Icon name="pencil" size={16} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewBatchesBtn}
          onPress={() => navigation.navigate('Batches', { courseId: item._id })}
        >
          <Text style={styles.viewBatchesText}>Manage Batches</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Course Management"
        subtitle="Create & manage vocational training courses"
      />

      {/* Search Input & Filter Toggle Button with Smooth Animation */}
      <Animated.View
        style={{
          maxHeight: headerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, showFilter ? 120 : 64],
          }),
          opacity: headerAnim,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 0],
              }),
            },
          ],
          overflow: 'hidden',
        }}
      >
        <View style={styles.searchFilterRow}>
          <View style={styles.searchBox}>
            <Icon name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search courses..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, showFilter && styles.filterBtnActive]}
            onPress={() => setShowFilter(!showFilter)}
            activeOpacity={0.8}
          >
            <Icon name="options-outline" size={18} color={showFilter ? '#FFFFFF' : '#374151'} style={{ marginRight: 6 }} />
            <Text style={[styles.filterBtnText, showFilter && { color: '#FFFFFF' }]}>Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Options Panel for All / Active / Archived */}
        {showFilter && (
          <View style={styles.filterOptionsPanel}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity
                style={[styles.filterChip, activeTab === 'all' && styles.filterChipActive]}
                onPress={() => setActiveTab('all')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeTab === 'all' && styles.filterChipTextActive]}>
                  All ({courses.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, activeTab === 'active' && styles.filterChipActive]}
                onPress={() => setActiveTab('active')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeTab === 'active' && styles.filterChipTextActive]}>
                  Active ({courses.filter(c => c.is_active).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, activeTab === 'archived' && styles.filterChipActive]}
                onPress={() => setActiveTab('archived')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeTab === 'archived' && styles.filterChipTextActive]}>
                  Archived ({courses.filter(c => !c.is_active).length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Course List */}
      {loading ? (
        <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={item => item._id}
          renderItem={renderCourseCard}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No courses found.</Text>}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      )}

      {/* Floating Create Course Liquid FAB Button */}
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
            onPress={openAddModal}
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

      {/* Add / Edit Course Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingCourseId ? 'Edit Course' : 'Create Course'}</Text>

              <Text style={styles.label}>Course Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Automotive Diagnostics Level 1"
                value={formData.title}
                onChangeText={t => setFormData({ ...formData, title: t })}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 75 }]}
                placeholder="Overview of syllabus and course goals..."
                multiline
                numberOfLines={3}
                value={formData.description}
                onChangeText={t => setFormData({ ...formData, description: t })}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Fee (LKR)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="25000"
                    keyboardType="numeric"
                    value={formData.fee}
                    onChangeText={t => setFormData({ ...formData, fee: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Duration (Weeks)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="8"
                    keyboardType="numeric"
                    value={formData.duration_weeks}
                    onChangeText={t => setFormData({ ...formData, duration_weeks: t })}
                  />
                </View>
              </View>

              <Text style={styles.label}>Prerequisites</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Basic Electronics"
                value={formData.prerequisites}
                onChangeText={t => setFormData({ ...formData, prerequisites: t })}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active Status</Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={v => setFormData({ ...formData, is_active: v })}
                  trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitModalBtn} onPress={saveCourse} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitModalText}>Save Course</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  topHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  actionButtonRow: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  addCourseBtn: {
    backgroundColor: '#F58220',
    borderRadius: 26,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.12)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 }
    }),
  },
  addCourseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 26,
    paddingHorizontal: 14,
    height: 40,
    marginRight: 8,
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#1F2937',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 40,
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }
    }),
  },
  filterBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#374151',
  },
  filterOptionsPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 4,
  },
  filterPanelTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  segmentedTabText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.05)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  archivedBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeBadgeText: {
    color: '#15803D',
  },
  archivedBadgeText: {
    color: '#4B5563',
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editOutlineBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBatchesBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 22,
    paddingVertical: 10,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(15, 23, 42, 0.2)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 }
    }),
  },
  viewBatchesText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#F58220',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.16)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 6, elevation: 6 }
    }),
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 15,
  },

  /* LIQUID FAB STYLES */
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingBottom: 20,
  },
  cancelModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginRight: 8,
    borderRadius: 24,
  },
  cancelModalText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitModalBtn: {
    backgroundColor: '#F58220',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 22,
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.12)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 5, elevation: 4 }
    }),
  },
  submitModalText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
