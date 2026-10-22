import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import ApplicationsManagementScreen from './ApplicationsManagementScreen';
import ScreenHeader from '../../components/shared/ScreenHeader';
import WhatsAppOptionsMenu from '../../components/shared/WhatsAppOptionsMenu';
import WhatsAppSelectionHeader from '../../components/shared/WhatsAppSelectionHeader';
import * as Print from 'expo-print';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !(global as any).nativeFabricUIManager) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type ModeType = 'applications' | 'students' | 'payments' | 'instructors';

export type ApplicationsSubFilter = 'pending' | 'approved' | 'rejected';
export type StudentsSubFilter = 'all' | 'active' | 'deactive' | 'completed';
export type PaymentsSubFilter = 'pending' | 'completed';
export type InstructorsSubFilter = 'active' | 'deactive';

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
  let initialMode: ModeType = 'applications';
  let initialView: 'hub' | 'detail' = 'hub';
  try {
    const route = useRoute<any>();
    if (route?.params?.initialTab) {
      initialView = 'detail';
      const tab = route.params.initialTab;
      if (tab === 'pending') initialMode = 'applications';
      else if (tab === 'approved') initialMode = 'students';
      else if (tab === 'instructors') initialMode = 'instructors';
    }
  } catch (e) {}

  const [currentView, setCurrentView] = useState<'hub' | 'detail'>(initialView);
  const [activeMode, setActiveMode] = useState<ModeType>(initialMode);
  const [applicationsSubFilter, setApplicationsSubFilter] = useState<ApplicationsSubFilter>('pending');
  const [studentsSubFilter, setStudentsSubFilter] = useState<StudentsSubFilter>('all');
  const [paymentsSubFilter, setPaymentsSubFilter] = useState<PaymentsSubFilter>('pending');
  const [instructorsSubFilter, setInstructorsSubFilter] = useState<InstructorsSubFilter>('active');

  const [applicationsList, setApplicationsList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [instructorsList, setInstructorsList] = useState<any[]>([]);
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
    if (activeMode === 'instructors') {
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
  }, [activeMode]);

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

  // Payment Management & Dossier States
  const [adminPaymentsList, setAdminPaymentsList] = useState<any[]>([]);
  const [paymentDossierModalVisible, setPaymentDossierModalVisible] = useState(false);
  const [paymentDossierData, setPaymentDossierData] = useState<any>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [manualPayModalVisible, setManualPayModalVisible] = useState(false);
  const [manualPayForm, setManualPayForm] = useState({ amount: '', payment_method: 'physical_cash', notes: '' });
  const [recordingManualPay, setRecordingManualPay] = useState(false);
  const [rejectSlipModalVisible, setRejectSlipModalVisible] = useState(false);
  const [rejectSlipForm, setRejectSlipForm] = useState({ slipId: '', reason: '' });
  const [rejectingSlip, setRejectingSlip] = useState(false);
  const [verifyingSlipId, setVerifyingSlipId] = useState<string | null>(null);
  const [dossierZoomImage, setDossierZoomImage] = useState<string | null>(null);

  useEffect(() => {
    fetchAllDashboardData();
    fetchBatches();
  }, []);
  const fetchBatches = async () => {
    try {
      const res = await api.get('/admin/batches');
      setBatches(res.data);
      if (res.data.length > 0) setAssignBatchId(res.data[0]._id);
    } catch (e) {
      console.warn('Failed to fetch batches');
    }
  };

  const fetchAllDashboardData = async () => {
    setLoading(true);
    try {
      const [appsRes, studentsRes, instRes, paymentsRes] = await Promise.allSettled([
        api.get('/admin/applications?status=all'),
        api.get('/admin/users?role=student'),
        api.get('/admin/users?role=instructor'),
        api.get('/admin/payments'),
      ]);

      if (appsRes.status === 'fulfilled') {
        setApplicationsList(appsRes.value.data || []);
      }
      if (studentsRes.status === 'fulfilled') {
        setStudentsList(studentsRes.value.data || []);
      }
      if (instRes.status === 'fulfilled') {
        setInstructorsList(instRes.value.data || []);
      }
      if (paymentsRes.status === 'fulfilled') {
        setAdminPaymentsList(paymentsRes.value.data || []);
      }
    } catch (e: any) {
      console.warn('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = () => {
    fetchAllDashboardData();
  };

  const handleOpenPaymentDossier = async (studentId: string) => {
    setPaymentDossierModalVisible(true);
    setLoadingDossier(true);
    try {
      const res = await api.get(`/admin/payments/${studentId}/dossier`);
      setPaymentDossierData(res.data);
    } catch (e: any) {
      showAlert('Error', 'Failed to load student payment dossier', undefined, 'error');
      setPaymentDossierModalVisible(false);
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleVerifySlip = async (slipId: string) => {
    setVerifyingSlipId(slipId);
    try {
      await api.put(`/admin/payments/slips/${slipId}/verify`);
      showAlert('Success', 'Payment slip verified and credited to student account!', undefined, 'success');
      if (paymentDossierData?.student?._id) {
        handleOpenPaymentDossier(paymentDossierData.student._id);
      }
      fetchAllDashboardData();
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Verification failed', undefined, 'error');
    } finally {
      setVerifyingSlipId(null);
    }
  };

  const handlePromptVerifySlip = (slip: any) => {
    if (paymentDossierModalVisible) {
      setPaymentDossierModalVisible(false);
    }
    const studentName = paymentDossierData?.student?.name || 'this student';
    setConfirmModal({
      visible: true,
      title: 'Approve Payment Slip',
      message: `Are you sure you want to verify this payment slip of LKR ${(slip.amount || 0).toLocaleString()} for ${studentName}?\n\nThis amount will be credited to their official account balance.`,
      type: 'info',
      confirmText: 'Approve & Credit',
      cancelText: 'Cancel',
      onConfirm: () => {
        handleVerifySlip(slip._id);
      }
    });
  };

  const handlePromptRejectSlip = (slip: any) => {
    if (paymentDossierModalVisible) {
      setPaymentDossierModalVisible(false);
    }
    const studentName = paymentDossierData?.student?.name || 'this student';
    setConfirmModal({
      visible: true,
      title: 'Reject Payment Slip',
      message: `Are you sure you want to reject the payment slip of LKR ${(slip.amount || 0).toLocaleString()} for ${studentName}?`,
      type: 'danger',
      confirmText: 'Reject Slip',
      cancelText: 'Cancel',
      onConfirm: () => {
        setRejectSlipForm({ slipId: slip._id, reason: '' });
        setRejectSlipModalVisible(true);
      }
    });
  };

  const handleRejectSlipSubmit = async () => {
    if (!rejectSlipForm.slipId) return;
    setRejectingSlip(true);
    try {
      await api.put(`/admin/payments/slips/${rejectSlipForm.slipId}/reject`, { reason: rejectSlipForm.reason });
      showAlert('Slip Rejected', 'Payment slip rejected and student notified.', undefined, 'info');
      setRejectSlipModalVisible(false);
      setRejectSlipForm({ slipId: '', reason: '' });
      if (paymentDossierData?.student?._id) {
        handleOpenPaymentDossier(paymentDossierData.student._id);
      }
      fetchAllDashboardData();
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Rejection failed', undefined, 'error');
    } finally {
      setRejectingSlip(false);
    }
  };

  const handleRecordManualPaySubmit = async () => {
    if (!paymentDossierData?.student?._id) return;
    if (!manualPayForm.amount || isNaN(Number(manualPayForm.amount)) || Number(manualPayForm.amount) <= 0) {
      return showAlert('Error', 'Please enter a valid cash amount', undefined, 'error');
    }
    setRecordingManualPay(true);
    try {
      await api.post(`/admin/payments/${paymentDossierData.student._id}/record-manual`, manualPayForm);
      showAlert('Payment Recorded', 'Manual cash/bank payment recorded successfully!', undefined, 'success');
      setManualPayModalVisible(false);
      setManualPayForm({ amount: '', payment_method: 'physical_cash', notes: '' });
      handleOpenPaymentDossier(paymentDossierData.student._id);
      fetchAllDashboardData();
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Failed to record manual payment', undefined, 'error');
    } finally {
      setRecordingManualPay(false);
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

  const handleApprove = (id: string, userName?: string) => {
    if (detailsModalVisible) {
      setDetailsModalVisible(false);
    }
    setConfirmModal({
      visible: true,
      title: 'Approve Application',
      message: `Are you sure you want to approve registration for ${userName || 'this applicant'}?\n\nAn official student index number and credentials will be generated and dispatched via email.`,
      type: 'info',
      confirmText: 'Approve',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const res = await api.put(`/admin/users/${id}/approve`);
          if (res.data.credentials) {
            setApprovedCredentials(res.data.credentials);
            setCredentialsModalVisible(true);
          } else {
            showAlert('Approved', 'User application approved successfully.', undefined, 'success');
          }
          fetchUsers();
        } catch (e: any) {
          const msg = e.response?.data?.message || 'Approval failed';
          showAlert('Error', msg, undefined, 'error');
        }
      }
    });
  };

  const handleReject = (id: string, userName?: string) => {
    if (detailsModalVisible) {
      setDetailsModalVisible(false);
    }
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
    if (detailsModalVisible) {
      setDetailsModalVisible(false);
    }
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

  const handleMarkCompleted = (id: string, userName?: string) => {
    if (detailsModalVisible) {
      setDetailsModalVisible(false);
    }
    setConfirmModal({
      visible: true,
      title: 'Mark Student Completed',
      message: `Are you sure you want to mark ${userName || 'this student'} as Completed & Graduated?\n\nThis will move the student to the Completed records section.`,
      type: 'info',
      confirmText: 'Mark Completed',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.put(`/admin/users/${id}/complete`);
          fetchUsers();
          showAlert('Success', `${userName || 'Student'} marked as Completed & Graduated.`, undefined, 'success');
        } catch (e: any) {
          showAlert('Error', e.response?.data?.message || 'Failed to update student status', undefined, 'error');
        }
      }
    });
  };

  const handleResendCredentials = (id: string, studentName?: string) => {
    if (detailsModalVisible) {
      setDetailsModalVisible(false);
    }
    setConfirmModal({
      visible: true,
      title: 'Resend Credentials',
      message: `Are you sure you want to resend login credentials to ${studentName || 'this student'}?\n\nA fresh temporary password will be generated and dispatched to their email address.`,
      type: 'info',
      confirmText: 'Resend Credentials',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setLoading(true);
          const res = await api.put(`/admin/users/${id}/resend-credentials`);
          if (res.data.credentials) {
            setApprovedCredentials(res.data.credentials);
            setCredentialsModalVisible(true);
          } else {
            showAlert('Credentials Resent', `Official login credentials email resent to ${studentName || 'student'}.`, undefined, 'success');
          }
        } catch (e: any) {
          showAlert('Error', e.response?.data?.message || 'Failed to resend credentials email', undefined, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteCompletely = (id: string, userName?: string, role?: string) => {
    if (detailsModalVisible) {
      setDetailsModalVisible(false);
    }
    setUserDetails(null);
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

      if (activeMode === 'instructors') {
        fetchAllDashboardData();
      } else {
        setActiveMode('instructors');
        fetchAllDashboardData();
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to create instructor';
      showAlert('Error', msg, undefined, 'error');
    } finally {
      setCreatingInstructor(false);
    }
  };

  const appMetrics = {
    pending: (applicationsList || []).filter(a => a.status === 'pending' || !a.status).length,
    approved: (applicationsList || []).filter(a => a.status === 'approved').length,
    rejected: (applicationsList || []).filter(a => a.status === 'rejected').length,
    total: (applicationsList || []).length,
  };

  const studentsMetrics = {
    all: (studentsList || []).length,
    active: (studentsList || []).filter(s => s.is_active === true).length,
    deactive: (studentsList || []).filter(s => s.is_active === false).length,
    completed: (studentsList || []).filter(s => s.status === 'completed' || s.is_graduated).length,
  };

  const sourcePayments = (adminPaymentsList && adminPaymentsList.length > 0) ? adminPaymentsList : [
    ...(studentsList || []).map(s => ({
      _id: s._id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      index_number: s.index_number,
      nic: s.nic,
      payment_status: s.payment_info?.payment_status || 'pending',
      payment_method: s.payment_info?.payment_method || 'bank_transfer',
      amount_paid: s.payment_info?.amount_paid || 0,
      total_fee: s.payment_info?.total_fee || 25000,
      category: (s.payment_info?.amount_paid || 0) >= (s.payment_info?.total_fee || 25000) ? 'completed' : 'pending',
    })),
  ];

  const paymentsMetrics = {
    pending: sourcePayments.filter((p: any) => p.category === 'pending' || p.amount_paid < p.total_fee || (p.payment_status !== 'paid' && p.payment_status !== 'waived')).length,
    completed: sourcePayments.filter((p: any) => p.category === 'completed' || p.amount_paid >= p.total_fee || p.payment_status === 'paid' || p.payment_status === 'waived').length,
  };

  const instructorsMetrics = {
    active: (instructorsList || []).filter(i => i.is_active !== false).length,
    deactive: (instructorsList || []).filter(i => i.is_active === false).length,
    total: (instructorsList || []).length,
  };

  const getFilteredData = () => {
    const term = (search || '').toLowerCase().trim();

    if (activeMode === 'applications') {
      return (applicationsList || []).filter(a => {
        const name = a.full_name || a.fullName || a.name || a.student_name || 'Applicant';
        const email = a.email || '';
        const nic = a.nic_number || a.nic || '';
        const regNo = a.generated_index_number || a.index_number || '';
        const status = a.status || 'pending';

        const matchesSearch =
          !term ||
          name.toLowerCase().includes(term) ||
          email.toLowerCase().includes(term) ||
          nic.toLowerCase().includes(term) ||
          regNo.toLowerCase().includes(term);

        if (applicationsSubFilter === 'pending') return matchesSearch && (status === 'pending' || !status);
        if (applicationsSubFilter === 'approved') return matchesSearch && status === 'approved';
        if (applicationsSubFilter === 'rejected') return matchesSearch && status === 'rejected';
        return matchesSearch;
      });
    }

    if (activeMode === 'students') {
      return (studentsList || []).filter(s => {
        const matchesSearch =
          !term ||
          (s?.name || '').toLowerCase().includes(term) ||
          (s?.email || '').toLowerCase().includes(term) ||
          (s?.index_number || '').toLowerCase().includes(term) ||
          (s?.nic || '').toLowerCase().includes(term);

        if (studentsSubFilter === 'active') return matchesSearch && s.is_active === true;
        if (studentsSubFilter === 'deactive') return matchesSearch && s.is_active === false;
        if (studentsSubFilter === 'completed') return matchesSearch && (s.status === 'completed' || s.is_graduated);
        return matchesSearch;
      });
    }

    if (activeMode === 'payments') {
      return sourcePayments.filter((p: any) => {
        const matchesSearch =
          !term ||
          (p?.name || '').toLowerCase().includes(term) ||
          (p?.email || '').toLowerCase().includes(term) ||
          (p?.index_number || '').toLowerCase().includes(term) ||
          (p?.nic || '').toLowerCase().includes(term);

        const isCompleted = p.category === 'completed' || p.amount_paid >= p.total_fee || p.payment_status === 'paid' || p.payment_status === 'waived';

        if (paymentsSubFilter === 'completed') {
          return matchesSearch && isCompleted;
        }
        if (paymentsSubFilter === 'pending') {
          return matchesSearch && !isCompleted;
        }
        return matchesSearch;
      });
    }

    if (activeMode === 'instructors') {
      return (instructorsList || []).filter(i => {
        const matchesSearch =
          !term ||
          (i?.name || '').toLowerCase().includes(term) ||
          (i?.email || '').toLowerCase().includes(term) ||
          (i?.nic || '').toLowerCase().includes(term);

        if (instructorsSubFilter === 'active') return matchesSearch && i.is_active !== false;
        if (instructorsSubFilter === 'deactive') return matchesSearch && i.is_active === false;
        return matchesSearch;
      });
    }

    return [];
  };

  const filteredUsers = getFilteredData();

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
      if (next.length === 0) {
        setIsSelectMode(false);
      }
      return next;
    });
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
        if (f.key === 'name') val = u.name || u.full_name || u.fullName || '';
        else if (f.key === 'guardian_name') val = u.guardian?.name || '';
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
      link.setAttribute('download', `TVTI_Users_Export_${activeMode}_${new Date().toISOString().slice(0, 10)}.csv`);
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

  const getInitials = useCallback((name?: string) => {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }, []);

  const getGradeColor = useCallback((grade: string) => {
    if (!grade) return '#6B7280';
    const g = grade.toUpperCase();
    if (g.startsWith('A')) return '#10B981';
    if (g.startsWith('B')) return '#3B82F6';
    if (g.startsWith('C')) return '#F59E0B';
    return '#EF4444';
  }, []);

  const renderPendingItem = ({ item }: { item: any }) => {
    const isSelected = selectedUserIds.includes(item._id);
    const isMenuOpen = activeMenuUserId === item._id;
    const name = item.full_name || item.fullName || item.name || item.student_name || 'Applicant';
    const status = item.status || 'pending';
    const photo = item.student_photo || item.profile_photo;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isMenuOpen && { zIndex: 9999, elevation: 25 },
          isSelectMode && isSelected && styles.whatsappSelectedCard,
        ]}
        onPress={() => {
          if (isSelectMode) {
            toggleUserSelection(item._id);
          } else if (activeMenuUserId) {
            setActiveMenuUserId(null);
          } else if (item.user_id) {
            handleOpenDetails(item.user_id);
          } else {
            setSelectedAppForReview(item);
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
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarImg} />
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
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <Text style={styles.userSubtext}>NIC / Reg: {item.nic_number || item.nic || item.index_number || 'N/A'}</Text>
          </View>

          <View style={styles.rightCardCol}>
            {!isSelectMode && (
              <WhatsAppOptionsMenu
                options={[
                  {
                    id: 'view_app',
                    label: 'View Application',
                    onPress: () => {
                      if (item.user_id) handleOpenDetails(item.user_id);
                      else setSelectedAppForReview(item);
                    },
                  },
                  ...(status === 'pending' ? [
                    {
                      id: 'approve',
                      label: 'Approve',
                      onPress: () => handleApprove(item.user_id || item._id),
                    },
                    {
                      id: 'reject',
                      label: 'Reject',
                      destructive: true,
                      onPress: () => handleReject(item.user_id || item._id, name),
                    }
                  ] : []),
                  ...(status === 'approved' ? [
                    {
                      id: 'resend_creds',
                      label: 'Resend Credentials',
                      onPress: () => handleResendCredentials(item.user_id || item._id, name),
                    }
                  ] : []),
                  {
                    id: 'delete',
                    label: 'Delete',
                    destructive: true,
                    onPress: () => handleDeleteCompletely(item._id, name, 'application'),
                  }
                ]}
              />
            )}
            {status !== 'rejected' && (
              <View style={[styles.statusBadge, { backgroundColor: status === 'approved' ? '#D1FAE5' : '#FEF3C7', marginTop: 8 }]}>
                <Text style={[styles.statusBadgeText, { color: status === 'approved' ? '#065F46' : '#D97706' }]}>
                  {status === 'approved' ? 'Approved' : 'Pending'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {!isSelectMode && status === 'pending' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.viewProfileBtn}
              onPress={() => {
                if (item.user_id) handleOpenDetails(item.user_id);
                else setSelectedAppForReview(item);
              }}
            >
              <Text style={styles.viewProfileText}>View Profile →</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.smallRejectBtn}
                onPress={() => handleReject(item.user_id || item._id, name)}
                activeOpacity={0.8}
              >
                <Text style={styles.smallRejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallApproveBtn}
                onPress={() => handleApprove(item.user_id || item._id)}
                activeOpacity={0.8}
              >
                <Text style={styles.smallApproveBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStudentItem = ({ item }: { item: any }) => {
    const isMenuOpen = activeMenuUserId === item._id;
    const isSelected = selectedUserIds.includes(item._id);
    const isDeactivated = !item.is_active;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isDeactivated && { opacity: 0.65 },
          isMenuOpen && { zIndex: 9999, elevation: 25 },
          isSelectMode && isSelected && styles.whatsappSelectedCard,
        ]}
        onPress={() => {
          if (isSelectMode) {
            toggleUserSelection(item._id);
          } else if (activeMenuUserId) {
            setActiveMenuUserId(null);
          } else if (isDeactivated) {
            handleToggleActive(item._id, false, item.name);
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
          <View style={styles.rightCardCol}>
            {!isSelectMode && (
              isDeactivated ? (
                <TouchableOpacity
                  style={{ padding: 6 }}
                  onPress={() => handleToggleActive(item._id, false, item.name)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="ellipsis-vertical" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : (
                <WhatsAppOptionsMenu
                  options={[
                    {
                      id: 'view_profile',
                      label: 'View Profile',
                      onPress: () => handleOpenDetails(item._id),
                    },
                    {
                      id: 'assign_batch',
                      label: 'Assign Batch',
                      onPress: () => {
                        setAssignStudentId(item._id);
                        setAssignModalVisible(true);
                      },
                    },
                    {
                      id: 'mark_completed',
                      label: 'Mark Completed',
                      onPress: () => handleMarkCompleted(item._id, item.name),
                    },
                    {
                      id: 'toggle_active',
                      label: 'Deactivate',
                      destructive: true,
                      onPress: () => handleToggleActive(item._id, true, item.name),
                    },
                    {
                      id: 'delete',
                      label: 'Delete',
                      destructive: true,
                      onPress: () => handleDeleteCompletely(item._id, item.name, item.role),
                    },
                  ]}
                />
              )
            )}
            <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#D1FAE5' : '#FEE2E2', marginTop: 8 }]}>
              <Text style={[styles.statusBadgeText, { color: item.is_active ? '#065F46' : '#991B1B' }]}>
                {item.is_active ? 'Active' : 'Deactivated'}
              </Text>
            </View>
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
          <View style={styles.rightCardCol}>
            {!isSelectMode && (
              <WhatsAppOptionsMenu
                options={[
                  {
                    id: 'view_profile',
                    label: 'View Profile',
                    onPress: () => handleOpenDetails(item._id),
                  },
                  {
                    id: 'toggle_active',
                    label: item.is_active ? 'Deactivate' : 'Activate',
                    destructive: item.is_active,
                    onPress: () => handleToggleActive(item._id, item.is_active, item.name),
                  },
                  {
                    id: 'delete',
                    label: 'Delete',
                    destructive: true,
                    onPress: () => handleDeleteCompletely(item._id, item.name, item.role),
                  },
                ]}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPaymentItem = ({ item }: { item: any }) => {
    const isPaid = item.category === 'completed' || item.amount_paid >= item.total_fee || item.payment_status === 'paid' || item.payment_status === 'waived';
    const amountPaid = item.amount_paid || 0;
    const totalFee = item.total_fee || 25000;
    const hasPendingSlips = (item.pending_slips_count || 0) > 0;
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
            handleOpenPaymentDossier(item._id);
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
            <View style={[styles.avatar, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="wallet" size={24} color="#F59E0B" />
            </View>
            {isSelectMode && (
              <View style={[styles.whatsappCheckBadge, isSelected ? styles.whatsappCheckBadgeActive : styles.whatsappCheckBadgeInactive]}>
                <Icon name={isSelected ? "checkmark" : "add"} size={12} color={isSelected ? "#FFFFFF" : "#64748B"} />
              </View>
            )}
          </View>

          <View style={styles.headerDetails}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.userName}>{item.name}</Text>
              {hasPendingSlips && (
                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#D97706' }}>NEW SLIP</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail}>{item.email}</Text>
            <Text style={styles.userSubtext}>
              Reg/Index: {item.index_number || item.nic || 'N/A'} • {item.payment_method === 'bank_transfer' ? 'Bank Deposit' : 'Cash Deposit'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isPaid ? '#D1FAE5' : amountPaid > 0 ? '#FFEDD5' : '#FEE2E2' }]}>
            <Text style={[styles.statusBadgeText, { color: isPaid ? '#065F46' : amountPaid > 0 ? '#C2410C' : '#991B1B' }]}>
              {isPaid ? 'Fully Paid' : amountPaid > 0 ? 'Partially Paid' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>
            Paid: LKR {amountPaid.toLocaleString()} / {totalFee.toLocaleString()}
          </Text>
          {!isSelectMode && (
            <TouchableOpacity
              style={styles.viewProfileBtn}
              onPress={() => handleOpenPaymentDossier(item._id)}
            >
              <Text style={styles.viewProfileText}>Open Dossier →</Text>
            </TouchableOpacity>
          )}
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
      {currentView === 'hub' ? (
        <>
          <ScreenHeader
            title="User Management"
            subtitle="Choose a category to manage"
            showBack={true}
          />
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 }}>
            <Text style={styles.hubSectionHeaderTitle}>Choose Activity</Text>

            {/* 1. Applications Card */}
            <TouchableOpacity
              style={styles.hubVerticalCard}
              onPress={() => {
                setActiveMode('applications');
                setApplicationsSubFilter('pending');
                setCurrentView('detail');
              }}
              activeOpacity={0.75}
            >
              <View style={styles.hubVerticalIconBox}>
                <Icon name="document-text-outline" size={24} color="#F59E0B" />
              </View>
              <View style={styles.hubVerticalTextCol}>
                <Text style={styles.hubVerticalTitle}>Applications</Text>
                <Text style={styles.hubVerticalSub}>{appMetrics.pending} Pending Applications</Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#D4D4D8" />
            </TouchableOpacity>

            {/* 2. Students Card */}
            <TouchableOpacity
              style={styles.hubVerticalCard}
              onPress={() => {
                setActiveMode('students');
                setStudentsSubFilter('all');
                setCurrentView('detail');
              }}
              activeOpacity={0.75}
            >
              <View style={styles.hubVerticalIconBox}>
                <Icon name="people-outline" size={24} color="#F59E0B" />
              </View>
              <View style={styles.hubVerticalTextCol}>
                <Text style={styles.hubVerticalTitle}>Students</Text>
                <Text style={styles.hubVerticalSub}>{studentsMetrics.all} Enrolled Students</Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#D4D4D8" />
            </TouchableOpacity>

            {/* 3. Payments Card */}
            <TouchableOpacity
              style={styles.hubVerticalCard}
              onPress={() => {
                setActiveMode('payments');
                setPaymentsSubFilter('pending');
                setCurrentView('detail');
              }}
              activeOpacity={0.75}
            >
              <View style={styles.hubVerticalIconBox}>
                <Icon name="wallet-outline" size={24} color="#F59E0B" />
              </View>
              <View style={styles.hubVerticalTextCol}>
                <Text style={styles.hubVerticalTitle}>Payments</Text>
                <Text style={styles.hubVerticalSub}>{paymentsMetrics.pending} Pending Slips</Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#D4D4D8" />
            </TouchableOpacity>

            {/* 4. Instructors Card */}
            <TouchableOpacity
              style={styles.hubVerticalCard}
              onPress={() => {
                setActiveMode('instructors');
                setInstructorsSubFilter('active');
                setCurrentView('detail');
              }}
              activeOpacity={0.75}
            >
              <View style={styles.hubVerticalIconBox}>
                <Icon name="school-outline" size={24} color="#F59E0B" />
              </View>
              <View style={styles.hubVerticalTextCol}>
                <Text style={styles.hubVerticalTitle}>Instructors</Text>
                <Text style={styles.hubVerticalSub}>{instructorsMetrics.active} Active Staff</Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#D4D4D8" />
            </TouchableOpacity>
          </ScrollView>
        </>
      ) : (
        <>
          {isSelectMode ? (
            <WhatsAppSelectionHeader
              visible={isSelectMode}
              selectedCount={selectedUserIds.length}
              onClearSelection={() => {
                setIsSelectMode(false);
                setSelectedUserIds([]);
              }}
              actions={[
                {
                  id: 'select_all',
                  icon: selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? "checkmark-done" : "checkmark-done-circle-outline",
                  onPress: () => {
                    if (selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0) {
                      setSelectedUserIds([]);
                      setIsSelectMode(false);
                    } else {
                      setSelectedUserIds(filteredUsers.map(u => u._id));
                    }
                  },
                },
                {
                  id: 'export_csv',
                  icon: 'download-outline',
                  disabled: selectedUserIds.length === 0,
                  onPress: () => openExportModal('selected'),
                },
                {
                  id: 'bulk_delete',
                  icon: 'trash-outline',
                  disabled: selectedUserIds.length === 0,
                  color: selectedUserIds.length > 0 ? '#EF4444' : '#FFFFFF',
                  onPress: handleBulkDelete,
                },
              ]}
            />
          ) : (
            <ScreenHeader
              title={
                activeMode === 'applications'
                  ? 'Applications'
                  : activeMode === 'students'
                  ? 'Students'
                  : activeMode === 'payments'
                  ? 'Payments'
                  : 'Instructors'
              }
              subtitle={`Manage ${activeMode} records`}
              showBack={true}
              onBackPress={() => setCurrentView('hub')}
              options={[
                {
                  id: 'select_mode',
                  label: 'Select Mode',
                  onPress: () => setIsSelectMode(true),
                },
                {
                  id: 'export_excel',
                  label: 'Export Excel Sheet',
                  onPress: () => openExportModal('all_filtered'),
                },
              ]}
            />
          )}

          {/* Sub-Filter Pill Bar */}
          <View style={styles.subFilterBarSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFilterBarScroll}>
              {activeMode === 'applications' && (
                <>
                  <TouchableOpacity
                    style={[styles.subFilterPill, applicationsSubFilter === 'pending' && styles.subFilterPillActive]}
                    onPress={() => setApplicationsSubFilter('pending')}
                  >
                    <Text style={[styles.subFilterPillText, applicationsSubFilter === 'pending' && styles.subFilterPillTextActive]}>
                      Pending ({appMetrics.pending})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subFilterPill, applicationsSubFilter === 'approved' && styles.subFilterPillActive]}
                    onPress={() => setApplicationsSubFilter('approved')}
                  >
                    <Text style={[styles.subFilterPillText, applicationsSubFilter === 'approved' && styles.subFilterPillTextActive]}>
                      Approved ({appMetrics.approved})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subFilterPill, applicationsSubFilter === 'rejected' && styles.subFilterPillActive]}
                    onPress={() => setApplicationsSubFilter('rejected')}
                  >
                    <Text style={[styles.subFilterPillText, applicationsSubFilter === 'rejected' && styles.subFilterPillTextActive]}>
                      Rejected ({appMetrics.rejected})
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {activeMode === 'students' && (
                <>
                  <TouchableOpacity
                    style={[styles.subFilterPill, studentsSubFilter === 'all' && styles.subFilterPillActive]}
                    onPress={() => setStudentsSubFilter('all')}
                  >
                    <Text style={[styles.subFilterPillText, studentsSubFilter === 'all' && styles.subFilterPillTextActive]}>
                      All ({studentsMetrics.all})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subFilterPill, studentsSubFilter === 'active' && styles.subFilterPillActive]}
                    onPress={() => setStudentsSubFilter('active')}
                  >
                    <Text style={[styles.subFilterPillText, studentsSubFilter === 'active' && styles.subFilterPillTextActive]}>
                      Active ({studentsMetrics.active})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subFilterPill, studentsSubFilter === 'deactive' && styles.subFilterPillActive]}
                    onPress={() => setStudentsSubFilter('deactive')}
                  >
                    <Text style={[styles.subFilterPillText, studentsSubFilter === 'deactive' && styles.subFilterPillTextActive]}>
                      Deactive ({studentsMetrics.deactive})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subFilterPill, studentsSubFilter === 'completed' && styles.subFilterPillActive]}
                    onPress={() => setStudentsSubFilter('completed')}
                  >
                    <Text style={[styles.subFilterPillText, studentsSubFilter === 'completed' && styles.subFilterPillTextActive]}>
                      Completed ({studentsMetrics.completed})
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {activeMode === 'payments' && (
                <>
                  <TouchableOpacity
                    style={[styles.subFilterPill, paymentsSubFilter === 'pending' && styles.subFilterPillActive]}
                    onPress={() => setPaymentsSubFilter('pending')}
                  >
                    <Text style={[styles.subFilterPillText, paymentsSubFilter === 'pending' && styles.subFilterPillTextActive]}>
                      Pending Slips ({paymentsMetrics.pending})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subFilterPill, paymentsSubFilter === 'completed' && styles.subFilterPillActive]}
                    onPress={() => setPaymentsSubFilter('completed')}
                  >
                    <Text style={[styles.subFilterPillText, paymentsSubFilter === 'completed' && styles.subFilterPillTextActive]}>
                      Completed ({paymentsMetrics.completed})
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {activeMode === 'instructors' && (
                <>
                  <TouchableOpacity
                    style={[styles.subFilterPill, instructorsSubFilter === 'active' && styles.subFilterPillActive]}
                    onPress={() => setInstructorsSubFilter('active')}
                  >
                    <Text style={[styles.subFilterPillText, instructorsSubFilter === 'active' && styles.subFilterPillTextActive]}>
                      Active Staff ({instructorsMetrics.active})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subFilterPill, instructorsSubFilter === 'deactive' && styles.subFilterPillActive]}
                    onPress={() => setInstructorsSubFilter('deactive')}
                  >
                    <Text style={[styles.subFilterPillText, instructorsSubFilter === 'deactive' && styles.subFilterPillTextActive]}>
                      Deactivated ({instructorsMetrics.deactive})
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>

          {/* Main Content Area */}
          <>
            {/* Search Box */}
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
            </View>

            {/* Content List */}
            {loading ? (
              <ActivityIndicator size="large" color="#F58220" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={item => item._id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                renderItem={
                  activeMode === 'applications'
                    ? renderPendingItem
                    : activeMode === 'students'
                    ? renderStudentItem
                    : activeMode === 'payments'
                    ? renderPaymentItem
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
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110 }}
                  ListEmptyComponent={<Text style={styles.emptyListText}>No records found for this filter.</Text>}
                />
              )}
            </>
          </>
        )}

      {/* Floating Add Instructor Liquid FAB Button */}
      {currentView === 'detail' && activeMode === 'instructors' && !isSelectMode && (
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
                  {userDetails.user.role === 'applicant' ? (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {userDetails.user.status === 'approved' ? (
                        <TouchableOpacity
                          style={[styles.footerActionBtn, { backgroundColor: '#0D9488' }]}
                          onPress={() => {
                            setDetailsModalVisible(false);
                            handleResendCredentials(userDetails.user._id, userDetails.user.name || userDetails.user.full_name);
                          }}
                          activeOpacity={0.8}
                        >
                          <Icon name="mail-unread-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.footerActionText}>Resend Credentials</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.footerActionBtn, { backgroundColor: '#E2E8F0' }]}
                            onPress={() => {
                              setDetailsModalVisible(false);
                              handleReject(userDetails.user._id, userDetails.user.name || userDetails.user.full_name);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.footerActionText, { color: '#1E293B' }]}>Reject</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.footerActionBtn, { backgroundColor: '#F58220' }]}
                            onPress={() => {
                              setDetailsModalVisible(false);
                              handleApprove(userDetails.user._id, userDetails.user.name || userDetails.user.full_name);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.footerActionText}>Approve</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {userDetails.user.role === 'student' ? (
                        <>
                          <TouchableOpacity
                            style={[styles.footerActionBtn, { backgroundColor: '#2563EB' }]}
                            onPress={() => {
                              setDetailsModalVisible(false);
                              setAssignStudentId(userDetails.user._id);
                              setAssignModalVisible(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Icon name="library-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.footerActionText}>Assign Batch</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.footerActionBtn, { backgroundColor: userDetails.user.is_active ? '#D97706' : '#10B981' }]}
                            onPress={() => {
                              setDetailsModalVisible(false);
                              handleToggleActive(userDetails.user._id, userDetails.user.is_active, userDetails.user.name || userDetails.user.full_name);
                            }}
                            activeOpacity={0.8}
                          >
                            <Icon name={userDetails.user.is_active ? "pause-circle" : "play-circle"} size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.footerActionText}>
                              {userDetails.user.is_active ? 'Deactivate' : 'Activate'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.footerActionBtn, { backgroundColor: '#F58220' }]}
                            onPress={() => {
                              setDetailsModalVisible(false);
                              handleMarkCompleted(userDetails.user._id, userDetails.user.name || userDetails.user.full_name);
                            }}
                            activeOpacity={0.8}
                          >
                            <Icon name="checkmark-done-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.footerActionText}>Completed</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.footerActionBtn, { backgroundColor: '#0D9488' }]}
                            onPress={() => {
                              setDetailsModalVisible(false);
                              handleResendCredentials(userDetails.user._id, userDetails.user.name || userDetails.user.full_name);
                            }}
                            activeOpacity={0.8}
                          >
                            <Icon name="mail-unread-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.footerActionText}>Resend Credentials</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.footerActionBtn, { backgroundColor: userDetails.user.is_active ? '#D97706' : '#10B981' }]}
                            onPress={() => {
                              setDetailsModalVisible(false);
                              handleToggleActive(userDetails.user._id, userDetails.user.is_active, userDetails.user.name || userDetails.user.full_name);
                            }}
                            activeOpacity={0.8}
                          >
                            <Icon name={userDetails.user.is_active ? "pause-circle" : "play-circle"} size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.footerActionText}>
                              {userDetails.user.is_active ? 'Deactivate' : 'Activate'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.footerActionBtn, { backgroundColor: '#7F1D1D' }]}
                            onPress={() => {
                              setDetailsModalVisible(false);
                              handleDeleteCompletely(userDetails.user._id, userDetails.user.name || userDetails.user.full_name, userDetails.user.role);
                            }}
                            activeOpacity={0.8}
                          >
                            <Icon name="trash-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.footerActionText}>Delete</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* STUDENT PAYMENT DOSSIER MODAL (ADMIN VIEW) */}
      {/* ========================================================================= */}
      <Modal visible={paymentDossierModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
          <View style={{ height: '92%', backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
            {/* Modal Header Bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
              <TouchableOpacity
                onPress={() => setPaymentDossierModalVisible(false)}
                style={{ padding: 4 }}
              >
                <Icon name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>Student Payment Dossier</Text>
              <TouchableOpacity
                style={{ backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={() => {
                  setPaymentDossierModalVisible(false);
                  setManualPayModalVisible(true);
                }}
              >
                <Icon name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>+ Cash Pay</Text>
              </TouchableOpacity>
            </View>

            {loadingDossier ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading payment dossier...</Text>
              </View>
            ) : paymentDossierData ? (
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
                {/* 1. Student Profile Banner Card */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
                  {paymentDossierData.student?.profile_photo ? (
                    <Image source={{ uri: paymentDossierData.student.profile_photo }} style={{ width: 54, height: 54, borderRadius: 27, marginRight: 14, backgroundColor: '#F1F5F9' }} />
                  ) : (
                    <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18 }}>{getInitials(paymentDossierData.student?.name)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>{paymentDossierData.student?.name}</Text>
                    <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 1 }}>{paymentDossierData.student?.email}</Text>
                    <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                      Reg No: {paymentDossierData.student?.index_number || paymentDossierData.student?.nic || 'N/A'} • {paymentDossierData.student?.phone || 'No Phone'}
                    </Text>
                  </View>
                </View>

                {/* 2. Financial Totals & Progress Bar */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>Fee Breakdown & Settlement</Text>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Total Fee</Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                        LKR {(paymentDossierData.summary?.total_fee || 25000).toLocaleString()}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Settled Amount</Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#10B981' }}>
                        LKR {(paymentDossierData.summary?.amount_paid || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Balance Due</Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: (paymentDossierData.summary?.remaining_balance || 0) > 0 ? '#EF4444' : '#10B981' }}>
                        LKR {(paymentDossierData.summary?.remaining_balance || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginVertical: 8 }}>
                    <View
                      style={{
                        height: '100%',
                        backgroundColor: (paymentDossierData.summary?.remaining_balance || 0) === 0 ? '#10B981' : '#F59E0B',
                        width: `${Math.min(100, Math.round(((paymentDossierData.summary?.amount_paid || 0) / (paymentDossierData.summary?.total_fee || 25000)) * 100))}%`,
                      }}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      Settlement Rate: {Math.min(100, Math.round(((paymentDossierData.summary?.amount_paid || 0) / (paymentDossierData.summary?.total_fee || 25000)) * 100))}%
                    </Text>
                    <View style={{ backgroundColor: paymentDossierData.summary?.category === 'completed' ? '#D1FAE5' : '#FEF3C7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: paymentDossierData.summary?.category === 'completed' ? '#065F46' : '#D97706' }}>
                        {paymentDossierData.summary?.category === 'completed' ? 'COMPLETED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3. Initial Registration Payment Slip Info (if present) */}
                {paymentDossierData.registration_info && (
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>Initial Registration Payment</Text>
                    <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                      Method: {paymentDossierData.registration_info.payment_method === 'bank_transfer' ? 'Bank Deposit Slip' : 'Physical Cash at Counter'}
                    </Text>
                    {paymentDossierData.registration_info.payment_slip ? (
                      <TouchableOpacity
                        style={{ marginTop: 8, height: 90, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F1F5F9' }}
                        onPress={() => setDossierZoomImage(paymentDossierData.registration_info.payment_slip)}
                      >
                        <Image source={{ uri: paymentDossierData.registration_info.payment_slip }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                {/* 4. Submitted Payment Slips Timeline */}
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>
                    Payment Slips History ({paymentDossierData.slips?.length || 0})
                  </Text>

                  {(!paymentDossierData.slips || paymentDossierData.slips.length === 0) ? (
                    <View style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Icon name="document-text-outline" size={30} color="#94A3B8" />
                      <Text style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>No payment slips uploaded yet.</Text>
                    </View>
                  ) : (
                    paymentDossierData.slips.map((slip: any, index: number) => {
                      const isVerified = slip.status === 'verified';
                      const isRejected = slip.status === 'rejected';
                      const isPending = slip.status === 'pending';

                      return (
                        <View
                          key={slip._id || index}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 14,
                            padding: 14,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: isVerified ? '#BBF7D0' : isRejected ? '#FECDD3' : '#FDE68A',
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                              LKR {(slip.amount || 0).toLocaleString()}
                            </Text>
                            <View style={{ backgroundColor: isVerified ? '#D1FAE5' : isRejected ? '#FFE4E6' : '#FEF3C7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: isVerified ? '#065F46' : isRejected ? '#BE123C' : '#D97706' }}>
                                {isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'PENDING VERIFICATION'}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                            Method: {slip.payment_method === 'bank_transfer' ? 'Bank Deposit' : slip.payment_method === 'online_transfer' ? 'Online Bank Transfer' : 'Cash'} • Date: {slip.createdAt ? new Date(slip.createdAt).toLocaleString() : 'N/A'}
                          </Text>

                          {slip.notes ? <Text style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', marginTop: 2 }}>Notes: {slip.notes}</Text> : null}
                          {isRejected && slip.rejection_reason ? <Text style={{ fontSize: 12, color: '#BE123C', fontWeight: '600', marginTop: 4 }}>Rejection Reason: {slip.rejection_reason}</Text> : null}

                          {slip.slip_url ? (
                            <TouchableOpacity
                              style={{ marginTop: 10, height: 110, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F1F5F9', position: 'relative' }}
                              onPress={() => setDossierZoomImage(slip.slip_url)}
                              activeOpacity={0.8}
                            >
                              <Image source={{ uri: slip.slip_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                              <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icon name="expand" size={12} color="#FFFFFF" />
                                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>Tap to Zoom</Text>
                              </View>
                            </TouchableOpacity>
                          ) : null}

                          {/* Admin Action Buttons on Pending Slip */}
                          {isPending && (
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                              <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => handlePromptVerifySlip(slip)}
                                disabled={verifyingSlipId === slip._id}
                              >
                                {verifyingSlipId === slip._id ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 }}>Approve & Credit LKR {slip.amount?.toLocaleString()}</Text>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{ backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => handlePromptRejectSlip(slip)}
                              >
                                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 }}>Reject</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* RECORD MANUAL CASH PAYMENT MODAL */}
      {/* ========================================================================= */}
      <Modal visible={manualPayModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Manual Payment</Text>
              <TouchableOpacity onPress={() => setManualPayModalVisible(false)}>
                <Icon name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Cash Amount (LKR) *</Text>
            <TextInput
              style={styles.modalInput}
              value={manualPayForm.amount}
              onChangeText={t => setManualPayForm({ ...manualPayForm, amount: t })}
              placeholder="e.g. 15000"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[
                { id: 'physical_cash', label: 'Cash at Counter' },
                { id: 'bank_transfer', label: 'Direct Bank Deposit' },
              ].map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: manualPayForm.payment_method === m.id ? '#0F172A' : '#E2E8F0',
                    backgroundColor: manualPayForm.payment_method === m.id ? '#0F172A' : '#FFFFFF',
                    alignItems: 'center',
                  }}
                  onPress={() => setManualPayForm({ ...manualPayForm, payment_method: m.id })}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: manualPayForm.payment_method === m.id ? '#FFFFFF' : '#475569' }}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notes / Counter Receipt Reference</Text>
            <TextInput
              style={styles.modalInput}
              value={manualPayForm.notes}
              onChangeText={t => setManualPayForm({ ...manualPayForm, notes: t })}
              placeholder="Receipt # or admin remark"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalFooterBtns}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setManualPayModalVisible(false)}
                disabled={recordingManualPay}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalBtn, recordingManualPay && { opacity: 0.6 }]}
                onPress={handleRecordManualPaySubmit}
                disabled={recordingManualPay}
              >
                {recordingManualPay ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Record Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* REJECT SLIP REASON MODAL */}
      {/* ========================================================================= */}
      <Modal visible={rejectSlipModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Payment Slip</Text>
              <TouchableOpacity onPress={() => setRejectSlipModalVisible(false)}>
                <Icon name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              Specify the reason for rejecting this payment slip. The student will be notified via email and in-app message.
            </Text>

            <Text style={styles.inputLabel}>Rejection Reason *</Text>
            <TextInput
              style={[styles.modalInput, { height: 74, textAlignVertical: 'top' }]}
              multiline
              numberOfLines={3}
              value={rejectSlipForm.reason}
              onChangeText={t => setRejectSlipForm({ ...rejectSlipForm, reason: t })}
              placeholder="e.g. Image blur or transaction reference not matching"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalFooterBtns}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setRejectSlipModalVisible(false)}
                disabled={rejectingSlip}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ flex: 1.5, backgroundColor: '#EF4444', paddingVertical: 11, borderRadius: 8, alignItems: 'center' }, rejectingSlip && { opacity: 0.6 }]}
                onPress={handleRejectSlipSubmit}
                disabled={rejectingSlip}
              >
                {rejectingSlip ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13.5 }}>Reject Slip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* DOSSIER FULL-SCREEN IMAGE ZOOM MODAL */}
      {/* ========================================================================= */}
      <Modal visible={Boolean(dossierZoomImage)} transparent animationType="fade">
        <View style={styles.zoomModalOverlay}>
          <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setDossierZoomImage(null)}>
            <Icon name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.zoomImageContainer}>
            {dossierZoomImage ? (
              <Image source={{ uri: dossierZoomImage }} style={styles.fullZoomImage} resizeMode="contain" />
            ) : null}
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
    marginTop: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
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
    marginRight: 8,
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
    alignSelf: 'flex-start',
    flexShrink: 0,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#000000',
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
    alignSelf: 'flex-start',
    flexShrink: 0,
    marginLeft: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  rejectOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
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
    fontSize: 12,
    fontWeight: '700',
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
    fontWeight: '700',
    fontSize: 12,
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
    fontWeight: '700',
    fontSize: 12,
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

  /* VERTICAL CATEGORY HUB STYLES (MATCHING USER REFERENCE IMAGE) */
  hubSectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  hubVerticalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 }
    }),
  },
  hubVerticalIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  hubVerticalTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  hubVerticalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  hubVerticalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },

  /* 4 MODE CARDS DASHBOARD STYLES */
  modeCardsSection: {
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modeCardsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  modeCardItem: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#64748B',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }
    }),
  },
  modeCardItemActive: {
    borderColor: '#F58220',
    borderWidth: 1.5,
    backgroundColor: '#FAFAF9',
    ...Platform.select({
      web: { boxShadow: '0 6px 16px rgba(245, 130, 32, 0.15)' },
      default: { shadowColor: '#F58220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 }
    }),
  },
  modeCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeCardIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeCardCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  modeCardCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  modeCardTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modeCardSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  /* SUB-FILTER PILL BAR STYLES */
  subFilterBarSection: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subFilterBarScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  subFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subFilterPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  subFilterPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  subFilterPillTextActive: {
    color: '#FFFFFF',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
  },
  modalFooterBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  cancelModalBtnText: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: 13.5,
  },
  saveModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13.5,
  },
  zoomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  zoomImageContainer: {
    width: '95%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullZoomImage: {
    width: '100%',
    height: '100%',
  },
});
