import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  Platform
} from 'react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';

type StatusTab = 'all' | 'pending' | 'contacted' | 'paid' | 'approved' | 'rejected';

export default function ApplicationsManagementScreen() {
  const [activeTab, setActiveTab] = useState<StatusTab>('pending');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Approval Credentials Modal
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
  const [approvedCredentials, setApprovedCredentials] = useState<any>(null);

  // Assign Courses Modal State
  const [assignCoursesModalVisible, setAssignCoursesModalVisible] = useState(false);
  const [selectedAppForAssignment, setSelectedAppForAssignment] = useState<any>(null);
  const [allAvailableCourses, setAllAvailableCourses] = useState<any[]>([]);
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>([]);
  const [assigningCourses, setAssigningCourses] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [activeTab]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'all' ? '/admin/applications' : `/admin/applications?status=${activeTab}`;
      const res = await api.get(url);
      setApplications(res.data || []);
    } catch (e) {
      console.warn('Failed to load applications', e);
      Alert.alert('Error', 'Failed to load student applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const handleOpenAssignCoursesModal = async (app: any) => {
    setSelectedAppForAssignment(app);
    let initialIds: string[] = [];
    if (app.course_ids && app.course_ids.length > 0) {
      initialIds = app.course_ids.map((c: any) => c._id || c);
    } else if (app.course_id) {
      initialIds = [app.course_id._id || app.course_id];
    }
    setAssignedCourseIds(initialIds);

    try {
      const res = await api.get('/courses/active');
      setAllAvailableCourses(res.data || []);
    } catch (e) {
      console.warn('Failed to fetch courses', e);
    }
    setAssignCoursesModalVisible(true);
  };

  const toggleAssignedCourse = (courseId: string) => {
    setAssignedCourseIds(prev => {
      if (prev.includes(courseId)) {
        if (prev.length === 1) return prev; // Keep at least 1 course
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleSaveCourseAssignments = async (newStatus?: string) => {
    if (!selectedAppForAssignment) return;
    if (assignedCourseIds.length === 0) {
      if (Platform.OS === 'web') window.alert('Please select at least one course to assign.');
      else Alert.alert('Error', 'Please select at least one course to assign.');
      return;
    }

    setAssigningCourses(true);
    try {
      const targetStatus = newStatus || selectedAppForAssignment.status;
      const res = await api.put(`/admin/applications/${selectedAppForAssignment._id}/status`, {
        status: targetStatus,
        assigned_course_ids: assignedCourseIds
      });

      setAssignCoursesModalVisible(false);
      if (targetStatus === 'approved' && res.data.credentials) {
        setApprovedCredentials(res.data.credentials);
        setCredentialsModalVisible(true);
        setActiveTab('approved');
      } else {
        if (Platform.OS === 'web') window.alert(`Courses assigned successfully! Status: ${targetStatus.toUpperCase()}`);
        else Alert.alert('Success', `Courses assigned successfully! Status: ${targetStatus.toUpperCase()}`);
      }
      fetchApplications();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to save course assignments';
      if (Platform.OS === 'web') window.alert(`Error: ${msg}`);
      else Alert.alert('Error', msg);
    } finally {
      setAssigningCourses(false);
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: string, appName: string) => {
    if (newStatus === 'approved') {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(
          `Approve application for "${appName}"?\n\nThis will auto-generate a unique Student Registration No and 7-day temporary password.`
        );
        if (confirmed) {
          processStatusUpdate(appId, newStatus);
        }
      } else {
        Alert.alert(
          'Approve Application?',
          `Approve application for "${appName}"? This will auto-generate a unique Student Registration No and 7-day temporary password.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm Approval', onPress: () => processStatusUpdate(appId, newStatus) }
          ]
        );
      }
    } else {
      processStatusUpdate(appId, newStatus);
    }
  };

  const processStatusUpdate = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      const res = await api.put(`/admin/applications/${appId}/status`, { status: newStatus });

      if (newStatus === 'approved' && res.data.credentials) {
        setApprovedCredentials(res.data.credentials);
        setCredentialsModalVisible(true);
        setActiveTab('approved');
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Application status set to ${newStatus.toUpperCase()}`);
        } else {
          Alert.alert('Success', `Application status set to ${newStatus.toUpperCase()}`);
        }
      }

      fetchApplications();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to update application status';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#92400E', label: 'PENDING' };
      case 'contacted':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'CONTACTED' };
      case 'paid':
        return { bg: '#EDE9FE', text: '#5B21B6', label: 'FEES PAID' };
      case 'approved':
        return { bg: '#D1FAE5', text: '#065F46', label: 'APPROVED' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'REJECTED' };
      default:
        return { bg: '#F3F4F6', text: '#374151', label: status.toUpperCase() };
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const renderApplicationCard = ({ item }: { item: any }) => {
    const badge = getStatusBadgeStyle(item.status);
    const isUpdating = updatingId === item._id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.studentName}>{item.full_name}</Text>
            <View style={styles.courseTagsContainer}>
              {item.course_ids && item.course_ids.length > 0 ? (
                item.course_ids.map((c: any, i: number) => (
                  <View key={c._id || i} style={styles.courseBadgeChip}>
                    <Icon name="book-outline" size={11} color="#D97706" style={{ marginRight: 3 }} />
                    <Text style={styles.courseBadgeText}>{c.title || 'Course'}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.courseBadgeChip}>
                  <Icon name="book-outline" size={11} color="#D97706" style={{ marginRight: 3 }} />
                  <Text style={styles.courseBadgeText}>{item.course_id?.title || 'Vocational Course'}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reg No:</Text>
            <Text style={[styles.detailVal, { color: item.generated_index_number ? '#059669' : '#D97706', fontWeight: 'bold' }]}>
              {item.generated_index_number || 'Pending Approval'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>NIC Number:</Text>
            <Text style={styles.detailVal}>{item.nic_number || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email:</Text>
            <Text style={styles.detailVal}>{item.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailVal}>{item.phone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Submitted At:</Text>
            <Text style={styles.detailVal}>{new Date(item.submitted_at || item.createdAt).toLocaleString()}</Text>
          </View>
        </View>

        {/* Action Controls per Stage */}
        <View style={styles.actionsBar}>
          {isUpdating ? (
            <ActivityIndicator size="small" color="#000000" style={{ paddingVertical: 6 }} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.stageBtn, { backgroundColor: '#F58220' }]}
                onPress={() => handleOpenAssignCoursesModal(item)}
              >
                <Icon name="create-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.stageBtnText}>Assign Courses</Text>
              </TouchableOpacity>

              {item.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.stageBtn, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleUpdateStatus(item._id, 'contacted', item.full_name)}
                  >
                    <Text style={styles.stageBtnText}>Mark Contacted</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stageBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => handleUpdateStatus(item._id, 'approved', item.full_name)}
                  >
                    <Text style={styles.stageBtnText}>Approve</Text>
                  </TouchableOpacity>
                </>
              )}

              {item.status === 'contacted' && (
                <>
                  <TouchableOpacity
                    style={[styles.stageBtn, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => handleUpdateStatus(item._id, 'paid', item.full_name)}
                  >
                    <Text style={styles.stageBtnText}>Mark Paid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stageBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => handleUpdateStatus(item._id, 'approved', item.full_name)}
                  >
                    <Text style={styles.stageBtnText}>Approve</Text>
                  </TouchableOpacity>
                </>
              )}

              {item.status === 'paid' && (
                <TouchableOpacity
                  style={[styles.stageBtn, { backgroundColor: '#10B981', flex: 1 }]}
                  onPress={() => handleUpdateStatus(item._id, 'approved', item.full_name)}
                >
                  <Icon name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.stageBtnText}>Approve & Issue Reg No.</Text>
                </TouchableOpacity>
              )}

              {item.status === 'approved' && (
                <TouchableOpacity
                  style={[styles.stageBtn, { backgroundColor: '#059669', flex: 1 }]}
                  onPress={() => handleUpdateStatus(item._id, 'approved', item.full_name)}
                >
                  <Icon name="key-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.stageBtnText}>Re-issue Credentials</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Title Header */}
      <View style={styles.topHeader}>
        <Text style={styles.pageTitle}>Student Applications</Text>
        <Text style={styles.pageSubtitle}>Review registrations, track payment status, and issue registration numbers.</Text>
      </View>

      {/* Tabs Filter Header */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar}>
        {[
          { id: 'pending', label: 'Pending' },
          { id: 'contacted', label: 'Contacted' },
          { id: 'paid', label: 'Fees Paid' },
          { id: 'approved', label: 'Approved' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'all', label: 'All Applications' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.id as StatusTab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Applications List */}
      {loading ? (
        <ActivityIndicator size="large" color="#000000" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={applications}
          keyExtractor={item => item._id}
          renderItem={renderApplicationCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#000000']} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No applications found in "{activeTab}" status.</Text>}
        />
      )}

      {/* Assign Courses Modal */}
      <Modal visible={assignCoursesModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.assignModalCard}>
            <View style={styles.assignModalHeader}>
              <Text style={styles.assignModalTitle}>Assign Courses & Approve Fee</Text>
              <TouchableOpacity onPress={() => setAssignCoursesModalVisible(false)}>
                <Icon name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <Text style={styles.assignModalSub}>
              Select the course(s) to assign for student <Text style={{ fontWeight: 'bold', color: '#111827' }}>{selectedAppForAssignment?.full_name}</Text>:
            </Text>

            <ScrollView style={{ flexMaxHeight: 280, marginVertical: 12 }}>
              {allAvailableCourses.map(course => {
                const isSelected = assignedCourseIds.includes(course._id);
                return (
                  <TouchableOpacity
                    key={course._id}
                    style={[styles.assignCourseItem, isSelected && styles.assignCourseItemActive]}
                    onPress={() => toggleAssignedCourse(course._id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.assignCheckbox, isSelected && styles.assignCheckboxActive]}>
                      {isSelected && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.assignCourseText, isSelected && styles.assignCourseTextActive]}>
                        {course.title}
                      </Text>
                      {course.fee ? (
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Fee: LKR {course.fee.toLocaleString()}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.assignModalActions}>
              <TouchableOpacity
                style={[styles.assignSaveBtn, { backgroundColor: '#374151' }]}
                onPress={() => handleSaveCourseAssignments(selectedAppForAssignment?.status)}
                disabled={assigningCourses}
              >
                <Text style={styles.assignSaveBtnText}>Save Course Selection</Text>
              </TouchableOpacity>

              {selectedAppForAssignment?.status !== 'approved' && (
                <TouchableOpacity
                  style={[styles.assignSaveBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => handleSaveCourseAssignments('approved')}
                  disabled={assigningCourses}
                >
                  {assigningCourses ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.assignSaveBtnText}>Assign & Approve Reg No.</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Generated Credentials Modal */}
      <Modal visible={credentialsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconCircle}>
              <Icon name="checkmark-circle" size={50} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>Application Approved! 🎉</Text>
            <Text style={styles.modalSub}>
              Student account created & registration number generated successfully.
            </Text>

            {approvedCredentials && (
              <View style={styles.credentialsBox}>
                <View style={styles.credRow}>
                  <Text style={styles.credLabel}>Registration No:</Text>
                  <Text style={styles.credValue}>{approvedCredentials.index_number}</Text>
                </View>
                <View style={styles.credRow}>
                  <Text style={styles.credLabel}>Temp Password:</Text>
                  <Text style={styles.credValue}>{approvedCredentials.temp_password}</Text>
                </View>
                <View style={styles.credRow}>
                  <Text style={styles.credLabel}>Student Email:</Text>
                  <Text style={styles.credSubValue}>{approvedCredentials.email}</Text>
                </View>
              </View>
            )}

            <View style={styles.expiryNoticeBox}>
              <Icon name="time-outline" size={18} color="#92400E" style={{ marginRight: 8 }} />
              <Text style={styles.expiryNoticeText}>
                Temporary password expires in 7 days. Upon first login, the student will be prompted to set a permanent password.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeCredModalBtn}
              onPress={() => setCredentialsModalVisible(false)}
            >
              <Text style={styles.closeCredModalBtnText}>Done</Text>
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
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  tabsBar: {
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 50,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#000000',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: 'bold',
    color: '#92400E',
    fontSize: 15,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  courseTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
  courseBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  stageBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  completedStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  completedStatusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 15,
  },

  /* ASSIGN COURSES MODAL STYLES */
  assignModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
    elevation: 5,
  },
  assignModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  assignModalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  assignModalSub: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 10,
    marginBottom: 4,
  },
  assignCourseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  assignCourseItemActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F58220',
  },
  assignCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  assignCheckboxActive: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  assignCourseText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  assignCourseTextActive: {
    color: '#D97706',
    fontWeight: 'bold',
  },
  assignModalActions: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 10,
  },
  assignSaveBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  /* CREDENTIALS MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '88%',
    alignItems: 'center',
    elevation: 5,
  },
  successIconCircle: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  credentialsBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 14,
  },
  credRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  credLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  credValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#F58220',
  },
  credSubValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  expiryNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 18,
  },
  expiryNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  closeCredModalBtn: {
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  closeCredModalBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
