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
          // On web, append the actual File object so Axios can serialize it correctly
          data.append('profile_photo', photoAsset.file, photoAsset.fileName || 'photo.jpg');
        } else {
          // On native, use the {uri, name, type} approach that React Native's fetch understands
          const localUri = photoAsset.uri;
          const filename = (photoAsset.fileName || localUri.split('/').pop() || 'photo.jpg');
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

  const handleLogoutPress = () => {
    setLogoutModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#000000" />
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* ========================================================================= */}
        {/* DARK HERO BANNER CARD (EXACT UI MATCH FROM DESIGN IMAGE) */}
        {/* ========================================================================= */}
        <View style={styles.darkHeaderCard}>
          {/* Avatar Ring */}
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

          {/* User Name */}
          <Text style={styles.userName}>{profile.name}</Text>

          {/* Role Pill Badge */}
          <View style={styles.roleBadgePill}>
            <Text style={styles.roleBadgeText}>{(profile.role || 'STUDENT').toUpperCase()}</Text>
          </View>

          {/* Email Address */}
          <Text style={styles.userEmail}>{profile.email}</Text>
        </View>

        {/* ========================================================================= */}
        {/* ACTION BUTTONS (EXACT DESIGN MATCH) */}
        {/* ========================================================================= */}
        <View style={styles.actionButtonsContainer}>
          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.darkPrimaryBtn}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="pencil" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.darkPrimaryBtnText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Change Password Button */}
          <TouchableOpacity
            style={styles.outlineSecondaryBtn}
            onPress={() => setPassModalVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="lock-closed-outline" size={18} color="#18181B" style={{ marginRight: 8 }} />
            <Text style={styles.outlineSecondaryBtnText}>Change Password</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.dangerLogoutBtn}
            onPress={handleLogoutPress}
            activeOpacity={0.8}
          >
            <Icon name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.dangerLogoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Extra Account Info Card */}
        <View style={styles.accountInfoCard}>
          <Text style={styles.accountInfoTitle}>System Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{profile.role === 'student' ? 'Reg No:' : 'Reg No / User ID:'}</Text>
            <Text style={[styles.infoVal, { fontWeight: 'bold', color: '#111827' }]} numberOfLines={1}>
              {profile.index_number || profile._id}
            </Text>
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
            <Text style={[styles.infoVal, { color: '#059669', fontWeight: 'bold' }]}>Active & Verified</Text>
          </View>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* EDIT PROFILE MODAL */}
      {/* ========================================================================= */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Photo Avatar Upload Touch */}
            <TouchableOpacity onPress={pickImage} style={styles.photoUploadBox}>
              {(photoAsset?.uri || profile.profile_photo) ? (
                <Image source={photoAsset?.uri || profile.profile_photo} style={styles.modalAvatarImg} />
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
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitModalBtn} onPress={saveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitModalText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* CHANGE PASSWORD MODAL */}
      {/* ========================================================================= */}
      <Modal visible={passModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrentPass(v => !v)}>
                <Icon name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
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
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNewPass(v => !v)}>
                <Icon name={showNewPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
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
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPass(v => !v)}>
                <Icon name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setPassModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitModalBtn} onPress={handleChangePassword} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitModalText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* LOGOUT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal visible={logoutModalVisible} animationType="fade" transparent={true} onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 24,
            width: '100%',
            maxWidth: 380,
            alignItems: 'center',
            boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.25)',
            elevation: 10
          }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#FEE2E2',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <Icon name="log-out-outline" size={28} color="#DC2626" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>
              Confirm Logout
            </Text>
            <Text style={{ fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
              Are you sure you want to log out of the TVTI Project Portal?
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#CBD5E1'
                }}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={{ color: '#475569', fontWeight: 'bold', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#DC2626',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
                onPress={() => {
                  setLogoutModalVisible(false);
                  logout();
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* ACK / ALERT POPUP MODAL */}
      {/* ========================================================================= */}
      <Modal visible={ackModal.visible} animationType="fade" transparent onRequestClose={() => setAckModal(p => ({ ...p, visible: false }))}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={[
              styles.popupIconCircle,
              {
                backgroundColor:
                  ackModal.type === 'success' ? '#DCFCE7' :
                  ackModal.type === 'error'   ? '#FEE2E2' : '#EFF6FF'
              }
            ]}>
              <Icon
                name={
                  ackModal.type === 'success' ? 'checkmark-circle-outline' :
                  ackModal.type === 'error'   ? 'close-circle-outline' :
                  'information-circle-outline'
                }
                size={28}
                color={
                  ackModal.type === 'success' ? '#16A34A' :
                  ackModal.type === 'error'   ? '#DC2626' : '#2563EB'
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
                    ackModal.type === 'success' ? '#16A34A' :
                    ackModal.type === 'error'   ? '#DC2626' : '#2563EB'
                }
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
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F6',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  /* DARK HEADER CARD (MATCHING USER DESIGN EXACTLY) */
  darkHeaderCard: {
    backgroundColor: '#121214',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.3)',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#9CA3AF',
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#27272A',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3F3F46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  roleBadgePill: {
    borderWidth: 1,
    borderColor: '#7C2D12',
    backgroundColor: 'rgba(124, 45, 18, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F97316',
    letterSpacing: 1,
  },
  userEmail: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  /* ACTION BUTTONS (MATCHING DESIGN LAYOUT) */
  actionButtonsContainer: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
    gap: 14,
  },
  darkPrimaryBtn: {
    backgroundColor: '#1E1E22',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  darkPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  outlineSecondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1E1E22',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineSecondaryBtnText: {
    color: '#1E1E22',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dangerLogoutBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLogoutBtnText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 16,
  },

  /* EXTRA SYSTEM INFO CARD */
  accountInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  accountInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    maxWidth: '60%',
  },

  /* MODALS STYLES */
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
    color: '#111827',
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
    backgroundColor: '#3F3F46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F97316',
    padding: 6,
    borderRadius: 12,
  },
  photoUploadHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
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
    backgroundColor: '#1E1E22',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  submitModalText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Password field with eye toggle
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Ack Popup Styles
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.2)',
    elevation: 10,
  },
  popupIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  popupMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  popupOkBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  popupOkBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
