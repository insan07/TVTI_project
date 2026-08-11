import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView
} from 'react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function ForceChangePasswordScreen() {
  const authContext = useContext(AuthContext) as any;
  const user = authContext?.user;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const insets = useSafeAreaInsets();

  const handleSetPassword = async () => {
    setErrorMsg('');

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorMsg('Please enter and confirm your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match. Please verify your entries.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.put('/users/force-change-password', {
        newPassword: newPassword.trim()
      });
      Alert.alert('Success', 'Password updated successfully! Welcome.');

      // Update AuthContext user state to clear must_change_password
      if (authContext?.setUser) {
        authContext.setUser({
          ...user,
          must_change_password: false
        });
      } else if (authContext?.fetchMe) {
        authContext.fetchMe();
      }
    } catch (e: any) {
      const serverMsg = e.response?.data?.message;
      setErrorMsg(serverMsg || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandTitle}>First-Time Password Setup</Text>
        <Text style={styles.brandSubtitle}>TVTI Student Portal</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.cardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.card}
          contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.securityBox}>
            <Icon name="shield-checkmark" size={24} color="#D97706" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.securityBoxTitle}>First Login Password Setup</Text>
              <Text style={styles.securityBoxSub}>
                Welcome, <Text style={{ fontWeight: 'bold' }}>{user?.name || 'Student'}</Text>! Please create a new secure permanent password for your account.
              </Text>
            </View>
          </View>

          {/* Read-Only Student Profile Details */}
          <View style={styles.profileSummaryBox}>
            <Text style={styles.profileSummaryTitle}>Student Identity Profile</Text>
            
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>Reg No / Index:</Text>
              <Text style={styles.readOnlyValueBold}>{user?.index_number || 'Registered Student'}</Text>
            </View>

            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>Full Name:</Text>
              <Text style={styles.readOnlyValue}>{user?.name || 'N/A'}</Text>
            </View>

            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>Email Address:</Text>
              <Text style={styles.readOnlyValue}>{user?.email || 'N/A'}</Text>
            </View>

            <View style={styles.lockNoticeRow}>
              <Icon name="lock-closed" size={14} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={styles.lockNoticeText}>Profile details verified by TVTI Admin and cannot be edited.</Text>
            </View>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={20} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>New Permanent Password *</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              secureTextEntry={!showNewPassword}
              placeholderTextColor={COLORS.textMuted}
              value={newPassword}
              onChangeText={(t) => {
                setNewPassword(t);
                if (errorMsg) setErrorMsg('');
              }}
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
              <Icon name={showNewPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Confirm New Password *</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter new password"
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (errorMsg) setErrorMsg('');
              }}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Icon name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Set Password & Enter Portal</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  headerGradient: {
    paddingBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: SPACING.xs,
  },
  brandTitle: {
    fontSize: 22,
    color: '#FFFFFF',
    ...FONTS.bold,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#FDE68A',
    marginTop: 2,
  },
  cardContainer: {
    flex: 1,
    marginTop: -20,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.xl,
    ...SHADOW.md,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  securityBoxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  securityBoxSub: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  profileSummaryBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  profileSummaryTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  readOnlyLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  readOnlyValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  readOnlyValueBold: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: 'bold',
  },
  lockNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  lockNoticeText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorBoxText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 18,
    ...FONTS.medium,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    ...FONTS.regular,
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    ...SHADOW.md,
  },
  buttonText: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    ...FONTS.bold,
  },
});
