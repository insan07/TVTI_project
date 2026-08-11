import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import CustomDropdown from '../../components/shared/CustomDropdown';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    name: '',
    nic: '',
    email: '',
    phone: '',
    desired_courses: [] as string[],
  });

  const [courses, setCourses] = useState<{ _id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Modals
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/courses/active').catch(() => null);
        if (res && res.data && res.data.length > 0) {
          setCourses(res.data);
          setFormData(prev => ({ ...prev, desired_courses: [res.data[0]._id] }));
        } else {
          const mock = [
            { _id: '60c72b2f9b1d8e1f88c88c81', title: 'Mobile Phone Repairing' },
            { _id: '60c72b2f9b1d8e1f88c88c82', title: 'Laptop & Desktop Repairing' },
            { _id: '60c72b2f9b1d8e1f88c88c83', title: 'CCTV Installation & Networking' }
          ];
          setCourses(mock);
          setFormData(prev => ({ ...prev, desired_courses: [mock[0]._id] }));
        }
      } catch (e) {
        console.warn('Failed to fetch courses', e);
      } finally {
        setFetchingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const toggleCourse = (courseId: string) => {
    setFormData(prev => {
      const exists = prev.desired_courses.includes(courseId);
      let updated: string[];
      if (exists) {
        if (prev.desired_courses.length === 1) return prev; // Keep at least one selected
        updated = prev.desired_courses.filter(id => id !== courseId);
      } else {
        updated = [...prev.desired_courses, courseId];
      }
      return { ...prev, desired_courses: updated };
    });
    if (errorMsg) setErrorMsg('');
  };

  const handleRegisterApplication = async () => {
    setErrorMsg('');
    const { name, nic, email, phone, desired_courses } = formData;

    if (!name.trim() || !nic.trim() || !email.trim() || !phone.trim() || desired_courses.length === 0) {
      setErrorMsg('Please complete all required fields and select at least one course.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMsg('You must agree to the Terms & Conditions to submit your application.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/applications', {
        full_name: name.trim(),
        nic_number: nic.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        course_id: desired_courses[0],
        course_ids: desired_courses,
        terms_accepted: true
      });

      // Show Application Success Modal
      setSuccessModalVisible(true);
    } catch (e: any) {
      const serverMsg = e.response?.data?.message;
      if (serverMsg) {
        setErrorMsg(serverMsg);
      } else {
        setErrorMsg('Application submission failed. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    setSuccessModalVisible(false);
    navigation.navigate('Login', {
      registeredEmail: formData.email,
      infoMessage: 'Application Submitted! ⏳ Your registration status is PENDING. Once approved by TVTI Admin, your unique Registration Number & password will be issued.'
    });
  };

  const isFormValid = formData.name.trim() !== '' &&
    formData.nic.trim() !== '' &&
    formData.email.trim() !== '' &&
    formData.phone.trim() !== '' &&
    formData.desired_courses.length > 0 &&
    agreedToTerms;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        style={[styles.headerGradient, { paddingTop: insets.top + 12 }]}
      >
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandTitle}>Student Course Application</Text>
        <Text style={styles.brandSubtitle}>Apply for vocational certification programs</Text>
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
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={20} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <Icon name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. John Doe"
              placeholderTextColor={COLORS.textMuted}
              value={formData.name}
              onChangeText={(val) => handleChange('name', val)}
            />
          </View>

          <Text style={styles.inputLabel}>NIC Number *</Text>
          <View style={styles.inputContainer}>
            <Icon name="card-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 200112345678"
              placeholderTextColor={COLORS.textMuted}
              value={formData.nic}
              onChangeText={(val) => handleChange('nic', val)}
            />
          </View>

          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.inputContainer}>
            <Icon name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. john@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.textMuted}
              value={formData.email}
              onChangeText={(val) => handleChange('email', val)}
            />
          </View>

          <Text style={styles.inputLabel}>Phone Number *</Text>
          <View style={styles.inputContainer}>
            <Icon name="call-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. +94 77 123 4567"
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.textMuted}
              value={formData.phone}
              onChangeText={(val) => handleChange('phone', val)}
            />
          </View>

          <Text style={styles.inputLabel}>Desired Vocational Course(s) * (Select one or more)</Text>
          {fetchingCourses ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ paddingVertical: 14 }} />
          ) : (
            <View style={{ marginBottom: SPACING.md }}>
              {courses.map(c => {
                const isSelected = formData.desired_courses.includes(c._id);
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.courseOptionCard, isSelected && styles.courseOptionCardSelected]}
                    onPress={() => toggleCourse(c._id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.courseCheckbox, isSelected && styles.courseCheckboxSelected]}>
                      {isSelected && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.courseOptionTitle, isSelected && styles.courseOptionTitleSelected]}>
                      {c.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Checkbox for Terms & Conditions */}
          <View style={styles.termsRow}>
            <TouchableOpacity
              style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.8}
            >
              {agreedToTerms && <Icon name="checkmark" size={16} color="#FFFFFF" />}
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => setTermsModalVisible(true)}
                >
                  Terms & Conditions
                </Text>{' '}
                of TVTI Vocational Institute *
              </Text>
            </View>
          </View>

          {/* Submit Button: Disabled until terms checked */}
          <TouchableOpacity
            style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
            onPress={handleRegisterApplication}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Submit Application</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already registered? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.link}>Login Here</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms & Conditions Modal */}
      <Modal visible={termsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.termsModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>TVTI Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                <Icon name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginVertical: 12 }}>
              <Text style={styles.termsContent}>
                1. <Text style={{ fontWeight: 'bold' }}>Admissions Policy</Text>: All applications submitted via this portal are subject to document verification by TVTI Admissions Office.
                {'\n\n'}
                2. <Text style={{ fontWeight: 'bold' }}>Status & Credentials</Text>: Initial submission creates a <Text style={{ color: '#D97706', fontWeight: 'bold' }}>PENDING</Text> record. Upon payment & admin approval, your unique Registration Number (e.g. 26T0001) and temporary password will be issued.
                {'\n\n'}
                3. <Text style={{ fontWeight: 'bold' }}>Security & Password Setup</Text>: Temporary passwords expire after 7 days. On your first login, you are required to set a new permanent password.
                {'\n\n'}
                4. <Text style={{ fontWeight: 'bold' }}>Attendance & Discipline</Text>: Enrolled students must maintain a minimum 80% practical workshop attendance.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.acceptTermsBtn}
              onPress={() => {
                setAgreedToTerms(true);
                setTermsModalVisible(false);
              }}
            >
              <Text style={styles.acceptTermsBtnText}>I Agree & Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Registration Success Modal */}
      <Modal visible={successModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconCircle}>
              <Icon name="checkmark-circle" size={54} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>Application Submitted! 🎉</Text>
            <Text style={styles.modalText}>
              Your course application has been submitted successfully.
              {"\n\n"}
              Application Status: <Text style={{ fontWeight: 'bold', color: '#D97706' }}>PENDING REVIEW</Text>
              {"\n\n"}
              Once TVTI Admin approves your application, your unique <Text style={{ fontWeight: 'bold', color: '#111827' }}>Registration Number</Text> (e.g. 26T0001) and temporary login password will be issued.
            </Text>

            <TouchableOpacity style={styles.modalLoginBtn} onPress={handleGoToLogin}>
              <Text style={styles.modalLoginBtnText}>Return to Login</Text>
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
    backgroundColor: COLORS.surface,
  },
  headerGradient: {
    paddingBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: SPACING.xs,
  },
  brandTitle: {
    fontSize: 20,
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
  courseOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  courseOptionCardSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: COLORS.primary,
  },
  courseCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  courseCheckboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  courseOptionTitle: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  courseOptionTitleSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  termsText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...SHADOW.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    ...FONTS.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  link: {
    color: COLORS.secondary,
    ...FONTS.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '88%',
    alignItems: 'center',
    elevation: 5,
  },
  termsModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  successIconCircle: {
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  termsContent: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  acceptTermsBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  acceptTermsBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalLoginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  modalLoginBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
