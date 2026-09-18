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
  ScrollView,
  Platform,
  Image,
  Animated,
  LayoutAnimation,
  UIManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Share
} from 'react-native';
import api from '../../services/api';
import CustomDropdown from '../../components/shared/CustomDropdown';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import ApplicationsManagementScreen from './ApplicationsManagementScreen';
import ScreenHeader from '../../components/shared/ScreenHeader';
import * as Print from 'expo-print';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Tab = 'pending' | 'approved' | 'instructors';

const EXPORT_AVAILABLE_FIELDS = [
  { key: 'name', label: 'Full Name', defaultChecked: true },
  { key: 'email', label: 'Email Address', defaultChecked: true },
  { key: 'index_number', label: 'Reg No / Index', defaultChecked: true },
  { key: 'nic', label: 'NIC Number', defaultChecked: true },
  { key: 'phone', label: 'Phone Number', defaultChecked: true },
  { key: 'date_of_birth', label: 'Date of Birth', defaultChecked: false },
  { key: 'gender', label: 'Gender', defaultChecked: false },
  { key: 'address', label: 'Residential Address', defaultChecked: false },
  { key: 'role', label: 'Account Role', defaultChecked: false },
  { key: 'is_active', label: 'Account Status', defaultChecked: false },
  { key: 'createdAt', label: 'Joined Date', defaultChecked: false },
  { key: 'guardian_name', label: 'Guardian Name', defaultChecked: false },
  { key: 'guardian_phone', label: 'Guardian Phone', defaultChecked: false },
];

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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const headerAnim = useRef(new Animated.Value(1)).current;
  const isHeaderVisibleRef = useRef(true);
  const lastScrollY = useRef(0);

  // Top Header 3-Dots Menu, Select Mode & Export Modal States
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportTarget, setExportTarget] = useState<'all_filtered' | 'selected'>('all_filtered');
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>([
    'name',
    'email',
    'index_number',
    'nic',
    'phone'
  ]);

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

  // User Details Modal State
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedAppForReview, setSelectedAppForReview] = useState<any>(null);

  // Inline WhatsApp 3-Dots Options Menu State
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  // Add Instructor Modal & Liquid FAB Animation
  const [instructorModalVisible, setInstructorModalVisible] = useState(false);
  const [instructorForm, setInstructorForm] = useState({ name: '', email: '', phone: '', nic: '' });
  const [creatingInstructor, setCreatingInstructor] = useState(false);

  // Liquid FAB Animation State
  const wave1Anim = React.useRef(new Animated.Value(0)).current;
  const wave2Anim = React.useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (activeTab === 'instructors') {
      wave1Anim.setValue(0);
      wave2Anim.setValue(0);

      animation = Animated.loop(
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
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [activeTab]);

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

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const openExportModal = (target: 'all_filtered' | 'selected') => {
    setExportTarget(target);
    setExportModalVisible(true);
  };

  const toggleExportField = (fieldKey: string) => {
    setSelectedExportFields(prev =>
      prev.includes(fieldKey) ? prev.filter(k => k !== fieldKey) : [...prev, fieldKey]
    );
  };

  const handleExecuteExport = () => {
    const fieldsToExport = EXPORT_AVAILABLE_FIELDS.filter(f => selectedExportFields.includes(f.key));
    if (fieldsToExport.length === 0) {
      showAlert('Notice', 'Please select at least one field to include in the Excel export sheet.', undefined, 'info');
      return;
    }

    const targetList = exportTarget === 'selected'
      ? (users || []).filter(u => selectedUserIds.includes(u._id))
      : filteredUsers;

    if (!targetList || targetList.length === 0) {
      showAlert('Notice', 'No user records available to export.', undefined, 'info');
      return;
    }

    const headers = fieldsToExport.map(f => `"${f.label.replace(/"/g, '""')}"`).join(',');

    const rows = targetList.map(u => {
      return fieldsToExport.map(f => {
        let val = '';
        if (f.key === 'guardian_name') val = u.guardian?.name || '';
        else if (f.key === 'guardian_phone') val = u.guardian?.phone || '';
        else if (f.key === 'is_active') val = u.is_active ? 'Active' : 'Deactivated';
        else if (f.key === 'createdAt') val = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '';
        else val = u[f.key] !== undefined && u[f.key] !== null ? String(u[f.key]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvData = '\uFEFF' + [headers, ...rows].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TVTI_Users_Export_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData);
      if (typeof window !== 'undefined' && window.open) {
        window.open(dataUri, '_blank');
      }
    }

    setExportModalVisible(false);
    showAlert('Success', `Exported ${targetList.length} user records to Excel CSV sheet.`, undefined, 'success');
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) return;
    setConfirmModal({
      visible: true,
      title: '⚠️ Bulk Delete Users',
      message: `Are you sure you want to PERMANENTLY delete ${selectedUserIds.length} selected user(s) and ALL their data?\n\nThis action CANNOT be undone.`,
      type: 'danger',
      confirmText: `Delete ${selectedUserIds.length} Users`,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setLoading(true);
          for (const id of selectedUserIds) {
            try {
              await api.delete(`/admin/users/${id}/delete`);
            } catch (err) {
              console.warn(`Failed to delete user ${id}`, err);
            }
          }
          setSelectedUserIds([]);
          setIsSelectMode(false);
          fetchUsers();
          showAlert('Deleted', `Permanently deleted ${selectedUserIds.length} selected user(s).`, undefined, 'success');
        } catch (e: any) {
          showAlert('Error', 'Bulk deletion failed', undefined, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

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

  const renderPendingItem = ({ item }: { item: any }) => {
    const isSelected = selectedUserIds.includes(item._id);
    return (
      <TouchableOpacity
        style={[
          styles.card,
          isSelectMode && isSelected && styles.whatsappSelectedCard,
        ]}
        onPress={() => {
          if (isSelectMode) {
            toggleUserSelection(item._id);
          } else {
            handleOpenDetails(item._id);
          }
        }}
        onLongPress={() => {
          if (!isSelectMode) {
            setActiveMenuUserId(null);
            setIsSelectMode(true);
            toggleUserSelection(item._id);
          }
        }}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View style={{ position: 'relative' }}>
            {item.profile_photo ? (
              <Image source={{ uri: item.profile_photo }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Icon name="person" size={24} color="#475569" />
              </View>
            )}
            {isSelectMode && (
              <View style={[styles.whatsappCheckBadge, isSelected ? styles.whatsappCheckBadgeActive : styles.whatsappCheckBadgeInactive]}>
                <Icon name={isSelected ? "checkmark" : "add"} size={12} color={isSelected ? "#FFFFFF" : "#64748B"} />
              </View>
            )}
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
          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => {
              if (isSelectMode) toggleUserSelection(item._id);
              else handleOpenDetails(item._id);
            }}
          >
            <Text style={styles.viewProfileText}>View Profile →</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.smallRejectBtn}
              onPress={() => {
                if (isSelectMode) toggleUserSelection(item._id);
                else handleReject(item._id, item.name);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.smallRejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallApproveBtn}
              onPress={() => {
                if (isSelectMode) toggleUserSelection(item._id);
                else handleApprove(item._id);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.smallApproveBtnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStudentItem = ({ item }: { item: any }) => {
    const isMenuOpen = activeMenuUserId === item._id;
    const isSelected = selectedUserIds.includes(item._id);
    return (
      <TouchableOpacity
        style={[
          styles.card,
          !item.is_active && { opacity: 0.65 },
          isMenuOpen && { zIndex: 9999, elevation: 25 },
          isSelectMode && isSelected && styles.whatsappSelectedCard,
        ]}
        onPress={() => {
          if (isSelectMode) {
            toggleUserSelection(item._id);
          } else if (activeMenuUserId) {
            setActiveMenuUserId(null);
          } else {
            handleOpenDetails(item._id);
          }
        }}
        onLongPress={() => {
          if (!isSelectMode) {
            setActiveMenuUserId(null);
            setIsSelectMode(true);
            toggleUserSelection(item._id);
          }
        }}
        activeOpacity={0.75}
      >
        <View style={[styles.cardHeader, isMenuOpen && { zIndex: 9999 }]}>
          <View style={{ position: 'relative' }}>
            {item.profile_photo ? (
              <Image source={{ uri: item.profile_photo }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Icon name="person" size={24} color="#475569" />
              </View>
            )}
            {isSelectMode && (
              <View style={[styles.whatsappCheckBadge, isSelected ? styles.whatsappCheckBadgeActive : styles.whatsappCheckBadgeInactive]}>
                <Icon name={isSelected ? "checkmark" : "add"} size={12} color={isSelected ? "#FFFFFF" : "#64748B"} />
              </View>
            )}
          </View>

          <View style={styles.headerDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <Text style={styles.userSubtext}>Reg No: {item.index_number || item.nic || 'N/A'}</Text>
          </View>
          <View style={[styles.rightCardCol, isMenuOpen && { zIndex: 9999 }]}>
            {!isSelectMode && (
              <TouchableOpacity
                style={styles.threeDotsBtn}
                onPress={() => setActiveMenuUserId(isMenuOpen ? null : item._id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="ellipsis-vertical" size={20} color={isMenuOpen ? "#0F172A" : "#64748B"} />
              </TouchableOpacity>
            )}
            <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#D1FAE5' : '#FEE2E2', marginTop: 8 }]}>
              <Text style={[styles.statusBadgeText, { color: item.is_active ? '#065F46' : '#991B1B' }]}>
                {item.is_active ? 'Active' : 'Deactivated'}
              </Text>
            </View>

            {!isSelectMode && isMenuOpen && (
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
    const isSelected = selectedUserIds.includes(item._id);
    return (
      <TouchableOpacity
        style={[
          styles.card,
          !item.is_active && { opacity: 0.65 },
          isMenuOpen && { zIndex: 9999, elevation: 25 },
          isSelectMode && isSelected && styles.whatsappSelectedCard,
        ]}
        onPress={() => {
          if (isSelectMode) {
            toggleUserSelection(item._id);
          } else if (activeMenuUserId) {
            setActiveMenuUserId(null);
          } else {
            handleOpenDetails(item._id);
          }
        }}
        onLongPress={() => {
          if (!isSelectMode) {
            setActiveMenuUserId(null);
            setIsSelectMode(true);
            toggleUserSelection(item._id);
          }
        }}
        activeOpacity={0.75}
      >
        <View style={[styles.cardHeader, isMenuOpen && { zIndex: 9999 }]}>
          <View style={{ position: 'relative' }}>
            {item.profile_photo ? (
              <Image source={{ uri: item.profile_photo }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Icon name="person" size={24} color="#475569" />
              </View>
            )}
            {isSelectMode && (
              <View style={[styles.whatsappCheckBadge, isSelected ? styles.whatsappCheckBadgeActive : styles.whatsappCheckBadgeInactive]}>
                <Icon name={isSelected ? "checkmark" : "add"} size={12} color={isSelected ? "#FFFFFF" : "#64748B"} />
              </View>
            )}
          </View>
          <View style={styles.headerDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.phone ? <Text style={styles.userSubtext}>{item.phone}</Text> : null}
          </View>
          <View style={[styles.rightCardCol, isMenuOpen && { zIndex: 9999 }]}>
            {!isSelectMode && (
              <TouchableOpacity
                style={styles.threeDotsBtn}
                onPress={() => setActiveMenuUserId(isMenuOpen ? null : item._id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="ellipsis-vertical" size={20} color={isMenuOpen ? "#0F172A" : "#64748B"} />
              </TouchableOpacity>
            )}

            {!isSelectMode && isMenuOpen && (
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

  if (selectedAppForReview) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ApplicationsManagementScreen
          embedded={true}
          selectedApp={selectedAppForReview}
          onBack={() => setSelectedAppForReview(null)}
          onApproved={() => {
            setSelectedAppForReview(null);
            fetchUsers();
          }}
        />
      </SafeAreaView>
    );
  }

  const handleSaveUserPdf = async () => {
    if (!userDetails || !userDetails.user) return;
    try {
      const u = userDetails.user;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>User Profile Form - ${u.name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #0F172A; }
            .header { text-align: center; border-bottom: 2px solid #0F172A; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 20px; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; }
            .header p { margin: 4px 0 0 0; font-size: 13px; color: #64748B; }
            .section { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
            .section-title { font-size: 15px; font-weight: bold; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 10px; color: #0F172A; }
            .row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
            .label { font-weight: 600; color: #475569; }
            .val { color: #0F172A; text-align: right; }
            .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94A3B8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TWINTEC VOCATIONAL TRAINING INSTITUTE</h1>
            <h2 style="margin: 6px 0 0 0; font-size: 16px; color: #475569;">USER PROFILE FORM</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <div class="section-title">Personal & Contact Details</div>
            <div class="row"><span class="label">Full Name:</span><span class="val">${u.name || 'N/A'}</span></div>
            <div class="row"><span class="label">Email:</span><span class="val">${u.email || 'N/A'}</span></div>
            <div class="row"><span class="label">Role:</span><span class="val">${u.role ? u.role.toUpperCase() : 'STUDENT'}</span></div>
            <div class="row"><span class="label">Reg No / Index:</span><span class="val">${u.index_number || 'N/A'}</span></div>
            <div class="row"><span class="label">NIC Number:</span><span class="val">${u.nic || 'N/A'}</span></div>
            <div class="row"><span class="label">Phone:</span><span class="val">${u.phone || 'N/A'}</span></div>
            <div class="row"><span class="label">Date of Birth:</span><span class="val">${u.date_of_birth || 'N/A'}</span></div>
            <div class="row"><span class="label">Gender:</span><span class="val">${u.gender || 'N/A'}</span></div>
            <div class="row"><span class="label">Address:</span><span class="val">${u.address || 'N/A'}</span></div>
          </div>

          ${u.guardian ? `
          <div class="section">
            <div class="section-title">Guardian Information</div>
            <div class="row"><span class="label">Guardian Name:</span><span class="val">${u.guardian.name || 'N/A'}</span></div>
            <div class="row"><span class="label">Relationship:</span><span class="val">${u.guardian.relationship || 'N/A'}</span></div>
            <div class="row"><span class="label">Guardian Phone:</span><span class="val">${u.guardian.phone || 'N/A'}</span></div>
          </div>
          ` : ''}

          ${u.educational_qualification ? `
          <div class="section">
            <div class="section-title">Educational Qualifications</div>
            <div class="row"><span class="label">Highest Level:</span><span class="val">${u.educational_qualification.highest_level || 'N/A'}</span></div>
            <div class="row"><span class="label">Grade / Result:</span><span class="val">${u.educational_qualification.grade_level || 'N/A'}</span></div>
            <div class="row"><span class="label">Institute:</span><span class="val">${u.educational_qualification.institute_name || 'N/A'}</span></div>
          </div>
          ` : ''}

          ${u.payment_info ? `
          <div class="section">
            <div class="section-title">Payment Information</div>
            <div class="row"><span class="label">Payment Method:</span><span class="val">${u.payment_info.payment_method === 'bank_transfer' ? 'Bank Deposit Slip' : 'Cash at Counter'}</span></div>
            <div class="row"><span class="label">Payment Status:</span><span class="val">${u.payment_info.payment_status ? u.payment_info.payment_status.toUpperCase() : 'PENDING'}</span></div>
            <div class="row"><span class="label">Total Course Fee:</span><span class="val">LKR ${u.payment_info.total_fee ? u.payment_info.total_fee.toLocaleString() : '0'}</span></div>
            <div class="row"><span class="label">Amount Paid:</span><span class="val">LKR ${u.payment_info.amount_paid ? u.payment_info.amount_paid.toLocaleString() : '0'}</span></div>
          </div>
          ` : ''}

          <div class="footer">
            <p>Twintec Vocational Training Institute · Official Records</p>
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        await Print.printAsync({ html: htmlContent });
      }
    } catch (e) {
      console.warn('Failed to print PDF', e);
      if (Platform.OS === 'web') window.alert('Failed to generate PDF document.');
      else Alert.alert('Error', 'Failed to generate PDF document.');
    }
  };

  const handleShareUserPdf = async () => {
    if (!userDetails || !userDetails.user) return;
    try {
      const u = userDetails.user;
      const shareMessage = `Twintec VTI - User Profile Dossier\nName: ${u.name}\nEmail: ${u.email}\nReg No: ${u.index_number || u.nic || 'N/A'}\nRole: ${u.role ? u.role.toUpperCase() : 'STUDENT'}`;

      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({
            title: `User Dossier - ${u.name}`,
            text: shareMessage,
          });
        } else {
          handleSaveUserPdf();
        }
      } else {
        const { uri } = await Print.printToFileAsync({
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>User Profile Form - ${u.name}</title>
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #0F172A; }
                .header { text-align: center; border-bottom: 2px solid #0F172A; padding-bottom: 12px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 20px; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; }
                .header p { margin: 4px 0 0 0; font-size: 13px; color: #64748B; }
                .section { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
                .section-title { font-size: 15px; font-weight: bold; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 10px; color: #0F172A; }
                .row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
                .label { font-weight: 600; color: #475569; }
                .val { color: #0F172A; text-align: right; }
                .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94A3B8; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>TWINTEC VOCATIONAL TRAINING INSTITUTE</h1>
                <h2 style="margin: 6px 0 0 0; font-size: 16px; color: #475569;">USER PROFILE FORM</h2>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
              </div>
              <div class="section">
                <div class="section-title">Personal & Contact Details</div>
                <div class="row"><span class="label">Full Name:</span><span class="val">${u.name || 'N/A'}</span></div>
                <div class="row"><span class="label">Email:</span><span class="val">${u.email || 'N/A'}</span></div>
                <div class="row"><span class="label">Role:</span><span class="val">${u.role ? u.role.toUpperCase() : 'STUDENT'}</span></div>
                <div class="row"><span class="label">Reg No / Index:</span><span class="val">${u.index_number || 'N/A'}</span></div>
                <div class="row"><span class="label">NIC Number:</span><span class="val">${u.nic || 'N/A'}</span></div>
                <div class="row"><span class="label">Phone:</span><span class="val">${u.phone || 'N/A'}</span></div>
                <div class="row"><span class="label">Date of Birth:</span><span class="val">${u.date_of_birth || 'N/A'}</span></div>
                <div class="row"><span class="label">Gender:</span><span class="val">${u.gender || 'N/A'}</span></div>
                <div class="row"><span class="label">Address:</span><span class="val">${u.address || 'N/A'}</span></div>
              </div>
              ${u.guardian ? `
              <div class="section">
                <div class="section-title">Guardian Information</div>
                <div class="row"><span class="label">Guardian Name:</span><span class="val">${u.guardian.name || 'N/A'}</span></div>
                <div class="row"><span class="label">Relationship:</span><span class="val">${u.guardian.relationship || 'N/A'}</span></div>
                <div class="row"><span class="label">Guardian Phone:</span><span class="val">${u.guardian.phone || 'N/A'}</span></div>
              </div>
              ` : ''}
              <div class="footer">
                <p>Twintec Vocational Training Institute · Official Records</p>
              </div>
            </body>
            </html>
          `
        });
        await Share.share({
          message: shareMessage,
          url: uri,
          title: `User Dossier - ${u.name}`
        });
      }
    } catch (e) {
      console.warn('Failed to share PDF document', e);
    }
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
      {isSelectMode ? (
        <View style={styles.whatsappHeaderBar}>
          <View style={styles.whatsappHeaderLeft}>
            <TouchableOpacity
              style={styles.whatsappHeaderIconBtn}
              onPress={() => {
                setIsSelectMode(false);
                setSelectedUserIds([]);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.whatsappHeaderTitle}>
              {selectedUserIds.length}
            </Text>
          </View>

          <View style={styles.whatsappHeaderActions}>
            <TouchableOpacity
              style={styles.whatsappHeaderIconBtn}
              onPress={() => {
                if (selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0) {
                  setSelectedUserIds([]);
                } else {
                  setSelectedUserIds(filteredUsers.map(u => u._id));
                }
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? "checkmark-done" : "checkmark-done-circle-outline"}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.whatsappHeaderIconBtn, selectedUserIds.length === 0 && { opacity: 0.4 }]}
              disabled={selectedUserIds.length === 0}
              onPress={() => openExportModal('selected')}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="download-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.whatsappHeaderIconBtn, selectedUserIds.length === 0 && { opacity: 0.4 }]}
              disabled={selectedUserIds.length === 0}
              onPress={handleBulkDelete}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="trash-outline" size={22} color={selectedUserIds.length > 0 ? "#EF4444" : "#FFFFFF"} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScreenHeader
          title="User Management"
          subtitle="Manage student admissions & instructor staff"
          rightElement={
            <View style={{ position: 'relative', zIndex: 99999 }}>
              <TouchableOpacity
                style={{
                  padding: 6,
                  borderRadius: 8,
                  backgroundColor: headerMenuOpen ? '#F1F5F9' : 'transparent',
                }}
                onPress={() => setHeaderMenuOpen(!headerMenuOpen)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="ellipsis-vertical" size={22} color="#0F172A" />
              </TouchableOpacity>

              {headerMenuOpen && (
                <View style={styles.headerDropdownMenu}>
                  <TouchableOpacity
                    style={styles.headerDropdownItem}
                    onPress={() => {
                      setHeaderMenuOpen(false);
                      setIsSelectMode(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="checkbox-outline" size={18} color="#0F172A" style={{ marginRight: 10 }} />
                    <Text style={styles.headerDropdownText}>Select Mode</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.headerDropdownItem, { borderBottomWidth: 0 }]}
                    onPress={() => {
                      setHeaderMenuOpen(false);
                      openExportModal('all_filtered');
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="download-outline" size={18} color="#0F172A" style={{ marginRight: 10 }} />
                    <Text style={styles.headerDropdownText}>Export Excel Sheet</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
        />
      )}
      {/* Sleek Segmented Pill Track Header */}
      <View style={styles.segmentedTrackContainer}>
        <View style={styles.segmentedTrack}>
          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'pending' && styles.segmentedTabActive]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.8}
          >
            <Icon
              name={activeTab === 'pending' ? 'document-text' : 'document-text-outline'}
              size={16}
              color={activeTab === 'pending' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentedTabText, activeTab === 'pending' && styles.segmentedTabTextActive]}>
              Applications
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'approved' && styles.segmentedTabActive]}
            onPress={() => setActiveTab('approved')}
            activeOpacity={0.8}
          >
            <Icon
              name={activeTab === 'approved' ? 'people' : 'people-outline'}
              size={16}
              color={activeTab === 'approved' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentedTabText, activeTab === 'approved' && styles.segmentedTabTextActive]}>
              Students
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
        <ApplicationsManagementScreen
          embedded={true}
          onApproved={fetchUsers}
          onSelectAppForReview={(app) => setSelectedAppForReview(app)}
        />
      ) : (
        <>
          {/* Search & Filters with Smooth Animation */}
          <Animated.View
            style={{
              maxHeight: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, showFilter && activeTab === 'approved' ? 120 : 64],
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
                  placeholder="Search by name, email, reg no, or NIC..."
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
              >
                <Icon name="options-outline" size={18} color={showFilter ? '#FFFFFF' : '#374151'} style={{ marginRight: 6 }} />
                <Text style={[styles.filterBtnText, showFilter && { color: '#FFFFFF' }]}>Filters</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Options Panel for Approved Tab */}
            {showFilter && activeTab === 'approved' && (
              <View style={styles.filterOptionsPanel}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
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
          </Animated.View>

          {/* Content List */}
          {loading ? (
            <ActivityIndicator size="large" color="#000000" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={item => item._id}
              onScroll={handleScroll}
              scrollEventThrottle={16}
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
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 110 }}
              ListEmptyComponent={<Text style={styles.emptyListText}>No users found in this tab.</Text>}
            />
          )}
        </>
      )}

      {/* Floating Add Instructor Liquid FAB Button */}
      {activeTab === 'instructors' && (
        <View style={styles.liquidFabContainer} pointerEvents="box-none">
          {/* Outer Liquid Ripple Wave Layer 1 */}
          <Animated.View
            style={[
              styles.liquidWaveRing,
              {
                transform: [{ scale: wave1Scale }],
                opacity: wave1Opacity,
              },
            ]}
          />

          {/* Outer Liquid Ripple Wave Layer 2 */}
          <Animated.View
            style={[
              styles.liquidWaveRingSecond,
              {
                transform: [{ scale: wave2Scale }],
                opacity: wave2Opacity,
              },
            ]}
          />

          {/* Main Liquid Glass FAB Button */}
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity
              style={styles.liquidFabButton}
              onPress={() => setInstructorModalVisible(true)}
              onPressIn={handleFabPressIn}
              onPressOut={handleFabPressOut}
              activeOpacity={0.9}
            >
              {/* Glass Sheen Reflection Arc */}
              <View style={styles.liquidGlassSheen} />

              {/* Glossy Core Icon */}
              <View style={styles.liquidInnerCore}>
                <Icon name="add" size={32} color="#FFFFFF" style={styles.liquidPlusIcon} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}





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

      {/* EXPORT SETTINGS MODAL */}
      <Modal visible={exportModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="document-text-outline" size={24} color="#0F172A" style={{ marginRight: 8 }} />
                <Text style={styles.exportModalTitle}>Excel Export Settings</Text>
              </View>
              <TouchableOpacity onPress={() => setExportModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.exportModalSub}>
              Select columns/fields to include in the Excel file ({exportTarget === 'selected' ? `${selectedUserIds.length} Selected Users` : `${filteredUsers.length} Users`}):
            </Text>

            {/* Quick Actions */}
            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
              <TouchableOpacity
                style={styles.fieldQuickBtn}
                onPress={() => setSelectedExportFields(EXPORT_AVAILABLE_FIELDS.map(f => f.key))}
              >
                <Text style={styles.fieldQuickBtnText}>Select All Fields</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fieldQuickBtn}
                onPress={() => setSelectedExportFields(['name', 'email', 'index_number', 'nic', 'phone'])}
              >
                <Text style={styles.fieldQuickBtnText}>Reset Defaults</Text>
              </TouchableOpacity>
            </View>

            {/* Field Checkboxes */}
            <ScrollView style={{ maxHeight: 270, marginVertical: 6 }} showsVerticalScrollIndicator={true}>
              {EXPORT_AVAILABLE_FIELDS.map(field => {
                const isChecked = selectedExportFields.includes(field.key);
                return (
                  <TouchableOpacity
                    key={field.key}
                    style={[styles.fieldCheckboxRow, isChecked && styles.fieldCheckboxRowActive]}
                    onPress={() => toggleExportField(field.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.fieldBox, isChecked && styles.fieldBoxActive]}>
                      {isChecked && <Icon name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.fieldRowLabel, isChecked && styles.fieldRowLabelActive]}>
                      {field.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Modal Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.cancelExportBtn}
                onPress={() => setExportModalVisible(false)}
              >
                <Text style={styles.cancelExportBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmExportBtn}
                onPress={handleExecuteExport}
              >
                <Icon name="download-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmExportBtnText}>Download Excel Sheet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* USER DOSSIER DETAILS MODAL (POPUP) */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setDetailsModalVisible(false);
          setUserDetails(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '88%', width: '92%', maxWidth: 650, padding: 0, overflow: 'hidden' }]}>
            {loadingDetails || !userDetails ? (
              <View style={styles.modalLoadingContainer}>
                <View style={{ width: '100%', paddingHorizontal: 16, paddingTop: 16, alignItems: 'flex-end' }}>
                  <TouchableOpacity
                    onPress={() => {
                      setDetailsModalVisible(false);
                      setUserDetails(null);
                    }}
                    activeOpacity={0.7}
                    style={{ padding: 4 }}
                  >
                    <Icon name="close" size={22} color="#4B5563" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#000000" />
                  <Text style={styles.modalLoadingText}>Loading complete profile...</Text>
                </View>
              </View>
            ) : (
              <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                {/* Dossier Header matching Batch viewing modal */}
                <View style={styles.detailsHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailsName}>{userDetails.user.name}</Text>
                    <Text style={styles.detailsEmail}>
                      {userDetails.user.email} • {userDetails.user.role ? userDetails.user.role.toUpperCase() : ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.closeModalIconBtn}
                      onPress={handleSaveUserPdf}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="document-text-outline" size={20} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.closeModalIconBtn}
                      onPress={handleShareUserPdf}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="share-social-outline" size={20} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.closeModalIconBtn}
                      onPress={() => {
                        setDetailsModalVisible(false);
                        setUserDetails(null);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="close" size={22} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Scrollable Body */}
                <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14 }} showsVerticalScrollIndicator={false}>
                  {/* Profile Summary Header Card */}
                  <View style={styles.infoSectionCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {userDetails.user.profile_photo ? (
                        <Image source={{ uri: userDetails.user.profile_photo }} style={styles.modalAvatarImg} />
                      ) : (
                        <View style={styles.infoAvatarCircle}>
                          <Icon name="person" size={26} color="#FFFFFF" />
                        </View>
                      )}
                      <View style={{ marginLeft: 14, flex: 1 }}>
                        <Text style={styles.infoStudentName}>{userDetails.user.name}</Text>
                        <Text style={styles.infoStudentEmail}>{userDetails.user.email}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                          <View style={[styles.statusBadge, { backgroundColor: userDetails.user.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
                            <Text style={[styles.statusBadgeText, { color: userDetails.user.is_active ? '#065F46' : '#991B1B' }]}>
                              {userDetails.user.is_active ? 'Active' : 'Deactivated'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* SECTION 1: Personal Information Card */}
                  <View style={styles.infoSectionCard}>
                    <Text style={styles.sectionCardHeaderTitle}>Personal Information</Text>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Full Name:</Text>
                      <Text style={styles.infoVal}>{userDetails.user.name || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Email Address:</Text>
                      <Text style={styles.infoVal}>{userDetails.user.email || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Reg No / Index:</Text>
                      <Text style={styles.infoVal}>{userDetails.user.index_number || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>NIC Number:</Text>
                      <Text style={styles.infoVal}>{userDetails.user.nic || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone Number:</Text>
                      <Text style={styles.infoVal}>{userDetails.user.phone || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Date of Birth:</Text>
                      <Text style={styles.infoVal}>{userDetails.user.date_of_birth || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Gender:</Text>
                      <Text style={styles.infoVal}>{userDetails.user.gender || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Address:</Text>
                      <Text style={styles.infoVal}>{userDetails.user.address || 'N/A'}</Text>
                    </View>
                  </View>

                  {/* SECTION 2: Guardian Information */}
                  {userDetails.user.guardian && (
                    <View style={styles.infoSectionCard}>
                      <Text style={styles.sectionCardHeaderTitle}>Guardian Information</Text>
                      <View style={styles.infoDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Guardian Name:</Text>
                        <Text style={styles.infoVal}>{userDetails.user.guardian.name || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Relationship:</Text>
                        <Text style={styles.infoVal}>{userDetails.user.guardian.relationship || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Guardian Phone:</Text>
                        <Text style={styles.infoVal}>{userDetails.user.guardian.phone || 'N/A'}</Text>
                      </View>
                    </View>
                  )}

                  {/* SECTION 3: Educational Qualifications */}
                  {userDetails.user.educational_qualification && (
                    <View style={styles.infoSectionCard}>
                      <Text style={styles.sectionCardHeaderTitle}>Educational Qualifications</Text>
                      <View style={styles.infoDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Highest Qualification:</Text>
                        <Text style={styles.infoVal}>{userDetails.user.educational_qualification.highest_level || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Grade / Result:</Text>
                        <Text style={styles.infoVal}>{userDetails.user.educational_qualification.grade_level || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Institute Name:</Text>
                        <Text style={styles.infoVal}>{userDetails.user.educational_qualification.institute_name || 'N/A'}</Text>
                      </View>
                    </View>
                  )}

                  {/* SECTION 4: Tuition & Financial Info */}
                  {userDetails.user.payment_info && (
                    <View style={styles.infoSectionCard}>
                      <Text style={styles.sectionCardHeaderTitle}>Tuition & Financial Info</Text>
                      <View style={styles.infoDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Payment Method:</Text>
                        <Text style={styles.infoVal}>{userDetails.user.payment_info.payment_method === 'bank_transfer' ? 'Bank Deposit Slip' : 'Cash at Counter'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Payment Status:</Text>
                        <Text style={[styles.infoVal, { fontWeight: 'bold', color: userDetails.user.payment_info.payment_status === 'paid' ? '#059669' : '#D97706' }]}>
                          {userDetails.user.payment_info.payment_status ? userDetails.user.payment_info.payment_status.toUpperCase() : 'PENDING'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Total Course Fee:</Text>
                        <Text style={styles.infoVal}>LKR {userDetails.user.payment_info.total_fee ? userDetails.user.payment_info.total_fee.toLocaleString() : '0'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Amount Paid:</Text>
                        <Text style={[styles.infoVal, { color: '#059669', fontWeight: 'bold' }]}>LKR {userDetails.user.payment_info.amount_paid ? userDetails.user.payment_info.amount_paid.toLocaleString() : '0'}</Text>
                      </View>
                    </View>
                  )}

                  {/* SECTION 5: Academic Enrollments Card */}
                  {userDetails.user.role === 'student' && (
                    <View style={styles.infoSectionCard}>
                      <Text style={styles.sectionCardHeaderTitle}>Academic Enrollments</Text>
                      <View style={styles.infoDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Overall Average Marks:</Text>
                        <Text style={[styles.infoVal, { color: '#2563EB', fontWeight: 'bold' }]}>{userDetails.averageMark}%</Text>
                      </View>
                      {(!userDetails.enrollments || userDetails.enrollments.length === 0) ? (
                        <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>No active batch enrollments yet.</Text>
                      ) : (
                        userDetails.enrollments.map((e: any) => (
                          <View key={e._id} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0F172A' }}>{e.batch_id?.course_id?.title || 'Course'}</Text>
                            <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>Batch: {e.batch_id?.name || 'Batch'} · {e.batch_id?.course_id?.duration_weeks} Weeks</Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}

                  {/* INSTRUCTOR SPECIFIC DETAILS CARD */}
                  {userDetails.user.role === 'instructor' && (
                    <View style={styles.infoSectionCard}>
                      <Text style={styles.sectionCardHeaderTitle}>Teaching Assignments</Text>
                      <View style={styles.infoDivider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Assigned Batches:</Text>
                        <Text style={styles.infoVal}>{userDetails.assignedBatches?.length || 0} Active Batches</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Total Enrolled Students:</Text>
                        <Text style={styles.infoVal}>{userDetails.totalStudents || 0}</Text>
                      </View>
                    </View>
                  )}

                  <View style={{ height: 20 }} />
                </ScrollView>

                {/* Stable Bottom Actions matching Batch dossier */}
                <View style={styles.detailsFooter}>
                  {userDetails.user.role === 'student' && !userDetails.user.is_active ? (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={[styles.footerActionBtn, { backgroundColor: '#E2E8F0' }]}
                        onPress={() => handleReject(userDetails.user._id, userDetails.user.name)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.footerActionText, { color: '#1E293B' }]}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.footerActionBtn, { backgroundColor: '#F58220' }]}
                        onPress={() => handleApprove(userDetails.user._id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.footerActionText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {userDetails.user.role === 'student' && (
                        <TouchableOpacity
                          style={[styles.footerActionBtn, { backgroundColor: '#2563EB' }]}
                          onPress={() => {
                            setAssignStudentId(userDetails.user._id);
                            setAssignModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Icon name="library-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.footerActionText}>Assign Batch</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.footerActionBtn, { backgroundColor: userDetails.user.is_active ? '#D97706' : '#10B981' }]}
                        onPress={() => handleToggleActive(userDetails.user._id, userDetails.user.is_active, userDetails.user.name)}
                        activeOpacity={0.8}
                      >
                        <Icon name={userDetails.user.is_active ? "pause-circle" : "play-circle"} size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.footerActionText}>
                          {userDetails.user.is_active ? 'Deactivate' : 'Activate'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.footerActionBtn, { backgroundColor: '#7F1D1D' }]}
                        onPress={() => handleDeleteCompletely(userDetails.user._id, userDetails.user.name, userDetails.user.role)}
                        activeOpacity={0.8}
                      >
                        <Icon name="trash-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.footerActionText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
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
  dossierBackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  savePdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  savePdfBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rightAlignedActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 40,
    width: '100%',
  },
  smallRejectBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallRejectBtnText: {
    color: '#1E293B',
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallApproveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F58220',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallApproveBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  /* PLAIN MINIMAL DESIGN STYLES */
  plainProfileHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  plainAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 14,
    backgroundColor: '#E5E7EB',
  },
  plainAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  plainNameText: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#000000',
  },
  plainSubText: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  plainSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
  },
  plainRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  plainLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  plainValue: {
    fontSize: 14,
    color: '#000000',
    marginTop: 2,
  },
  embeddedActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  /* HARDCOPY PAPER APPLICATION FORM STYLES */
  hardcopyFormSheet: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  formOfficialHeader: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A',
  },
  formHeaderCrestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  formCrestBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 10,
  },
  formCrestBadgeText: {
    color: '#F58220',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  formInstituteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  formDocumentTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  formRefMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  formRefNoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  formStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  formStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.4,
  },
  pendingDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    marginRight: 5,
  },
  formSectionBanner: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 16,
    marginBottom: 10,
  },
  formSectionBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  formProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  formAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#0F172A',
    marginRight: 14,
  },
  formAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  formApplicantFullName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  formApplicantEmail: {
    fontSize: 13,
    color: '#475569',
    marginTop: 1,
    fontWeight: '500',
  },
  formOtpVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formOtpVerifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  formFieldRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  formFieldCell: {
    flex: 1,
  },
  formFieldFullRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  formCellLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  formCellValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  formBatchItemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formBatchItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  formBatchItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  /* EXECUTIVE PROFESSIONAL BUTTONS */
  profRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(220, 38, 38, 0.28)' },
      default: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 3 }
    }),
  },
  profApproveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 }
    }),
  },
  profAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 3px 10px rgba(37, 99, 235, 0.28)' },
      default: { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 3 }
    }),
  },
  profDeactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 3px 10px rgba(217, 119, 6, 0.28)' },
      default: { shadowColor: '#D97706', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 3 }
    }),
  },
  profActivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 3px 10px rgba(5, 150, 105, 0.28)' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 3 }
    }),
  },
  profDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 3px 10px rgba(220, 38, 38, 0.28)' },
      default: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 3 }
    }),
  },
  profBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
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
    marginBottom: 8,
    marginTop: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 40,
    marginRight: 10,
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
    borderColor: '#D1D5DB',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 40,
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
    fontSize: 13.5,
    fontWeight: '600',
    color: '#374151',
  },
  segmentedTrackContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
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
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailSectionAccent: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#F58220',
    marginRight: 8,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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

  /* PROFESSIONAL COLORED ACTION BUTTON STYLES */
  coloredRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 140,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' },
      default: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }
    }),
  },
  coloredApproveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 140,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 }
    }),
  },
  coloredAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' },
      default: { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 }
    }),
  },
  coloredDeactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)' },
      default: { shadowColor: '#D97706', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 }
    }),
  },
  coloredActivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 }
    }),
  },
  coloredDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' },
      default: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 }
    }),
  },
  coloredBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },

  /* STRUCTURED CARD STYLES */
  infoSectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }
    }),
  },
  sectionCardHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  modalAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
  },
  infoAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoStudentName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  infoStudentEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  /* HEADER DROPDOWN MENU STYLES */
  headerDropdownMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    zIndex: 99999,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 12 }
    }),
  },
  headerDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerDropdownText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  /* SELECT MODE BANNER STYLES */
  selectModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectModePillBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  selectModePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  selectCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  selectActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeSelectBtn: {
    padding: 4,
    marginLeft: 4,
  },
  /* CHECKBOX & SELECTION STYLES */
  selectCheckboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  selectCheckboxCircleActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  selectedCardHighlight: {
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    backgroundColor: '#F0F9FF',
  },
  /* EXPORT MODAL STYLES */
  exportModalCard: {
    width: '92%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      web: { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 16 }
    }),
  },
  exportModalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  exportModalSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  fieldQuickBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fieldQuickBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  fieldCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldCheckboxRowActive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  fieldBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  fieldBoxActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  fieldRowLabel: {
    fontSize: 13.5,
    color: '#475569',
  },
  fieldRowLabelActive: {
    fontWeight: '600',
    color: '#0F172A',
  },
  cancelExportBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelExportBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  confirmExportBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  confirmExportBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  /* WHATSAPP CONTEXTUAL SELECTION STYLES */
  whatsappHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  whatsappHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  whatsappHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  whatsappHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  whatsappHeaderIconBtn: {
    padding: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappSelectedCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
  },
  whatsappCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  whatsappCheckBadgeActive: {
    backgroundColor: '#16A34A',
  },
  whatsappCheckBadgeInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
});
