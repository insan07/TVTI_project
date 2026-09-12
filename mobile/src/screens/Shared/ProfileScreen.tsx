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

export default function ProfileScreen() {
  const context = useContext(AuthContext);
  if (!context) return null;
  const { logout } = context as any;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSystemDetails, setShowSystemDetails] = useState(false);

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [photoAsset, setPhotoAsset] = useState<any>(null);

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
      showAck('Error', 'Failed to fetch profile', 'error');
    } finally {
      setLoading(false);
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
      setPhotoAsset(result.assets[0]);
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

      showAck('Profile Updated', 'Your profile has been updated successfully!', 'success', () => {
        setEditModalVisible(false);
        setPhotoAsset(null);
        fetchProfile();
      });
    } catch (e: any) {
      showAck('Error', e.response?.data?.message || 'Failed to update profile', 'error');
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

      showAck('Password Updated', 'Your password has been changed successfully!', 'success', () => {
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

  const isStudent = (profile.role || 'student').toLowerCase() === 'student';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        {/* PAGE HEADER */}
        {/* ========================================================================= */}
        <Text style={styles.categoryHeader}>Account</Text>
        <Text style={styles.mainTitle}>Profile</Text>

        {/* ========================================================================= */}
        {/* TOP MAIN PROFILE CARD (EXACT MATCH TO DESIGN SCREENSHOT) */}
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
            <View style={styles.roleBadgePill}>
              <Text style={styles.roleBadgeText}>
                {(profile.role || 'STUDENT').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Quick Edit Arrow Circle Button */}
          <TouchableOpacity
            style={styles.editCircleBtn}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.7}
          >
            <Icon name="arrow-forward-outline" size={16} color="#52525B" />
          </TouchableOpacity>
        </View>



        {/* ========================================================================= */}
        {/* MENU ACTION LIST CARDS (EXACT MATCH TO DESIGN SCREENSHOT) */}
        {/* ========================================================================= */}
        <View style={styles.menuListSection}>
          {/* Edit Profile Item */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeftContent}>
              <Icon name="pencil-outline" size={20} color="#3F3F46" style={styles.menuIcon} />
              <Text style={styles.menuText}>Edit Profile</Text>
            </View>
            <Icon name="chevron-forward" size={18} color="#A1A1AA" />
          </TouchableOpacity>

          {/* Change Password Item */}
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

          {/* System Details Item */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setShowSystemDetails(v => !v)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeftContent}>
              <Icon name="information-circle-outline" size={20} color="#3F3F46" style={styles.menuIcon} />
              <Text style={styles.menuText}>System Details</Text>
            </View>
            <Icon name={showSystemDetails ? "chevron-down" : "chevron-forward"} size={18} color="#A1A1AA" />
          </TouchableOpacity>

          {/* Expandable System Details Content */}
          {showSystemDetails && (
            <View style={styles.expandableDetailsCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Registration / User ID:</Text>
                <Text style={styles.infoVal}>{profile.index_number || profile._id}</Text>
              </View>
              {profile.phone ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone Number:</Text>
                  <Text style={styles.infoVal}>{profile.phone}</Text>
                </View>
              ) : null}
              {profile.nic ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>NIC Number:</Text>
                  <Text style={styles.infoVal}>{profile.nic}</Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Status:</Text>
                <Text style={[styles.infoVal, { color: '#10B981', fontWeight: 'bold' }]}>
                  Active & Verified
                </Text>
              </View>
            </View>
          )}

          {/* Notifications Item */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => showAck('Notifications', 'Notification preferences are enabled for your TVTI account.', 'info')}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeftContent}>
              <Icon name="notifications-outline" size={20} color="#3F3F46" style={styles.menuIcon} />
              <Text style={styles.menuText}>Notifications</Text>
            </View>
            <Icon name="chevron-forward" size={18} color="#A1A1AA" />
          </TouchableOpacity>

          {/* Help & Support Item */}
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

          {/* Logout Item */}
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
              📧 Email: support@tvti.edu{'\n'}
              📞 Phone: +94 11 234 5678
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
      <Modal
        visible={logoutModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={[styles.popupIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="log-out-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.popupTitle}>Confirm Logout</Text>
            <Text style={styles.popupMessage}>
              Are you sure you want to log out of your TVTI account?
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 16 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={{ color: '#475569', fontWeight: 'bold', fontSize: 14 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#DC2626',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setLogoutModalVisible(false);
                  logout();
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>
                  Logout
                </Text>
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
    backgroundColor: '#F4F4F6', // Light clean gray matching design screenshot
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100, // Space so floating bottom navbar never overlaps content
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
  categoryHeader: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '500',
    marginBottom: 2,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#18181B',
    marginBottom: 20,
  },

  /* MAIN PROFILE CARD (EXACT MATCH TO DESIGN SCREENSHOT) */
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.04)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    }),
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFC83B', // Warm yellow/orange backdrop matching screenshot
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
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileMetaContainer: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#18181B',
  },
  userEmail: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
    marginBottom: 6,
  },
  roleBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
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

  /* METRICS GRID ROW (EXACT MATCH TO DESIGN SCREENSHOT) */
  statsGridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.03)' },
      default: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#18181B',
  },
  statLabel: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 4,
    fontWeight: '500',
  },

  /* MENU ACTION LIST CARDS (EXACT MATCH TO DESIGN SCREENSHOT) */
  menuListSection: {
    gap: 10,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
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

  /* EXPANDABLE SYSTEM DETAILS */
  expandableDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: -4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#71717A',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18181B',
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
