import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FONTS } from '../../config/theme';
import ScreenHeader from '../../components/shared/ScreenHeader';

export default function ProfileScreen() {
  const context = useContext(AuthContext);
  if (!context) return null;
  const { logout, user } = context as any;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tab / Detail Modals
  const [myDetailsModalVisible, setMyDetailsModalVisible] = useState(false);
  const [paymentDetailsModalVisible, setPaymentDetailsModalVisible] = useState(false);

  // Student Payment Slips & Upload States
  const [mySlipsList, setMySlipsList] = useState<any[]>([]);
  const [mySlipsSummary, setMySlipsSummary] = useState<any>(null);
  const [loadingMySlips, setLoadingMySlips] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadForm, setUploadForm] = useState({ amount: '', payment_method: 'bank_transfer', notes: '' });
  const [uploadSlipAsset, setUploadSlipAsset] = useState<any>(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [photoAsset, setPhotoAsset] = useState<any>(null);

  // Bank Slip Zoom Modal
  const [slipZoomVisible, setSlipZoomVisible] = useState(false);

  // Change Password Modal
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Help & Support Modal
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Logout Confirmation Modal
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Ack / Alert Popup
  const [ackModal, setAckModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    onOk?: () => void;
  }>({ visible: false, title: '', message: '', type: 'info' });

  const showAck = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    onOk?: () => void
  ) => setAckModal({ visible: true, title, message, type, onOk });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/me');
      setProfile(res.data);
      setFormData({ name: res.data.name || '', phone: res.data.phone || '' });
    } catch (error) {
      console.warn('Failed to fetch profile', error);
      showAck('Error', 'Failed to fetch profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPaymentSlips = async () => {
    setLoadingMySlips(true);
    try {
      const res = await api.get('/students/payments/my-slips');
      setMySlipsSummary(res.data.summary);
      setMySlipsList(res.data.slips || []);
    } catch (e) {
      console.warn('Failed to fetch payment slips', e);
    } finally {
      setLoadingMySlips(false);
    }
  };

  const pickPaymentSlipImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
        showAck('File Too Large', 'Selected slip document is larger than 8MB. Please upload a smaller image.', 'error');
        return;
      }
      setUploadSlipAsset(asset);
    }
  };

  const handleUploadPaymentSlip = async () => {
    if (!uploadForm.amount || isNaN(Number(uploadForm.amount)) || Number(uploadForm.amount) <= 0) {
      return showAck('Required Field', 'Please enter a valid payment amount (e.g. 10000).', 'error');
    }
    if (!uploadSlipAsset) {
      return showAck('Required Field', 'Please select or capture a payment slip document image.', 'error');
    }

    setUploadingSlip(true);
    try {
      const data = new FormData();
      data.append('amount', uploadForm.amount.trim());
      data.append('payment_method', uploadForm.payment_method);
      data.append('notes', uploadForm.notes.trim());

      if (Platform.OS === 'web' && uploadSlipAsset.file instanceof File) {
        data.append('slip_file', uploadSlipAsset.file, uploadSlipAsset.fileName || 'slip.jpg');
      } else {
        const localUri = uploadSlipAsset.uri;
        const filename = uploadSlipAsset.fileName || localUri.split('/').pop() || 'slip.jpg';
        const type = uploadSlipAsset.mimeType || 'image/jpeg';
        data.append('slip_file', { uri: localUri, name: filename, type } as any);
      }

      await api.post('/students/payments/upload-slip', data);
      showAck('Slip Uploaded', 'Your payment slip has been submitted successfully for admin review.', 'success', () => {
        setUploadModalVisible(false);
        setUploadSlipAsset(null);
        setUploadForm({ amount: '', payment_method: 'bank_transfer', notes: '' });
        fetchMyPaymentSlips();
        fetchProfile();
      });
    } catch (e: any) {
      showAck('Error', e.response?.data?.message || 'Failed to upload payment slip', 'error');
    } finally {
      setUploadingSlip(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        showAck('Image Too Large', 'Selected profile photo is larger than 5MB. Please choose an image smaller than 5MB.', 'error');
        return;
      }
      setPhotoAsset(asset);
    }
  };

  const saveProfile = async () => {
    if (!formData.name.trim()) return showAck('Error', 'Name is required', 'error');

    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('phone', formData.phone.trim());

      if (photoAsset) {
        if (Platform.OS === 'web' && photoAsset.file instanceof File) {
          data.append('profile_photo', photoAsset.file, photoAsset.fileName || 'photo.jpg');
        } else {
          const localUri = photoAsset.uri;
          const filename = photoAsset.fileName || localUri.split('/').pop() || 'photo.jpg';
          const type = photoAsset.mimeType || 'image/jpeg';
          data.append('profile_photo', { uri: localUri, name: filename, type } as any);
        }
      }

      await api.put('/users/profile', data);

      showAck('Profile Updated', 'Your profile has been updated successfully', 'success', () => {
        setEditModalVisible(false);
        setPhotoAsset(null);
        fetchProfile();
      });
    } catch (e: any) {
      const serverMsg = e.response?.data?.message;
      if (e.response?.status === 413 || (serverMsg && serverMsg.toLowerCase().includes('too large'))) {
        showAck('Photo Too Large', 'The selected profile photo is too large (request entity too large). Please upload a smaller image under 5MB.', 'error');
      } else {
        showAck('Error', serverMsg || 'Failed to update profile', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passData.currentPassword || !passData.newPassword || !passData.confirmPassword) {
      return showAck('Error', 'Please fill all password fields', 'error');
    }
    if (passData.newPassword !== passData.confirmPassword) {
      return showAck('Error', 'New passwords do not match', 'error');
    }
    if (passData.newPassword.length < 6) {
      return showAck('Error', 'Password must be at least 6 characters', 'error');
    }

    setSaving(true);
    try {
      await api.put('/users/change-password', {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword,
      });

      showAck('Password Updated', 'Your password has been changed successfully', 'success', () => {
        setPassModalVisible(false);
        setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      });
    } catch (e: any) {
      showAck('Error', e.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#F58220" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={{ color: '#6B7280' }}>Failed to load profile details</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const formatCurrency = (amt?: number) => {
    const val = amt || 0;
    return `LKR ${val.toLocaleString('en-US')}`;
  };

  const getPaymentStatusBadge = (status?: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'paid':
        return { text: 'Fully Paid', bg: '#DCFCE7', color: '#15803D' };
      case 'partial':
        return { text: 'Partially Paid', bg: '#FFEDD5', color: '#C2410C' };
      case 'overdue':
        return { text: 'Overdue', bg: '#FEE2E2', color: '#B91C1C' };
      case 'waived':
        return { text: 'Waived', bg: '#DBEAFE', color: '#1D4ED8' };
      default:
        return { text: 'Pending Payment', bg: '#FEF3C7', color: '#B45309' };
    }
  };

  const paymentInfo = profile.payment_info || {};
  const totalFee = paymentInfo.total_course_fee || 0;
  const amountPaid = paymentInfo.amount_paid || 0;
  const remainingBalance = Math.max(0, totalFee - amountPaid);
  const statusBadge = getPaymentStatusBadge(paymentInfo.payment_status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={
          user?.role === 'instructor' ? 'Instructor Profile' :
          user?.role === 'admin' ? 'Admin Profile' : 'Student Profile'
        }
        subtitle="Account details & preferences"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        {/* TOP PROFILE CARD */}
        {/* ========================================================================= */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {(photoAsset?.uri || profile.profile_photo) ? (
              <Image
                source={photoAsset?.uri || profile.profile_photo}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials(profile.name)}</Text>
              </View>
            )}
          </View>

          <View style={styles.profileMetaContainer}>
            <Text style={styles.userName} numberOfLines={1}>
              {profile.name}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {profile.email}
            </Text>
            <Text style={styles.regNumberText}>
              {user?.role === 'student' ? 'REG NO : ' : 'ID : '}
              {profile.index_number || profile.nic || (user?.role === 'student' ? 'TVTI/STUDENT' : 'N/A')}
            </Text>
          </View>

          {/* Quick Edit Pencil Circle Button */}
          <TouchableOpacity
            style={styles.editCircleBtn}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.7}
          >
            <Icon name="pencil-outline" size={16} color="#52525B" />
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* MENU OPTIONS LIST (STYLING EXACTLY MATCHES USER'S SCREENSHOT) */}
        {/* ========================================================================= */}
        <View style={styles.menuListSection}>
          {/* My Details Option Card */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setMyDetailsModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeftContent}>
              <Icon name="person-outline" size={20} color="#3F3F46" style={styles.menuIcon} />
              <Text style={styles.menuText}>My Details</Text>
            </View>
            <Icon name="chevron-forward" size={18} color="#A1A1AA" />
          </TouchableOpacity>

          {/* Payment Details Option Card */}
          {user?.role === 'student' && (
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => setPaymentDetailsModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeftContent}>
                <Icon name="card-outline" size={20} color="#3F3F46" style={styles.menuIcon} />
                <Text style={styles.menuText}>Payment Details</Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#A1A1AA" />
            </TouchableOpacity>
          )}

          {/* Change Password Option Card */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setPassModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeftContent}>
              <Icon name="lock-closed-outline" size={20} color="#3F3F46" style={styles.menuIcon} />
              <Text style={styles.menuText}>Change Password</Text>
            </View>
            <Icon name="chevron-forward" size={18} color="#A1A1AA" />
          </TouchableOpacity>

          {/* Help & Support Option Card */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setHelpModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeftContent}>
              <Icon name="help-circle-outline" size={20} color="#3F3F46" style={styles.menuIcon} />
              <Text style={styles.menuText}>Help & Support</Text>
            </View>
            <Icon name="chevron-forward" size={18} color="#A1A1AA" />
          </TouchableOpacity>

          {/* Logout Option Card */}
          <TouchableOpacity
            style={[styles.menuCard, styles.logoutMenuCard]}
            onPress={() => setLogoutModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeftContent}>
              <Icon name="log-out-outline" size={20} color="#EF4444" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: '#EF4444', fontWeight: '700' }]}>
                Logout
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color="#FCA5A5" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* MY DETAILS MODAL VIEW */}
      {/* ========================================================================= */}
      <Modal visible={myDetailsModalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F4F6' }} edges={['top']}>
          {/* Modal Header */}
          <View style={styles.modalHeaderBar}>
            <TouchableOpacity
              style={styles.modalBackBtn}
              onPress={() => setMyDetailsModalVisible(false)}
              activeOpacity={0.7}
            >
              <Icon name="chevron-back" size={24} color="#18181B" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>My Details</Text>
            <TouchableOpacity
              style={styles.modalEditHeaderBtn}
              onPress={() => setEditModalVisible(true)}
              activeOpacity={0.7}
            >
              <Icon name="pencil-outline" size={20} color="#F58220" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Personal Details Card */}
            <View style={styles.detailCard}>
              <View style={styles.cardHeaderRow}>
                <Icon name="person-outline" size={20} color="#F58220" />
                <Text style={styles.cardHeaderTitle}>Personal Information</Text>
              </View>
              <View style={styles.cardDivider} />

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>{profile.name || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>{profile.email || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>{profile.date_of_birth || 'Not Specified'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>
                    {profile.gender ? profile.gender.toUpperCase() : 'Not Specified'}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>NIC Number</Text>
                  <Text style={styles.infoValue}>{profile.nic || 'Not Provided'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Contact Phone</Text>
                  <Text style={styles.infoValue}>{profile.phone || 'Not Provided'}</Text>
                </View>
                <View style={[styles.infoItem, { width: '100%' }]}>
                  <Text style={styles.infoLabel}>Residential Address</Text>
                  <Text style={styles.infoValue}>{profile.address || 'Not Provided'}</Text>
                </View>
              </View>
            </View>

            {user?.role === 'student' && (
              <>
                {/* 2. Parent / Guardian Details Card */}
                <View style={styles.detailCard}>
                  <View style={styles.cardHeaderRow}>
                    <Icon name="people-outline" size={20} color="#F58220" />
                    <Text style={styles.cardHeaderTitle}>Parent / Guardian Information</Text>
                  </View>
                  <View style={styles.cardDivider} />

                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Guardian Name</Text>
                      <Text style={styles.infoValue}>{profile.guardian?.name || 'Not Provided'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Relationship</Text>
                      <Text style={styles.infoValue}>{profile.guardian?.relationship || 'Not Provided'}</Text>
                    </View>
                    <View style={[styles.infoItem, { width: '100%' }]}>
                      <Text style={styles.infoLabel}>Guardian Contact Phone</Text>
                      <Text style={styles.infoValue}>{profile.guardian?.phone || 'Not Provided'}</Text>
                    </View>
                  </View>
                </View>

                {/* 3. Educational Background Card */}
                <View style={styles.detailCard}>
                  <View style={styles.cardHeaderRow}>
                    <Icon name="school-outline" size={20} color="#F58220" />
                    <Text style={styles.cardHeaderTitle}>Educational Qualifications</Text>
                  </View>
                  <View style={styles.cardDivider} />

                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Highest Level Attained</Text>
                      <Text style={styles.infoValue}>
                        {profile.educational_qualification?.highest_level || 'Not Specified'}
                      </Text>
                    </View>
                    {profile.educational_qualification?.grade_level ? (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Current Grade Level</Text>
                        <Text style={styles.infoValue}>{profile.educational_qualification.grade_level}</Text>
                      </View>
                    ) : null}
                    {profile.educational_qualification?.institute_name ? (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>School / Institute</Text>
                        <Text style={styles.infoValue}>{profile.educational_qualification.institute_name}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.infoItem, { width: '100%' }]}>
                      <Text style={styles.infoLabel}>Qualification Details</Text>
                      <Text style={styles.infoValue}>
                        {profile.educational_qualification?.details || 'No additional details logged'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 4. Enrolled Courses Card */}
                <View style={styles.detailCard}>
                  <View style={styles.cardHeaderRow}>
                    <Icon name="book-outline" size={20} color="#F58220" />
                    <Text style={styles.cardHeaderTitle}>Enrolled Courses</Text>
                  </View>
                  <View style={styles.cardDivider} />

                  {profile.enrolled_courses && profile.enrolled_courses.length > 0 ? (
                    profile.enrolled_courses.map((course: any, idx: number) => (
                      <View key={course._id || idx} style={styles.courseRowItem}>
                        <View style={styles.courseBadge}>
                          <Text style={styles.courseBadgeText}>{course.code || 'COURSE'}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.courseTitleText}>{course.title}</Text>
                          {course.course_fee !== undefined ? (
                            <Text style={styles.courseSubFee}>Fee: {formatCurrency(course.course_fee)}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No enrolled courses registered yet.</Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* PAYMENT DETAILS & SLIP HISTORY MODAL VIEW */}
      {/* ========================================================================= */}
      <Modal visible={paymentDetailsModalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
          {/* Modal Header */}
          <View style={styles.modalHeaderBar}>
            <TouchableOpacity
              style={styles.modalBackBtn}
              onPress={() => setPaymentDetailsModalVisible(false)}
              activeOpacity={0.7}
            >
              <Icon name="chevron-back" size={24} color="#18181B" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>My Payments & Slips</Text>
            <TouchableOpacity
              style={{ padding: 6 }}
              onPress={fetchMyPaymentSlips}
              activeOpacity={0.7}
            >
              <Icon name="refresh" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Summary Card */}
            <View style={styles.detailCard}>
              <View style={styles.cardHeaderRow}>
                <Icon name="wallet-outline" size={22} color="#F59E0B" />
                <Text style={styles.cardHeaderTitle}>Fee Summary</Text>
              </View>
              <View style={styles.cardDivider} />

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Total Course Fee</Text>
                  <Text style={styles.infoValue}>{formatCurrency(mySlipsSummary?.total_fee || totalFee)}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Amount Paid</Text>
                  <Text style={[styles.infoValue, { color: '#10B981' }]}>{formatCurrency(mySlipsSummary?.amount_paid || amountPaid)}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Remaining Balance</Text>
                  <Text style={[styles.infoValue, { color: (mySlipsSummary?.remaining_balance ?? remainingBalance) > 0 ? '#EF4444' : '#10B981' }]}>
                    {formatCurrency(mySlipsSummary?.remaining_balance ?? remainingBalance)}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Overall Status</Text>
                  <Text style={[styles.infoValue, { color: statusBadge.color, fontWeight: '700' }]}>
                    {mySlipsSummary?.payment_status === 'paid' ? 'Fully Paid' : mySlipsSummary?.payment_status === 'partially_paid' ? 'Partially Paid' : 'Pending Review'}
                  </Text>
                </View>
              </View>

              {/* Upload Slip Action Button */}
              <TouchableOpacity
                style={{
                  marginTop: 16,
                  backgroundColor: '#0F172A',
                  paddingVertical: 13,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onPress={() => setUploadModalVisible(true)}
                activeOpacity={0.8}
              >
                <Icon name="cloud-upload-outline" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Upload Payment Slip</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Sent Slips History Section */}
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>
                Sent Slips History ({mySlipsList.length})
              </Text>

              {loadingMySlips ? (
                <ActivityIndicator size="small" color="#F59E0B" style={{ marginVertical: 20 }} />
              ) : mySlipsList.length === 0 ? (
                <View style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Icon name="receipt-outline" size={32} color="#94A3B8" />
                  <Text style={{ color: '#64748B', marginTop: 8, fontSize: 13 }}>No payment slips submitted yet.</Text>
                  <TouchableOpacity
                    style={{ marginTop: 10 }}
                    onPress={() => setUploadModalVisible(true)}
                  >
                    <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 13 }}>+ Upload your first slip</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                mySlipsList.map((slip: any, index: number) => {
                  const isVerified = slip.status === 'verified';
                  const isRejected = slip.status === 'rejected';
                  return (
                    <View
                      key={slip._id || index}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: isVerified ? '#BBF7D0' : isRejected ? '#FECDD3' : '#E2E8F0',
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                          LKR {(slip.amount || 0).toLocaleString()}
                        </Text>
                        <View
                          style={{
                            backgroundColor: isVerified ? '#D1FAE5' : isRejected ? '#FFE4E6' : '#FEF3C7',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: isVerified ? '#065F46' : isRejected ? '#BE123C' : '#D97706',
                            }}
                          >
                            {isVerified ? 'Verified & Approved' : isRejected ? 'Rejected' : 'Pending Review'}
                          </Text>
                        </View>
                      </View>

                      <View style={{ marginTop: 8, gap: 4 }}>
                        <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                          Method: {slip.payment_method === 'bank_transfer' ? 'Bank Deposit' : slip.payment_method === 'online_transfer' ? 'Online Transfer' : 'Physical Cash'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#94A3B8' }}>
                          Submitted: {slip.createdAt ? new Date(slip.createdAt).toLocaleString() : 'Recently'}
                        </Text>
                        {slip.notes ? <Text style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>Note: {slip.notes}</Text> : null}
                        {isRejected && slip.rejection_reason ? (
                          <Text style={{ fontSize: 12.5, color: '#BE123C', fontWeight: '600', marginTop: 4 }}>
                            Rejection Reason: {slip.rejection_reason}
                          </Text>
                        ) : null}
                      </View>

                      {slip.slip_url ? (
                        <TouchableOpacity
                          style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', height: 100, backgroundColor: '#F1F5F9', position: 'relative' }}
                          onPress={() => setZoomImageUrl(slip.slip_url)}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri: slip.slip_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Icon name="expand" size={12} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '600' }}>Preview Slip</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* UPLOAD PAYMENT SLIP MODAL */}
      {/* ========================================================================= */}
      <Modal visible={uploadModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Payment Slip</Text>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                <Icon name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={pickPaymentSlipImage} style={[styles.photoUploadBox, { borderRadius: 12, height: 120, width: '100%' }]}>
              {uploadSlipAsset?.uri ? (
                <Image source={{ uri: uploadSlipAsset.uri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} contentFit="cover" />
              ) : (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="camera-outline" size={32} color="#64748B" />
                  <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Tap to select slip document photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Paid Amount (LKR) *</Text>
            <TextInput
              style={styles.modalInput}
              value={uploadForm.amount}
              onChangeText={t => setUploadForm({ ...uploadForm, amount: t })}
              placeholder="e.g. 10000"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[
                { id: 'bank_transfer', label: 'Bank Slip' },
                { id: 'online_transfer', label: 'Online Bank' },
                { id: 'physical_cash', label: 'Cash' },
              ].map(method => (
                <TouchableOpacity
                  key={method.id}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: uploadForm.payment_method === method.id ? '#0F172A' : '#E2E8F0',
                    backgroundColor: uploadForm.payment_method === method.id ? '#0F172A' : '#FFFFFF',
                    alignItems: 'center',
                  }}
                  onPress={() => setUploadForm({ ...uploadForm, payment_method: method.id })}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: uploadForm.payment_method === method.id ? '#FFFFFF' : '#475569' }}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notes / Reference Number (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={uploadForm.notes}
              onChangeText={t => setUploadForm({ ...uploadForm, notes: t })}
              placeholder="Bank branch or ref no"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalFooterBtns}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setUploadModalVisible(false)}
                disabled={uploadingSlip}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalBtn, uploadingSlip && { opacity: 0.6 }]}
                onPress={handleUploadPaymentSlip}
                disabled={uploadingSlip}
              >
                {uploadingSlip ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Submit Slip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* FULL-SCREEN SLIP IMAGE ZOOM MODAL */}
      {/* ========================================================================= */}
      <Modal visible={Boolean(zoomImageUrl)} transparent animationType="fade">
        <View style={styles.zoomModalOverlay}>
          <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomImageUrl(null)}>
            <Icon name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.zoomImageContainer}>
            {zoomImageUrl ? (
              <Image source={{ uri: zoomImageUrl }} style={styles.fullZoomImage} contentFit="contain" />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* EDIT PROFILE MODAL */}
      {/* ========================================================================= */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={pickImage} style={styles.photoUploadBox}>
              {(photoAsset?.uri || profile.profile_photo) ? (
                <Image
                  source={photoAsset?.uri || profile.profile_photo}
                  style={styles.modalAvatarImg}
                />
              ) : (
                <View style={styles.modalAvatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{getInitials(formData.name)}</Text>
                </View>
              )}
              <View style={styles.uploadBadge}>
                <Icon name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoUploadHint}>Tap avatar to upload photo</Text>

            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.name}
              onChangeText={t => setFormData({ ...formData, name: t })}
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.phone}
              onChangeText={t => setFormData({ ...formData, phone: t })}
              placeholder="+94 77 123 4567"
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* CHANGE PASSWORD MODAL */}
      {/* ========================================================================= */}
      <Modal visible={passModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPassModalVisible(false)}>
                <Icon name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current Password *</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showCurrentPass}
                value={passData.currentPassword}
                onChangeText={t => setPassData({ ...passData, currentPassword: t })}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowCurrentPass(v => !v)}
              >
                <Icon
                  name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>New Password *</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showNewPass}
                value={passData.newPassword}
                onChangeText={t => setPassData({ ...passData, newPassword: t })}
                placeholder="At least 6 characters"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowNewPass(v => !v)}
              >
                <Icon
                  name={showNewPass ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirm New Password *</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showConfirmPass}
                value={passData.confirmPassword}
                onChangeText={t => setPassData({ ...passData, confirmPassword: t })}
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPass(v => !v)}
              >
                <Icon
                  name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setPassModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleChangePassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* HELP & SUPPORT MODAL */}
      {/* ========================================================================= */}
      <Modal visible={helpModalVisible} animationType="fade" transparent={true}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={[styles.popupIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="headset-outline" size={28} color="#D97706" />
            </View>
            <Text style={styles.popupTitle}>TVTI Support</Text>
            <Text style={styles.popupMessage}>
              Need assistance with your courses, timetable, or student account? Contact the TVTI Student Support Desk.
              {'\n\n'}
              Email: support@tvti.edu{'\n'}
              Phone: +94 11 234 5678
            </Text>
            <TouchableOpacity
              style={[styles.popupOkBtn, { backgroundColor: '#18181B' }]}
              onPress={() => setHelpModalVisible(false)}
            >
              <Text style={styles.popupOkBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* LOGOUT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal visible={logoutModalVisible} animationType="fade" transparent={true} onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 380,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10
          }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#FEE2E2',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <Icon name="shield-checkmark-outline" size={32} color="#DC2626" />
            </View>

            <Text style={{ fontSize: 19, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 6 }}>
              Confirm Logout
            </Text>

            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
              Are you sure you want to log out of your session? You can log back in at any time.
            </Text>

            {/* Account Details Safety Badge */}
            <View style={{
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              width: '100%',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                Account: <Text style={{ color: '#0F172A', fontWeight: 'bold' }}>{profile.name || profile.email}</Text> ({profile.role?.toUpperCase() || 'USER'})
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#0F172A',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
                onPress={() => setLogoutModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Stay Logged In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#FEF2F2',
                  borderWidth: 1,
                  borderColor: '#FCA5A5',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setLogoutModalVisible(false);
                  logout();
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 14 }}>Yes, Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* ACK / ALERT POPUP MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={ackModal.visible}
        animationType="fade"
        transparent
        onRequestClose={() => setAckModal(p => ({ ...p, visible: false }))}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View
              style={[
                styles.popupIconCircle,
                {
                  backgroundColor:
                    ackModal.type === 'success'
                      ? '#DCFCE7'
                      : ackModal.type === 'error'
                      ? '#FEE2E2'
                      : '#EFF6FF',
                },
              ]}
            >
              <Icon
                name={
                  ackModal.type === 'success'
                    ? 'checkmark-circle-outline'
                    : ackModal.type === 'error'
                    ? 'close-circle-outline'
                    : 'information-circle-outline'
                }
                size={28}
                color={
                  ackModal.type === 'success'
                    ? '#16A34A'
                    : ackModal.type === 'error'
                    ? '#DC2626'
                    : '#2563EB'
                }
              />
            </View>
            <Text style={styles.popupTitle}>{ackModal.title}</Text>
            <Text style={styles.popupMessage}>{ackModal.message}</Text>
            <TouchableOpacity
              style={[
                styles.popupOkBtn,
                {
                  backgroundColor:
                    ackModal.type === 'success'
                      ? '#16A34A'
                      : ackModal.type === 'error'
                      ? '#DC2626'
                      : '#2563EB',
                },
              ]}
              onPress={() => {
                const onOk = ackModal.onOk;
                setAckModal(p => ({ ...p, visible: false }));
                if (onOk) onOk();
              }}
            >
              <Text style={styles.popupOkBtnText}>OK</Text>
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
    backgroundColor: '#F4F4F6',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F6',
  },
  loadingText: {
    marginTop: 12,
    color: '#71717A',
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#18181B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  /* HEADER */
  stickyHeader: {
    backgroundColor: '#F4F4F6',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  mainTitle: {
    fontSize: 28,
    color: '#18181B',
    ...FONTS.extraBold,
    marginBottom: 8,
  },

  /* MODAL HEADER BAR */
  modalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  modalBackBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F4F4F6',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181B',
  },
  modalEditHeaderBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
  },

  /* MAIN PROFILE CARD */
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    }),
  },
  avatarContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    ...FONTS.extraBold,
    color: '#FFFFFF',
  },
  profileMetaContainer: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  userName: {
    fontSize: 17,
    ...FONTS.extraBold,
    color: '#18181B',
  },
  userEmail: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
    marginBottom: 4,
  },
  regNumberText: {
    color: '#F58220',
    fontSize: 12.5,
    ...FONTS.extraBold,
    letterSpacing: 0.4,
  },
  editCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  /* SECTIONS & DETAIL CARDS */
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.03)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#18181B',
    marginLeft: 10,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F4F4F6',
    marginVertical: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    width: '47%',
  },
  infoLabel: {
    fontSize: 11.5,
    color: '#71717A',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#18181B',
    marginTop: 2,
  },

  /* COURSE LIST */
  courseRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  courseBadge: {
    backgroundColor: '#F58220',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  courseBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  courseTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18181B',
  },
  courseSubFee: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  /* SLIP PREVIEW */
  slipContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F6',
  },
  slipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3F3F46',
    marginBottom: 8,
  },
  slipImageWrapper: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F4F4F6',
  },
  slipImagePreview: {
    width: '100%',
    height: '100%',
  },
  slipOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  slipOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },

  /* MENU ACTION LIST CARDS */
  menuListSection: {
    gap: 10,
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.03)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    }),
  },
  logoutMenuCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  menuLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 14,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18181B',
  },

  /* ZOOM MODAL */
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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

  /* MODALS */
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
    maxWidth: 420,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18181B',
  },
  photoUploadBox: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  modalAvatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#18181B',
    padding: 6,
    borderRadius: 12,
  },
  photoUploadHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#71717A',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3F3F46',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F4F4F6',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#18181B',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F6',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 10,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#18181B',
  },
  eyeBtn: {
    padding: 4,
  },
  modalFooterBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  cancelModalBtnText: {
    color: '#71717A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  saveModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F4F4F6',
  },
  cancelModalText: {
    color: '#71717A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  submitModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#18181B',
  },
  submitModalText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  /* POPUP OVERLAYS */
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.2)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
    }),
  },
  popupIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181B',
    textAlign: 'center',
    marginBottom: 8,
  },
  popupMessage: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  popupOkBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  popupOkBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
