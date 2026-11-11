import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
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
import { FONTS } from '../../config/theme';
import StudentAdmissionModal, { AdmissionTarget } from '../../components/shared/StudentAdmissionModal';
import ManagementDialog from '../../components/shared/ManagementDialog';
import ManagementFilterBar from '../../components/shared/ManagementFilterBar';
import ManagementSheet from '../../components/shared/ManagementSheet';
import { PaymentListCard, PaymentDetails, AddPayment } from '../../components/shared/PaymentManagement';
import { usersSectionTheme } from '../../components/shared/usersSectionTheme';
import CustomDropdown from '../../components/shared/CustomDropdown';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { floatingTabBarClearance } from '../../components/navigation/floatingTabBarLayout';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import ApplicationsManagementScreen from './ApplicationsManagementScreen';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { useTheme } from '../../context/ThemeContext';
import WhatsAppOptionsMenu from '../../components/shared/WhatsAppOptionsMenu';
import WhatsAppSelectionHeader from '../../components/shared/WhatsAppSelectionHeader';
import * as Print from 'expo-print';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !(globalThis as any).nativeFabricUIManager) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type ModeType = 'applications' | 'students' | 'payments' | 'instructors';

export type ApplicationsSubFilter = 'pending' | 'approved' | 'rejected';
export type StudentsSubFilter = 'all' | 'active' | 'deactive' | 'completed';
export type PaymentsSubFilter = 'review' | 'pending' | 'completed';
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
  const insets = useSafeAreaInsets();
  const dockClearance = floatingTabBarClearance(insets.bottom);
  const { isDark } = useTheme();
  const design = usersSectionTheme(isDark);
  const styles = useMemo(() => createStyles(usersSectionTheme(isDark)), [isDark]);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [admissionTarget, setAdmissionTarget] = useState<AdmissionTarget | null>(null);
  useEffect(() => { if (route.params?.approveStudentId) { setAdmissionTarget({ kind: 'approve', id: route.params.approveStudentId, name: route.params.approveStudentName || 'Student' }); navigation.setParams?.({ approveStudentId: undefined, approveStudentName: undefined }); } }, [route.params?.approveStudentId]);

  let initialMode: ModeType = 'applications';
  let initialView: 'hub' | 'detail' = 'hub';

  if (route?.params?.initialActivity) {
    initialView = 'detail';
    const act = route.params.initialActivity;
    if (act === 'applications' || act === 'students' || act === 'payments' || act === 'instructors') {
      initialMode = act;
    }
  } else if (route?.params?.initialTab) {
    initialView = 'detail';
    const tab = route.params.initialTab;
    if (tab === 'pending') initialMode = 'applications';
    else if (tab === 'approved') initialMode = 'students';
    else if (tab === 'instructors') initialMode = 'instructors';
    else if (tab === 'payments') initialMode = 'payments';
  }

  const [currentView, setCurrentView] = useState<'hub' | 'detail'>(initialView);
  const [activeMode, setActiveMode] = useState<ModeType>(initialMode);
  const [applicationsSubFilter, setApplicationsSubFilter] = useState<ApplicationsSubFilter>('pending');
  const [studentsSubFilter, setStudentsSubFilter] = useState<StudentsSubFilter>('all');
  const [paymentsSubFilter, setPaymentsSubFilter] = useState<PaymentsSubFilter>('pending');
  const [instructorsSubFilter, setInstructorsSubFilter] = useState<InstructorsSubFilter>('active');

  useEffect(() => {
    const act = route?.params?.initialActivity;
    const tab = route?.params?.initialTab;
    if (act && (act === 'applications' || act === 'students' || act === 'payments' || act === 'instructors')) {
      setActiveMode(act);
      setCurrentView('detail');
    } else if (tab) {
      if (tab === 'pending') setActiveMode('applications');
      else if (tab === 'approved') setActiveMode('students');
      else if (tab === 'instructors') setActiveMode('instructors');
      else if (tab === 'payments') setActiveMode('payments');
      setCurrentView('detail');
    }
  }, [route?.params?.initialActivity, route?.params?.initialTab]);

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
  const userCacheRef = useRef<any>({});

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
    onCancel?: () => void;
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
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchAllDashboardData = async (quiet = false) => {
    if (!quiet) setLoading(true);
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
      if (!quiet) setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { void fetchAllDashboardData(true); }, []));

  const fetchUsers = () => {
    fetchAllDashboardData();
  };

  useEffect(() => {
    setSearch(''); setSelectedUserIds([]); setIsSelectMode(false);
    fetchUsers();
  }, [activeMode]);

  const handleOpenPaymentDossier = async (studentId: string) => {
    setPaymentDossierModalVisible(true);
    setLoadingDossier(true);
    setPaymentDossierData(null);
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
      setPaymentDossierModalVisible(true);
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
      onCancel: () => setPaymentDossierModalVisible(true),
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
      onCancel: () => setPaymentDossierModalVisible(true),
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
    if (!manualPayForm.amount || !Number.isFinite(Number(manualPayForm.amount)) || Number(manualPayForm.amount) <= 0) {
      return showAlert('Error', 'Please enter a valid payment amount', undefined, 'error');
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
    setDetailsModalVisible(false);
    setAdmissionTarget({ kind: 'approve', id, name: userName || 'Student' });
  };

  const handleReactivateStudent = (id: string, name?: string) => {
    setDetailsModalVisible(false);
    setConfirmModal({ visible: true, title: 'Reactivate student?', message: `Return ${name || 'this student'} to Active students? Their password and historical enrollments will be preserved.`, type: 'info', confirmText: 'Reactivate', cancelText: 'Cancel', onConfirm: async () => {
      try { await api.put(`/admin/users/${id}/reactivate`); fetchUsers(); showAlert('Student reactivated', 'The student is active again. You can assign a new batch when needed.', undefined, 'success'); }
      catch (error: any) { showAlert('Unable to reactivate', error.response?.data?.message || 'Please try again.', undefined, 'error'); }
    } });
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
          await api.put(`/admin/users/${id}/deactivate`, { is_active: !currentStatus });
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

  const handleDeleteCompletely = (id: string, userName?: string, role?: string) => {
    if (detailsModalVisible) {
      setDetailsModalVisible(false);
    }
    setUserDetails(null);
    setConfirmModal({
      visible: true,
      title: role === 'application' ? 'Delete application?' : 'Permanently delete user?',
      message: role === 'application' ? `Permanently delete the application for ${userName || 'this applicant'}? This cannot be undone.` : `This will permanently delete ${userName || 'this user'} and all their related data (enrollments, results, bookings and uploads). This cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(role === 'application' ? `/admin/applications/${id}` : `/admin/users/${id}/delete`);
          fetchUsers();
          showAlert(
            'Deleted',
            role === 'application' ? 'Application permanently deleted.' : `${userName || 'User'} and all related data have been permanently removed.`,
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
    active: (studentsList || []).filter(s => s.is_active === true && s.status !== 'completed' && !s.is_graduated).length,
    deactive: (studentsList || []).filter(s => s.is_active === false && s.status !== 'completed' && !s.is_graduated).length,
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
      total_fee: s.payment_info?.total_fee ?? 25000,
      category: (s.payment_info?.amount_paid || 0) >= (s.payment_info?.total_fee ?? 25000) ? 'completed' : 'pending',
    })),
  ];

  const isPaymentSettled = (payment: any) => payment.category === 'completed' || Number(payment.amount_paid ?? 0) >= Number(payment.total_fee ?? 0) || payment.payment_status === 'paid' || payment.payment_status === 'waived';
  const paymentsMetrics = { review: sourcePayments.filter((payment: any) => Number(payment.pending_slips_count || 0) > 0).length, pending: sourcePayments.filter(payment => !isPaymentSettled(payment)).length, completed: sourcePayments.filter(isPaymentSettled).length };

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

        if (studentsSubFilter === 'active') return matchesSearch && s.is_active === true && s.status !== 'completed' && !s.is_graduated;
        if (studentsSubFilter === 'deactive') return matchesSearch && s.is_active === false && s.status !== 'completed' && !s.is_graduated;
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

        const isCompleted = isPaymentSettled(p);
        if (paymentsSubFilter === 'review') return matchesSearch && Number(p.pending_slips_count || 0) > 0;

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
    // A payment row represents a student's account, not a deletable payment.
    if (activeMode === 'payments') { showAlert('Payment records', 'Open a payment dossier to review or update its payments. Student accounts can be managed from Students.'); return; }
    const applications = activeMode === 'applications';
    setConfirmModal({
      visible: true,
      title: applications ? 'Delete selected applications?' : 'Delete selected users?',
      message: applications ? `Permanently delete ${selectedUserIds.length} selected applications? This cannot be undone.` : `Permanently delete ${selectedUserIds.length} selected users and all their data? This cannot be undone.`,
      type: 'danger',
      confirmText: applications ? 'Delete applications' : 'Delete users',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setLoading(true);
          const failed: string[] = [];
          for (const id of selectedUserIds) {
            try {
              await api.delete(applications ? `/admin/applications/${id}` : `/admin/users/${id}/delete`);
            } catch (err) {
              failed.push(id);
              console.warn(`Failed to delete user ${id}`, err);
            }
          }
          setSelectedUserIds(failed);
          setIsSelectMode(failed.length > 0);
          fetchUsers();
          const deleted = selectedUserIds.length - failed.length;
          showAlert(failed.length ? 'Some records could not be deleted' : 'Deleted', `${deleted} record${deleted === 1 ? '' : 's'} deleted.${failed.length ? ` ${failed.length} remain selected. Please try again.` : ''}`, undefined, failed.length ? 'error' : 'success');
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

  const getGradeColor = useCallback((_grade: string) => '#F58220', []);

  const renderPendingItem = ({ item }: { item: any }) => {
    const isSelected = selectedUserIds.includes(item._id);
    const isMenuOpen = activeMenuUserId === item._id;
    const name = item.full_name || item.fullName || item.name || item.student_name || 'Applicant';
    const status = item.status || 'pending';
    const photo = item.student_photo || item.profile_photo;

    return (
      <TouchableOpacity accessibilityRole={Platform.OS === 'web' ? undefined : 'button'} role={Platform.OS === 'web' ? 'group' : undefined} accessibilityLabel={`View application ${name}`}         style={[
          styles.card,
          isDark && { backgroundColor: design.surface, borderColor: design.line },
          isMenuOpen && { zIndex: 9999, elevation: 25 },
          isSelectMode && isSelected && styles.whatsappSelectedCard,
        ]}
        onPress={() => {
          if (isSelectMode) {
            toggleUserSelection(item._id);
          } else if (activeMenuUserId) {
            setActiveMenuUserId(null);
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
              <View style={[styles.avatar, isDark && { backgroundColor: design.surface, borderColor: design.line }]}>
                <Icon name="person" size={24} color={isDark ? "#94A3B8" : "#475569"} />
              </View>
            )}
            {isSelectMode && (
              <View style={[styles.whatsappCheckBadge, isSelected ? styles.whatsappCheckBadgeActive : styles.whatsappCheckBadgeInactive]}>
                <Icon name={isSelected ? "checkmark" : "add"} size={12} color={isSelected ? "#FFFFFF" : "#64748B"} />
              </View>
            )}
          </View>

          <View style={styles.headerDetails}>
            <Text style={[styles.userName, isDark && { color: design.text }]}>{name}</Text>
            <Text style={[styles.userEmail, isDark && { color: design.muted }]}>{item.email}</Text>
            <Text style={[styles.userSubtext, isDark && { color: design.muted }]}>NIC / Reg: {item.nic_number || item.nic || item.index_number || 'N/A'}</Text>
          </View>

          <View style={styles.rightCardCol}>
            {!isSelectMode && (
              <WhatsAppOptionsMenu
                accessibilityLabel={`Application options for ${name}`}
                options={[
                  {
                    id: 'view_app',
                    label: 'View Application',
                    onPress: () => {
                      setSelectedAppForReview(item);
                    },
                  },
                  ...(status === 'pending' ? [
                    {
                      id: 'approve',
                      label: 'Approve',
                      onPress: () => item.user_id ? handleApprove(item.user_id) : setSelectedAppForReview(item),
                    },
                    {
                      id: 'reject',
                      label: 'Reject',
                      destructive: true,
                      onPress: () => item.user_id ? handleReject(item.user_id, name) : setSelectedAppForReview(item),
                    }
                  ] : []),
                  ...(status === 'approved' ? [{ id: 'reject_approved', label: 'Reject Application', onPress: () => setSelectedAppForReview(item) }] : []),
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
              <View style={[styles.statusBadge, { backgroundColor: status === 'approved' ? design.successSoft : design.warningSoft, marginTop: 8 }]}>
                <Text style={[styles.statusBadgeText, { color: status === 'approved' ? design.success : design.accent }]}>
                  {status === 'approved' ? 'Approved' : 'Pending'}
                </Text>
              </View>
            )}
          </View>
        </View>

      </TouchableOpacity>
    );
  };

  const renderStudentItem = ({ item }: { item: any }) => {
    const selected = selectedUserIds.includes(item._id), completed = item.status === 'completed' || item.is_graduated;
    const active = item.is_active && !completed;
    return <TouchableOpacity accessibilityRole={Platform.OS === 'web' ? undefined : 'button'} role={Platform.OS === 'web' ? 'group' : undefined} accessibilityLabel={`Open student ${item.name}`}
      style={[styles.card, selected && isSelectMode && styles.whatsappSelectedCard]} activeOpacity={0.75}
      onPress={() => isSelectMode ? toggleUserSelection(item._id) : handleOpenDetails(item._id)} onLongPress={() => { setIsSelectMode(true); toggleUserSelection(item._id); }}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}><Icon name={selected && isSelectMode ? 'checkmark' : 'person-outline'} size={22} color={design.accent} /></View>
        <View style={styles.headerDetails}><Text style={styles.userName}>{item.name}</Text><Text style={styles.userEmail}>{item.email}</Text><Text style={styles.userSubtext}>Reg No: {item.index_number || item.registration_number || item.nic || 'N/A'}</Text></View>
        <View style={styles.rightCardCol}>
          {!isSelectMode && <WhatsAppOptionsMenu accessibilityLabel={`Student options for ${item.name}`} options={[
            { id: 'view', label: 'View Profile', onPress: () => handleOpenDetails(item._id) },
            ...(active ? [
              { id: 'batch', label: 'Assign Batch', onPress: () => { setAssignStudentId(item._id); setAssignModalVisible(true); } },
              { id: 'complete', label: 'Mark Completed', onPress: () => handleMarkCompleted(item._id, item.name) },
              { id: 'deactivate', label: 'Deactivate', onPress: () => handleToggleActive(item._id, true, item.name) },
            ] : [{ id: 'reactivate', label: 'Reactivate', onPress: () => handleReactivateStudent(item._id, item.name) }]),
            { id: 'delete', label: 'Delete', destructive: true, onPress: () => handleDeleteCompletely(item._id, item.name, 'student') },
          ]} />}
          <View style={[styles.statusBadge, { backgroundColor: active ? design.accentSoft : design.field }]}><Text style={[styles.statusBadgeText, { color: active ? design.accent : design.muted }]}>{completed ? 'Completed' : active ? 'Active' : 'Deactivated'}</Text></View>
        </View>
      </View>
    </TouchableOpacity>;
  };

  const renderStudentActions = (student: any) => {
    const completed = student.status === 'completed' || student.is_graduated, active = student.is_active && !completed;
    const actions = [
      ...(active ? [{ title: 'Assign Batch', primary: true, action: () => { setDetailsModalVisible(false); setAssignStudentId(student._id); setAssignModalVisible(true); } }] : [{ title: 'Reactivate', primary: true, action: () => handleReactivateStudent(student._id, student.name) }]),
      { title: 'Payments', primary: false, action: () => { setDetailsModalVisible(false); void handleOpenPaymentDossier(student._id); } },
      ...(active ? [{ title: 'Mark Completed', primary: false, action: () => handleMarkCompleted(student._id, student.name) }, { title: 'Deactivate', primary: false, action: () => handleToggleActive(student._id, true, student.name) }] : []),
    ];
    return <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{actions.map(action => <TouchableOpacity key={action.title} accessibilityRole="button" accessibilityLabel={`Student action ${action.title}`} onPress={action.action}
      style={{ flexGrow: 1, flexBasis: '45%', minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: action.primary ? design.accent : design.line, backgroundColor: action.primary ? design.accent : design.field }}><Text style={{ ...FONTS.semiBold, fontSize: 13, color: action.primary ? '#FFFFFF' : design.text }}>{action.title}</Text></TouchableOpacity>)}</View>;
  };

  const renderInstructorItem = ({ item }: { item: any }) => {
    const isMenuOpen = activeMenuUserId === item._id;
    const isSelected = selectedUserIds.includes(item._id);
    return (
      <TouchableOpacity accessibilityRole={Platform.OS === 'web' ? undefined : 'button'} role={Platform.OS === 'web' ? 'group' : undefined} accessibilityLabel={`Open instructor ${item.name}`}         style={[
          styles.card,
          isDark && { backgroundColor: design.surface, borderColor: design.line },
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
              <View style={[styles.avatar, isDark && { backgroundColor: design.surface, borderColor: design.line }]}>
                <Icon name="person" size={24} color={isDark ? "#94A3B8" : "#475569"} />
              </View>
            )}
            {isSelectMode && (
              <View style={[styles.whatsappCheckBadge, isSelected ? styles.whatsappCheckBadgeActive : styles.whatsappCheckBadgeInactive]}>
                <Icon name={isSelected ? "checkmark" : "add"} size={12} color={isSelected ? "#FFFFFF" : "#64748B"} />
              </View>
            )}
          </View>
          <View style={styles.headerDetails}>
            <Text style={[styles.userName, isDark && { color: design.text }]}>{item.name}</Text>
            <Text style={[styles.userEmail, isDark && { color: design.muted }]}>{item.email}</Text>
            {item.phone ? <Text style={[styles.userSubtext, isDark && { color: design.muted }]}>{item.phone}</Text> : null}
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

  const renderPaymentItem = ({ item }: { item: any }) => <PaymentListCard item={item} selected={selectedUserIds.includes(item._id)} selecting={isSelectMode}
    onPress={() => isSelectMode ? toggleUserSelection(item._id) : handleOpenPaymentDossier(item._id)}
    onLongPress={() => { if (!isSelectMode) { setActiveMenuUserId(null); setIsSelectMode(true); toggleUserSelection(item._id); } }} />;

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
      showAlert('Error', 'Failed to generate PDF document.', undefined, 'error');
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
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: design.surface }]} edges={['top']}>
      <ScreenBackground />
      {activeMenuUserId && (
        <TouchableOpacity accessibilityRole="button"           activeOpacity={1}
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
          <ScreenHeader plainBack

            title="User Management"
            subtitle="Choose a category to manage"
            showBack={true}
          />
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 100,
              maxWidth: 1100,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            <Text style={[styles.hubSectionHeaderTitle, isDark && { color: design.text }]}>Choose Activity</Text>

            {/* 1. Applications Card */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Manage applications"               style={[styles.hubVerticalCard, isDark && styles.hubVerticalCardDark]}
              onPress={() => {
                setActiveMode('applications');
                setApplicationsSubFilter('pending');
                setCurrentView('detail');
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.hubVerticalIconBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : design.warningSoft }]}>
                <Icon name="document-text-outline" size={24} color={design.accent} />
              </View>
              <View style={styles.hubVerticalTextCol}>
                <Text style={[styles.hubVerticalTitle, isDark && { color: design.text }]}>Applications</Text>
                <Text style={[styles.hubVerticalSub, isDark && { color: design.muted }]}>{appMetrics.pending} Pending Applications</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={isDark ? "#64748B" : "#94A3B8"} />
            </TouchableOpacity>

            {/* 2. Students Card */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Manage students"               style={[styles.hubVerticalCard, isDark && styles.hubVerticalCardDark]}
              onPress={() => {
                setActiveMode('students');
                setStudentsSubFilter('all');
                setCurrentView('detail');
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.hubVerticalIconBox, { backgroundColor: isDark ? design.accentSoft : design.accentSoft }]}>
                <Icon name="people-outline" size={24} color={design.accent} />
              </View>
              <View style={styles.hubVerticalTextCol}>
                <Text style={[styles.hubVerticalTitle, isDark && { color: design.text }]}>Students</Text>
                <Text style={[styles.hubVerticalSub, isDark && { color: design.muted }]}>{studentsMetrics.all} Enrolled Students</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={isDark ? "#64748B" : "#94A3B8"} />
            </TouchableOpacity>

            {/* 3. Payments Card */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Manage payments"               style={[styles.hubVerticalCard, isDark && styles.hubVerticalCardDark]}
              onPress={() => {
                setActiveMode('payments');
                setPaymentsSubFilter(paymentsMetrics.review > 0 ? 'review' : 'pending');
                setCurrentView('detail');
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.hubVerticalIconBox, { backgroundColor: isDark ? design.accentSoft : design.successSoft }]}>
                <Icon name="wallet-outline" size={24} color={design.accent} />
              </View>
              <View style={styles.hubVerticalTextCol}>
                <Text style={[styles.hubVerticalTitle, isDark && { color: design.text }]}>Payments</Text>
                <Text style={[styles.hubVerticalSub, isDark && { color: design.muted }]}>{paymentsMetrics.pending} Outstanding Payments</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={isDark ? "#64748B" : "#94A3B8"} />
            </TouchableOpacity>

            {/* 4. Instructors Card */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Manage instructors"               style={[styles.hubVerticalCard, isDark && styles.hubVerticalCardDark]}
              onPress={() => {
                setActiveMode('instructors');
                setInstructorsSubFilter('active');
                setCurrentView('detail');
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.hubVerticalIconBox, { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.18)' : design.accentSoft }]}>
                <Icon name="school-outline" size={24} color={design.accent} />
              </View>
              <View style={styles.hubVerticalTextCol}>
                <Text style={[styles.hubVerticalTitle, isDark && { color: design.text }]}>Instructors</Text>
                <Text style={[styles.hubVerticalSub, isDark && { color: design.muted }]}>{instructorsMetrics.active} Active Staff</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={isDark ? "#64748B" : "#94A3B8"} />
            </TouchableOpacity>
          </ScrollView>
        </>
      ) : (
        <>
          {isSelectMode ? (
            <WhatsAppSelectionHeader neutral
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
                  disabled: activeMode === 'payments' || selectedUserIds.length === 0,
                  color: selectedUserIds.length > 0 ? design.accent : '#FFFFFF',
                  onPress: handleBulkDelete,
                },
              ]}
            />
          ) : (
            <ScreenHeader plainBack

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

          <View style={{ width: '100%', maxWidth: 1100, alignSelf: 'center' }}>
            {activeMode === 'applications' && <ManagementFilterBar value={applicationsSubFilter} onChange={setApplicationsSubFilter} items={[{ value: 'pending', label: 'Pending', count: appMetrics.pending }, { value: 'approved', label: 'Approved', count: appMetrics.approved }, { value: 'rejected', label: 'Rejected', count: appMetrics.rejected }]} />}
            {activeMode === 'students' && <ManagementFilterBar value={studentsSubFilter} onChange={setStudentsSubFilter} items={[{ value: 'all', label: 'All', count: studentsMetrics.all }, { value: 'active', label: 'Active', count: studentsMetrics.active }, { value: 'deactive', label: 'Deactive', count: studentsMetrics.deactive }, { value: 'completed', label: 'Completed', count: studentsMetrics.completed }]} />}
            {activeMode === 'payments' && <ManagementFilterBar value={paymentsSubFilter} onChange={setPaymentsSubFilter} items={[{ value: 'review', label: 'Review', count: paymentsMetrics.review }, { value: 'pending', label: 'Outstanding', count: paymentsMetrics.pending }, { value: 'completed', label: 'Settled', count: paymentsMetrics.completed }]} />}
            {activeMode === 'instructors' && <ManagementFilterBar value={instructorsSubFilter} onChange={setInstructorsSubFilter} items={[{ value: 'active', label: 'Active Staff', count: instructorsMetrics.active }, { value: 'deactive', label: 'Deactivated', count: instructorsMetrics.deactive }]} />}
          </View>

          {/* Main Content Area */}
          <>
            {/* Search Box */}
            <View style={styles.searchFilterRow}>
              <View style={[styles.searchBox, isDark && { backgroundColor: design.surface, borderColor: design.line }]}>
                <Icon name="search-outline" size={18} color={isDark ? "#94A3B8" : "#9CA3AF"} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, isDark && { color: design.text }]}
                  accessibilityLabel="Search users" placeholder="Search by name, email, reg no, or NIC..."
                  placeholderTextColor={design.muted}
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
                style={{ width: '100%', maxWidth: 1100, alignSelf: 'center' }}
                data={filteredUsers}
                refreshing={refreshing}
                onRefresh={async () => { setRefreshing(true); try { await fetchAllDashboardData(true); } finally { setRefreshing(false); } }}
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
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: dockClearance + 96 }}
                ListEmptyComponent={<Text style={styles.emptyListText}>{activeMode === 'payments' && paymentsSubFilter === 'review' ? 'No payments awaiting review.' : 'No records found for this filter.'}</Text>}
              />
            )}
          </>
        </>
      )}

      {currentView === 'detail' && activeMode !== 'payments' && !isSelectMode && <TouchableOpacity accessibilityRole="button" accessibilityLabel={activeMode === 'instructors' ? 'Create instructor' : 'Add student manually'} onPress={() => activeMode === 'instructors' ? setInstructorModalVisible(true) : setAdmissionTarget({ kind: 'create' })}
        style={{ position: 'absolute', bottom: dockClearance + 16, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: design.accent, alignItems: 'center', justifyContent: 'center', zIndex: 20 }}><Icon name="add" size={28} color="#FFFFFF" /></TouchableOpacity>}

      {/* Add Instructor Modal */}
      <Modal visible={instructorModalVisible} animationType="slide" transparent={true} onRequestClose={() => setInstructorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Instructor</Text>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Inst. Miller"
              accessibilityLabel="Instructor name" value={instructorForm.name}
              onChangeText={v => setInstructorForm({ ...instructorForm, name: v })}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. miller@gmail.com"
              accessibilityLabel="Instructor email" value={instructorForm.email}
              onChangeText={v => setInstructorForm({ ...instructorForm, email: v })}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>NIC Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 199912345678 or 991234567V"
              accessibilityLabel="Instructor nic" value={instructorForm.nic}
              onChangeText={v => setInstructorForm({ ...instructorForm, nic: v })}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +94 77 123 4567"
              accessibilityLabel="Instructor phone" value={instructorForm.phone}
              onChangeText={v => setInstructorForm({ ...instructorForm, phone: v })}
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity accessibilityRole="button"                 style={styles.cancelModalBtn}
                onPress={() => setInstructorModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"                 style={styles.submitModalBtn}
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
      <Modal visible={assignModalVisible} animationType="fade" transparent={true} onRequestClose={() => setAssignModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign to Batch</Text>
            <CustomDropdown appearance="management"
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
              <TouchableOpacity accessibilityRole="button" style={styles.cancelModalBtn} onPress={() => setAssignModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"                 style={styles.submitModalBtn}
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
      <Modal visible={credentialsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCredentialsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <View style={{ marginBottom: 12 }}>
              <Icon name="checkmark-circle-outline" size={50} color={design.accent} />
            </View>
            <Text style={styles.modalTitle}>Student Account Ready</Text>
            <Text style={{ fontFamily: FONTS.regular.fontFamily,  fontSize: 13, color: design.muted, textAlign: 'center', marginBottom: 16 }}>
              Student account saved and selected batches assigned.
            </Text>

            {approvedCredentials && (
              <View style={{ backgroundColor: design.surface, borderRadius: 12, padding: 16, width: '100%', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontFamily: FONTS.regular.fontFamily,  fontSize: 13, color: design.muted }}>Index No:</Text>
                  <Text style={{ fontFamily: FONTS.bold.fontFamily,  fontSize: 17, fontWeight: 'bold', color: design.accent }}>{approvedCredentials.index_number}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontFamily: FONTS.regular.fontFamily,  fontSize: 13, color: design.muted }}>Temp Password:</Text>
                  <Text style={{ fontFamily: FONTS.bold.fontFamily,  fontSize: 17, fontWeight: 'bold', color: design.accent }}>{approvedCredentials.temp_password}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.regular.fontFamily,  fontSize: 13, color: design.muted }}>Student Email:</Text>
                  <Text style={{ fontFamily: FONTS.medium.fontFamily,  fontSize: 13, color: design.text, fontWeight: '500' }}>{approvedCredentials.email}</Text>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: design.accentSoft, borderRadius: 8, padding: 10, marginBottom: 18 }}>
              <Icon name="shield-checkmark-outline" size={18} color={design.accent} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: FONTS.regular.fontFamily,  flex: 1, fontSize: 12, color: design.accent, lineHeight: 16 }}>
                Temporary password expires in 7 days. Save these initial login details before closing.
              </Text>
            </View>

            <TouchableOpacity accessibilityRole="button"               style={{ backgroundColor: design.accent, borderRadius: 10, paddingVertical: 12, width: '100%', alignItems: 'center' }}
              onPress={() => setCredentialsModalVisible(false)} accessibilityLabel="Close credentials"
            >
              <Text style={{ fontFamily: FONTS.bold.fontFamily,  color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>Close & Return</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CUSTOM IN-APP CONFIRMATION POPUP MODAL */}


      {/* CUSTOM IN-APP ALERT POPUP MODAL */}


      {/* EXPORT SETTINGS MODAL */}
      <Modal visible={exportModalVisible} animationType="slide" transparent={true} onRequestClose={() => setExportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="document-text-outline" size={24} color="#0F172A" style={{ marginRight: 8 }} />
                <Text style={styles.exportModalTitle}>Excel Export Settings</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => setExportModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={22} color={design.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.exportModalSub}>
              Select columns/fields to include in the Excel file ({exportTarget === 'selected' ? `${selectedUserIds.length} Selected Users` : `${filteredUsers.length} Users`}):
            </Text>

            {/* Quick Actions */}
            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
              <TouchableOpacity accessibilityRole="button"                 style={styles.fieldQuickBtn}
                onPress={() => setSelectedExportFields(EXPORT_AVAILABLE_FIELDS.map(f => f.key))}
              >
                <Text style={styles.fieldQuickBtnText}>Select All Fields</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"                 style={styles.fieldQuickBtn}
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
                  <TouchableOpacity accessibilityRole="button"                     key={field.key}
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
              <TouchableOpacity accessibilityRole="button"                 style={styles.cancelExportBtn}
                onPress={() => setExportModalVisible(false)}
              >
                <Text style={styles.cancelExportBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity accessibilityRole="button"                 style={styles.confirmExportBtn}
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
                  <TouchableOpacity accessibilityRole="button"                     onPress={() => {
                      setDetailsModalVisible(false);
                      setUserDetails(null);
                    }}
                    activeOpacity={0.7}
                    style={{ padding: 4 }} accessibilityLabel="Close user profile"
                  >
                    <Icon name="close" size={22} color={design.muted} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#000000" />
                  <Text style={styles.modalLoadingText}>Loading complete profile...</Text>
                </View>
              </View>
            ) : (
              <View style={{ flex: 1, backgroundColor: design.surface }}>
                {/* Dossier Header matching Batch viewing modal */}
                <View style={styles.detailsHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailsName}>{userDetails.user.name}</Text>
                    <Text style={styles.detailsEmail}>
                      {userDetails.user.email} • {userDetails.user.role ? userDetails.user.role.toUpperCase() : ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity accessibilityRole="button"                       style={styles.closeModalIconBtn}
                      onPress={handleSaveUserPdf}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="document-text-outline" size={20} color={design.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button"                       style={styles.closeModalIconBtn}
                      onPress={handleShareUserPdf}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="share-social-outline" size={20} color={design.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button"                       style={styles.closeModalIconBtn}
                      onPress={() => {
                        setDetailsModalVisible(false);
                        setUserDetails(null);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Close user profile"
                    >
                      <Icon name="close" size={22} color={design.muted} />
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
                          <View style={[styles.statusBadge, { backgroundColor: userDetails.user.is_active ? design.successSoft : design.dangerSoft }]}>
                            <Text style={[styles.statusBadgeText, { color: userDetails.user.is_active ? design.success : design.danger }]}>
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
                        <Text style={[styles.infoVal, { fontWeight: 'bold', color: userDetails.user.payment_info.payment_status === 'paid' ? design.success : design.accent }]}>
                          {userDetails.user.payment_info.payment_status ? userDetails.user.payment_info.payment_status.toUpperCase() : 'PENDING'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Total Course Fee:</Text>
                        <Text style={styles.infoVal}>LKR {userDetails.user.payment_info.total_fee ? userDetails.user.payment_info.total_fee.toLocaleString() : '0'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Amount Paid:</Text>
                        <Text style={[styles.infoVal, { color: design.success, fontWeight: 'bold' }]}>LKR {userDetails.user.payment_info.amount_paid ? userDetails.user.payment_info.amount_paid.toLocaleString() : '0'}</Text>
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
                        <Text style={[styles.infoVal, { color: design.accent, fontWeight: 'bold' }]}>{userDetails.averageMark}%</Text>
                      </View>
                      {(!userDetails.enrollments || userDetails.enrollments.length === 0) ? (
                        <Text style={{ fontFamily: FONTS.regular.fontFamily,  fontSize: 13, color: design.muted, marginTop: 4, fontStyle: 'italic' }}>No active batch enrollments yet.</Text>
                      ) : (
                        userDetails.enrollments.map((e: any) => (
                          <View key={e._id} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: design.line }}>
                            <Text style={{ fontFamily: FONTS.bold.fontFamily,  fontSize: 14, fontWeight: 'bold', color: design.text }}>{e.batch_id?.course_id?.title || 'Course'}</Text>
                            <Text style={{ fontFamily: FONTS.regular.fontFamily,  fontSize: 12.5, color: design.muted, marginTop: 2 }}>Batch: {e.batch_id?.name || 'Batch'} · {e.batch_id?.course_id?.duration_weeks} Weeks</Text>
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
                  {userDetails.user.role === 'applicant' ? <TouchableOpacity accessibilityRole="button" style={[styles.footerActionBtn, { backgroundColor: design.accent }]} onPress={() => { setDetailsModalVisible(false); setSelectedAppForReview({ ...userDetails.user, full_name: userDetails.user.full_name || userDetails.user.name }); }}><Text style={styles.footerActionText}>Review Application</Text></TouchableOpacity> : (
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {userDetails.user.role === 'student' ? renderStudentActions(userDetails.user) : (
                        <>
                          <TouchableOpacity accessibilityRole="button"
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
                          <TouchableOpacity accessibilityRole="button"
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

      <PaymentDetails visible={paymentDossierModalVisible} loading={loadingDossier} data={paymentDossierData} onClose={() => setPaymentDossierModalVisible(false)}
        onAdd={() => { setPaymentDossierModalVisible(false); setManualPayForm({ amount: '', payment_method: 'physical_cash', notes: '' }); setManualPayModalVisible(true); }} onImage={setDossierZoomImage} onApprove={handlePromptVerifySlip} onReject={handlePromptRejectSlip} verifyingId={verifyingSlipId} />
      <AddPayment visible={manualPayModalVisible} data={paymentDossierData} form={manualPayForm} onChange={setManualPayForm} saving={recordingManualPay} onSubmit={handleRecordManualPaySubmit}
        onClose={() => { if (!recordingManualPay) { setManualPayModalVisible(false); setPaymentDossierModalVisible(true); } }} />

      {/* ========================================================================= */}
      {/* REJECT SLIP REASON MODAL */}
      {/* ========================================================================= */}
      <ManagementSheet visible={rejectSlipModalVisible} title="Reject Payment Slip" backLabel="Cancel payment rejection" busy={rejectingSlip}
        onClose={() => { if (!rejectingSlip) { setRejectSlipModalVisible(false); setPaymentDossierModalVisible(true); } }}
        footer={<View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel payment rejection" disabled={rejectingSlip} style={styles.cancelModalBtn} onPress={() => { setRejectSlipModalVisible(false); setPaymentDossierModalVisible(true); }}><Text style={styles.cancelModalBtnText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reject Slip" disabled={rejectingSlip} style={[styles.saveModalBtn, { backgroundColor: design.accent }]} onPress={handleRejectSlipSubmit}>{rejectingSlip ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveModalBtnText}>Reject slip</Text>}</TouchableOpacity>
        </View>}>
        <Text style={{ ...FONTS.regular, fontSize: 13, lineHeight: 20, color: design.muted }}>Explain why this payment could not be verified. The student will receive the reason.</Text>
        <Text style={styles.inputLabel}>Rejection reason</Text>
        <TextInput accessibilityLabel="Payment rejection reason" editable={!rejectingSlip} multiline numberOfLines={4} value={rejectSlipForm.reason} onChangeText={reason => setRejectSlipForm(current => ({ ...current, reason }))} placeholder="Receipt unclear or transaction reference does not match" placeholderTextColor={design.muted} style={[styles.modalInput, { minHeight: 100, textAlignVertical: 'top' }]} />
      </ManagementSheet>

      {/* ========================================================================= */}
      {/* DOSSIER FULL-SCREEN IMAGE ZOOM MODAL */}
      {/* ========================================================================= */}
      <Modal visible={Boolean(dossierZoomImage)} transparent animationType="fade">
        <View style={styles.zoomModalOverlay}>
          <TouchableOpacity accessibilityRole="button" style={styles.zoomCloseBtn} onPress={() => setDossierZoomImage(null)}>
            <Icon name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.zoomImageContainer}>
            {dossierZoomImage ? (
              <Image source={{ uri: dossierZoomImage }} style={styles.fullZoomImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
      <ManagementDialog visible={confirmModal.visible} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} confirmText={confirmModal.confirmText || 'Confirm'} cancelText={confirmModal.cancelText || 'Cancel'} onCancel={() => { const action = confirmModal.onCancel; setConfirmModal(prev => ({ ...prev, visible: false })); action?.(); }} onConfirm={() => { const action = confirmModal.onConfirm; setConfirmModal(prev => ({ ...prev, visible: false })); action?.(); }} />
      <ManagementDialog visible={alertModal.visible} title={alertModal.title} message={alertModal.message} type={alertModal.type} onConfirm={() => { const action = alertModal.onOk; setAlertModal(prev => ({ ...prev, visible: false })); action?.(); }} />
      {admissionTarget && <StudentAdmissionModal target={admissionTarget} onClose={() => setAdmissionTarget(null)} onSaved={data => {
        setAdmissionTarget(null); fetchUsers();
        if (data.credentials) { setApprovedCredentials(data.credentials); setCredentialsModalVisible(true); }
        else showAlert('Student saved', data.message || 'Student saved and batches assigned.', undefined, 'success');
      }} />}
    </SafeAreaView>
  );
}

const createStyles = (design: ReturnType<typeof usersSectionTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: design.field,
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
    backgroundColor: design.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  minHeight: 44, },
  savePdfBtnText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rightAlignedActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 40,
    width: '100%',
  flexWrap: 'wrap', },
  smallRejectBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: design.field,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  minHeight: 44, borderWidth: 1, borderColor: design.line, },
  smallRejectBtnText: { fontFamily: FONTS.semiBold.fontFamily,
    color: design.text,
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallApproveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: design.accent,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  minHeight: 44, },
  smallApproveBtnText: { fontFamily: FONTS.semiBold.fontFamily,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallBtnText: { fontFamily: FONTS.semiBold.fontFamily,
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
    borderBottomColor: design.line,
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
    backgroundColor: design.field,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  plainNameText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 19,
    fontWeight: 'bold',
    color: design.text,
  },
  plainSubText: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 13,
    color: design.muted,
    marginTop: 2,
  },
  plainSectionTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 16,
    fontWeight: 'bold',
    color: design.text,
    marginTop: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
    paddingBottom: 4,
  },
  plainRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  plainLabel: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: design.text,
  },
  plainValue: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 14,
    color: design.text,
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
    backgroundColor: design.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: design.line,
  },
  /* HARDCOPY PAPER APPLICATION FORM STYLES */
  hardcopyFormSheet: {
    backgroundColor: design.surface,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  formOfficialHeader: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: design.line,
  },
  formHeaderCrestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  formCrestBadge: {
    backgroundColor: design.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 10,
  },
  formCrestBadgeText: { fontFamily: FONTS.regular.fontFamily,
    color: '#F58220',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  formInstituteTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 12,
    fontWeight: '800',
    color: design.text,
    letterSpacing: 0.8,
  },
  formDocumentTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: design.muted,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  formRefMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  formRefNoText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: design.muted,
    letterSpacing: 0.5,
  },
  formStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.warningSoft,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  formStatusPillText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10,
    fontWeight: '800',
    color: design.warning,
    letterSpacing: 0.4,
  },
  pendingDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: design.accent,
    marginRight: 5,
  },
  formSectionBanner: {
    backgroundColor: design.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 16,
    marginBottom: 10,
  },
  formSectionBannerText: { fontFamily: FONTS.bold.fontFamily,
    color: design.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  formProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
    marginBottom: 8,
  },
  formAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: design.line,
    marginRight: 14,
  },
  formAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: design.field,
    borderWidth: 1.5,
    borderColor: design.line,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  formApplicantFullName: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 17,
    fontWeight: '800',
    color: design.text,
    letterSpacing: -0.2,
  },
  formApplicantEmail: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 13,
    color: design.muted,
    marginTop: 1,
    fontWeight: '500',
  },
  formOtpVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formOtpVerifiedText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10,
    fontWeight: '800',
    color: design.text,
  },
  formFieldRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  formFieldCell: {
    flex: 1,
  },
  formFieldFullRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  formCellLabel: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10.5,
    fontWeight: '700',
    color: design.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  formCellValue: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: design.text,
    marginTop: 2,
  },
  formBatchItemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  formBatchItemTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 13.5,
    fontWeight: '700',
    color: design.text,
  },
  formBatchItemSub: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 12,
    color: design.muted,
    marginTop: 2,
  },
  /* EXECUTIVE PROFESSIONAL BUTTONS */
  profRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 6, elevation: 0 }
    }),
  minHeight: 44, },
  profApproveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 6, elevation: 0 }
    }),
  minHeight: 44, },
  profAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  profDeactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#D97706', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  profActivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  profDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  profBtnText: { fontFamily: FONTS.bold.fontFamily,
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
  title: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 26,
    fontWeight: 'bold',
    color: design.text,
  },
  subtitle: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 14,
    color: design.muted,
    marginTop: 4,
  },
  actionButtonRow: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  addInstructorBtn: {
    backgroundColor: design.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 6, elevation: 0 }
    }),
  minHeight: 44, },
  addInstructorBtnText: { fontFamily: FONTS.bold.fontFamily,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 0,
    marginTop: 10,
  width: '100%', maxWidth: 1100, alignSelf: 'center', marginHorizontal: 0, },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.surface,
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 40,
    marginRight: 10,
  minHeight: 44, },
  searchInput: { fontFamily: FONTS.regular.fontFamily,
    flex: 1,
    fontSize: 13.5,
    color: design.text,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.surface,
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0, shadowRadius: 4, elevation: 0 }
    }),
  minHeight: 44, },
  filterBtnActive: {
    backgroundColor: design.accent,
    borderColor: design.line,
  },
  filterBtnText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: design.text,
  },
  segmentedTrackContainer: {
    backgroundColor: design.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: design.line,
    borderRadius: 26,
    padding: 4,
    borderWidth: 1,
    borderColor: design.line,
    ...Platform.select({
      web: { boxShadow: 'none' },
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
    backgroundColor: design.accent,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0,
        shadowRadius: 6,
        elevation: 0,
      }
    }),
  },
  segmentedTabText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: design.muted,
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: design.line,
    backgroundColor: design.surface,
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
    backgroundColor: design.accentSoft,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  tabText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: design.muted,
  },
  activeTabText: {
    color: design.accent,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: design.warningSoft,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  tabBadgeText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 12,
    fontWeight: 'bold',
    color: design.accent,
  },
  card: {
    backgroundColor: design.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: design.line,
    overflow: 'visible',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0, shadowRadius: 6, elevation: 0 }
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
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
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
    borderColor: design.line,
  },
  headerDetails: {
    flex: 1,
    marginRight: 8,
  minWidth: 0, },
  userName: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 16.5,
    fontWeight: 'bold',
    color: design.text,
  lineHeight: 23, },
  userEmail: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 12,
    color: design.muted,
    marginTop: 2,
  lineHeight: 18, },
  userSubtext: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 12,
    color: design.muted,
    marginTop: 2,
  lineHeight: 18, },
  newBadge: {
    backgroundColor: design.warningSoft,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: design.line,
  },
  newBadgeText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: design.accent,
  },
  statusBadge: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
    marginLeft: 4,
  },
  statusBadgeText: { fontFamily: FONTS.semiBold.fontFamily,
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
    backgroundColor: design.accentSoft,
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  minHeight: 44, },
  viewProfileText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 12.5,
    fontWeight: 'bold',
    color: design.accent,
  },
  rejectOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: design.surface,
  minHeight: 44, },
  rejectOutlineText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: design.accent,
  },
  approveDarkBtn: {
    backgroundColor: design.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  approveDarkText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deactivateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: design.dangerSoft,
  minHeight: 44, },
  deactivateBtnText: { fontFamily: FONTS.bold.fontFamily,
    fontWeight: '700',
    fontSize: 12,
  },
  activateBtn: {
    borderColor: '#A7F3D0',
    backgroundColor: design.successSoft,
  borderRadius: 10, minHeight: 44, },
  activateBtnText: {
    color: design.success,
  },
  deletePermanentBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: design.accent,
    backgroundColor: '#1A1A1A',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#7F1D1D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 4, elevation: 0 }
    }),
  minHeight: 44, },
  deletePermanentBtnText: { fontFamily: FONTS.semiBold.fontFamily,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  filterOptionsPanel: {
    backgroundColor: design.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  filterPanelTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 11,
    fontWeight: 'bold',
    color: design.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
  },
  filterChipActive: {
    backgroundColor: design.accent,
    borderColor: design.line,
  },
  filterChipText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: design.muted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  assignBatchBtn: {
    backgroundColor: design.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  assignBatchText: { fontFamily: FONTS.bold.fontFamily,
    color: design.text,
    fontWeight: '700',
    fontSize: 12,
  },
  emptyListText: { fontFamily: FONTS.regular.fontFamily,
    textAlign: 'center',
    color: design.muted,
    marginTop: 40,
    fontSize: 15,
  },

  /* DETAILS MODAL STYLES */
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: { fontFamily: FONTS.regular.fontFamily,
    marginTop: 12,
    color: design.muted,
    fontSize: 14,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: design.field,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  detailsAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
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
    borderColor: design.line,
  },
  detailsName: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 18,
    fontWeight: 'bold',
    color: design.text,
  },
  detailsEmail: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 13,
    color: design.muted,
    marginTop: 1,
  },
  roleTag: {
    backgroundColor: design.field,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleTagText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10,
    fontWeight: 'bold',
    color: design.text,
  },
  closeModalIconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: design.field,
  },
  detailSectionCard: {
    backgroundColor: design.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: design.line,
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
    backgroundColor: design.accent,
    marginRight: 8,
  },
  detailSectionTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    color: design.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 13,
    color: design.muted,
  },
  detailValue: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: design.text,
  },
  summaryBanner: {
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryBannerInstructor: {
    backgroundColor: design.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryBannerTitle: { fontFamily: FONTS.semiBold.fontFamily,
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBannerValue: { fontFamily: FONTS.bold.fontFamily,
    color: design.text,
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 2,
  },
  emptyDetailText: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 13,
    color: design.muted,
    fontStyle: 'italic',
  },
  itemSubCard: {
    backgroundColor: design.field,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: design.line,
  },
  itemSubTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 14,
    fontWeight: 'bold',
    color: design.text,
  },
  itemSubDesc: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 12,
    color: design.muted,
    marginTop: 2,
  },
  itemSubMeta: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 11,
    color: design.muted,
    marginTop: 4,
  },
  resultItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  resultName: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 13,
    fontWeight: 'bold',
    color: design.text,
  },
  resultBatch: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 11,
    color: design.muted,
    marginTop: 1,
  },
  resultScore: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 14,
    fontWeight: 'bold',
    color: design.text,
  },
  gradeChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
  },
  gradeChipText: { fontFamily: FONTS.bold.fontFamily,
    color: design.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsFooter: {
    padding: 14,
    backgroundColor: design.surface,
    borderTopWidth: 1,
    borderTopColor: design.line,
  },
  footerActionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 6, elevation: 0 }
    }),
  minHeight: 44, minWidth: 90, },
  footerActionText: { fontFamily: FONTS.bold.fontFamily,
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
  padding: 20, },
  modalCard: {
    backgroundColor: design.surface,
    borderRadius: 18,
    padding: 20,
    width: '92%',
    elevation: 0,
  borderWidth: 1, borderColor: design.line, maxWidth: 650, maxHeight: '90%', },
  modalTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 18,
    fontWeight: 'bold',
    color: design.text,
    marginBottom: 16,
  },
  label: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: design.text,
    marginBottom: 6,
    marginTop: 10,
  },
  input: { fontFamily: FONTS.regular.fontFamily,
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: design.text,
  minHeight: 44, },
  pickerContainer: {
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: design.field,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  flexWrap: 'wrap', gap: 10, },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: design.field,
  minHeight: 44, borderWidth: 1, borderColor: design.line, },
  cancelModalText: {
    color: design.muted,
    fontWeight: '600',
  },
  submitModalBtn: {
    backgroundColor: design.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
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
    backgroundColor: design.surface,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0, shadowRadius: 12, elevation: 0 }
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
  popupTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 18,
    fontWeight: 'bold',
    color: design.text,
    textAlign: 'center',
    marginBottom: 8
  },
  popupMessage: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 14,
    color: design.muted,
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
    backgroundColor: design.field,
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: design.line
  },
  popupCancelText: { fontFamily: FONTS.bold.fontFamily,
    color: design.muted,
    fontWeight: 'bold',
    fontSize: 14
  },
  popupConfirmBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  },
  popupConfirmText: { fontFamily: FONTS.bold.fontFamily,
    color: design.text,
    fontWeight: 'bold',
    fontSize: 14
  },
  popupSingleBtn: {
    width: '100%',
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  },
  popupSingleBtnText: { fontFamily: FONTS.bold.fontFamily,
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
  borderRadius: 10, minHeight: 44, },

  /* INLINE WHATSAPP 3-DOTS DROPDOWN MENU STYLES */
  whatsappMenuContainer: {
    position: 'absolute',
    top: 28,
    right: 0,
    backgroundColor: design.surface,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
    width: 140,
    borderWidth: 1,
    borderColor: design.line,
    zIndex: 99999,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0, shadowRadius: 10, elevation: 0 },
    }),
  },
  whatsappMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  whatsappMenuText: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 13.5,
    fontWeight: '500',
    color: design.text,
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
    borderColor: design.line,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: {
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0,
        shadowRadius: 12,
        elevation: 0,
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
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0, shadowRadius: 3 },
    }),
  },

  /* PROFESSIONAL COLORED ACTION BUTTON STYLES */
  coloredRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 140,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 6, elevation: 0 }
    }),
  minHeight: 44, },
  coloredApproveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 140,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 6, elevation: 0 }
    }),
  minHeight: 44, },
  coloredAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  coloredDeactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#D97706', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  coloredActivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  coloredDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  coloredBtnText: { fontFamily: FONTS.bold.fontFamily,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },

  /* VERTICAL CATEGORY HUB STYLES (MATCHING USER REFERENCE IMAGE) */
  hubSectionHeaderTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    color: design.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  hubVerticalCard: {
    backgroundColor: design.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: design.line,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 10, elevation: 0 }
    }),
  padding: 16, },
  hubVerticalCardDark: {
    backgroundColor: design.surface,
    borderColor: design.line,
  },
  hubVerticalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  hubVerticalTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  hubVerticalTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 16.5,
    fontWeight: '700',
    color: design.text,
  },
  hubVerticalSub: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 13,
    color: design.muted,
    marginTop: 3,
    fontWeight: '500',
  },

  /* 4 MODE CARDS DASHBOARD STYLES */
  modeCardsSection: {
    paddingVertical: 10,
    backgroundColor: design.surface,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  modeCardsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  modeCardItem: {
    width: 170,
    backgroundColor: design.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: design.line,
    borderLeftWidth: 4,
    borderLeftColor: '#64748B',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0, shadowRadius: 4, elevation: 0 }
    }),
  },
  modeCardItemActive: {
    borderColor: '#F58220',
    borderWidth: 1.5,
    backgroundColor: '#FAFAF9',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#F58220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 8, elevation: 0 }
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
    backgroundColor: design.field,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  modeCardCountText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10.5,
    fontWeight: '700',
    color: design.muted,
  },
  modeCardTitleText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 15,
    fontWeight: '700',
    color: design.text,
  },
  modeCardSubtext: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 11,
    color: design.muted,
    marginTop: 2,
  },

  /* STRUCTURED CARD STYLES */
  infoSectionCard: {
    backgroundColor: design.surface,
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0, shadowRadius: 4, elevation: 0 }
    }),
  },
  sectionCardHeaderTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 15,
    fontWeight: 'bold',
    color: design.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: design.line,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  flexWrap: 'wrap', columnGap: 12, rowGap: 6, },
  infoLabel: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 13,
    color: design.muted,
    fontWeight: '500',
  flexShrink: 1, },
  infoVal: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: design.text,
    maxWidth: '65%',
    textAlign: 'right',
  flexShrink: 1, },
  modalAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: design.field,
  },
  infoAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: design.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoStudentName: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 17,
    fontWeight: 'bold',
    color: design.text,
  },
  infoStudentEmail: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 13,
    color: design.muted,
    marginTop: 1,
  },
  /* HEADER DROPDOWN MENU STYLES */
  headerDropdownMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    width: 200,
    backgroundColor: design.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: design.line,
    paddingVertical: 4,
    zIndex: 99999,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 10, elevation: 0 }
    }),
  },
  headerDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  headerDropdownText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: design.text,
  },
  /* SELECT MODE BANNER STYLES */
  selectModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: design.field,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectModePillBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  selectModePillText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: design.text,
  },
  selectCountText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: design.text,
  },
  selectActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  minHeight: 44, },
  selectActionText: { fontFamily: FONTS.semiBold.fontFamily,
    color: design.text,
    fontSize: 12,
    fontWeight: '600',
  },
  closeSelectBtn: {
    padding: 4,
    marginLeft: 4,
  borderRadius: 10, minHeight: 44, },
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
    backgroundColor: design.surface,
  },
  selectCheckboxCircleActive: {
    backgroundColor: design.accent,
    borderColor: design.accent,
  },
  selectedCardHighlight: {
    borderColor: design.accent,
    borderWidth: 1.5,
    backgroundColor: '#F0F9FF',
  },
  /* EXPORT MODAL STYLES */
  exportModalCard: {
    width: '92%',
    maxWidth: 440,
    backgroundColor: design.surface,
    borderRadius: 18,
    padding: 20,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0, shadowRadius: 16, elevation: 0 }
    }),
  borderWidth: 1, borderColor: design.line, maxHeight: '88%', },
  exportModalTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 17,
    fontWeight: 'bold',
    color: design.text,
  },
  exportModalSub: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 12.5,
    color: design.muted,
    marginTop: 2,
  },
  fieldQuickBtn: {
    backgroundColor: design.field,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: design.line,
  minHeight: 44, },
  fieldQuickBtnText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: design.text,
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
    backgroundColor: design.field,
    borderColor: design.line,
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
    backgroundColor: design.surface,
  },
  fieldBoxActive: {
    backgroundColor: design.accent,
    borderColor: design.line,
  },
  fieldRowLabel: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 13.5,
    color: design.muted,
  },
  fieldRowLabelActive: {
    fontWeight: '600',
    color: design.text,
  },
  cancelExportBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: design.field,
    alignItems: 'center',
    justifyContent: 'center',
  minHeight: 44, },
  cancelExportBtnText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: design.muted,
  },
  confirmExportBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: design.accent,
  minHeight: 44, },
  confirmExportBtnText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  /* WHATSAPP CONTEXTUAL SELECTION STYLES */
  whatsappHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: design.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  whatsappHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  whatsappHeaderTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 20,
    fontWeight: '700',
    color: design.text,
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
    backgroundColor: design.accentSoft,
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
    borderColor: design.line,
  },
  whatsappCheckBadgeActive: {
    backgroundColor: '#16A34A',
  },
  whatsappCheckBadgeInactive: {
    backgroundColor: design.field,
    borderColor: design.line,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: design.muted,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: { fontFamily: FONTS.regular.fontFamily,
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: design.text,
  minHeight: 44, },
  modalFooterBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  flexWrap: 'wrap', },
  cancelModalBtnText: { fontFamily: FONTS.bold.fontFamily,
    color: design.muted,
    fontWeight: 'bold',
    fontSize: 13.5,
  },
  saveModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: design.accent,
    alignItems: 'center',
    justifyContent: 'center',
  minHeight: 44, },
  saveModalBtnText: { fontFamily: FONTS.bold.fontFamily,
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
