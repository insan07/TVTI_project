import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
  TextInput,
  Share
} from 'react-native';
import { Image } from 'expo-image';
import api from '../../services/api';
import { FONTS } from '../../config/theme';
import CourseBatchAssignments from '../../components/shared/CourseBatchAssignments';
import ManagementDialog from '../../components/shared/ManagementDialog';
import { usersSectionTheme } from '../../components/shared/usersSectionTheme';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../config/theme';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { useTheme } from '../../context/ThemeContext';
import WhatsAppSelectionHeader from '../../components/shared/WhatsAppSelectionHeader';
import * as Print from 'expo-print';

interface ApplicationsManagementScreenProps {
  embedded?: boolean;
  onApproved?: () => void;
  selectedApp?: any;
  onSelectAppForReview?: (app: any) => void;
  onBack?: () => void;
  statusFilter?: 'pending' | 'approved' | 'rejected' | 'all';
}

export default function ApplicationsManagementScreen({
  embedded = false,
  onApproved,
  selectedApp,
  onSelectAppForReview,
  onBack,
  statusFilter,
}: ApplicationsManagementScreenProps) {
  const { isDark } = useTheme();
  const design = usersSectionTheme(isDark);
  const styles = useMemo(() => createStyles(usersSectionTheme(isDark)), [isDark]);
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info'; onOk?: () => void }>({ visible: false, title: '', message: '', type: 'info' });
  const showFeedback = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info', onOk?: () => void) => setFeedback({ visible: true, title, message, type, onOk });
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Review Modal States
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedAppForReview, setSelectedAppForReview] = useState<any>(null);
  const [allAvailableCourses, setAllAvailableCourses] = useState<any[]>([]);
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>([]);
  const [assignedBatchIds, setAssignedBatchIds] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [approving, setApproving] = useState(false);

  // Admin Payment Editor States
  const [adminTotalFee, setAdminTotalFee] = useState('0');
  const [adminAmountPaid, setAdminAmountPaid] = useState('0');
  const [adminPaymentStatus, setAdminPaymentStatus] = useState<'pending' | 'partially_paid' | 'paid' | 'waived'>('pending');
  const [slipZoomModalVisible, setSlipZoomModalVisible] = useState(false);

  // Credentials Modal States
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
  const [resendingCredentials, setResendingCredentials] = useState(false);
  const [credentialsTitle, setCredentialsTitle] = useState('Student Application Approved');
  const [credentialsEmailSent, setCredentialsEmailSent] = useState(false);
  const [approvedCredentials, setApprovedCredentials] = useState<{
    index_number: string;
    temp_password: string;
    email: string;
  } | null>(null);

  // Rejection Reason Modal States
  const [rejectReasonModalVisible, setRejectReasonModalVisible] = useState(false);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Selection & Permanent Delete States
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // Custom Confirmation Acknowledgment Modal State
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

  useEffect(() => {
    fetchPendingApplications();
    fetchActiveCourses();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      handleOpenReviewModal(selectedApp);
    }
  }, [selectedApp]);

  const toggleAppSelection = (appId: string) => {
    setSelectedAppIds(prev => {
      const next = prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId];
      if (next.length === 0) {
        setIsSelectMode(false);
      }
      return next;
    });
  };

  const handleDeleteSingleApp = (appId: string, name?: string) => {
    const appName = name || 'this application';
    const confirmMsg = `Are you sure you want to PERMANENTLY delete the application for "${appName}"? This action cannot be undone.`;

    setReviewModalVisible(false);
    setConfirmModal({ visible: true, title: 'Delete application?', message: confirmMsg, type: 'danger', confirmText: 'Delete forever', onConfirm: () => { void execDeleteSingleApp(appId); } });
  };

  const execDeleteSingleApp = async (appId: string) => {
    try {
      await api.delete(`/admin/applications/${appId}`);
      setReviewModalVisible(false);
      setSelectedAppForReview(null);
      const msg = 'Application record permanently deleted.';
      showFeedback('Deleted', msg, 'success', onBack);
      fetchPendingApplications();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to delete application';
      showFeedback('Error', msg, 'error');
    }
  };

  const handleBulkDeleteApps = () => {
    if (selectedAppIds.length === 0) return;
    const confirmMsg = `Are you sure you want to PERMANENTLY delete ${selectedAppIds.length} selected application(s)? This action cannot be undone.`;

    const execBulkDelete = async () => {
      try {
        setLoading(true);
        const failed: string[] = [];
        for (const id of selectedAppIds) {
          try {
            await api.delete(`/admin/applications/${id}`);
          } catch (err) {
            failed.push(id);
            console.warn(`Failed to delete application ${id}`, err);
          }
        }
        setSelectedAppIds(failed);
        setIsSelectMode(failed.length > 0);
        fetchPendingApplications();
        const deleted = selectedAppIds.length - failed.length;
        const msg = `${deleted} application${deleted === 1 ? '' : 's'} deleted.${failed.length ? ` ${failed.length} remain selected. Please try again.` : ''}`;
        showFeedback(failed.length ? 'Some applications could not be deleted' : 'Deleted', msg, failed.length ? 'error' : 'success');
      } catch (e) {
        showFeedback('Error', 'Bulk deletion failed', 'error');
      } finally {
        setLoading(false);
      }
    };

    setConfirmModal({ visible: true, title: 'Delete selected applications?', message: confirmMsg, type: 'danger', confirmText: 'Delete selected', onConfirm: () => { void execBulkDelete(); } });
  };

  const handleExportSelectedApps = () => {
    const selectedList = (applications || []).filter(a => selectedAppIds.includes(a._id));
    if (selectedList.length === 0) return;

    const headers = '"Full Name","Email","Phone","NIC","Status","Payment Method","Created At"';
    const rows = selectedList.map(a => {
      const name = `"${(a.full_name || '').replace(/"/g, '""')}"`;
      const email = `"${(a.email || '').replace(/"/g, '""')}"`;
      const phone = `"${(a.phone || '').replace(/"/g, '""')}"`;
      const nic = `"${(a.nic || '').replace(/"/g, '""')}"`;
      const status = `"${(a.status || 'pending').replace(/"/g, '""')}"`;
      const method = `"${(a.payment_method || 'bank_transfer').replace(/"/g, '""')}"`;
      const created = `"${a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}"`;
      return [name, email, phone, nic, status, method, created].join(',');
    });

    const csvData = '\uFEFF' + [headers, ...rows].join('\n');
    if (Platform.OS === 'web') {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TVTI_Applications_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const fetchPendingApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/applications?status=all');
      setApplications(res.data || []);
    } catch (e) {
      console.warn('Failed to fetch pending applications', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const displayedApplications = (applications || []).filter((app: any) => {
    if (statusFilter === 'pending') return app.status === 'pending' || !app.status;
    if (statusFilter === 'approved') return app.status === 'approved';
    if (statusFilter === 'rejected') return app.status === 'rejected';
    if (statusFilter === 'all') return true;
    return app.status !== 'approved';
  });

  const fetchActiveCourses = async () => {
    try {
      setLoadingCourses(true);
      const res = await api.get('/courses/active');
      setAllAvailableCourses(res.data || []);
    } catch (e) {
      console.warn('Failed to fetch active courses', e);
    } finally {
      setLoadingCourses(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingApplications();
  };

  const handleOpenReviewModal = (app: any) => {
    setSelectedAppForReview(app);

    let initialIds: string[] = [];
    if (app.course_ids && app.course_ids.length > 0) {
      initialIds = app.course_ids.map((c: any) => c._id || c);
    } else if (app.course_id) {
      initialIds = [(app.course_id._id || app.course_id)];
    }
    setAssignedCourseIds(initialIds);
    setAssignedBatchIds((app.assigned_batch_ids || []).map((batch: any) => String(batch._id || batch)));

    let calculatedFee = 0;
    if (app.total_course_fee && app.total_course_fee > 0) {
      calculatedFee = app.total_course_fee;
    } else if (app.course_ids && app.course_ids.length > 0) {
      calculatedFee = app.course_ids.reduce((acc: number, c: any) => acc + (c.fee || 0), 0);
    } else if (app.course_id && app.course_id.fee) {
      calculatedFee = app.course_id.fee;
    }

    setAdminTotalFee(String(calculatedFee));
    setAdminAmountPaid(app.amount_paid !== undefined ? String(app.amount_paid) : '0');
    setAdminPaymentStatus(app.payment_status || (app.payment_method === 'bank_transfer' ? 'pending' : 'pending'));

    setReviewModalVisible(true);
  };

  const toggleAssignedCourse = (courseId: string) => {
    setAssignedCourseIds(prev => {
      if (prev.includes(courseId)) {
        if (prev.length === 1) {
          const msg = 'At least one course must be assigned to the student.';
          showFeedback('Notice', msg, 'info');
          return prev;
        }
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };
  const handlePromptApprove = () => {
    if (!selectedAppForReview) return;
    if (assignedCourseIds.length === 0) {
      const msg = 'Please select at least one course to assign.';
      showFeedback('Error', msg, 'error');
      return;
    }
    if (assignedBatchIds.length !== assignedCourseIds.length) { showFeedback('Batch required', 'Select one batch for every selected course.'); return; }
    setReviewModalVisible(false);
    setConfirmModal({
      visible: true,
      title: 'Approve Application',
      message: `Are you sure you want to approve registration for ${selectedAppForReview.full_name}?\n\nAn official student index number and credentials will be generated and dispatched via email.`,
      type: 'info',
      confirmText: 'Approve',
      cancelText: 'Cancel',
      onConfirm: () => {
        handleApproveFromReview();
      }
    });
  };

  const handlePromptReject = () => {
    if (!selectedAppForReview) return;
    setReviewModalVisible(false);
    setConfirmModal({
      visible: true,
      title: 'Reject Application',
      message: `Are you sure you want to reject registration for ${selectedAppForReview.full_name}?`,
      type: 'danger',
      confirmText: 'Continue Rejection',
      cancelText: 'Cancel',
      onConfirm: () => {
        setRejectionReasonText('');
        setRejectReasonModalVisible(true);
      }
    });
  };

  const handleApproveFromReview = async () => {
    if (!selectedAppForReview) return;
    if (assignedCourseIds.length === 0) {
      const msg = 'Please select at least one course to assign.';
      showFeedback('Error', msg, 'error');
      return;
    }

    setApproving(true);
    try {
      const res = await api.put(`/admin/applications/${selectedAppForReview._id}/status`, {
        status: 'approved',
        assigned_course_ids: assignedCourseIds,
        assigned_batch_ids: assignedBatchIds,
        total_course_fee: Number(adminTotalFee) || 0,
        amount_paid: Number(adminAmountPaid) || 0,
        payment_status: adminPaymentStatus
      });

      setReviewModalVisible(false);

      if (res.data.credentials) {
        setCredentialsTitle('Student Application Approved');
        setCredentialsEmailSent(res.data.email_sent === true);
        setApprovedCredentials(res.data.credentials);
        setCredentialsModalVisible(true);
      } else {
        const msg = 'Application approved successfully.';
        showFeedback('Success', msg, 'success', () => { onApproved?.(); onBack?.(); });
      }

      fetchPendingApplications();
      // Keep the acknowledgement or credentials visible until it is dismissed.
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to approve application';
      showFeedback('Error', msg, 'error');
    } finally {
      setApproving(false);
    }
  };

  const handlePromptResendCredentials = () => {
    if (!selectedAppForReview || resendingCredentials) return;
    const applicationId = selectedAppForReview._id;
    setReviewModalVisible(false);
    setConfirmModal({
      visible: true, title: 'Resend Credentials',
      message: `Generate a new temporary password and email it to ${selectedAppForReview.email}? The current password will be replaced.`,
      confirmText: 'Resend Credentials', cancelText: 'Cancel', type: 'info',
      onConfirm: async () => {
        setResendingCredentials(true);
        try {
          const response = await api.put(`/admin/applications/${applicationId}/resend-credentials`);
          setCredentialsTitle('New Login Credentials');
          setCredentialsEmailSent(response.data.email_sent === true);
          setApprovedCredentials(response.data.credentials);
          setCredentialsModalVisible(true);
          fetchPendingApplications();
        } catch (error: any) {
          setReviewModalVisible(true);
          showFeedback('Unable to resend', error.response?.data?.message || 'Credentials could not be resent. Please try again.', 'error');
        } finally { setResendingCredentials(false); }
      }
    });
  };

  const handleRejectFromReview = () => {
    if (!selectedAppForReview) return;
    setRejectionReasonText('');
    setRejectReasonModalVisible(true);
  };

  const processReject = async (appId: string, reason: string) => {
    setRejectingId(appId);
    try {
      const finalReason = reason.trim() || 'Application details did not meet entry requirements.';
      const response = await api.put(`/admin/applications/${appId}/status`, {
        status: 'rejected',
        rejection_reason: finalReason
      });
      setRejectReasonModalVisible(false);
      setReviewModalVisible(false);
      setSelectedAppForReview(null);
      const msg = response.data.email_sent ? 'Application rejected. The rejection reason was emailed to the student.' : 'Application rejected. The email could not be delivered.';
      showFeedback('Success', msg, 'success', () => { onApproved?.(); onBack?.(); });
      fetchPendingApplications();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to reject application';
      showFeedback('Error', msg, 'error');
    } finally {
      setRejectingId(null);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const renderApplicationCard = ({ item }: { item: any }) => {
    const isRejected = item.status === 'rejected';
    const isSelected = selectedAppIds.includes(item._id);
    return (
      <TouchableOpacity accessibilityRole={Platform.OS === 'web' ? undefined : 'button'} role={Platform.OS === 'web' ? 'group' : undefined}         style={[
          styles.card,
          isDark && { backgroundColor: design.surface, borderColor: design.line },
          isRejected && { opacity: 0.6, backgroundColor: isDark ? design.surface : design.field, borderColor: isDark ? design.accent : design.line },
          isSelectMode && isSelected && styles.whatsappSelectedCard,
        ]}
        onPress={() => {
          if (isSelectMode) {
            toggleAppSelection(item._id);
          } else {
            handleOpenReviewModal(item);
            if (onSelectAppForReview) {
              onSelectAppForReview(item);
            }
          }
        }}
        onLongPress={() => {
          if (!isSelectMode) {
            setIsSelectMode(true);
            toggleAppSelection(item._id);
          }
        }}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ position: 'relative' }}>
            {item.student_photo ? (
              <Image source={{ uri: item.student_photo }} style={[styles.cardAvatarImg, isRejected && { opacity: 0.7 }]} />
            ) : (
              <View style={[styles.avatarCircle, isRejected && { backgroundColor: isDark ? design.surface : '#E2E8F0' }]}>
                <Icon name="person" size={24} color={isRejected ? "#94A3B8" : (isDark ? "#94A3B8" : "#475569")} />
              </View>
            )}
            {isSelectMode && (
              <View style={[styles.whatsappCheckBadge, isSelected ? styles.whatsappCheckBadgeActive : styles.whatsappCheckBadgeInactive]}>
                <Icon name={isSelected ? "checkmark" : "add"} size={12} color={isSelected ? "#FFFFFF" : "#64748B"} />
              </View>
            )}
          </View>

          <View style={styles.cardInfoCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[styles.studentName, isDark && { color: design.text }, isRejected && { color: design.muted }]} numberOfLines={1}>{item.full_name}</Text>
            </View>
            <Text style={[styles.studentEmailText, isDark && { color: design.muted }]} numberOfLines={1}>{item.email}</Text>
            {item.phone ? (
              <Text style={[styles.studentPhoneText, isDark && { color: design.muted }]} numberOfLines={1}>{item.phone}</Text>
            ) : item.nic ? (
              <Text style={[styles.studentPhoneText, isDark && { color: design.muted }]} numberOfLines={1}>{item.nic}</Text>
            ) : null}
          </View>

          <View style={styles.arrowContainer}>
            <Icon name="arrow-forward" size={19} color={isRejected ? "#94A3B8" : (isDark ? "#E2E8F0" : "#475569")} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleSavePdf = async () => {
    if (!selectedAppForReview) return;
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Student Application Form - ${selectedAppForReview.full_name}</title>
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
            <h2 style="margin: 6px 0 0 0; font-size: 16px; color: #475569;">STUDENT APPLICATION FORM</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <div class="section-title">Personal & Contact Details</div>
            <div class="row"><span class="label">Full Name:</span><span class="val">${selectedAppForReview.full_name || 'N/A'}</span></div>
            <div class="row"><span class="label">Email:</span><span class="val">${selectedAppForReview.email || 'N/A'}</span></div>
            <div class="row"><span class="label">Phone:</span><span class="val">${selectedAppForReview.phone || 'N/A'}</span></div>
            <div class="row"><span class="label">NIC Number:</span><span class="val">${selectedAppForReview.nic_number || 'N/A'}</span></div>
            <div class="row"><span class="label">Date of Birth:</span><span class="val">${selectedAppForReview.date_of_birth || 'N/A'}</span></div>
            <div class="row"><span class="label">Gender:</span><span class="val">${selectedAppForReview.gender || 'N/A'}</span></div>
            <div class="row"><span class="label">Address:</span><span class="val">${selectedAppForReview.address || 'N/A'}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Parent / Guardian Information</div>
            <div class="row"><span class="label">Guardian Name:</span><span class="val">${selectedAppForReview.guardian?.name || 'N/A'}</span></div>
            <div class="row"><span class="label">Relationship:</span><span class="val">${selectedAppForReview.guardian?.relationship || 'N/A'}</span></div>
            <div class="row"><span class="label">Guardian Phone:</span><span class="val">${selectedAppForReview.guardian?.phone || 'N/A'}</span></div>
            <div class="row"><span class="label">Occupation:</span><span class="val">${selectedAppForReview.guardian?.occupation || 'N/A'}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Educational Qualifications</div>
            <div class="row"><span class="label">Highest Level:</span><span class="val">${selectedAppForReview.educational_qualification?.highest_level || 'N/A'}</span></div>
            <div class="row"><span class="label">Grade / Result:</span><span class="val">${selectedAppForReview.educational_qualification?.grade_level || 'N/A'}</span></div>
            <div class="row"><span class="label">Institute:</span><span class="val">${selectedAppForReview.educational_qualification?.institute_name || 'N/A'}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Payment Information</div>
            <div class="row"><span class="label">Payment Method:</span><span class="val">${selectedAppForReview.payment_method === 'bank_transfer' ? 'Bank Deposit Slip' : 'Cash at Counter'}</span></div>
            <div class="row"><span class="label">Total Course Fee:</span><span class="val">LKR ${adminTotalFee}</span></div>
            <div class="row"><span class="label">Amount Paid:</span><span class="val">LKR ${adminAmountPaid}</span></div>
          </div>

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
      showFeedback('Error', 'Failed to generate PDF document.', 'error');
    }
  };

  const handleSharePdf = async () => {
    if (!selectedAppForReview) return;
    try {
      const app = selectedAppForReview;
      const shareMessage = `Twintec VTI - Student Application Dossier\nName: ${app.full_name}\nEmail: ${app.email}\nNIC: ${app.nic_number || 'N/A'}\nPhone: ${app.phone || 'N/A'}`;

      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({
            title: `Student Application - ${app.full_name}`,
            text: shareMessage,
          });
        } else {
          handleSavePdf();
        }
      } else {
        const { uri } = await Print.printToFileAsync({
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Student Application Form - ${app.full_name}</title>
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
                <h2 style="margin: 6px 0 0 0; font-size: 16px; color: #475569;">STUDENT APPLICATION FORM</h2>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
              </div>
              <div class="section">
                <div class="section-title">Personal & Contact Details</div>
                <div class="row"><span class="label">Full Name:</span><span class="val">${app.full_name || 'N/A'}</span></div>
                <div class="row"><span class="label">Email:</span><span class="val">${app.email || 'N/A'}</span></div>
                <div class="row"><span class="label">Phone:</span><span class="val">${app.phone || 'N/A'}</span></div>
                <div class="row"><span class="label">NIC Number:</span><span class="val">${app.nic_number || 'N/A'}</span></div>
                <div class="row"><span class="label">Date of Birth:</span><span class="val">${app.date_of_birth || 'N/A'}</span></div>
                <div class="row"><span class="label">Gender:</span><span class="val">${app.gender || 'N/A'}</span></div>
                <div class="row"><span class="label">Address:</span><span class="val">${app.address || 'N/A'}</span></div>
              </div>
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
          title: `Student Application - ${app.full_name}`
        });
      }
    } catch (e) {
      console.warn('Failed to share PDF document', e);
    }
  };

  const renderContentBody = () => {
    if (selectedAppForReview) {
      return (
        <>
          <Modal
            visible={Boolean(selectedAppForReview) && reviewModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              setSelectedAppForReview(null);
              setReviewModalVisible(false);
              if (onBack) onBack();
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { height: '88%', width: '92%', maxWidth: 650, padding: 0, overflow: 'hidden' }]}>
                <View style={{ flex: 1, backgroundColor: design.surface }}>
                {/* Dossier Header Row with Save PDF, Share, and Close Icon Shortcuts */}
                <View style={styles.detailsHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailsName}>{selectedAppForReview.full_name}</Text>
                    <Text style={styles.detailsEmail}>
                      {selectedAppForReview.email} • APPLICATION
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity accessibilityRole="button"                       style={styles.closeModalIconBtn}
                      onPress={handleSavePdf}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="document-text-outline" size={20} color={design.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button"                       style={styles.closeModalIconBtn}
                      onPress={handleSharePdf}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="share-social-outline" size={20} color={design.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button"                       style={styles.closeModalIconBtn}
                      onPress={() => {
                        setSelectedAppForReview(null);
                        setReviewModalVisible(false);
                        if (onBack) onBack();
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Close application review"
                    >
                      <Icon name="close" size={22} color={design.muted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Scrollable Body */}
                <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
                  {selectedAppForReview?.status === 'rejected' && (
                    <View style={styles.rejectionNoticeBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Icon name="alert-circle" size={18} color={design.accent} />
                        <Text style={styles.rejectionNoticeTitle}>Application Rejected</Text>
                      </View>
                      <Text style={styles.rejectionNoticeReason}>
                        <Text style={{ fontWeight: '700' }}>Reason sent to applicant:</Text>{' '}
                        {selectedAppForReview.rejection_reason || 'Details/documents provided did not meet entry requirements.'}
                      </Text>
                    </View>
                  )}

                  {/* 1. Applicant Profile Card */}
                  <View style={styles.infoSectionCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      {selectedAppForReview.student_photo ? (
                        <Image source={{ uri: selectedAppForReview.student_photo }} style={styles.modalAvatarImg} />
                      ) : (
                        <View style={styles.infoAvatarCircle}>
                          <Text style={styles.infoAvatarText}>{getInitials(selectedAppForReview.full_name)}</Text>
                        </View>
                      )}

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.infoStudentName}>{selectedAppForReview.full_name}</Text>
                        <Text style={styles.infoStudentEmail}>{selectedAppForReview.email}</Text>
                      </View>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Date of Birth:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.date_of_birth || 'Not Provided'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Gender:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.gender || 'Not Provided'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Residential Address:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.address || 'Not Provided'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone Number:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.phone || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>NIC Number:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.nic_number || 'Not Provided'}</Text>
                    </View>
                  </View>

                  {/* 2. Parent / Guardian Information Card */}
                  <View style={styles.infoSectionCard}>
                    <Text style={styles.sectionCardHeaderTitle}>Parent / Guardian Details</Text>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Guardian Name:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.guardian?.name || 'Not Provided'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Relationship:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.guardian?.relationship || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Contact Phone:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.guardian?.phone || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Occupation:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.guardian?.occupation || 'N/A'}</Text>
                    </View>
                  </View>

                  {/* 3. Educational Qualifications Card */}
                  <View style={styles.infoSectionCard}>
                    <Text style={styles.sectionCardHeaderTitle}>Educational Qualifications</Text>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Highest Qualification:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.educational_qualification?.highest_level || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Grade Level / Result:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.educational_qualification?.grade_level || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>School / Institute:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.educational_qualification?.institute_name || 'N/A'}</Text>
                    </View>
                  </View>

                  {/* 4. Payment Method & Deposit Slip Review Card */}
                  <View style={styles.infoSectionCard}>
                    <Text style={styles.sectionCardHeaderTitle}>Payment Method & Receipt Slip</Text>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Selected Payment Method:</Text>
                      <Text style={[styles.infoVal, { fontWeight: 'bold', color: design.accent }]}>
                        {selectedAppForReview.payment_method === 'bank_transfer'
                          ? 'Bank Deposit Slip Upload'
                          : 'Physical Cash Payment at Counter'}
                      </Text>
                    </View>

                    {selectedAppForReview.payment_slip ? (
                      <View style={{ marginTop: 10 }}>
                        <Text style={styles.infoLabel}>Uploaded Bank Deposit Receipt Slip:</Text>
                        <TouchableOpacity accessibilityRole="button" onPress={() => setSlipZoomModalVisible(true)} style={styles.slipThumbnailBox}>
                          <Image source={{ uri: selectedAppForReview.payment_slip }} style={styles.slipThumbnailImg} contentFit="contain" />
                          <View style={styles.zoomOverlayBadge}>
                            <Icon name="scan-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.zoomOverlayText}>Tap to View Full Slip</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.noSlipBox}>
                        <Text style={styles.noSlipText}>
                          {selectedAppForReview.payment_method === 'bank_transfer'
                            ? 'No deposit slip uploaded'
                            : 'Student will pay cash physically at TVTI Finance Counter on Registration Day.'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 5. Admin Payment Amount & Status Editor Card */}
                  <View style={styles.adminFeeEditorCard}>
                    <Text style={styles.adminFeeTitle}>Admin Fee & Tuition Editor</Text>
                    <Text style={styles.adminFeeSub}>Adjust course tuition, amount received, and payment status:</Text>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.feeInputLabel}>Total Course Fee (LKR):</Text>
                        <TextInput
                          style={styles.feeInput}
                          keyboardType="number-pad"
                          value={adminTotalFee}
                          onChangeText={setAdminTotalFee}
                          placeholder="e.g. 25000"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.feeInputLabel}>Amount Paid (LKR):</Text>
                        <TextInput
                          style={styles.feeInput}
                          keyboardType="number-pad"
                          value={adminAmountPaid}
                          onChangeText={setAdminAmountPaid}
                          placeholder="e.g. 10000"
                        />
                      </View>
                    </View>

                    {(() => {
                      const balance = Math.max(0, (Number(adminTotalFee) || 0) - (Number(adminAmountPaid) || 0));
                      return (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: design.line }}>
                          <Text style={{ fontFamily: FONTS.regular.fontFamily,  fontSize: 13, color: design.muted }}>Remaining Balance Due:</Text>
                          <Text style={{ fontFamily: FONTS.bold.fontFamily,  fontSize: 15, fontWeight: 'bold', color: balance > 0 ? design.accent : design.accent }}>
                            LKR {balance.toLocaleString()}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={styles.infoSectionCard}>
                    <Text style={styles.sectionCardHeaderTitle}>Courses and Batch Assignments</Text>
                    <View style={styles.infoDivider} />
                    <CourseBatchAssignments courseIds={assignedCourseIds} batchIds={assignedBatchIds} onCoursesChange={setAssignedCourseIds} onBatchesChange={setAssignedBatchIds} readOnly={selectedAppForReview.status === 'approved'} />
                  </View>

                  <View style={{ height: 20 }} />
                </ScrollView>

                {/* Stable Bottom Actions matching Student Dossier popup */}
                <View style={styles.detailsFooter}>
                  {selectedAppForReview?.status === 'approved' ? (
                    <View style={{ gap: 10, flex: 1 }}>
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Resend approved application credentials" style={[styles.footerActionBtn, { backgroundColor: design.accent }]} disabled={resendingCredentials} onPress={handlePromptResendCredentials}><Text style={styles.footerActionText}>Resend Credentials</Text></TouchableOpacity>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reject approved application" style={[styles.footerActionBtn, { backgroundColor: design.field, borderWidth: 1, borderColor: design.line }]} onPress={handlePromptReject}><Text style={[styles.footerActionText, { color: design.text }]}>Reject Application</Text></TouchableOpacity>
                      <TouchableOpacity accessibilityRole="button" style={[styles.footerActionBtn, { backgroundColor: design.field, borderWidth: 1, borderColor: design.line }]} onPress={() => { setReviewModalVisible(false); setSelectedAppForReview(null); onBack?.(); }}><Text style={[styles.footerActionText, { color: design.text }]}>Close</Text></TouchableOpacity>
                      </View>
                    </View>
                  ) : selectedAppForReview?.status === 'rejected' ? (
                    <TouchableOpacity accessibilityRole="button"                       style={[styles.footerActionBtn, { backgroundColor: design.accent, flex: 1 }]}
                      onPress={handlePromptApprove}
                      disabled={approving}
                      activeOpacity={0.85}
                    >
                      {approving ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.footerActionText}>Approve Application</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                      <TouchableOpacity accessibilityRole="button" style={[styles.footerActionBtn, { backgroundColor: design.field, borderWidth: 1, borderColor: design.line, flex: 1 }]}
                        onPress={handlePromptReject}
                        disabled={approving || rejectingId !== null}
                        activeOpacity={0.8}
                      >
                        {rejectingId ? (
                          <ActivityIndicator color="#1E293B" size="small" />
                        ) : (
                          <Text style={[styles.footerActionText, { color: design.text }]}>Reject</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity accessibilityRole="button"                         style={[styles.footerActionBtn, { backgroundColor: design.accent, flex: 1 }]}
                        onPress={handlePromptApprove}
                        disabled={approving}
                        activeOpacity={0.85}
                      >
                        {approving ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.footerActionText}>Approve</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </Modal>

          {/* Slip Image Full Screen Zoom Modal */}
          <Modal visible={slipZoomModalVisible} animationType="fade" transparent={true} onRequestClose={() => setSlipZoomModalVisible(false)}>
            <View style={styles.zoomModalOverlay}>
              <TouchableOpacity accessibilityRole="button" style={styles.zoomCloseBtn} onPress={() => setSlipZoomModalVisible(false)}>
                <Icon name="close-circle" size={32} color="#FFFFFF" />
              </TouchableOpacity>
              {selectedAppForReview?.payment_slip && (
                <Image source={{ uri: selectedAppForReview.payment_slip }} style={styles.fullZoomImg} contentFit="contain" />
              )}
            </View>
          </Modal>

          {/* GENERATED CREDENTIALS MODAL */}
          <Modal visible={credentialsModalVisible} animationType="slide" transparent={true} onRequestClose={() => { setCredentialsModalVisible(false); setSelectedAppForReview(null); setReviewModalVisible(false); onApproved?.(); onBack?.(); }}>
            <View style={styles.modalOverlay}>
              <View style={styles.credentialsModalCard}>
                <View style={styles.successIconCircle}>
                  <Icon name="checkmark-circle-outline" size={50} color={design.accent} />
                </View>
                <Text style={styles.credModalTitle}>{credentialsTitle}</Text>
                <Text style={styles.credModalSub}>
                  {credentialsEmailSent ? 'Login credentials have been emailed to the student.' : 'Login credentials generated. Email delivery failed; save the details below.'}
                </Text>

                {approvedCredentials && (
                  <View style={styles.credentialsBox}>
                    <View style={styles.credRow}>
                      <Text style={styles.credLabel}>Index No:</Text>
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
                  <Icon name="shield-checkmark-outline" size={18} color={design.accent} style={{ marginRight: 8 }} />
                  <Text style={styles.expiryNoticeText}>
                    Temporary password expires in 7 days. Save these initial login details before closing.
                  </Text>
                </View>

                <TouchableOpacity accessibilityRole="button"                   style={styles.closeCredModalBtn}
                  onPress={() => {
                    setCredentialsModalVisible(false);
                    setSelectedAppForReview(null);
                    setReviewModalVisible(false);
                    if (onApproved) onApproved();
                    if (onBack) onBack();
                  }} accessibilityLabel="Close credentials"
                >
                  <Text style={styles.closeCredModalBtnText}>Close & Return</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* REJECTION REASON INPUT MODAL */}
          <Modal visible={rejectReasonModalVisible} animationType="fade" transparent={true} onRequestClose={() => setRejectReasonModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.rejectModalCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: design.dangerSoft, justifyContent: 'center', alignItems: 'center' }}>
                      <Icon name="close-circle" size={20} color={design.accent} />
                    </View>
                    <View>
                      <Text style={{ fontFamily: FONTS.bold.fontFamily,  fontSize: 18, fontWeight: '700', color: design.text }}>Reject Application</Text>
                      <Text style={{ fontFamily: FONTS.regular.fontFamily,  fontSize: 12, color: design.muted }}>{selectedAppForReview?.full_name}</Text>
                    </View>
                  </View>
                  <TouchableOpacity accessibilityRole="button" onPress={() => setRejectReasonModalVisible(false)}>
                    <Icon name="close" size={22} color={design.muted} />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontFamily: FONTS.regular.fontFamily,  fontSize: 13, color: design.muted, marginBottom: 12, lineHeight: 18 }}>
                  Please specify the reason for rejecting this application. This explanation will be sent directly to the applicant's email address.
                </Text>

                {/* Quick Reason Chips */}
                <Text style={{ fontFamily: FONTS.bold.fontFamily,  fontSize: 11.5, fontWeight: '700', color: design.muted, marginBottom: 8, textTransform: 'uppercase' }}>Quick Presets:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {[
                    'Incomplete / Unclear Documents',
                    'Invalid Payment Deposit Slip',
                    'Does Not Meet Entry Criteria',
                    'Duplicate Application Request'
                  ].map(preset => (
                    <TouchableOpacity accessibilityRole="button"                       key={preset}
                      style={[
                        styles.presetChip,
                        rejectionReasonText === preset && styles.presetChipActive
                      ]}
                      onPress={() => setRejectionReasonText(preset)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetChipText, rejectionReasonText === preset && styles.presetChipTextActive]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={{ fontFamily: FONTS.bold.fontFamily,  fontSize: 11.5, fontWeight: '700', color: design.muted, marginBottom: 6, textTransform: 'uppercase' }}>Reason / Remarks:</Text>
                <TextInput
                  style={styles.rejectionTextInput}
                  placeholder="Type specific rejection reason here..."
                  placeholderTextColor={design.muted}
                  accessibilityLabel="Application rejection reason" value={rejectionReasonText}
                  onChangeText={setRejectionReasonText}
                  multiline={true}
                  numberOfLines={3}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <TouchableOpacity accessibilityRole="button"                     style={[styles.modalBtn, { backgroundColor: design.field, flex: 1 }]}
                    onPress={() => setRejectReasonModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontFamily: FONTS.semiBold.fontFamily,  color: design.muted, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity accessibilityRole="button"                     style={[styles.modalBtn, { backgroundColor: design.accent, flex: 1.5 }]}
                    onPress={() => processReject(selectedAppForReview?._id, rejectionReasonText)}
                    disabled={rejectingId !== null}
                    activeOpacity={0.85}
                  >
                    {rejectingId ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={{ fontFamily: FONTS.bold.fontFamily,  color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Send Rejection Email</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* CUSTOM IN-APP CONFIRMATION POPUP MODAL */}

        </>
      );
    }

    return (
      <>
        <WhatsAppSelectionHeader neutral
          visible={isSelectMode}
          selectedCount={selectedAppIds.length}
          onClearSelection={() => {
            setIsSelectMode(false);
            setSelectedAppIds([]);
          }}
          actions={[
            {
              id: 'select_all',
              icon: selectedAppIds.length === applications.length && applications.length > 0 ? "checkmark-done" : "checkmark-done-circle-outline",
              onPress: () => {
                if (selectedAppIds.length === applications.length && applications.length > 0) {
                  setSelectedAppIds([]);
                  setIsSelectMode(false);
                } else {
                  setSelectedAppIds(applications.map(a => a._id));
                }
              },
            },
            {
              id: 'export_csv',
              icon: 'download-outline',
              disabled: selectedAppIds.length === 0,
              onPress: handleExportSelectedApps,
            },
            {
              id: 'bulk_delete',
              icon: 'trash-outline',
              disabled: selectedAppIds.length === 0,
              color: selectedAppIds.length > 0 ? design.accent : '#FFFFFF',
              onPress: handleBulkDeleteApps,
            },
          ]}
        />
        {loading ? (
          <ActivityIndicator size="large" color="#000000" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={displayedApplications}
            keyExtractor={item => item._id}
            renderItem={renderApplicationCard}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 110 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#000000']} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="checkmark-circle-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitleText}>No Applications Found</Text>
                <Text style={styles.emptySubText}>New student registration applications will appear here.</Text>
              </View>
            }
          />
        )}
      </>
    );
  };

  const renderContent = () => <>
    {renderContentBody()}
    <ManagementDialog visible={resendingCredentials} title="Sending credentials" message="Generating a new temporary password and emailing the student." busy confirmText="Sending…" onConfirm={() => {}} />
    <ManagementDialog visible={confirmModal.visible} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type}
      confirmText={confirmModal.confirmText || 'Confirm'} cancelText={confirmModal.cancelText || 'Cancel'}
      onCancel={() => { setConfirmModal(prev => ({ ...prev, visible: false })); if (selectedAppForReview) setReviewModalVisible(true); }}
      onConfirm={() => { const action = confirmModal.onConfirm; setConfirmModal(prev => ({ ...prev, visible: false })); action?.(); }} />
    <ManagementDialog visible={feedback.visible} title={feedback.title} message={feedback.message} type={feedback.type}
      onConfirm={() => { const action = feedback.onOk; setFeedback(prev => ({ ...prev, visible: false })); if (action) action(); else if (selectedAppForReview && !credentialsModalVisible) setReviewModalVisible(true); }} />
  </>;

  if (embedded) {
    return <View style={[styles.container, isDark && { backgroundColor: 'transparent' }]}>{renderContent()}</View>;
  }

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: design.surface }]} edges={['top']}>
      <ScreenBackground />
      <View style={[styles.topHeader, isDark && { backgroundColor: design.surface, borderBottomColor: design.line }]}>
        <Text style={[styles.topHeaderTitle, isDark && { color: design.text }]}>Pending Registrations</Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}

const createStyles = (design: ReturnType<typeof usersSectionTheme>) => StyleSheet.create({
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
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
  /* MODERN STRUCTURED DOSSIER CARD STYLES */
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
  infoAvatarText: { fontFamily: FONTS.bold.fontFamily,
    color: design.text,
    fontWeight: 'bold',
    fontSize: 18,
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
  slipThumbnailBox: {
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  slipThumbnailImg: {
    width: '100%',
    height: 140,
    borderRadius: 8,
  },
  zoomOverlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.surface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 6,
  },
  zoomOverlayText: { fontFamily: FONTS.bold.fontFamily,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  noSlipBox: {
    backgroundColor: design.field,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: design.line,
  },
  noSlipText: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 12.5,
    color: design.muted,
    fontStyle: 'italic',
  },
  adminFeeEditorCard: {
    backgroundColor: design.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  borderWidth: 1, borderColor: design.line, },
  adminFeeTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 16.5,
    fontWeight: 'bold',
    color: design.text,
  },
  adminFeeSub: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 12,
    color: design.muted,
    marginTop: 2,
  },
  feeInputLabel: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 12,
    color: design.muted,
    marginBottom: 4,
    fontWeight: '600',
  },
  feeInput: { fontFamily: FONTS.bold.fontFamily,
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: design.text,
  minHeight: 44, },
  courseSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.field,
    borderWidth: 1.5,
    borderColor: design.line,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  courseSelectItemActive: {
    borderColor: design.accent,
    backgroundColor: design.successSoft,
  },
  courseCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: design.surface,
  },
  courseCheckboxActive: {
    backgroundColor: design.accent,
    borderColor: design.accent,
  },
  courseSelectTitle: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: design.text,
  },
  courseSelectTitleActive: {
    color: design.success,
    fontWeight: 'bold',
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
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: design.field,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
    marginBottom: 12,
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
  closeModalIconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: design.field,
    justifyContent: 'center',
    alignItems: 'center',
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
  plainTextInput: { fontFamily: FONTS.regular.fontFamily,
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: design.text,
    marginTop: 4,
    backgroundColor: design.surface,
  },
  plainCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  plainCheckbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: design.line,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 3,
    backgroundColor: design.surface,
  },
  plainCheckboxActive: {
    backgroundColor: design.accent,
    borderColor: design.line,
  },
  plainCourseTitle: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 14,
    color: design.text,
  },
  plainActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  plainRejectBtn: {
    flex: 1,
    backgroundColor: design.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  minHeight: 44, },
  plainApproveBtn: {
    flex: 1.5,
    backgroundColor: design.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  minHeight: 44, },
  plainBtnText: { fontFamily: FONTS.bold.fontFamily,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
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
  coloredBtnText: { fontFamily: FONTS.bold.fontFamily,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: design.field,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: design.surface,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  topHeaderTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 20,
    fontWeight: 'bold',
    color: design.text,
  },
  card: {
    backgroundColor: design.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: design.line,
    ...Platform.select({
      web: {
        boxShadow: 'none',
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0,
        shadowRadius: 6,
        elevation: 0,
      },
    }),
  padding: 16, },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowContainer: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: design.line,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CFD9DE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  cardInfoCol: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  studentName: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: design.text,
    letterSpacing: -0.2,
  },
  studentEmailText: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 13,
    color: design.muted,
    marginTop: 2,
  },
  studentPhoneText: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 12.5,
    color: design.muted,
    marginTop: 3,
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBadgeText: { fontFamily: FONTS.bold.fontFamily,
    color: design.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },
  courseSummaryRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: design.line,
  },
  courseSummaryLabel: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: design.muted,
    marginBottom: 6,
  },
  courseTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  courseBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.accentSoft,
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  courseBadgeText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: design.warning,
  },
  cardFooterActions: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: design.line,
  },
  reviewBtn: {
    backgroundColor: design.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 5, elevation: 0 }
    }),
  minHeight: 44, },
  reviewBtnText: { fontFamily: FONTS.bold.fontFamily,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitleText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 16,
    fontWeight: 'bold',
    color: design.text,
    marginTop: 12,
  },
  emptySubText: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 13,
    color: design.muted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
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
  modalCard: {
    backgroundColor: design.surface,
    borderRadius: 18,
    padding: 20,
    width: '92%',
    elevation: 0,
  borderWidth: 1, borderColor: design.line, maxWidth: 650, maxHeight: '90%', },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reviewModalCard: {
    backgroundColor: design.field,
    borderRadius: 20,
    width: '100%',
    maxWidth: 680,
    maxHeight: '94%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: design.line,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0, shadowRadius: 24, elevation: 0 }
    }),
  },
  brandTopRibbon: {
    height: 4,
    backgroundColor: design.accent,
    width: '100%',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
    backgroundColor: design.surface,
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: 12,
  },
  headerBrandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  brandCrestBadge: {
    backgroundColor: design.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  brandCrestText: { fontFamily: FONTS.regular.fontFamily,
    color: '#F58220',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerSuperText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10.5,
    fontWeight: '700',
    color: design.muted,
    letterSpacing: 1.1,
  },
  reviewModalTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 19,
    fontWeight: '800',
    color: design.text,
    letterSpacing: -0.3,
  },
  reviewModalSub: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 12,
    color: design.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: design.field,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: design.line,
  },
  modalScrollBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  dossierSectionCard: {
    backgroundColor: design.surface,
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0, shadowRadius: 3, elevation: 0 }
    }),
  },
  profileHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  profileAvatarImg: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#F58220',
  },
  profileAvatarPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: design.field,
    borderWidth: 1.5,
    borderColor: design.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeroMeta: {
    flex: 1,
    marginLeft: 14,
  },
  profileStudentName: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 18,
    fontWeight: '800',
    color: design.text,
    letterSpacing: -0.2,
  },
  profileStudentEmail: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 13,
    color: design.muted,
    marginTop: 1,
    fontWeight: '500',
  },
  profileStatusBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.successSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: design.success,
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.warningSoft,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unverifiedBadgeText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: design.warning,
  },
  pendingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.accentSoft,
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: design.accent,
    marginRight: 5,
  },
  pendingBadgePillText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: design.accent,
  },
  specGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  specGridItem: {
    width: '48.5%',
    backgroundColor: design.field,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: design.line,
  },
  specGridItemFull: {
    width: '100%',
  },
  specLabel: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: design.muted,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  specValue: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: design.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionAccentBar: {
    width: 3.5,
    height: 18,
    borderRadius: 2,
    backgroundColor: design.accent,
    marginRight: 8,
  },
  sectionHeadingText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 14.5,
    fontWeight: '700',
    color: design.text,
    letterSpacing: -0.2,
  },
  sectionSubHeadingText: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 11.5,
    color: design.muted,
    marginTop: 1,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: design.field,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: design.line,
    marginBottom: 12,
  },
  paymentMethodNoticeLabel: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 12.5,
    color: design.muted,
    fontWeight: '600',
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.accentSoft,
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  paymentMethodPillText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: design.accent,
  },
  slipInspectionWrap: {
    marginTop: 4,
  },
  slipInspectionLabel: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: design.text,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  slipInspectionBox: {
    backgroundColor: design.surface,
    borderWidth: 1.5,
    borderColor: design.line,
    borderRadius: 14,
    padding: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  slipInspectionImg: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: design.field,
  },
  slipOverlayBar: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: design.line,
  },
  slipOverlayText: { fontFamily: FONTS.bold.fontFamily,
    color: design.text,
    fontSize: 11.5,
    fontWeight: '700',
  },
  advisoryNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: 12,
  },
  advisoryNoticeText: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 12.5,
    color: '#0369A1',
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  ledgerSectionCard: {
    backgroundColor: design.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: design.line,
    borderTopWidth: 3,
    borderTopColor: '#F58220',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0, shadowRadius: 4, elevation: 0 }
    }),
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ledgerAccentBar: {
    width: 3.5,
    height: 18,
    borderRadius: 2,
    backgroundColor: design.surface,
    marginRight: 8,
  },
  ledgerTitleText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 15,
    fontWeight: '800',
    color: design.text,
    letterSpacing: -0.2,
  },
  ledgerSubText: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 11.5,
    color: design.muted,
    marginTop: 1,
  },
  feeInputsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  feeInputCol: {
    flex: 1,
  },
  feeFieldLabel: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 11.5,
    fontWeight: '700',
    color: design.text,
    marginBottom: 6,
  },
  feeInputFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.field,
    borderWidth: 1.5,
    borderColor: design.line,
    borderRadius: 10,
    overflow: 'hidden',
  },
  currencyBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRightWidth: 1,
    borderRightColor: design.line,
  },
  currencyBadgeText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 11,
    fontWeight: '800',
    color: design.text,
  },
  feeNumericInput: { fontFamily: FONTS.bold.fontFamily,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: design.text,
  },
  statusSegmentWrap: {
    marginTop: 14,
  },
  statusPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  statusPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.field,
    borderWidth: 1.5,
    borderColor: design.line,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  statusPillItemActive: {
    backgroundColor: design.accent,
    borderColor: design.line,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusPillLabel: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: design.muted,
  },
  statusPillLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  balanceLedgerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: design.accentSoft,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  balanceLedgerBannerSettled: {
    backgroundColor: design.successSoft,
    borderColor: '#A7F3D0',
  },
  balanceMetaCol: {
    flex: 1,
    marginRight: 10,
  },
  balanceLedgerLabel: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.6,
  },
  balanceLedgerSub: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 11,
    color: '#7C2D12',
    marginTop: 2,
    fontWeight: '500',
  },
  balanceLedgerAmount: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 17,
    fontWeight: '900',
    color: design.accent,
    letterSpacing: -0.2,
  },
  balanceLedgerAmountSettled: {
    color: design.success,
  },
  noCoursesText: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 12.5,
    color: design.muted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  courseEnrollCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.field,
    borderWidth: 1.5,
    borderColor: design.line,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  courseEnrollCardActive: {
    borderColor: '#F58220',
    backgroundColor: design.accentSoft,
  },
  enrollCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: design.line,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: design.surface,
  },
  enrollCheckboxActive: {
    backgroundColor: design.accent,
    borderColor: '#F58220',
  },
  enrollCourseTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 13.5,
    fontWeight: '700',
    color: design.text,
  },
  enrollCourseTitleActive: {
    color: '#9A3412',
  },
  enrollCourseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  courseTagPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  courseTagPillText: { fontFamily: FONTS.semiBold.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: design.muted,
  },
  courseFeeText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: design.muted,
  },
  reviewModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: design.line,
    backgroundColor: design.surface,
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
    backgroundColor: design.successSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formOtpVerifiedText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10,
    fontWeight: '800',
    color: design.success,
  },
  formOtpPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: design.warningSoft,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formOtpPendingText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10,
    fontWeight: '800',
    color: design.warning,
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
  formSlipInspectionBox: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: design.surface,
    marginTop: 6,
    borderWidth: 1,
    borderColor: design.line,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 6, elevation: 0 }
    }),
  minHeight: 44, },
  rejectButtonText: { fontFamily: FONTS.bold.fontFamily,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  approveButton: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: design.accent,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 6, elevation: 0 }
    }),
  minHeight: 44, },
  approveButtonText: { fontFamily: FONTS.bold.fontFamily,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
    letterSpacing: 0.2,
  },
  zoomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullZoomImg: {
    width: '100%',
    height: '80%',
  },
  credentialsModalCard: {
    backgroundColor: design.surface,
    borderRadius: 24,
    padding: 24,
    width: '88%',
    alignItems: 'center',
    elevation: 0,
  },
  successIconCircle: {
    marginBottom: 14,
  },
  credModalTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 18,
    fontWeight: 'bold',
    color: design.text,
  },
  credModalSub: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 12,
    color: design.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  credentialsBox: {
    backgroundColor: design.surface,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  credRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: design.line,
  },
  credLabel: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 12,
    color: design.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  credValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: design.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  credSubValue: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 13,
    color: design.text,
    fontWeight: '500',
  },
  expiryNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: design.accentSoft,
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  expiryNoticeText: { fontFamily: FONTS.regular.fontFamily,
    flex: 1,
    fontSize: 12,
    color: design.accent,
    lineHeight: 16,
  },
  closeCredModalBtn: {
    backgroundColor: design.accent,
    borderRadius: 10,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 6, elevation: 0 }
    }),
  minHeight: 44, },
  closeCredModalBtnText: { fontFamily: FONTS.bold.fontFamily,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rejectedBadge: {
    backgroundColor: design.dangerSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectedBadgeText: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 10.5,
    fontWeight: '700',
    color: design.danger,
    textTransform: 'uppercase',
  },
  smallDeleteBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: design.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  minHeight: 44, },
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
    marginBottom: 8,
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
  rejectionNoticeBox: {
    backgroundColor: design.dangerSoft,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  rejectionNoticeTitle: { fontFamily: FONTS.bold.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: design.danger,
    textTransform: 'uppercase',
  },
  rejectionNoticeReason: { fontFamily: FONTS.regular.fontFamily,
    fontSize: 13,
    color: design.danger,
    lineHeight: 18,
  },
  rejectModalCard: {
    backgroundColor: design.surface,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0, shadowRadius: 15, elevation: 0 }
    }),
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
  },
  presetChipActive: {
    backgroundColor: design.dangerSoft,
    borderColor: '#FCA5A5',
  },
  presetChipText: { fontFamily: FONTS.medium.fontFamily,
    fontSize: 11.5,
    color: design.muted,
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: design.danger,
    fontWeight: '700',
  },
  rejectionTextInput: { fontFamily: FONTS.regular.fontFamily,
    backgroundColor: design.field,
    borderWidth: 1,
    borderColor: design.line,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: design.text,
    minHeight: 75,
    textAlignVertical: 'top',
  },
  modalBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  minHeight: 44, },
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
});
