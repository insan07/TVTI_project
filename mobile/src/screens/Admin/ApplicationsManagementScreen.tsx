import React, { useState, useEffect } from 'react';
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
  Alert,
  TextInput
} from 'react-native';
import { Image } from 'expo-image';
import api from '../../services/api';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../config/theme';
import ScreenHeader from '../../components/shared/ScreenHeader';
import * as Print from 'expo-print';

interface ApplicationsManagementScreenProps {
  embedded?: boolean;
  onApproved?: () => void;
  selectedApp?: any;
  onSelectAppForReview?: (app: any) => void;
  onBack?: () => void;
}

export default function ApplicationsManagementScreen({
  embedded = false,
  onApproved,
  selectedApp,
  onSelectAppForReview,
  onBack,
}: ApplicationsManagementScreenProps) {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Review Modal States
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedAppForReview, setSelectedAppForReview] = useState<any>(null);
  const [allAvailableCourses, setAllAvailableCourses] = useState<any[]>([]);
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [approving, setApproving] = useState(false);

  // Admin Payment Editor States
  const [adminTotalFee, setAdminTotalFee] = useState('0');
  const [adminAmountPaid, setAdminAmountPaid] = useState('0');
  const [adminPaymentStatus, setAdminPaymentStatus] = useState<'pending' | 'partially_paid' | 'paid' | 'waived'>('pending');
  const [slipZoomModalVisible, setSlipZoomModalVisible] = useState(false);

  // Credentials Modal States
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
  const [approvedCredentials, setApprovedCredentials] = useState<{
    index_number: string;
    temp_password: string;
    email: string;
  } | null>(null);

  // Selection & Permanent Delete States
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

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
    setSelectedAppIds(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  const handleDeleteSingleApp = (appId: string, name?: string) => {
    const appName = name || 'this application';
    const confirmMsg = `Are you sure you want to PERMANENTLY delete the application for "${appName}"? This action cannot be undone.`;

    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMsg)) return;
      execDeleteSingleApp(appId);
    } else {
      Alert.alert(
        '⚠️ Delete Application',
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete Forever', style: 'destructive', onPress: () => execDeleteSingleApp(appId) }
        ]
      );
    }
  };

  const execDeleteSingleApp = async (appId: string) => {
    try {
      await api.delete(`/admin/applications/${appId}`);
      setReviewModalVisible(false);
      setSelectedAppForReview(null);
      const msg = 'Application record permanently deleted.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Deleted', msg);
      fetchPendingApplications();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to delete application';
      if (Platform.OS === 'web') window.alert(`Error: ${msg}`);
      else Alert.alert('Error', msg);
    }
  };

  const handleBulkDeleteApps = () => {
    if (selectedAppIds.length === 0) return;
    const confirmMsg = `Are you sure you want to PERMANENTLY delete ${selectedAppIds.length} selected application(s)? This action cannot be undone.`;

    const execBulkDelete = async () => {
      try {
        setLoading(true);
        for (const id of selectedAppIds) {
          try {
            await api.delete(`/admin/applications/${id}`);
          } catch (err) {
            console.warn(`Failed to delete application ${id}`, err);
          }
        }
        setSelectedAppIds([]);
        setIsSelectMode(false);
        fetchPendingApplications();
        const msg = `Permanently deleted ${selectedAppIds.length} application(s).`;
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Deleted', msg);
      } catch (e) {
        if (Platform.OS === 'web') window.alert('Bulk deletion failed.');
        else Alert.alert('Error', 'Bulk deletion failed');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) execBulkDelete();
    } else {
      Alert.alert(
        '⚠️ Bulk Delete Applications',
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: `Delete ${selectedAppIds.length}`, style: 'destructive', onPress: execBulkDelete }
        ]
      );
    }
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
      const nonApproved = (res.data || []).filter((a: any) => a.status !== 'approved');
      setApplications(nonApproved);
    } catch (e) {
      console.warn('Failed to fetch pending applications', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

    let calculatedFee = 0;
    if (app.total_course_fee && app.total_course_fee > 0) {
      calculatedFee = app.total_course_fee;
    } else if (app.course_ids && app.course_ids.length > 0) {
      calculatedFee = app.course_ids.reduce((acc: number, c: any) => acc + (c.fee || 0), 0);
    } else if (app.course_id && app.course_id.fee) {
      calculatedFee = app.course_id.fee;
    }

    setAdminTotalFee(calculatedFee > 0 ? String(calculatedFee) : '25000');
    setAdminAmountPaid(app.amount_paid !== undefined ? String(app.amount_paid) : '0');
    setAdminPaymentStatus(app.payment_status || (app.payment_method === 'bank_transfer' ? 'pending' : 'pending'));

    setReviewModalVisible(true);
  };

  const toggleAssignedCourse = (courseId: string) => {
    setAssignedCourseIds(prev => {
      if (prev.includes(courseId)) {
        if (prev.length === 1) {
          const msg = 'At least one course must be assigned to the student.';
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Notice', msg);
          return prev;
        }
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleApproveFromReview = async () => {
    if (!selectedAppForReview) return;
    if (assignedCourseIds.length === 0) {
      const msg = 'Please select at least one course to assign.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    setApproving(true);
    try {
      const res = await api.put(`/admin/applications/${selectedAppForReview._id}/status`, {
        status: 'approved',
        assigned_course_ids: assignedCourseIds,
        total_course_fee: Number(adminTotalFee) || 0,
        amount_paid: Number(adminAmountPaid) || 0,
        payment_status: adminPaymentStatus
      });

      setReviewModalVisible(false);

      if (res.data.credentials) {
        setApprovedCredentials(res.data.credentials);
        setCredentialsModalVisible(true);
      } else {
        const msg = 'Application approved successfully.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Success', msg);
      }

      fetchPendingApplications();
      if (onApproved) onApproved();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to approve application';
      if (Platform.OS === 'web') window.alert(`Error: ${msg}`);
      else Alert.alert('Error', msg);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectFromReview = async () => {
    if (!selectedAppForReview) return;
    const confirmMsg = `Are you sure you want to reject the application for "${selectedAppForReview.full_name}"?`;

    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMsg)) return;
      processReject(selectedAppForReview._id);
    } else {
      Alert.alert(
        'Reject Application',
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reject Application', style: 'destructive', onPress: () => processReject(selectedAppForReview._id) }
        ]
      );
    }
  };

  const processReject = async (appId: string) => {
    setRejectingId(appId);
    try {
      await api.put(`/admin/applications/${appId}/status`, { status: 'rejected' });
      setReviewModalVisible(false);
      const msg = 'Application rejected successfully.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Success', msg);
      fetchPendingApplications();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to reject application';
      if (Platform.OS === 'web') window.alert(`Error: ${msg}`);
      else Alert.alert('Error', msg);
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
      <TouchableOpacity
        style={[
          styles.card,
          isRejected && { opacity: 0.6, backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
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
              <View style={[styles.avatarCircle, isRejected && { backgroundColor: '#E2E8F0' }]}>
                <Icon name="person" size={24} color={isRejected ? "#94A3B8" : "#475569"} />
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
              <Text style={[styles.studentName, isRejected && { color: '#64748B' }]} numberOfLines={1}>{item.full_name}</Text>
              {isRejected && (
                <View style={styles.rejectedBadge}>
                  <Text style={styles.rejectedBadgeText}>Rejected</Text>
                </View>
              )}
            </View>
            <Text style={styles.studentEmailText} numberOfLines={1}>{item.email}</Text>
            {item.phone ? (
              <Text style={styles.studentPhoneText} numberOfLines={1}>{item.phone}</Text>
            ) : item.nic ? (
              <Text style={styles.studentPhoneText} numberOfLines={1}>{item.nic}</Text>
            ) : null}
          </View>

          <View style={styles.arrowContainer}>
            <Icon name="arrow-forward" size={19} color={isRejected ? "#94A3B8" : "#475569"} />
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
      if (Platform.OS === 'web') window.alert('Failed to generate PDF document.');
      else Alert.alert('Error', 'Failed to generate PDF document.');
    }
  };

  const renderContent = () => {
    if (selectedAppForReview) {
      return (
        <View style={styles.fullScreenOverlay}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
            {/* Scrollable Modern Structured Dossier Body */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
              {/* Dossier Header Row: Icon-Only Back Button (Left) & Save PDF Button (Right) */}
              <View style={styles.dossierBackHeaderRow}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedAppForReview(null);
                    setReviewModalVisible(false);
                    if (onBack) onBack();
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ padding: 4 }}
                >
                  <Icon name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.savePdfBtn}
                  onPress={handleSavePdf}
                  activeOpacity={0.85}
                >
                  <Icon name="document-text-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.savePdfBtnText}>Save PDF</Text>
                </TouchableOpacity>
              </View>

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
                  <Text style={[styles.infoVal, { fontWeight: 'bold', color: '#2563EB' }]}>
                    {selectedAppForReview.payment_method === 'bank_transfer'
                      ? 'Bank Deposit Slip Upload'
                      : 'Physical Cash Payment at Counter'}
                  </Text>
                </View>

                {selectedAppForReview.payment_slip ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.infoLabel}>Uploaded Bank Deposit Receipt Slip:</Text>
                    <TouchableOpacity onPress={() => setSlipZoomModalVisible(true)} style={styles.slipThumbnailBox}>
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' }}>
                      <Text style={{ fontSize: 13, color: '#94A3B8' }}>Remaining Balance Due:</Text>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: balance > 0 ? '#F59E0B' : '#10B981' }}>
                        LKR {balance.toLocaleString()}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* 6. Course Assignments Card */}
              <View style={styles.infoSectionCard}>
                <Text style={styles.sectionCardHeaderTitle}>Assigned Academic Courses</Text>
                <View style={styles.infoDivider} />
                {loadingCourses ? (
                  <ActivityIndicator color="#059669" style={{ marginVertical: 10 }} />
                ) : (
                  allAvailableCourses.map(course => {
                    const isSelected = assignedCourseIds.includes(course._id);
                    return (
                      <TouchableOpacity
                        key={course._id}
                        style={[styles.courseSelectItem, isSelected && styles.courseSelectItemActive]}
                        onPress={() => toggleAssignedCourse(course._id)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.courseCheckbox, isSelected && styles.courseCheckboxActive]}>
                          {isSelected && <Icon name="checkmark" size={12} color="#FFFFFF" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.courseSelectTitle, isSelected && styles.courseSelectTitleActive]}>
                            {course.title}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            {course.fee ? `Tuition: LKR ${course.fee.toLocaleString()}` : 'Free'} · {course.duration_weeks || 12} Weeks
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Professional Action Buttons: Small, Equal Size, Right-Aligned, Icon-less */}
              <View style={styles.rightAlignedActionsRow}>
                <TouchableOpacity
                  style={styles.smallDeleteBtn}
                  onPress={() => handleDeleteSingleApp(selectedAppForReview._id, selectedAppForReview.full_name)}
                  disabled={approving || rejectingId !== null}
                  activeOpacity={0.8}
                >
                  <Text style={styles.smallBtnText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.smallRejectBtn}
                  onPress={handleRejectFromReview}
                  disabled={approving || rejectingId !== null}
                  activeOpacity={0.8}
                >
                  {rejectingId ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.smallBtnText}>Reject</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.smallApproveBtn}
                  onPress={handleApproveFromReview}
                  disabled={approving}
                  activeOpacity={0.85}
                >
                  {approving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.smallBtnText}>Approve</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>

          {/* Slip Image Full Screen Zoom Modal */}
          <Modal visible={slipZoomModalVisible} animationType="fade" transparent={true}>
            <View style={styles.zoomModalOverlay}>
              <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setSlipZoomModalVisible(false)}>
                <Icon name="close-circle" size={32} color="#FFFFFF" />
              </TouchableOpacity>
              {selectedAppForReview?.payment_slip && (
                <Image source={{ uri: selectedAppForReview.payment_slip }} style={styles.fullZoomImg} contentFit="contain" />
              )}
            </View>
          </Modal>

          {/* GENERATED CREDENTIALS MODAL */}
          <Modal visible={credentialsModalVisible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.credentialsModalCard}>
                <View style={styles.successIconCircle}>
                  <Icon name="checkmark-circle-outline" size={50} color="#10B981" />
                </View>
                <Text style={styles.credModalTitle}>Student Application Approved</Text>
                <Text style={styles.credModalSub}>
                  Student account created, registration number assigned, and temporary password issued.
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
                  <Icon name="shield-checkmark-outline" size={18} color="#0F766E" style={{ marginRight: 8 }} />
                  <Text style={styles.expiryNoticeText}>
                    Temporary password expires in 7 days. Official login credentials have been dispatched to the student's email address.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeCredModalBtn}
                  onPress={() => setCredentialsModalVisible(false)}
                >
                  <Text style={styles.closeCredModalBtnText}>Close & Return</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          </SafeAreaView>
        </View>
      );
    }

    return (
      <>
        {isSelectMode && (
          <View style={styles.whatsappHeaderBar}>
            <View style={styles.whatsappHeaderLeft}>
              <TouchableOpacity
                style={styles.whatsappHeaderIconBtn}
                onPress={() => {
                  setIsSelectMode(false);
                  setSelectedAppIds([]);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.whatsappHeaderTitle}>
                {selectedAppIds.length}
              </Text>
            </View>

            <View style={styles.whatsappHeaderActions}>
              <TouchableOpacity
                style={styles.whatsappHeaderIconBtn}
                onPress={() => {
                  if (selectedAppIds.length === applications.length && applications.length > 0) {
                    setSelectedAppIds([]);
                  } else {
                    setSelectedAppIds(applications.map(a => a._id));
                  }
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon
                  name={selectedAppIds.length === applications.length && applications.length > 0 ? "checkmark-done" : "checkmark-done-circle-outline"}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.whatsappHeaderIconBtn, selectedAppIds.length === 0 && { opacity: 0.4 }]}
                disabled={selectedAppIds.length === 0}
                onPress={handleExportSelectedApps}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="download-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.whatsappHeaderIconBtn, selectedAppIds.length === 0 && { opacity: 0.4 }]}
                disabled={selectedAppIds.length === 0}
                onPress={handleBulkDeleteApps}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="trash-outline" size={22} color={selectedAppIds.length > 0 ? "#EF4444" : "#FFFFFF"} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        {loading ? (
          <ActivityIndicator size="large" color="#000000" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={applications}
            keyExtractor={item => item._id}
            renderItem={renderApplicationCard}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
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

  if (embedded) {
    return <View style={styles.container}>{renderContent()}</View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Pending Registrations</Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    backgroundColor: '#F8FAFC',
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
  /* MODERN STRUCTURED DOSSIER CARD STYLES */
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
  infoAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
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
  slipThumbnailBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 6,
  },
  zoomOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  noSlipBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noSlipText: {
    fontSize: 12.5,
    color: '#64748B',
    fontStyle: 'italic',
  },
  adminFeeEditorCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  adminFeeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  adminFeeSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  feeInputLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 4,
    fontWeight: '600',
  },
  feeInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  courseSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  courseSelectItemActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
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
    backgroundColor: '#FFFFFF',
  },
  courseCheckboxActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  courseSelectTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  courseSelectTitleActive: {
    color: '#065F46',
    fontWeight: 'bold',
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
  plainTextInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000000',
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  plainCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  plainCheckbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  plainCheckboxActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  plainCourseTitle: {
    fontSize: 14,
    color: '#000000',
  },
  plainActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  plainRejectBtn: {
    flex: 1,
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plainApproveBtn: {
    flex: 1.5,
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plainBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallApproveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#059669',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  coloredBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 1px 3px -1px rgba(15, 23, 42, 0.03)',
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
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
    borderColor: '#E2E8F0',
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
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  studentEmailText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  studentPhoneText: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBadgeText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: 'bold',
  },
  courseSummaryRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  courseSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
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
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  cardFooterActions: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reviewBtn: {
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 }
    }),
  },
  reviewBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  reviewModalCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    width: '100%',
    maxWidth: 680,
    maxHeight: '94%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)' },
      default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12 }
    }),
  },
  brandTopRibbon: {
    height: 4,
    backgroundColor: '#F58220',
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
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#111827',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  brandCrestText: {
    color: '#F58220',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerSuperText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.1,
  },
  reviewModalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  reviewModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalScrollBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  dossierSectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }
    }),
  },
  profileHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeroMeta: {
    flex: 1,
    marginLeft: 14,
  },
  profileStudentName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  profileStudentEmail: {
    fontSize: 13,
    color: '#64748B',
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unverifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
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
    backgroundColor: '#F58220',
    marginRight: 5,
  },
  pendingBadgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  specGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  specGridItem: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  specGridItemFull: {
    width: '100%',
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
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
    backgroundColor: '#F58220',
    marginRight: 8,
  },
  sectionHeadingText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionSubHeadingText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  paymentMethodNoticeLabel: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  paymentMethodPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  slipInspectionWrap: {
    marginTop: 4,
  },
  slipInspectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  slipInspectionBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  slipInspectionImg: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  slipOverlayBar: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  slipOverlayText: {
    color: '#FFFFFF',
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
  advisoryNoticeText: {
    fontSize: 12.5,
    color: '#0369A1',
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  ledgerSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 3,
    borderTopColor: '#F58220',
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }
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
    backgroundColor: '#0F172A',
    marginRight: 8,
  },
  ledgerTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  ledgerSubText: {
    fontSize: 11.5,
    color: '#64748B',
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
  feeFieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  feeInputFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    overflow: 'hidden',
  },
  currencyBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
  },
  currencyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  feeNumericInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  statusPillItemActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusPillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statusPillLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  balanceLedgerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  balanceLedgerBannerSettled: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  balanceMetaCol: {
    flex: 1,
    marginRight: 10,
  },
  balanceLedgerLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.6,
  },
  balanceLedgerSub: {
    fontSize: 11,
    color: '#7C2D12',
    marginTop: 2,
    fontWeight: '500',
  },
  balanceLedgerAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#C2410C',
    letterSpacing: -0.2,
  },
  balanceLedgerAmountSettled: {
    color: '#065F46',
  },
  noCoursesText: {
    fontSize: 12.5,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  courseEnrollCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  courseEnrollCardActive: {
    borderColor: '#F58220',
    backgroundColor: '#FFF7ED',
  },
  enrollCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  enrollCheckboxActive: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  enrollCourseTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
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
  courseTagPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  courseFeeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  reviewModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formOtpVerifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  formOtpPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formOtpPendingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
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
  formSlipInspectionBox: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' },
      default: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }
    }),
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  approveButton: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 }
    }),
  },
  approveButtonText: {
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '88%',
    alignItems: 'center',
    elevation: 5,
  },
  successIconCircle: {
    marginBottom: 14,
  },
  credModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  credModalSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  credentialsBox: {
    backgroundColor: '#0F172A',
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
    borderBottomColor: '#334155',
  },
  credLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  credValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  credSubValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  expiryNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  expiryNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#0F766E',
    lineHeight: 16,
  },
  closeCredModalBtn: {
    backgroundColor: '#111827',
    borderRadius: 24,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 }
    }),
  },
  closeCredModalBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rejectedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectedBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#991B1B',
    textTransform: 'uppercase',
  },
  smallDeleteBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
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
    marginBottom: 8,
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
