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

interface ApplicationsManagementScreenProps {
  embedded?: boolean;
  onApproved?: () => void;
}

export default function ApplicationsManagementScreen({ embedded = false, onApproved }: ApplicationsManagementScreenProps) {
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

  useEffect(() => {
    fetchPendingApplications();
    fetchActiveCourses();
  }, []);

  const fetchPendingApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/applications?status=pending');
      setApplications(res.data || []);
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
    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          {item.student_photo ? (
            <Image source={{ uri: item.student_photo }} style={styles.cardAvatarImg} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
            </View>
          )}

          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.studentName}>{item.full_name}</Text>
            <Text style={styles.studentEmailText}>{item.email}</Text>
            {item.phone ? <Text style={styles.studentPhoneText}>Phone: {item.phone}</Text> : null}
          </View>
          <View style={styles.pendingBadge}>
            <Icon name="time-outline" size={12} color="#D97706" style={{ marginRight: 3 }} />
            <Text style={styles.pendingBadgeText}>PENDING</Text>
          </View>
        </View>

        {/* Requested Courses Summary */}
        <View style={styles.courseSummaryRow}>
          <Text style={styles.courseSummaryLabel}>Requested Course(s):</Text>
          <View style={styles.courseTagsContainer}>
            {item.course_ids && item.course_ids.length > 0 ? (
              item.course_ids.map((c: any, i: number) => (
                <View key={c._id || i} style={styles.courseBadgeChip}>
                  <Icon name="book-outline" size={11} color="#92400E" style={{ marginRight: 3 }} />
                  <Text style={styles.courseBadgeText}>{c.title || 'Vocational Course'}</Text>
                </View>
              ))
            ) : (
              <View style={styles.courseBadgeChip}>
                <Icon name="book-outline" size={11} color="#92400E" style={{ marginRight: 3 }} />
                <Text style={styles.courseBadgeText}>{item.course_id?.title || 'Vocational Course'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Button Bar - ONLY REVIEW BUTTON */}
        <View style={styles.cardFooterActions}>
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => handleOpenReviewModal(item)}
            activeOpacity={0.85}
          >
            <Icon name="eye-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.reviewBtnText}>Review Application</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContent = () => (
    <>
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
              <Text style={styles.emptyTitleText}>No Pending Applications</Text>
              <Text style={styles.emptySubText}>All new student registrations have been reviewed and approved.</Text>
            </View>
          }
        />
      )}

      {/* ========================================================================= */}
      {/* COMPREHENSIVE REVIEW MODAL */}
      {/* ========================================================================= */}
      <Modal visible={reviewModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModalCard}>
            {selectedAppForReview && (
              <View style={{ flex: 1 }}>
                {/* Modal Header */}
                <View style={styles.reviewModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewModalTitle}>Review Student Application</Text>
                    <Text style={styles.reviewModalSub}>Verify applicant information, check payment details, set fees, and approve registration.</Text>
                  </View>
                  <TouchableOpacity onPress={() => setReviewModalVisible(false)} style={styles.closeIconBtn}>
                    <Icon name="close" size={22} color="#374151" />
                  </TouchableOpacity>
                </View>

                {/* Modal Body */}
                <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
                  {/* 1. Applicant Profile Information */}
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
                        {selectedAppForReview.email_verified && (
                          <View style={styles.otpVerifiedTag}>
                            <Icon name="checkmark-circle-outline" size={12} color="#065F46" style={{ marginRight: 3 }} />
                            <Text style={styles.otpVerifiedText}>OTP Verified Email</Text>
                          </View>
                        )}
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
                      <Text style={styles.infoVal}>{selectedAppForReview.nic_number || 'Optional / Not Provided'}</Text>
                    </View>
                  </View>

                  {/* 2. Parent / Guardian Information */}
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
                      <Text style={styles.infoLabel}>Occupation / Address:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.guardian?.occupation || 'N/A'}</Text>
                    </View>
                  </View>

                  {/* 3. Educational Qualifications */}
                  <View style={styles.infoSectionCard}>
                    <Text style={styles.sectionCardHeaderTitle}>Educational Qualifications</Text>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Highest Qualification:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.educational_qualification?.highest_level || 'N/A'}</Text>
                    </View>
                    {selectedAppForReview.educational_qualification?.grade_level ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Grade Level:</Text>
                        <Text style={styles.infoVal}>{selectedAppForReview.educational_qualification.grade_level}</Text>
                      </View>
                    ) : null}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>School / Institute:</Text>
                      <Text style={styles.infoVal}>{selectedAppForReview.educational_qualification?.institute_name || 'N/A'}</Text>
                    </View>
                    {selectedAppForReview.educational_qualification?.details ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Qualification Details:</Text>
                        <Text style={styles.infoVal}>{selectedAppForReview.educational_qualification.details}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* 4. Payment Method & Deposit Slip Review */}
                  <View style={styles.infoSectionCard}>
                    <Text style={styles.sectionCardHeaderTitle}>Payment Method & Deposit Slip</Text>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Selected Payment Method:</Text>
                      <Text style={[styles.infoVal, { fontWeight: 'bold', color: COLORS.primary }]}>
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

                  {/* 5. Admin Payment Amount & Status Editor */}
                  <View style={styles.adminFeeEditorCard}>
                    <Text style={styles.adminFeeTitle}>Admin Fee & Payment Editor</Text>
                    <Text style={styles.adminFeeSub}>Adjust total course fee, amount received, and payment status before approval:</Text>

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

                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.feeInputLabel}>Payment Status:</Text>
                      <View style={styles.statusChipsRow}>
                        {[
                          { id: 'pending', label: 'Pending' },
                          { id: 'partially_paid', label: 'Partially Paid' },
                          { id: 'paid', label: 'Paid' },
                          { id: 'waived', label: 'Waived' }
                        ].map(st => (
                          <TouchableOpacity
                            key={st.id}
                            style={[styles.statusChip, adminPaymentStatus === st.id && styles.statusChipSelected]}
                            onPress={() => setAdminPaymentStatus(st.id as any)}
                          >
                            <Text style={[styles.statusChipText, adminPaymentStatus === st.id && styles.statusChipTextSelected]}>
                              {st.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.balanceSummaryRow}>
                      <Text style={styles.balanceLabel}>Remaining Balance:</Text>
                      <Text style={styles.balanceValue}>
                        LKR {Math.max(0, (Number(adminTotalFee) || 0) - (Number(adminAmountPaid) || 0)).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* 6. Assign Course(s) Section */}
                  <View style={styles.infoSectionCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Icon name="book-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
                      <Text style={styles.sectionHeaderTitle}>Assign Course(s)</Text>
                    </View>
                    <Text style={styles.sectionHeaderDesc}>
                      Select the course(s) to assign to <Text style={{ fontWeight: 'bold', color: '#111827' }}>{selectedAppForReview.full_name}</Text> upon approval:
                    </Text>

                    {loadingCourses ? (
                      <ActivityIndicator color="#F58220" style={{ marginVertical: 20 }} />
                    ) : (
                      <View style={{ marginTop: 10 }}>
                        {allAvailableCourses.length === 0 ? (
                          <Text style={styles.noCoursesText}>No active courses available.</Text>
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
                                  {isSelected && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.courseSelectTitle, isSelected && styles.courseSelectTitleActive]}>
                                    {course.title}
                                  </Text>
                                  {course.fee ? (
                                    <Text style={styles.courseSelectMeta}>Standard Course Fee: LKR {course.fee.toLocaleString()} · {course.duration_weeks || 12} Weeks</Text>
                                  ) : (
                                    <Text style={styles.courseSelectMeta}>Duration: {course.duration_weeks || 12} Weeks</Text>
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                  <View style={{ height: 30 }} />
                </ScrollView>

                {/* Modal Footer Actions */}
                <View style={styles.reviewModalFooter}>
                  <TouchableOpacity
                    style={styles.rejectOutlineBtn}
                    onPress={handleRejectFromReview}
                    disabled={approving || rejectingId !== null}
                  >
                    <Text style={styles.rejectOutlineBtnText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveFillBtn}
                    onPress={handleApproveFromReview}
                    disabled={approving}
                  >
                    {approving ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Icon name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.approveFillBtnText}>Approve Student</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
    </>
  );

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
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  studentEmailText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  studentPhoneText: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    width: '92%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  reviewModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  reviewModalSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeIconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  infoSectionCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  modalAvatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  infoAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  infoStudentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  infoStudentEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  otpVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  otpVerifiedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#065F46',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    maxWidth: 200,
    textAlign: 'right',
  },
  sectionCardHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionHeaderDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 6,
  },
  noCoursesText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  courseSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 10,
    marginBottom: 6,
  },
  courseSelectItemActive: {
    borderColor: '#F58220',
    backgroundColor: '#FFF7ED',
  },
  courseCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  courseCheckboxActive: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  courseSelectTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  courseSelectTitleActive: {
    color: '#F58220',
    fontWeight: 'bold',
  },
  courseSelectMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  slipThumbnailBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  slipThumbnailImg: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  zoomOverlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.8)',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  noSlipText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  adminFeeEditorCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  },
  feeInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusChipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  statusChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  balanceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  reviewModalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  rejectOutlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  rejectOutlineBtnText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 14,
  },
  approveFillBtn: {
    flex: 2,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(5, 150, 105, 0.3)' },
      default: { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }
    }),
  },
  approveFillBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
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
});
