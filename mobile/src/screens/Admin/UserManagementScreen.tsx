import React, { useState, useEffect } from 'react';
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
  ScrollView,
  Platform
} from 'react-native';
import api from '../../services/api';
import CustomDropdown from '../../components/shared/CustomDropdown';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

type Tab = 'pending' | 'students' | 'instructors';

export default function UserManagementScreen() {
  const route = useRoute<any>();
  const [activeTab, setActiveTab] = useState<Tab>(route.params?.initialTab || 'pending');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // User Details Modal State
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Add Instructor Modal
  const [instructorModalVisible, setInstructorModalVisible] = useState(false);
  const [instructorForm, setInstructorForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [creatingInstructor, setCreatingInstructor] = useState(false);

  // Assign Batch Modal
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState<string | null>(null);
  const [assignBatchId, setAssignBatchId] = useState<string>('');
  const [batches, setBatches] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Approval Credentials Modal
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
  const [approvedCredentials, setApprovedCredentials] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
    fetchBatches();
  }, [activeTab]);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/admin/batches');
      setBatches(res.data);
      if (res.data.length > 0) setAssignBatchId(res.data[0]._id);
    } catch (e) {
      console.warn('Failed to fetch batches');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = '/admin/users';
      if (activeTab === 'pending') {
        url += '?role=student&status=pending';
      } else if (activeTab === 'students') {
        url += '?role=student&status=active';
      } else if (activeTab === 'instructors') {
        url += '?role=instructor';
      }
      const res = await api.get(url);
      setUsers(res.data);
    } catch (e: any) {
      console.warn('Failed to fetch users', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (userId: string) => {
    setDetailsModalVisible(true);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/admin/users/${userId}/details`);
      setUserDetails(res.data);
    } catch (e) {
      console.warn('Failed to load user details', e);
      Alert.alert('Error', 'Failed to load user profile details');
      setDetailsModalVisible(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await api.put(`/admin/users/${id}/approve`);
      if (res.data.credentials) {
        setApprovedCredentials(res.data.credentials);
        setCredentialsModalVisible(true);
      } else {
        if (Platform.OS === 'web') {
          window.alert('User application approved successfully.');
        } else {
          Alert.alert('Approved', 'User application approved.');
        }
      }
      setDetailsModalVisible(false);
      fetchUsers();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Approval failed';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const handleReject = async (id: string) => {
    const doReject = async () => {
      try {
        await api.put(`/admin/users/${id}/reject`, { reason: 'Rejected by admin' });
        setDetailsModalVisible(false);
        fetchUsers();
      } catch (e) {
        if (Platform.OS === 'web') {
          window.alert('Rejection failed');
        } else {
          Alert.alert('Error', 'Rejection failed');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to reject this registration?')) {
        doReject();
      }
    } else {
      Alert.alert('Reject Application', 'Are you sure you want to reject this registration?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: doReject }
      ]);
    }
  };

  const handleAssignBatch = async () => {
    if (!assignStudentId || !assignBatchId) return;
    setAssigning(true);
    try {
      await api.post(`/admin/batches/${assignBatchId}/enroll`, { studentIds: [assignStudentId] });
      Alert.alert('Success', 'Student assigned to batch successfully');
      setAssignModalVisible(false);
      if (detailsModalVisible && userDetails?.user?._id === assignStudentId) {
        handleOpenDetails(assignStudentId);
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const actionText = currentStatus ? 'deactivate' : 'activate';
    Alert.alert(`${currentStatus ? 'Deactivate' : 'Activate'} User`, `Are you sure you want to ${actionText} this user?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: currentStatus ? 'Deactivate' : 'Activate',
        style: currentStatus ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await api.put(`/admin/users/${id}/deactivate`);
            fetchUsers();
            if (detailsModalVisible) {
              handleOpenDetails(id);
            }
          } catch (e) {
            Alert.alert('Error', 'Status update failed');
          }
        }
      }
    ]);
  };

  const handleCreateInstructor = async () => {
    const { name, email, password, phone } = instructorForm;
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Name, email, and password are required');
      return;
    }

    setCreatingInstructor(true);
    try {
      await api.post('/admin/users/instructor', instructorForm);
      Alert.alert('Success', 'Instructor created successfully');
      setInstructorForm({ name: '', email: '', phone: '', password: '' });
      setInstructorModalVisible(false);
      if (activeTab === 'instructors') {
        fetchUsers();
      } else {
        setActiveTab('instructors');
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create instructor');
    } finally {
      setCreatingInstructor(false);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getGradeColor = (grade: string) => {
    if (!grade) return '#6B7280';
    const g = grade.toUpperCase();
    if (g.startsWith('A')) return '#10B981';
    if (g.startsWith('B')) return '#3B82F6';
    if (g.startsWith('C')) return '#F59E0B';
    return '#EF4444';
  };

  const renderPendingItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleOpenDetails(item._id)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.headerDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.index_number || item.nic ? <Text style={styles.userSubtext}>Reg No: {item.index_number || item.nic}</Text> : null}
        </View>
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>Pending</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewProfileBtn} onPress={() => handleOpenDetails(item._id)}>
          <Text style={styles.viewProfileText}>View Profile →</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.rejectOutlineBtn} onPress={() => handleReject(item._id)}>
            <Text style={styles.rejectOutlineText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveDarkBtn} onPress={() => handleApprove(item._id)}>
            <Text style={styles.approveDarkText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStudentItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleOpenDetails(item._id)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.headerDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userSubtext}>Reg No: {item.index_number || item.nic || 'N/A'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
          <Text style={[styles.statusBadgeText, { color: item.is_active ? '#065F46' : '#991B1B' }]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewProfileBtn} onPress={() => handleOpenDetails(item._id)}>
          <Text style={styles.viewProfileText}>View Profile →</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.deactivateBtn} onPress={() => handleToggleActive(item._id, item.is_active)}>
            <Text style={styles.deactivateBtnText}>{item.is_active ? 'Deactivate' : 'Activate'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.assignBatchBtn}
            onPress={() => {
              setAssignStudentId(item._id);
              setAssignModalVisible(true);
            }}
          >
            <Text style={styles.assignBatchText}>Assign Batch</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderInstructorItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleOpenDetails(item._id)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.avatarText, { color: '#92400E' }]}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.headerDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.phone ? <Text style={styles.userSubtext}>📱 {item.phone}</Text> : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#DBEAFE' : '#FEE2E2' }]}>
          <Text style={[styles.statusBadgeText, { color: item.is_active ? '#1E40AF' : '#991B1B' }]}>
            Instructor
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewProfileBtn} onPress={() => handleOpenDetails(item._id)}>
          <Text style={styles.viewProfileText}>View Profile & Batches →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deactivateBtn} onPress={() => handleToggleActive(item._id, item.is_active)}>
          <Text style={styles.deactivateBtnText}>{item.is_active ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeaderContainer}>
        <Text style={styles.title}>Users Management</Text>
        <Text style={styles.subtitle}>Manage student profiles, instructor accounts, and pending approvals.</Text>
      </View>

      {/* Add Instructor Button */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity style={styles.addInstructorBtn} onPress={() => setInstructorModalVisible(true)}>
          <Icon name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addInstructorBtnText}>+ Add Instructor</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, showFilter && styles.filterBtnActive]}
          onPress={() => setShowFilter(!showFilter)}
        >
          <Icon name="options-outline" size={18} color="#374151" style={{ marginRight: 6 }} />
          <Text style={styles.filterBtnText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Header */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'pending' && styles.activeTabItem]}
          onPress={() => setActiveTab('pending')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
            {activeTab === 'pending' && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{filteredUsers.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'students' && styles.activeTabItem]}
          onPress={() => setActiveTab('students')}
        >
          <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>Students</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'instructors' && styles.activeTabItem]}
          onPress={() => setActiveTab('instructors')}
        >
          <Text style={[styles.tabText, activeTab === 'instructors' && styles.activeTabText]}>Instructors</Text>
        </TouchableOpacity>
      </View>

      {/* Content List */}
      {loading ? (
        <ActivityIndicator size="large" color="#000000" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item._id}
          renderItem={
            activeTab === 'pending'
              ? renderPendingItem
              : activeTab === 'students'
              ? renderStudentItem
              : renderInstructorItem
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          ListEmptyComponent={<Text style={styles.emptyListText}>No users found in this tab.</Text>}
        />
      )}

      {/* ========================================================================= */}
      {/* COMPREHENSIVE USER DETAILS MODAL */}
      {/* ========================================================================= */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '88%', padding: 0, overflow: 'hidden' }]}>
            {loadingDetails || !userDetails ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#000000" />
                <Text style={styles.modalLoadingText}>Loading complete profile...</Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                {/* Profile Modal Top Header */}
                <View style={styles.detailsHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.detailsAvatar, { backgroundColor: userDetails.user.role === 'instructor' ? '#FEF3C7' : '#DBEAFE' }]}>
                      <Text style={[styles.detailsAvatarText, { color: userDetails.user.role === 'instructor' ? '#92400E' : '#1E40AF' }]}>
                        {getInitials(userDetails.user.name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailsName}>{userDetails.user.name}</Text>
                      <Text style={styles.detailsEmail}>{userDetails.user.email}</Text>
                      <View style={{ flexDirection: 'row', marginTop: 4, gap: 6 }}>
                        <View style={styles.roleTag}>
                          <Text style={styles.roleTagText}>{userDetails.user.role?.toUpperCase()}</Text>
                        </View>
                        <View style={[styles.roleTag, { backgroundColor: userDetails.user.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
                          <Text style={[styles.roleTagText, { color: userDetails.user.is_active ? '#065F46' : '#991B1B' }]}>
                            {userDetails.user.is_active ? 'ACTIVE' : 'PENDING / INACTIVE'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.closeModalIconBtn} onPress={() => setDetailsModalVisible(false)}>
                    <Icon name="close" size={22} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                {/* Scrollable Profile Body */}
                <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
                  {/* 1. Basic Info Card */}
                  <View style={styles.detailSectionCard}>
                    <Text style={styles.detailSectionTitle}>👤 Contact & Identity</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reg No:</Text>
                      <Text style={[styles.detailValue, { fontWeight: 'bold', color: '#059669' }]}>{userDetails.user.index_number || 'Pending'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>NIC Number:</Text>
                      <Text style={styles.detailValue}>{userDetails.user.nic || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone Number:</Text>
                      <Text style={styles.detailValue}>{userDetails.user.phone || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Joined Date:</Text>
                      <Text style={styles.detailValue}>
                        {userDetails.user.createdAt ? new Date(userDetails.user.createdAt).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* 2. STUDENT SPECIFIC DETAILS */}
                  {userDetails.user.role === 'student' && (
                    <>
                      {/* Academic Performance Summary */}
                      <View style={styles.summaryBanner}>
                        <Text style={styles.summaryBannerTitle}>Overall Average Marks</Text>
                        <Text style={styles.summaryBannerValue}>{userDetails.averageMark}%</Text>
                      </View>

                      {/* Enrolled Batches */}
                      <View style={styles.detailSectionCard}>
                        <Text style={styles.detailSectionTitle}>📚 Enrolled Courses & Batches</Text>
                        {(!userDetails.enrollments || userDetails.enrollments.length === 0) ? (
                          <Text style={styles.emptyDetailText}>No active batch enrollments yet.</Text>
                        ) : (
                          userDetails.enrollments.map((e: any) => (
                            <View key={e._id} style={styles.itemSubCard}>
                              <Text style={styles.itemSubTitle}>{e.batch_id?.course_id?.title || 'Course'}</Text>
                              <Text style={styles.itemSubDesc}>Batch: {e.batch_id?.name || 'Batch'}</Text>
                              <Text style={styles.itemSubMeta}>
                                Days: {e.batch_id?.schedule_json?.days?.join(', ') || 'N/A'} · Duration: {e.batch_id?.course_id?.duration_weeks} Weeks
                              </Text>
                            </View>
                          ))
                        )}
                      </View>

                      {/* Assessment Results */}
                      <View style={styles.detailSectionCard}>
                        <Text style={styles.detailSectionTitle}>📊 Assessment Marks & Evaluation</Text>
                        {(!userDetails.results || userDetails.results.length === 0) ? (
                          <Text style={styles.emptyDetailText}>No evaluation marks recorded yet.</Text>
                        ) : (
                          userDetails.results.map((r: any) => (
                            <View key={r._id} style={styles.resultItemRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.resultName}>{r.assessment_name}</Text>
                                <Text style={styles.resultBatch}>{r.batch_id?.course_id?.title || r.batch_id?.name}</Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.resultScore}>{r.marks?.toFixed(1)}%</Text>
                                <View style={[styles.gradeChip, { backgroundColor: getGradeColor(r.grade) }]}>
                                  <Text style={styles.gradeChipText}>{r.grade || 'Pass'}</Text>
                                </View>
                              </View>
                            </View>
                          ))
                        )}
                      </View>

                      {/* Practice Bookings */}
                      <View style={styles.detailSectionCard}>
                        <Text style={styles.detailSectionTitle}>🗓️ Practical Workshop Bookings</Text>
                        {(!userDetails.bookings || userDetails.bookings.length === 0) ? (
                          <Text style={styles.emptyDetailText}>No practice bookings found.</Text>
                        ) : (
                          userDetails.bookings.map((b: any) => (
                            <View key={b._id} style={styles.itemSubCard}>
                              <Text style={styles.itemSubTitle}>
                                {b.slot_id?.day_of_week} Slot ({b.slot_id?.start_time} - {b.slot_id?.end_time})
                              </Text>
                              <Text style={styles.itemSubDesc}>Instructor: {b.slot_id?.instructor_id?.name || 'Instructor'}</Text>
                              <Text style={styles.itemSubMeta}>Status: {b.status?.toUpperCase()}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    </>
                  )}

                  {/* 3. INSTRUCTOR SPECIFIC DETAILS */}
                  {userDetails.user.role === 'instructor' && (
                    <>
                      {/* Instructor Teaching Overview */}
                      <View style={styles.summaryBannerInstructor}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={styles.summaryBannerTitle}>Assigned Batches</Text>
                          <Text style={styles.summaryBannerValue}>{userDetails.assignedBatches?.length || 0}</Text>
                        </View>
                        <View style={{ height: 30, width: 1, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                        <View style={{ alignItems: 'center' }}>
                          <Text style={styles.summaryBannerTitle}>Total Students</Text>
                          <Text style={styles.summaryBannerValue}>{userDetails.totalStudents || 0}</Text>
                        </View>
                      </View>

                      {/* Teaching Batches */}
                      <View style={styles.detailSectionCard}>
                        <Text style={styles.detailSectionTitle}>🏫 Assigned Vocational Batches</Text>
                        {(!userDetails.assignedBatches || userDetails.assignedBatches.length === 0) ? (
                          <Text style={styles.emptyDetailText}>No batches currently assigned to this instructor.</Text>
                        ) : (
                          userDetails.assignedBatches.map((b: any) => (
                            <View key={b._id} style={styles.itemSubCard}>
                              <Text style={styles.itemSubTitle}>{b.name}</Text>
                              <Text style={styles.itemSubDesc}>Course: {b.course_id?.title || 'Vocational Course'}</Text>
                              <Text style={styles.itemSubMeta}>
                                Schedule: {b.schedule_json?.days?.join(', ') || 'N/A'} · Max Capacity: {b.capacity} Students
                              </Text>
                            </View>
                          ))
                        )}
                      </View>

                      {/* Uploaded Videos */}
                      <View style={styles.detailSectionCard}>
                        <Text style={styles.detailSectionTitle}>📹 Course Video Lessons ({userDetails.videos?.length || 0})</Text>
                        {(!userDetails.videos || userDetails.videos.length === 0) ? (
                          <Text style={styles.emptyDetailText}>No video lessons uploaded yet.</Text>
                        ) : (
                          userDetails.videos.map((v: any) => (
                            <View key={v._id} style={styles.resultItemRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.resultName}>{v.title}</Text>
                                <Text style={styles.resultBatch}>Batch: {v.batch_id?.name || 'General'}</Text>
                              </View>
                              <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ''}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    </>
                  )}

                  <View style={{ height: 40 }} />
                </ScrollView>

                {/* Profile Bottom Action Bar */}
                <View style={styles.detailsFooter}>
                  {userDetails.user.role === 'student' && !userDetails.user.is_active ? (
                    <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                      <TouchableOpacity style={[styles.footerActionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleReject(userDetails.user._id)}>
                        <Text style={styles.footerActionText}>Reject Application</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.footerActionBtn, { backgroundColor: '#10B981' }]} onPress={() => handleApprove(userDetails.user._id)}>
                        <Text style={styles.footerActionText}>Approve Student</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                      {userDetails.user.role === 'student' && (
                        <TouchableOpacity
                          style={[styles.footerActionBtn, { backgroundColor: '#000000' }]}
                          onPress={() => {
                            setAssignStudentId(userDetails.user._id);
                            setAssignModalVisible(true);
                          }}
                        >
                          <Text style={styles.footerActionText}>Assign Batch</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.footerActionBtn, { backgroundColor: userDetails.user.is_active ? '#DC2626' : '#2563EB' }]}
                        onPress={() => handleToggleActive(userDetails.user._id, userDetails.user.is_active)}
                      >
                        <Text style={styles.footerActionText}>
                          {userDetails.user.is_active ? 'Deactivate Account' : 'Activate Account'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Instructor Modal */}
      <Modal visible={instructorModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Instructor</Text>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Inst. Miller"
              value={instructorForm.name}
              onChangeText={v => setInstructorForm({ ...instructorForm, name: v })}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. miller@tvti.edu"
              value={instructorForm.email}
              onChangeText={v => setInstructorForm({ ...instructorForm, email: v })}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +94 77 123 4567"
              value={instructorForm.phone}
              onChangeText={v => setInstructorForm({ ...instructorForm, phone: v })}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              value={instructorForm.password}
              onChangeText={v => setInstructorForm({ ...instructorForm, password: v })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setInstructorModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleCreateInstructor}
                disabled={creatingInstructor}
              >
                {creatingInstructor ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitModalText}>Create Instructor</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Batch Modal */}
      <Modal visible={assignModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign to Batch</Text>
            <CustomDropdown
              label="Select Batch"
              placeholder="Choose a batch..."
              iconName="layers-outline"
              items={batches.map(b => ({
                label: b.course_id?.title ? `${b.course_id.title} (${b.name})` : b.name,
                value: b._id,
                subtext: `Instructor: ${b.instructor_ids?.[0]?.name || 'Assigned'} · ${b.capacity} Seats`
              }))}
              selectedValue={assignBatchId}
              onValueChange={v => setAssignBatchId(v)}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setAssignModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleAssignBatch}
                disabled={assigning}
              >
                {assigning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitModalText}>Assign</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Generated Credentials Modal */}
      <Modal visible={credentialsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <View style={{ marginBottom: 12 }}>
              <Icon name="checkmark-circle" size={50} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>User Approved! 🎉</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
              Student account created & index number generated successfully.
            </Text>

            {approvedCredentials && (
              <View style={{ backgroundColor: '#111827', borderRadius: 12, padding: 16, width: '100%', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Index Number:</Text>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#F58220' }}>{approvedCredentials.index_number}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Temp Password:</Text>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#F58220' }}>{approvedCredentials.temp_password}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Student Email:</Text>
                  <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '500' }}>{approvedCredentials.email}</Text>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginBottom: 18 }}>
              <Icon name="time-outline" size={18} color="#92400E" style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, fontSize: 12, color: '#92400E', lineHeight: 16 }}>
                Temporary password expires in 7 days. Upon first login, the student will be prompted to set a permanent password.
              </Text>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#000000', borderRadius: 10, paddingVertical: 12, width: '100%', alignItems: 'center' }}
              onPress={() => setCredentialsModalVisible(false)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>Done</Text>
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
  topHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
    marginBottom: 14,
  },
  addInstructorBtn: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addInstructorBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
  },
  filterBtnActive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#000000',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#D97706',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeTabText: {
    color: '#D97706',
  },
  tabBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D97706',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  headerDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  userSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  newBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    paddingTop: 12,
  },
  viewProfileBtn: {
    paddingVertical: 6,
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F58220',
  },
  rejectOutlineBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  rejectOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  approveDarkBtn: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  approveDarkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deactivateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    marginRight: 8,
  },
  deactivateBtnText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },
  assignBatchBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  assignBatchText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 15,
  },

  /* DETAILS MODAL STYLES */
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailsAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailsName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  detailsEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  roleTag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  closeModalIconBtn: {
    padding: 6,
  },
  detailSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryBanner: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryBannerInstructor: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryBannerTitle: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBannerValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 2,
  },
  emptyDetailText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  itemSubCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemSubTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  itemSubDesc: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  itemSubMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  resultItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  resultBatch: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  resultScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  gradeChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  gradeChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsFooter: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerActionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  /* OTHER MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '88%',
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  cancelModalText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitModalBtn: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  submitModalText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
