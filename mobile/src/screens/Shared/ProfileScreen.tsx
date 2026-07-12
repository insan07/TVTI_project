import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const context = useContext(AuthContext);
  if (!context) return null;
  const { user, logout } = context as any;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Password mode
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/me');
      setProfile(res.data);
      setFormData({ name: res.data.name, phone: res.data.phone || '' });
    } catch (error) {
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
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('phone', formData.phone);
      
      if (photoUri) {
        const localUri = photoUri;
        const filename = localUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        data.append('profile_photo', { uri: localUri, name: filename, type } as any);
      }

      await api.put('/users/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
      setPhotoUri(null);
      fetchProfile();
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passData.newPassword !== passData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await api.put('/users/change-password', {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      });
      Alert.alert('Success', 'Password changed');
      setIsChangingPassword(false);
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 50 }} />;
  if (!profile) return <Text style={{textAlign: 'center', marginTop: 20}}>Failed to load profile</Text>;

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <SafeAreaView style={{flex: 1}} edges={['top']}>
    <ScrollView style={styles.container}>
      {/* Header Profile Info */}
      <View style={styles.header}>
        <TouchableOpacity onPress={isEditing ? pickImage : undefined} style={styles.photoContainer}>
          {(photoUri || profile.profile_photo) ? (
            <Image source={photoUri || profile.profile_photo} style={styles.photo} contentFit="cover" transition={1000} cachePolicy="memory-disk" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.initials}>{getInitials(profile.name)}</Text>
            </View>
          )}
          {isEditing && <View style={styles.editBadge}><Text style={{color: '#fff', fontSize: 10}}>EDIT</Text></View>}
        </TouchableOpacity>

        {!isEditing ? (
          <>
            <Text style={styles.name}>{profile.name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profile.role.toUpperCase()}</Text>
            </View>
            <Text style={styles.email}>{profile.email}</Text>
          </>
        ) : (
          <View style={{ width: '100%', marginTop: 20 }}>
            <TextInput style={styles.input} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} placeholder="Name" />
            <TextInput style={styles.input} value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} placeholder="Phone" keyboardType="phone-pad" />
          </View>
        )}
      </View>

      {/* Role Specific Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dashboard Stats</Text>
        {profile.role === 'student' && (
          <>
            <Text style={styles.statText}>Enrolled Batches: {profile.stats?.enrolled_batches_count || 0}</Text>
            {profile.nic && <Text style={styles.statText}>NIC: {profile.nic}</Text>}
          </>
        )}
        {profile.role === 'instructor' && (
          <Text style={styles.statText}>Assigned Batches: {profile.stats?.assigned_batches_count || 0}</Text>
        )}
        {profile.role === 'admin' && (
          <Text style={styles.statText}>Total Platform Users: {profile.stats?.total_users_count || 0}</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {isEditing ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity style={[styles.btn, {backgroundColor: '#6B7280', flex: 1, marginRight: 5}]} onPress={() => {setIsEditing(false); setPhotoUri(null);}}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, {flex: 1, marginLeft: 5}]} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={() => setIsEditing(true)}>
            <Text style={styles.btnText}>Edit Profile</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.btn, styles.outlineBtn]} onPress={() => setIsChangingPassword(!isChangingPassword)}>
          <Text style={[styles.btnText, {color: '#2563EB'}]}>Change Password</Text>
        </TouchableOpacity>

        {isChangingPassword && (
          <View style={styles.card}>
            <TextInput style={styles.input} placeholder="Current Password" secureTextEntry value={passData.currentPassword} onChangeText={t => setPassData({...passData, currentPassword: t})} />
            <TextInput style={styles.input} placeholder="New Password" secureTextEntry value={passData.newPassword} onChangeText={t => setPassData({...passData, newPassword: t})} />
            <TextInput style={styles.input} placeholder="Confirm New Password" secureTextEntry value={passData.confirmPassword} onChangeText={t => setPassData({...passData, confirmPassword: t})} />
            <TouchableOpacity style={styles.btn} onPress={changePassword} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={[styles.btn, {backgroundColor: '#EF4444', marginTop: 30}]} onPress={logout}>
          <Text style={styles.btnText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { alignItems: 'center', backgroundColor: '#fff', padding: 24, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  photoContainer: { position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  initials: { fontSize: 36, color: '#2563EB', fontWeight: 'bold' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 12 },
  email: { color: '#6B7280', marginTop: 4 },
  roleBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginTop: 8 },
  roleText: { color: '#2563EB', fontWeight: '600', fontSize: 12 },
  card: { backgroundColor: '#fff', padding: 20, margin: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width: 0, height: 2}, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  statText: { fontSize: 14, color: '#4B5563', marginBottom: 8 },
  actionsContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  btn: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  outlineBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#2563EB' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
});
