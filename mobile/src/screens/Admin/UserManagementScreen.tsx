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
  Platform,
  Image
} from 'react-native';
import api from '../../services/api';
import CustomDropdown from '../../components/shared/CustomDropdown';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import ApplicationsManagementScreen from './ApplicationsManagementScreen';
import ScreenHeader from '../../components/shared/ScreenHeader';

type Tab = 'pending' | 'approved' | 'instructors';

export default function UserManagementScreen() {
  let initialTab: Tab = 'pending';
  try {
    const route = useRoute<any>();
    if (route?.params?.initialTab) {
      initialTab = route.params.initialTab;
    }
  } catch (e) {}

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // User Details Modal State
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Inline WhatsApp 3-Dots Options Menu State
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  // Add Instructor Modal
  const [instructorModalVisible, setInstructorModalVisible] = useState(false);
  const [instructorForm, setInstructorForm] = useState({ name: '', email: '', phone: '', nic: '' });
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

  // Custom Confirmation & Alert Dialog Popup State
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info' | 'lock';
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
    if (activeTab !== 'pending') {
      fetchUsers();
      fetchBatches();
    }
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
      if (activeTab === 'approved') {
        url += '?role=student';
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
      showAlert('Error', 'Failed to load user profile details', undefined, 'error');
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
        showAlert('Approved', 'User application approved successfully.', undefined, 'success');
      }
      setDetailsModalVisible(false);
      fetchUsers();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Approval failed';
      showAlert('Error', msg, undefined, 'error');
    }
  };

  const handleReject = (id: string, userName?: string) => {
    setConfirmModal({
      visible: true,
      title: 'Reject Registration',
      message: `Are you sure you want to reject registration for ${userName || 'this applicant'}?`,
      type: 'danger',
      confirmText: 'Reject',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.put(`/admin/users/${id}/reject`, { reason: 'Rejected by admin' });
          setDetailsModalVisible(false);
          fetchUsers();
          showAlert('Success', 'Application rejected successfully.', undefined, 'success');
        } catch (e) {
          showAlert('Error', 'Rejection failed', undefined, 'error');
        }
      }
    });
  };

  const handleAssignBatch = async () => {
    if (!assignStudentId || !assignBatchId) return;
    setAssigning(true);
    try {
      await api.post(`/admin/batches/${assignBatchId}/enroll`, { studentIds: [assignStudentId] });
      const selectedBatch = batches.find(b => b._id === assignBatchId);
      const batchName = selectedBatch?.name || 'Selected Batch';
      showAlert('Success', `Student assigned to ${batchName} successfully`, undefined, 'success');
      setAssignModalVisible(false);
      if (detailsModalVisible && userDetails?.user?._id === assignStudentId) {
        handleOpenDetails(assignStudentId);
      }
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Assignment failed', undefined, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean, userName?: string) => {
    const isDeactivating = currentStatus;
    setConfirmModal({
      visible: true,
      title: isDeactivating ? 'Deactivate Account' : 'Activate Account',
      message: isDeactivating
        ? `Are you sure you want to deactivate ${userName || 'this user'}'s account? They will be locked out and unable to log in.`
        : `Are you sure you want to reactivate ${userName || 'this user'}'s account?`,
      type: isDeactivating ? 'danger' : 'info',
      confirmText: isDeactivating ? 'Deactivate' : 'Activate',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.put(`/admin/users/${id}/deactivate`);
          fetchUsers();
          if (detailsModalVisible) {
            handleOpenDetails(id);
          }
          showAlert(
            'Success',
            `Account successfully ${isDeactivating ? 'deactivated' : 'activated'}.`,
            undefined,
            'success'
          );
        } catch (e: any) {
          showAlert('Error', e.response?.data?.message || 'Status update failed', undefined, 'error');
        }
      }
    });
  };

  const handleDeleteCompletely = (id: string, userName?: string, role?: string) => {
    const roleLabel = role === 'instructor' ? 'instructor' : 'student';
    setConfirmModal({
      visible: true,
      title: '⚠️ Permanently Delete',
      message: `This will PERMANENTLY delete ${userName || 'this user'} and ALL their related data (enrollments, results, bookings, uploads, etc.).\n\nThis action CANNOT be undone. Are you absolutely sure?`,
      type: 'danger',
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/users/${id}/delete`);
          fetchUsers();
          if (detailsModalVisible) {
            setDetailsModalVisible(false);
            setUserDetails(null);
          }
          showAlert(
            'Deleted',
            `${userName || 'User'} and all related data have been permanently removed.`,
            undefined,
            'success'
          );
        } catch (e: any) {
          showAlert('Error', e.response?.data?.message || 'Deletion failed', undefined, 'error');
        }
      }
    });
  };

  const handleCreateInstructor = async () => {
    const { name, email, phone, nic } = instructorForm;
    if (!name.trim() || !email.trim() || !nic.trim()) {
      showAlert('Error', 'Name, email, and NIC number are required', undefined, 'error');
      return;
    }

    setCreatingInstructor(true);
    try {
      const res = await api.post('/admin/users/instructor', instructorForm);
      setInstructorForm({ name: '', email: '', phone: '', nic: '' });
      setInstructorModalVisible(false);

      if (res.data.index_number) {
        setApprovedCredentials({
          index_number: res.data.index_number,
          temp_password: res.data.temp_password,
          email: res.data.email
        });
        setCredentialsModalVisible(true);
      } else {
        showAlert('Success', 'Instructor created successfully', undefined, 'success');
      }

      if (activeTab === 'instructors') {
        fetchUsers();
      } else {
        setActiveTab('instructors');
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to create instructor';
      showAlert('Error', msg, undefined, 'error');
    } finally {
      setCreatingInstructor(false);
    }
  };

  const filteredUsers = (users || []).filter(u => {
    const term = (search || '').toLowerCase().trim();
    const matchesSearch =
      !term ||
      (u?.name || '').toLowerCase().includes(term) ||
      (u?.email || '').toLowerCase().includes(term) ||
      (u?.index_number || '').toLowerCase().includes(term) ||
      (u?.nic || '').toLowerCase().includes(term);

    if (activeTab === 'approved') {
      if (statusFilter === 'active') return matchesSearch && u.is_active === true;
      if (statusFilter === 'inactive') return matchesSearch && u.is_active === false;
      return matchesSearch;
    }

    return matchesSearch;
  });

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <TouchableOpacity style={styles.rejectOutlineBtn} onPress={() => handleReject(item._id, item.name)}>
            <Text style={styles.rejectOutlineText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveDarkBtn} onPress={() => handleApprove(item._id)}>
            <Text style={styles.approveDarkText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStudentItem = ({ item }: { item: any }) => {
    const isMenuOpen = activeMenuUserId === item._id;
    return (
      <TouchableOpacity
        style={[styles.card, isMenuOpen && { zIndex: 9999, elevation: 25 }]}
        onPress={() => {
          if (activeMenuUserId) {
            setActiveMenuUserId(null);
          } else {
            handleOpenDetails(item._id);
          }
        }}
        activeOpacity={0.75}
      >
        <View style={[styles.cardHeader, isMenuOpen && { zIndex: 9999 }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.headerDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <Text style={styles.userSubtext}>Reg No: {item.index_number || item.nic || 'N/A'}</Text>
          </View>
          <View style={[styles.rightCardCol, isMenuOpen && { zIndex: 9999 }]}>
            <TouchableOpacity
              style={styles.threeDotsBtn}
              onPress={() => setActiveMenuUserId(isMenuOpen ? null : item._id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="ellipsis-vertical" size={20} color={isMenuOpen ? "#0F172A" : "#64748B"} />
            </TouchableOpacity>
            <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#D1FAE5' : '#FEE2E2', marginTop: 8 }]}>
              <Text style={[styles.statusBadgeText, { color: item.is_active ? '#065F46' : '#991B1B' }]}>
                {item.is_active ? 'Active' : 'Deactivated'}
              </Text>
            </View>

            {isMenuOpen && (
              <View style={styles.whatsappMenuContainer}>
                <TouchableOpacity
                  style={styles.whatsappMenuItem}
                  onPress={() => {
                    setActiveMenuUserId(null);
                    handleOpenDetails(item._id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.whatsappMenuText}>View Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.whatsappMenuItem}
                  onPress={() => {
                    setActiveMenuUserId(null);
                    setAssignStudentId(item._id);
                    setAssignModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.whatsappMenuText}>Assign Batch</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.whatsappMenuItem}
                  onPress={() => {
                    setActiveMenuUserId(null);
                    handleToggleActive(item._id, item.is_active, item.name);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.whatsappMenuText, { color: item.is_active ? "#DC2626" : "#2563EB" }]}>
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.whatsappMenuItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setActiveMenuUserId(null);
                    handleDeleteCompletely(item._id, item.name, item.role);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.whatsappMenuText, { color: '#DC2626', fontWeight: '600' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderInstructorItem = ({ item }: { item: any }) => {
    const isMenuOpen = activeMenuUserId === item._id;
    return (
      <TouchableOpacity
        style={[styles.card, isMenuOpen && { zIndex: 9999, elevation: 25 }]}
        onPress={() => {
          if (activeMenuUserId) {
            setActiveMenuUserId(null);
          } else {
            handleOpenDetails(item._id);
          }
        }}
        activeOpacity={0.75}
      >
        <View style={[styles.cardHeader, isMenuOpen && { zIndex: 9999 }]}>
          <View style={[styles.avatar, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.avatarText, { color: '#92400E' }]}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.headerDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.phone ? <Text style={styles.userSubtext}>📱 {item.phone}</Text> : null}
          </View>
          <View style={[styles.rightCardCol, isMenuOpen && { zIndex: 9999 }]}>
            <TouchableOpacity
              style={styles.threeDotsBtn}
              onPress={() => setActiveMenuUserId(isMenuOpen ? null : item._id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="ellipsis-vertical" size={20} color={isMenuOpen ? "#0F172A" : "#64748B"} />
            </TouchableOpacity>
            <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#DBEAFE' : '#FEE2E2', marginTop: 8 }]}>
              <Text style={[styles.statusBadgeText, { color: item.is_active ? '#1E40AF' : '#991B1B' }]}>
                Instructor
              </Text>
            </View>

            {isMenuOpen && (
              <View style={styles.whatsappMenuContainer}>
                <TouchableOpacity
                  style={styles.whatsappMenuItem}
                  onPress={() => {
                    setActiveMenuUserId(null);
                    handleOpenDetails(item._id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.whatsappMenuText}>View Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.whatsappMenuItem}
                  onPress={() => {
                    setActiveMenuUserId(null);
                    handleToggleActive(item._id, item.is_active, item.name);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.whatsappMenuText, { color: item.is_active ? "#DC2626" : "#2563EB" }]}>
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.whatsappMenuItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setActiveMenuUserId(null);
                    handleDeleteCompletely(item._id, item.name, item.role);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.whatsappMenuText, { color: '#DC2626', fontWeight: '600' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {activeMenuUserId && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActiveMenuUserId(null)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9990,
            backgroundColor: 'transparent',
          }}
        />
      )}
      <ScreenHeader
        title="User Management"
        subtitle="Manage student admissions & instructor staff"
      />
      {/* Sleek Segmented Pill Track Header */}
      <View style={styles.segmentedTrackContainer}>
        <View style={styles.segmentedTrack}>
          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'pending' && styles.segmentedTabActive]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.8}
          >
            <Icon
              name={activeTab === 'pending' ? 'time' : 'time-outline'}
              size={16}
              color={activeTab === 'pending' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentedTabText, activeTab === 'pending' && styles.segmentedTabTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'approved' && styles.segmentedTabActive]}
            onPress={() => setActiveTab('approved')}
            activeOpacity={0.8}
          >
            <Icon
              name={activeTab === 'approved' ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={16}
              color={activeTab === 'approved' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentedTabText, activeTab === 'approved' && styles.segmentedTabTextActive]}>
              Approved
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'instructors' && styles.segmentedTabActive]}
            onPress={() => setActiveTab('instructors')}
            activeOpacity={0.8}
          >
            <Icon
              name={activeTab === 'instructors' ? 'school' : 'school-outline'}
              size={16}
              color={activeTab === 'instructors' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentedTabText, activeTab === 'instructors' && styles.segmentedTabTextActive]}>
              Instructors
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content View */}
      {activeTab === 'pending' ? (
        <ApplicationsManagementScreen embedded={true} onApproved={fetchUsers} />
      ) : (
        <>
          {/* Add Instructor Button (only on instructors tab) */}
          {activeTab === 'instructors' && (
            <View style={styles.actionButtonRow}>
              <TouchableOpacity style={styles.addInstructorBtn} onPress={() => setInstructorModalVisible(true)} activeOpacity={0.85}>
                <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.addInstructorBtnText}>Add Instructor</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search & Filters */}
          <View style={styles.searchFilterRow}>
            <View style={styles.searchBox}>
              <Icon name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, email, reg no, or NIC..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity
              style={[styles.filterBtn, showFilter && styles.filterBtnActive]}
              onPress={() => setShowFilter(!showFilter)}
            >
              <Icon name="options-outline" size={18} color={showFilter ? '#FFFFFF' : '#374151'} style={{ marginRight: 6 }} />
              <Text style={[styles.filterBtnText, showFilter && { color: '#FFFFFF' }]}>Filters</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Options Panel for Approved Tab */}
          {showFilter && activeTab === 'approved' && (
            <View style={styles.filterOptionsPanel}>
              <Text style={styles.filterPanelTitle}>Filter Student Status:</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('all')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
                    All ({users.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'active' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('active')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'active' && styles.filterChipTextActive]}>
                    Active ({users.filter(u => u.is_active).length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'inactive' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('inactive')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'inactive' && styles.filterChipTextActive]}>
                    Deactivated ({users.filter(u => !u.is_active).length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Content List */}
          {loading ? (
            <ActivityIndicator size="large" color="#000000" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={item => item._id}
              renderItem={
                activeTab === 'approved'
                  ? renderStudentItem
                  : renderInstructorItem
              }
              CellRendererComponent={({ children, index, style, ...props }: any) => {
                const item = filteredUsers[index];
                const isMenuOpen = item && activeMenuUserId === item._id;
                return (
                  <View
                    style={[
                      style,
                      { zIndex: isMenuOpen ? 99999 : (filteredUsers.length || 100) - index }
                    ]}
                    {...props}
                  >
                    {children}
                  </View>
                );
              }}
              contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
              ListEmptyComponent={<Text style={styles.emptyListText}>No users found in this tab.</Text>}
            />
          )}
        </>
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
                  {/* 1. Personal Contact & Identity Card */}
                  <View style={styles.detailSectionCard}>
                    <Text style={styles.detailSectionTitle}>👤 Personal & Contact Info</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reg No / Index:</Text>
                      <Text style={[styles.detailValue, { fontWeight: 'bold', color: '#059669' }]}>{userDetails.user.index_number || 'Pending'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Full Name:</Text>
                      <Text style={styles.detailValue}>{userDetails.user.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email Address:</Text>
                      <Text style={styles.detailValue}>{userDetails.user.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone Number:</Text>
                      <Text style={styles.detailValue}>{userDetails.user.phone || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date of Birth:</Text>
                      <Text style={styles.detailValue}>{userDetails.user.date_of_birth || 'Not Provided'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Gender:</Text>
                      <Text style={styles.detailValue}>{userDetails.user.gender || 'Not Provided'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>NIC Number:</Text>
                      <Text style={styles.detailValue}>{userDetails.user.nic || 'Optional / Not Provided'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Residential Address:</Text>
                      <Text style={styles.detailValue}>{userDetails.user.address || 'Not Provided'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Joined Date:</Text>
                      <Text style={styles.detailValue}>
                        {userDetails.user.createdAt ? new Date(userDetails.user.createdAt).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* 2. Parent / Guardian Details Card */}
                  {userDetails.user.role === 'student' && (
                    <View style={styles.detailSectionCard}>
                      <Text style={styles.detailSectionTitle}>👨‍👩‍👦 Parent / Guardian Details</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Guardian Name:</Text>
                        <Text style={styles.detailValue}>{userDetails.user.guardian?.name || 'Not Provided'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Relationship:</Text>
                        <Text style={styles.detailValue}>{userDetails.user.guardian?.relationship || 'Not Provided'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Guardian Phone:</Text>
                        <Text style={styles.detailValue}>{userDetails.user.guardian?.phone || 'Not Provided'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Occupation:</Text>
                        <Text style={styles.detailValue}>{userDetails.user.guardian?.occupation || 'Not Provided'}</Text>
                      </View>
                    </View>
                  )}

                  {/* 3. Educational Qualifications Card */}
                  {userDetails.user.role === 'student' && (
                    <View style={styles.detailSectionCard}>
                      <Text style={styles.detailSectionTitle}>🎓 Educational Qualifications</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Highest Level:</Text>
                        <Text style={styles.detailValue}>{userDetails.user.educational_qualification?.highest_level || 'Not Provided'}</Text>
                      </View>
                      {userDetails.user.educational_qualification?.grade_level ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Grade Level:</Text>
                          <Text style={styles.detailValue}>{userDetails.user.educational_qualification.grade_level}</Text>
                        </View>
                      ) : null}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>School / Institute:</Text>
                        <Text style={styles.detailValue}>{userDetails.user.educational_qualification?.institute_name || 'Not Provided'}</Text>
                      </View>
                    </View>
                  )}

                  {/* 4. Payment & Deposit Details Card */}
                  {userDetails.user.role === 'student' && (
                    <View style={styles.detailSectionCard}>
                      <Text style={styles.detailSectionTitle}>💳 Payment & Fee Info</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Method:</Text>
                        <Text style={[styles.detailValue, { fontWeight: 'bold' }]}>
                          {userDetails.user.payment_info?.payment_method === 'bank_transfer'
                            ? 'Bank Deposit Slip Upload'
                            : 'Physical Cash Counter Payment'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Status:</Text>
                        <Text style={[styles.detailValue, { fontWeight: 'bold', color: userDetails.user.payment_info?.payment_status === 'paid' ? '#059669' : '#D97706' }]}>
                          {userDetails.user.payment_info?.payment_status?.toUpperCase() || 'PENDING'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total Course Fee:</Text>
                        <Text style={styles.detailValue}>Rs. {userDetails.user.payment_info?.total_fee ? userDetails.user.payment_info.total_fee.toLocaleString() : '0'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount Paid:</Text>
                        <Text style={styles.detailValue}>Rs. {userDetails.user.payment_info?.amount_paid ? userDetails.user.payment_info.amount_paid.toLocaleString() : '0'}</Text>
                      </View>
                      {userDetails.user.payment_info?.payment_slip ? (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.detailLabel}>Deposit Receipt Slip:</Text>
                          <Image
                            source={{ uri: userDetails.user.payment_info.payment_slip }}
                            style={{ width: '100%', height: 160, borderRadius: 10, marginTop: 6, resizeMode: 'contain', backgroundColor: '#F3F4F6' }}
                          />
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* 5. STUDENT SPECIFIC DETAILS */}
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
                      <TouchableOpacity style={[styles.footerActionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleReject(userDetails.user._id, userDetails.user.name)}>
                        <Text style={styles.footerActionText}>Reject Application</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.footerActionBtn, { backgroundColor: '#10B981' }]} onPress={() => handleApprove(userDetails.user._id)}>
                        <Text style={styles.footerActionText}>Approve Student</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10, width: '100%', flexWrap: 'wrap' }}>
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
                        onPress={() => handleToggleActive(userDetails.user._id, userDetails.user.is_active, userDetails.user.name)}
                      >
                        <Text style={styles.footerActionText}>
                          {userDetails.user.is_active ? 'Deactivate' : 'Activate'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.footerActionBtn, { backgroundColor: '#7F1D1D' }]}
                        onPress={() => handleDeleteCompletely(userDetails.user._id, userDetails.user.name, userDetails.user.role)}
                      >
                        <Text style={styles.footerActionText}>Delete Permanently</Text>
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
              placeholder="e.g. miller@gmail.com"
              value={instructorForm.email}
              onChangeText={v => setInstructorForm({ ...instructorForm, email: v })}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>NIC Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 199912345678 or 991234567V"
              value={instructorForm.nic}
              onChangeText={v => setInstructorForm({ ...instructorForm, nic: v })}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +94 77 123 4567"
              value={instructorForm.phone}
              onChangeText={v => setInstructorForm({ ...instructorForm, phone: v })}
              keyboardType="phone-pad"
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
              <Icon name="checkmark-circle-outline" size={50} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>User Account Approved</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
              Student account created & registration number generated successfully.
            </Text>

            {approvedCredentials && (
              <View style={{ backgroundColor: '#111827', borderRadius: 12, padding: 16, width: '100%', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Registration No:</Text>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#10B981' }}>{approvedCredentials.index_number}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Temp Password:</Text>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#10B981' }}>{approvedCredentials.temp_password}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Student Email:</Text>
                  <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '500' }}>{approvedCredentials.email}</Text>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0FDFA', borderRadius: 8, padding: 10, marginBottom: 18 }}>
              <Icon name="shield-checkmark-outline" size={18} color="#0F766E" style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, fontSize: 12, color: '#0F766E', lineHeight: 16 }}>
                Temporary password expires in 7 days. Official portal credentials have been dispatched to the student's email.
              </Text>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#000000', borderRadius: 10, paddingVertical: 12, width: '100%', alignItems: 'center' }}
              onPress={() => setCredentialsModalVisible(false)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>Close & Return</Text>
            </TouchableOpacity>
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
            <View style={[
              styles.popupIconCircle,
              { backgroundColor: confirmModal.type === 'danger' ? '#FEE2E2' : confirmModal.type === 'lock' ? '#FEF3C7' : '#EFF6FF' }
            ]}>
              <Icon
                name={
                  confirmModal.type === 'danger'
                    ? 'alert-circle-outline'
                    : confirmModal.type === 'lock'
                    ? 'lock-closed-outline'
                    : 'information-circle-outline'
                }
                size={28}
                color={
                  confirmModal.type === 'danger'
                    ? '#DC2626'
                    : confirmModal.type === 'lock'
                    ? '#D97706'
                    : '#2563EB'
                }
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
                style={[
                  styles.popupConfirmBtn,
                  { backgroundColor: confirmModal.type === 'danger' ? '#DC2626' : confirmModal.type === 'lock' ? '#D97706' : '#2563EB' }
                ]}
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
                { backgroundColor: alertModal.type === 'error' ? '#DC2626' : alertModal.type === 'success' ? '#16A34A' : '#000000' }
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
    marginTop: 16,
  },
  addInstructorBtn: {
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
  addInstructorBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
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
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }
    }),
  },
  filterBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  segmentedTrackContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 26,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: 'inset 0px 1px 3px rgba(0, 0, 0, 0.04)' },
      default: {}
    }),
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 22,
  },
  segmentedTabActive: {
    backgroundColor: '#0F172A',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(15, 23, 42, 0.22)' },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
        elevation: 4,
      }
    }),
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  activeTabItem: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeTabText: {
    color: '#D97706',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 8,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'visible',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
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
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  statusBadge: {
    borderRadius: 16,
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
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    paddingTop: 12,
  },
  viewProfileBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  viewProfileText: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#F97316',
  },
  rejectOutlineBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  rejectOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  approveDarkBtn: {
    backgroundColor: '#000000',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.22)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 3 }
    }),
  },
  approveDarkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deactivateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  deactivateBtnText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },
  activateBtn: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  activateBtnText: {
    color: '#059669',
  },
  deletePermanentBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#991B1B',
    backgroundColor: '#7F1D1D',
    ...Platform.select({
      web: { boxShadow: '0px 3px 8px rgba(127, 29, 29, 0.3)' },
      default: { shadowColor: '#7F1D1D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 }
    }),
  },
  deletePermanentBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  filterOptionsPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterPanelTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
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
  assignBatchBtn: {
    backgroundColor: '#10B981',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(16, 185, 129, 0.3)' },
      default: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 }
    }),
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
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  closeModalIconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  detailSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryBannerInstructor: {
    backgroundColor: '#111827',
    borderRadius: 16,
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
    borderRadius: 10,
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
    borderRadius: 12,
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
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }
    }),
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
    borderRadius: 20,
    padding: 20,
    width: '88%',
    elevation: 6,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
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
    paddingHorizontal: 18,
    marginRight: 8,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  cancelModalText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  submitModalBtn: {
    backgroundColor: '#000000',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.25)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 4 }
    }),
  },
  submitModalText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 10px 24px rgba(0, 0, 0, 0.25)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 10 }
    }),
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
    borderRadius: 24,
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
    borderRadius: 24,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 }
    }),
  },
  popupConfirmText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  popupSingleBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 }
    }),
  },
  popupSingleBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15
  },

  rightCardCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'visible',
  },
  threeDotsBtn: {
    padding: 4,
  },

  /* INLINE WHATSAPP 3-DOTS DROPDOWN MENU STYLES */
  whatsappMenuContainer: {
    position: 'absolute',
    top: 28,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
    width: 140,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    zIndex: 99999,
    ...Platform.select({
      web: { boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.22)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 25 },
    }),
  },
  whatsappMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  whatsappMenuText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#1E293B',
  }
});
