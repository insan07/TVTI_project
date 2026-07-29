import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
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
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Change Password Modal
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

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
      Alert.alert('Error', 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const saveProfile = async () => {
    if (!formData.name.trim()) return Alert.alert('Error', 'Name is required');

    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('phone', formData.phone.trim());

      if (photoUri) {
        const localUri = photoUri;
        const filename = localUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        data.append('profile_photo', { uri: localUri, name: filename, type } as any);
      }

      await api.put('/users/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Profile updated successfully!');
      setEditModalVisible(false);
      setPhotoUri(null);
      fetchProfile();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passData.currentPassword || !passData.newPassword || !passData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (passData.newPassword !== passData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passData.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      await api.put('/users/change-password', {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      });
      Alert.alert('Success', 'Password updated successfully!');
      setPassModalVisible(false);
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutPress = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out of TVTI Project Portal?')) {
        logout();
      }
    } else {
      Alert.alert(
        'Confirm Logout',
        'Are you sure you want to log out of TVTI Project Portal?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: logout }
        ]
      );
    }
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
            {(photoUri || profile.profile_photo) ? (
              <Image
                source={photoUri || profile.profile_photo}
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
              {(photoUri || profile.profile_photo) ? (
                <Image source={photoUri || profile.profile_photo} style={styles.modalAvatarImg} />
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
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={passData.currentPassword}
              onChangeText={t => setPassData({ ...passData, currentPassword: t })}
              placeholder="Enter current password"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>New Password *</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={passData.newPassword}
              onChangeText={t => setPassData({ ...passData, newPassword: t })}
              placeholder="At least 6 characters"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Confirm New Password *</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={passData.confirmPassword}
              onChangeText={t => setPassData({ ...passData, confirmPassword: t })}
              placeholder="Re-enter new password"
              placeholderTextColor="#9CA3AF"
            />

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
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
});
