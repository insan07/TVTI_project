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
  Image,
  Linking,
  useWindowDimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Theme mode: 'light' | 'dark'. Defaults to 'light' to match design screenshot
  const { mode: themeMode, isDark, toggleTheme } = useTheme();
  const isLight = !isDark;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'lms-autofill-styles';
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      if (themeMode === 'light') {
        style.innerHTML = `
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
            -webkit-text-fill-color: #0F172A !important;
            caret-color: #0F172A !important;
            transition: background-color 5000s ease-in-out 0s;
          }
          input {
            background-color: transparent !important;
          }
        `;
      } else {
        style.innerHTML = `
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 1000px rgba(22, 16, 12, 0.70) inset !important;
            -webkit-text-fill-color: #FFFFFF !important;
            caret-color: #FFFFFF !important;
            transition: background-color 5000s ease-in-out 0s;
          }
          input {
            background-color: transparent !important;
          }
        `;
      }
    }
  }, [themeMode]);

  // Wizard Step State (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // Form Data States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [dobDD, setDobDD] = useState('');
  const [dobMM, setDobMM] = useState('');
  const [dobYYYY, setDobYYYY] = useState('');

  const [formData, setFormData] = useState({
    // Section 1: Personal Details
    name: '',
    dob: '',
    gender: 'Male',
    address: '',
    phone: '',
    nic: '',
    email: '',

    // Section 2: Parent / Guardian Info
    guardian_name: '',
    guardian_relationship: 'Father',
    guardian_phone: '',
    guardian_occupation: '',

    // Section 3: Educational Qualifications
    education_level: 'O/L Completed',
    grade_level: '',
    school_name: '',

    // Section 4: Student Photo
    student_photo: '',

    // Section 5: Course & Payment
    desired_courses: [] as string[],
    payment_method: 'physical_pay' as 'bank_transfer' | 'physical_pay',
    payment_slip: '',
  });

  const [courses, setCourses] = useState<{ _id: string; title: string; code?: string; description?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Email OTP States
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Modals
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [courseInfoModalVisible, setCourseInfoModalVisible] = useState(false);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<any>(null);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);

  // DOB Clamping Logic
  const currentYear = new Date().getFullYear();

  const handleDobDDChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) {
      setDobDD('');
      return;
    }
    const num = parseInt(clean, 10);
    if (num > 31) {
      setDobDD('31');
    } else {
      setDobDD(clean);
    }
    if (errorMsg) setErrorMsg('');
  };

  const handleDobMMChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) {
      setDobMM('');
      return;
    }
    const num = parseInt(clean, 10);
    if (num > 12) {
      setDobMM('12');
    } else {
      setDobMM(clean);
    }
    if (errorMsg) setErrorMsg('');
  };

  const handleDobYYYYChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) {
      setDobYYYY('');
      return;
    }
    if (clean.length === 4) {
      const num = parseInt(clean, 10);
      if (num > currentYear) {
        setDobYYYY(String(currentYear));
        if (errorMsg) setErrorMsg('');
        return;
      }
    }
    setDobYYYY(clean);
    if (errorMsg) setErrorMsg('');
  };

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/courses/active').catch(() => null);
        if (res && res.data && res.data.length > 0) {
          setCourses(res.data);
          setFormData(prev => ({ ...prev, desired_courses: [res.data[0]._id] }));
        } else {
          setCourses([]);
        }
      } catch (e) {
        console.warn('Failed to fetch courses', e);
        setCourses([]);
      } finally {
        setFetchingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // Synchronize Name & DOB
  useEffect(() => {
    const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim();
    setFormData(prev => ({ ...prev, name: combinedName }));
  }, [firstName, lastName]);

  const getFormattedDob = () => {
    if (dobDD.trim() && dobMM.trim() && dobYYYY.trim()) {
      return `${dobYYYY.trim()}-${dobMM.trim().padStart(2, '0')}-${dobDD.trim().padStart(2, '0')}`;
    }
    return formData.dob || '';
  };

  useEffect(() => {
    if (dobDD && dobMM && dobYYYY) {
      const formattedDob = `${dobYYYY.trim()}-${dobMM.trim().padStart(2, '0')}-${dobDD.trim().padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, dob: formattedDob }));
    }
  }, [dobDD, dobMM, dobYYYY]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg('');
    if (field === 'email' && emailVerified) {
      handleResetEmail();
    }
  };

  const handleSendOtp = async () => {
    setOtpError('');
    setOtpSuccessMsg('');
    setOtpCode('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      setOtpError('Please enter a valid email address before requesting an OTP.');
      return;
    }

    try {
      setSendingOtp(true);
      const res = await api.post('/auth/send-otp', { email: formData.email.trim().toLowerCase() });
      if (res.data?.success) {
        setOtpSent(true);
        setOtpSuccessMsg(res.data?.message || 'A 6-digit OTP code has been sent to your email address.');
        if (res.data?.devOtp) {
          setOtpCode(res.data.devOtp);
        } else {
          setOtpCode('');
        }
        setResendCooldown(60);
      } else {
        setOtpError(res.data?.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to send OTP. Please check your network connection.';
      setOtpError(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    setOtpSuccessMsg('');
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setVerifyingOtp(true);
      const res = await api.post('/auth/verify-otp', {
        email: formData.email.trim().toLowerCase(),
        otp: otpCode.trim()
      });
      if (res.data?.verified || res.data?.success) {
        setEmailVerified(true);
        setOtpSent(false);
        setOtpCode('');
        setOtpSuccessMsg('Email verified successfully.');
      } else {
        setOtpError(res.data?.message || 'Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Verification failed. Please try again.';
      setOtpError(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResetEmail = () => {
    setEmailVerified(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpError('');
    setOtpSuccessMsg('');
  };

  const compressBase64Image = (dataUrl: string, maxWidth = 1000, quality = 0.5): Promise<string> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !dataUrl || !dataUrl.startsWith('data:image')) {
        return resolve(dataUrl);
      }
      const img = new (window as any).Image();
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
    });
  };

  const pickStudentPhoto = async () => {
    setErrorMsg('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Img = asset.base64
          ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;

        if (Platform.OS === 'web' && base64Img.startsWith('data:image')) {
          base64Img = await compressBase64Image(base64Img, 1000, 0.5);
        }

        if (base64Img.length > 3500000) {
          setErrorMsg('Selected student photo is larger than 2.5MB. Please choose a smaller photo.');
          return;
        }

        setFormData(prev => ({ ...prev, student_photo: base64Img }));
      }
    } catch (e) {
      console.warn('Failed to pick student photo', e);
    }
  };

  const pickPaymentSlip = async () => {
    setErrorMsg('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Img = asset.base64
          ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;

        if (Platform.OS === 'web' && base64Img.startsWith('data:image')) {
          base64Img = await compressBase64Image(base64Img, 1000, 0.5);
        }

        if (base64Img.length > 3500000) {
          setErrorMsg('Selected deposit receipt photo is larger than 2.5MB. Please choose a smaller photo.');
          return;
        }

        setFormData(prev => ({ ...prev, payment_slip: base64Img }));
      }
    } catch (e) {
      console.warn('Failed to pick payment slip', e);
    }
  };

  const toggleCourse = (courseId: string) => {
    setFormData(prev => {
      const exists = prev.desired_courses.includes(courseId);
      let updated: string[];
      if (exists) {
        if (prev.desired_courses.length === 1) return prev;
        updated = prev.desired_courses.filter(id => id !== courseId);
      } else {
        updated = [...prev.desired_courses, courseId];
      }
      return { ...prev, desired_courses: updated };
    });
    if (errorMsg) setErrorMsg('');
  };

  const openCourseWebsiteLink = () => {
    const websiteUrl = 'https://tvti.edu/courses';
    Linking.openURL(websiteUrl).catch(() => {
      if (courses.length > 0) {
        setSelectedCourseDetail(courses[0]);
      }
      setCourseInfoModalVisible(true);
    });
  };

  // STEP VALIDATION & NAVIGATION
  const handleNextStep = async () => {
    setErrorMsg('');

    if (currentStep === 1) {
      if (!firstName.trim()) {
        setErrorMsg('Please enter your First Name.');
        return;
      }
      const day = parseInt(dobDD.trim(), 10);
      const month = parseInt(dobMM.trim(), 10);
      const year = parseInt(dobYYYY.trim(), 10);

      if (!dobDD || !dobMM || !dobYYYY || isNaN(day) || isNaN(month) || isNaN(year)) {
        setErrorMsg('Please complete your Date of Birth (DD / MM / YYYY).');
        return;
      }
      if (day < 1 || day > 31) {
        setErrorMsg('Day of Birth must be between 1 and 31.');
        return;
      }
      if (month < 1 || month > 12) {
        setErrorMsg('Month of Birth must be between 1 and 12.');
        return;
      }
      if (year > currentYear || year < 1920) {
        setErrorMsg(`Year of Birth cannot exceed current year (${currentYear}).`);
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (!emailVerified) {
        setErrorMsg('Please verify your email address with OTP before continuing.');
        return;
      }
      const cleanedPhone = formData.phone.trim().replace(/[\s-]/g, '');
      const slPhoneRegex = /^(?:\+94|0)[1-9][0-9]{8}$/;
      if (!slPhoneRegex.test(cleanedPhone)) {
        setErrorMsg('Please enter a valid Sri Lankan phone number (e.g. 0771234567).');
        return;
      }
      if (formData.nic.trim()) {
        const slNicRegex = /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/;
        if (!slNicRegex.test(formData.nic.trim())) {
          setErrorMsg('Please enter a valid Sri Lankan NIC number (e.g. 199812345678 or 987654321V).');
          return;
        }
      }
      if (!formData.address.trim()) {
        setErrorMsg('Please enter your Residential Address.');
        return;
      }

      // Check Email & NIC availability against registered accounts and approved applications
      try {
        setLoading(true);
        await api.post('/auth/check-eligibility', {
          email: formData.email.trim().toLowerCase(),
          nic: formData.nic.trim() || undefined
        });
      } catch (checkErr: any) {
        const msg = checkErr.response?.data?.message || 'Eligibility check failed.';
        setErrorMsg(msg);
        return;
      } finally {
        setLoading(false);
      }

      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.guardian_name.trim() || !formData.guardian_phone.trim()) {
        setErrorMsg('Please enter Parent / Guardian Name and Contact Mobile Number.');
        return;
      }
      const cleanedGPhone = formData.guardian_phone.trim().replace(/[\s-]/g, '');
      const slPhoneRegex = /^(?:\+94|0)[1-9][0-9]{8}$/;
      if (!slPhoneRegex.test(cleanedGPhone)) {
        setErrorMsg('Please enter a valid Sri Lankan phone number for Guardian.');
        return;
      }

      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (formData.education_level === 'Below O/L' && !formData.grade_level.trim()) {
        setErrorMsg('Please specify your Current Grade Level (e.g. Grade 8, Grade 9).');
        return;
      }
      if (!formData.school_name.trim()) {
        setErrorMsg('Please enter School / Institution Name.');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      handleRegisterApplication();
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleRegisterApplication = async () => {
    setErrorMsg('');

    if (formData.desired_courses.length === 0) {
      setErrorMsg('Please select at least one course.');
      return;
    }

    if (formData.payment_method === 'bank_transfer' && !formData.payment_slip) {
      setErrorMsg('Please upload your Bank Deposit Receipt Slip photo or select Physical Cash Payment.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMsg('You must agree to the Terms & Conditions to submit your application.');
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || formData.name.trim();
    const formattedDob = getFormattedDob();

    try {
      setLoading(true);
      await api.post('/applications', {
        full_name: fullName,
        nic_number: formData.nic.trim() || undefined,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        date_of_birth: formattedDob || undefined,
        gender: formData.gender,
        address: formData.address.trim() || undefined,
        guardian: {
          name: formData.guardian_name.trim() || undefined,
          relationship: formData.guardian_relationship || 'Father',
          phone: formData.guardian_phone.trim() || undefined,
          occupation: formData.guardian_occupation.trim() || undefined
        },
        educational_qualification: {
          highest_level: formData.education_level || 'O/L Completed',
          grade_level: formData.education_level === 'Below O/L' ? formData.grade_level.trim() : undefined,
          institute_name: formData.school_name.trim() || undefined
        },
        // Flat fields for 100% fail-safe compatibility
        dob: formattedDob || undefined,
        guardian_name: formData.guardian_name.trim() || undefined,
        guardian_relationship: formData.guardian_relationship || 'Father',
        guardian_phone: formData.guardian_phone.trim() || undefined,
        guardian_occupation: formData.guardian_occupation.trim() || undefined,
        education_level: formData.education_level || 'O/L Completed',
        grade_level: formData.education_level === 'Below O/L' ? formData.grade_level.trim() : undefined,
        school_name: formData.school_name.trim() || undefined,

        student_photo: formData.student_photo || undefined,
        payment_method: formData.payment_method,
        payment_slip: formData.payment_slip || undefined,
        course_id: formData.desired_courses[0],
        course_ids: formData.desired_courses,
        terms_accepted: true
      });

      setSuccessModalVisible(true);
    } catch (e: any) {
      const serverMsg = e.response?.data?.message;
      if (e.response?.status === 413 || (serverMsg && serverMsg.toLowerCase().includes('too large'))) {
        setErrorMsg('The selected photo or deposit receipt is too large (request entity too large). Please upload a smaller image under 5MB.');
      } else if (serverMsg) {
        setErrorMsg(serverMsg);
      } else {
        setErrorMsg('Application submission failed. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    setSuccessModalVisible(false);
    navigation.navigate('Login', {
      registeredEmail: formData.email,
      infoMessage: 'Application Submitted: Your registration status is PENDING REVIEW. Once approved by TVTI Admin, your unique Registration Number & password will be issued.'
    });
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const renderStepIndicator = () => {
    const totalSteps = 5;
    return (
      <View style={styles.stepperContainer}>
        {/* Progress Line */}
        <View style={[styles.stepperLineBackground, isLight && { backgroundColor: '#E2E8F0' }]}>
          <View
            style={[
              styles.stepperLineProgress,
              { width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }
            ]}
          />
        </View>

        {/* Step Circles */}
        <View style={styles.stepperCirclesRow}>
          {[1, 2, 3, 4, 5].map((stepNum) => {
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;

            return (
              <TouchableOpacity
                key={stepNum}
                style={[
                  styles.stepCircle,
                  isLight && !isActive && !isCompleted && { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
                  isCompleted && styles.stepCircleCompleted,
                  isActive && styles.stepCircleActive,
                ]}
                onPress={() => {
                  if (stepNum < currentStep) setCurrentStep(stepNum);
                }}
                disabled={stepNum > currentStep}
              >
                {isCompleted ? (
                  <Icon name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepCircleText,
                      isLight && !isActive && { color: '#64748B' },
                      isActive && styles.stepCircleTextActive,
                    ]}
                  >
                    {stepNum}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Your Personal Details';
      case 2:
        return 'Parent & Guardian Info';
      case 3:
        return 'Educational Qualifications';
      case 4:
        return 'Student Photo Upload';
      case 5:
        return 'Course & Payment Details';
      default:
        return 'Registration Details';
    }
  };

  const renderRegisterCard = () => {
    const inputStyle = [styles.textInputStyle, isLight && styles.textInputLight];
    const labelStyle = [styles.fieldLabel, { color: isLight ? '#334155' : '#D4CAC0' }];
    const placeholderColor = isLight ? '#94A3B8' : '#9CA3AF';

    return (
      <View
        style={[
          styles.card,
          isLight ? styles.cardLight : styles.cardDark,
          isDesktop && (isLight ? styles.desktopCardLight : styles.desktopCardDark),
        ]}
      >
        {/* Back to Sign In Action */}
        <TouchableOpacity
          onPress={handleBackToLogin}
          style={styles.backButtonRow}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={18} color="#FF6500" style={{ marginRight: 6 }} />
          <Text style={styles.backButtonText}>Back to Sign In</Text>
        </TouchableOpacity>

        <Text style={[styles.welcomeTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
          Student Registration
        </Text>
        <Text style={[styles.welcomeSubtitle, { color: isLight ? '#475569' : '#A89F93' }]}>
          Step {currentStep} of 5: {getStepTitle()}
        </Text>

        {/* STEPPER INDICATOR HEADER */}
        {renderStepIndicator()}

        {/* ERROR BOX */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Icon name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.errorBoxText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* FORM CONTENT SCROLLVIEW */}
        <View style={styles.scrollForm}>
          <View style={styles.scrollFormContent}>

            {/* ========================================================================= */}
            {/* STEP 1: YOUR PERSONAL DETAILS */}
            {/* ========================================================================= */}
            {currentStep === 1 && (
              <View style={styles.stepSectionBox}>
                <Text style={labelStyle}>First Name *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Enter your first name"
                  placeholderTextColor={placeholderColor}
                  value={firstName}
                  onChangeText={setFirstName}
                />

                <Text style={labelStyle}>Last Name *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Enter your last name"
                  placeholderTextColor={placeholderColor}
                  value={lastName}
                  onChangeText={setLastName}
                />

                <Text style={labelStyle}>Date Of Birth *</Text>
                <View style={styles.dobThreeRow}>
                  <View style={[styles.dobBox, isLight && styles.dobBoxLight]}>
                    <TextInput
                      style={[styles.dobInput, isLight && { color: '#0F172A' }]}
                      placeholder="DD"
                      placeholderTextColor={placeholderColor}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={dobDD}
                      onChangeText={handleDobDDChange}
                    />
                  </View>
                  <View style={[styles.dobBox, isLight && styles.dobBoxLight]}>
                    <TextInput
                      style={[styles.dobInput, isLight && { color: '#0F172A' }]}
                      placeholder="MM"
                      placeholderTextColor={placeholderColor}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={dobMM}
                      onChangeText={handleDobMMChange}
                    />
                  </View>
                  <View style={[styles.dobBox, isLight && styles.dobBoxLight]}>
                    <TextInput
                      style={[styles.dobInput, isLight && { color: '#0F172A' }]}
                      placeholder="YYYY"
                      placeholderTextColor={placeholderColor}
                      keyboardType="number-pad"
                      maxLength={4}
                      value={dobYYYY}
                      onChangeText={handleDobYYYYChange}
                    />
                  </View>
                </View>

                {/* Email & OTP Row */}
                <Text style={labelStyle}>Email Address *</Text>
                <View style={styles.emailOtpWrapper}>
                  <TextInput
                    style={[styles.textInputStyle, isLight && styles.textInputLight, { flex: 1, marginBottom: 0 }]}
                    placeholder="name@example.com"
                    placeholderTextColor={placeholderColor}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(val) => handleChange('email', val)}
                    editable={!emailVerified}
                  />

                  {emailVerified ? (
                    <View style={styles.verifiedBadgeBox}>
                      <Icon name="checkmark-circle" size={18} color="#10B981" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.sendOtpBtn,
                        (sendingOtp || resendCooldown > 0) && styles.disabledBtn
                      ]}
                      onPress={handleSendOtp}
                      disabled={sendingOtp || resendCooldown > 0}
                    >
                      {sendingOtp ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.sendOtpBtnText}>
                          {resendCooldown > 0 ? `${resendCooldown}s` : 'Send OTP'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* OTP Input Form */}
                {otpSent && !emailVerified && (
                  <View style={[styles.otpCardBox, isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(255, 101, 0, 0.4)' }]}>
                    <Text style={styles.otpInstructionText}>
                      Enter the 6-digit OTP verification code sent to your email:
                    </Text>
                    <View style={styles.otpRow}>
                      <TextInput
                        style={[styles.otpInputStyle, isLight && { backgroundColor: '#FFFFFF', color: '#0F172A' }]}
                        placeholder="123456"
                        placeholderTextColor={placeholderColor}
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otpCode}
                        onChangeText={setOtpCode}
                      />
                      <TouchableOpacity
                        style={styles.verifyOtpBtn}
                        onPress={handleVerifyOtp}
                        disabled={verifyingOtp}
                      >
                        {verifyingOtp ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.verifyOtpBtnText}>Verify OTP</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}
                    {otpSuccessMsg ? <Text style={styles.otpSuccessText}>{otpSuccessMsg}</Text> : null}
                  </View>
                )}

                <Text style={labelStyle}>Mobile Number *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="0771234567 or +94771234567"
                  placeholderTextColor={placeholderColor}
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(val) => handleChange('phone', val)}
                />

                <Text style={labelStyle}>Gender *</Text>
                <TouchableOpacity
                  style={[styles.dropdownSelectTrigger, isLight && styles.dropdownSelectTriggerLight]}
                  onPress={() => setGenderModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownLeftRow}>
                    <Icon name="male-female-outline" size={18} color="#F58220" style={{ marginRight: 10 }} />
                    <Text style={[styles.dropdownSelectText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                      {formData.gender || 'Select Gender'}
                    </Text>
                  </View>
                  <Icon name="chevron-down-outline" size={18} color="#6B7280" />
                </TouchableOpacity>

                <Text style={labelStyle}>National ID Number (NIC) - Optional</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 199812345678 or 987654321V"
                  placeholderTextColor={placeholderColor}
                  value={formData.nic}
                  onChangeText={(val) => handleChange('nic', val)}
                />

                <Text style={labelStyle}>Residential Address *</Text>
                <TextInput
                  style={[styles.textInputStyle, isLight && styles.textInputLight, { height: 74, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="e.g. No. 12, Main Street, Colombo 03"
                  placeholderTextColor={placeholderColor}
                  multiline
                  value={formData.address}
                  onChangeText={(val) => handleChange('address', val)}
                />
              </View>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: PARENT & GUARDIAN INFO */}
            {/* ========================================================================= */}
            {currentStep === 2 && (
              <View style={styles.stepSectionBox}>
                <Text style={labelStyle}>Parent / Guardian Full Name *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Enter parent or guardian's name"
                  placeholderTextColor={placeholderColor}
                  value={formData.guardian_name}
                  onChangeText={(val) => handleChange('guardian_name', val)}
                />

                <Text style={labelStyle}>Relationship to Student *</Text>
                <TouchableOpacity
                  style={[styles.dropdownSelectTrigger, isLight && styles.dropdownSelectTriggerLight]}
                  onPress={() => setRelationshipModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownLeftRow}>
                    <Icon name="people-outline" size={18} color="#F58220" style={{ marginRight: 10 }} />
                    <Text style={[styles.dropdownSelectText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                      {formData.guardian_relationship || 'Select Relationship'}
                    </Text>
                  </View>
                  <Icon name="chevron-down-outline" size={18} color="#6B7280" />
                </TouchableOpacity>

                <Text style={labelStyle}>Guardian Mobile Number *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 0771234567"
                  placeholderTextColor={placeholderColor}
                  keyboardType="phone-pad"
                  value={formData.guardian_phone}
                  onChangeText={(val) => handleChange('guardian_phone', val)}
                />

                <Text style={labelStyle}>Guardian Occupation (Optional)</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. Civil Engineer, Teacher, Merchant"
                  placeholderTextColor={placeholderColor}
                  value={formData.guardian_occupation}
                  onChangeText={(val) => handleChange('guardian_occupation', val)}
                />
              </View>
            )}

            {/* ========================================================================= */}
            {/* STEP 3: EDUCATIONAL QUALIFICATIONS */}
            {/* ========================================================================= */}
            {currentStep === 3 && (
              <View style={styles.stepSectionBox}>
                <Text style={labelStyle}>Highest Education Level Attained *</Text>
                <View style={{ gap: 8, marginBottom: 12 }}>
                  {['Below O/L', 'O/L Completed', 'A/L Completed', 'Diploma / Higher Ed', 'NVQ Certified', 'Other Qualification'].map(lvl => (
                    <TouchableOpacity
                      key={lvl}
                      style={[styles.eduOptionBox, isLight && styles.eduOptionBoxLight, formData.education_level === lvl && styles.eduOptionBoxActive]}
                      onPress={() => handleChange('education_level', lvl)}
                    >
                      <Icon
                        name={formData.education_level === lvl ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={formData.education_level === lvl ? "#F58220" : "#9CA3AF"}
                      />
                      <Text style={[styles.eduOptionText, isLight && { color: '#334155' }, formData.education_level === lvl && styles.eduOptionTextActive]}>
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {formData.education_level === 'Below O/L' && (
                  <View style={{ marginTop: 2 }}>
                    <Text style={labelStyle}>Current Grade Level *</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="e.g. Grade 8, Grade 9, Grade 10"
                      placeholderTextColor={placeholderColor}
                      value={formData.grade_level}
                      onChangeText={(val) => handleChange('grade_level', val)}
                    />
                  </View>
                )}

                <Text style={labelStyle}>School or Institute Name *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. Royal College, Colombo"
                  placeholderTextColor={placeholderColor}
                  value={formData.school_name}
                  onChangeText={(val) => handleChange('school_name', val)}
                />
              </View>
            )}

            {/* ========================================================================= */}
            {/* STEP 4: STUDENT PHOTO UPLOAD */}
            {/* ========================================================================= */}
            {currentStep === 4 && (
              <View style={styles.stepSectionBox}>
                <Text style={[styles.photoInstructionsText, { color: isLight ? '#475569' : '#A89F93' }]}>
                  Please upload a clear passport-style headshot photo for your official TVTI student ID card & profile records.
                </Text>

                <TouchableOpacity
                  style={[styles.photoUploadCard, isLight && styles.photoUploadCardLight]}
                  onPress={pickStudentPhoto}
                  activeOpacity={0.8}
                >
                  {formData.student_photo ? (
                    <View style={styles.photoPreviewContainer}>
                      <Image source={{ uri: formData.student_photo }} style={styles.photoPreviewImg} />
                      <View style={styles.photoChangeBadge}>
                        <Icon name="camera" size={16} color="#FFFFFF" />
                        <Text style={styles.photoChangeText}>Change Photo</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.photoPlaceholderBox}>
                      <View style={styles.cameraIconCircle}>
                        <Icon name="camera-outline" size={32} color="#F58220" />
                      </View>
                      <Text style={[styles.uploadPromptTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                        Tap to Upload Photo
                      </Text>
                      <Text style={[styles.uploadPromptSub, { color: isLight ? '#64748B' : '#A89F93' }]}>
                        Supports PNG, JPG, JPEG up to 5MB
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ========================================================================= */}
            {/* STEP 5: COURSE & PAYMENT SELECTION */}
            {/* ========================================================================= */}
            {currentStep === 5 && (
              <View style={styles.stepSectionBox}>
                <View style={styles.coursesHeaderRow}>
                  <Text style={labelStyle}>Select Desired Courses *</Text>
                  <TouchableOpacity onPress={openCourseWebsiteLink} style={styles.syllabusLinkBtn}>
                    <Icon name="open-outline" size={14} color="#F58220" style={{ marginRight: 4 }} />
                    <Text style={styles.syllabusLinkText}>View Website Syllabus</Text>
                  </TouchableOpacity>
                </View>

                {fetchingCourses ? (
                  <ActivityIndicator size="small" color="#F58220" style={{ marginVertical: 12 }} />
                ) : courses.length > 0 ? (
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    {courses.map(course => {
                      const selected = formData.desired_courses.includes(course._id);
                      return (
                        <TouchableOpacity
                          key={course._id}
                          style={[styles.courseCheckCard, isLight && styles.courseCheckCardLight, selected && styles.courseCheckCardActive]}
                          onPress={() => toggleCourse(course._id)}
                        >
                          <Icon
                            name={selected ? "checkbox" : "square-outline"}
                            size={20}
                            color={selected ? "#F58220" : "#9CA3AF"}
                          />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.courseCheckTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                              {course.title}
                            </Text>
                            {course.code ? (
                              <Text style={[styles.courseCheckCode, { color: isLight ? '#64748B' : '#A89F93' }]}>
                                Code: {course.code}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginBottom: 16 }}>
                    Default Technical Training Diploma Course (TVTI General)
                  </Text>
                )}

                <Text style={labelStyle}>Payment Method *</Text>
                <View style={styles.paymentMethodRow}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodChip,
                      isLight && styles.paymentMethodChipLight,
                      formData.payment_method === 'bank_transfer' && styles.paymentMethodChipActive
                    ]}
                    onPress={() => handleChange('payment_method', 'bank_transfer')}
                  >
                    <Icon
                      name="card-outline"
                      size={18}
                      color={formData.payment_method === 'bank_transfer' ? '#F58220' : '#71717A'}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        isLight && { color: '#475569' },
                        formData.payment_method === 'bank_transfer' && styles.paymentMethodTextActive
                      ]}
                    >
                      Bank Slip Upload
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentMethodChip,
                      isLight && styles.paymentMethodChipLight,
                      formData.payment_method === 'physical_pay' && styles.paymentMethodChipActive
                    ]}
                    onPress={() => handleChange('payment_method', 'physical_pay')}
                  >
                    <Icon
                      name="cash-outline"
                      size={18}
                      color={formData.payment_method === 'physical_pay' ? '#F58220' : '#71717A'}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        isLight && { color: '#475569' },
                        formData.payment_method === 'physical_pay' && styles.paymentMethodTextActive
                      ]}
                    >
                      Physical Cash Payment
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Bank Slip Upload Box */}
                {formData.payment_method === 'bank_transfer' && (
                  <View style={styles.slipUploadSection}>
                    <Text style={labelStyle}>Upload Bank Deposit Receipt Photo *</Text>
                    <TouchableOpacity style={[styles.slipUploadBox, isLight && styles.slipUploadBoxLight]} onPress={pickPaymentSlip}>
                      {formData.payment_slip ? (
                        <View style={styles.slipPreviewBox}>
                          <Image source={{ uri: formData.payment_slip }} style={styles.slipPreviewImg} />
                          <View style={styles.slipChangeBadge}>
                            <Icon name="camera" size={14} color="#FFF" />
                            <Text style={styles.slipChangeText}>Change Receipt</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.slipPlaceholderBox}>
                          <Icon name="cloud-upload-outline" size={26} color="#F58220" />
                          <Text style={[styles.slipPlaceholderTitle, { color: isLight ? '#64748B' : '#A89F93' }]}>
                            Tap to Upload Bank Receipt
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Terms Agreement Checkbox */}
                <TouchableOpacity
                  style={styles.termsAgreementRow}
                  onPress={() => setAgreedToTerms(v => !v)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.customCheckbox, agreedToTerms && styles.customCheckboxChecked]}>
                    {agreedToTerms ? <Icon name="checkmark" size={14} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={[styles.termsAgreementText, { color: isLight ? '#475569' : '#C5BCB3' }]}>
                    I agree to the{' '}
                    <Text style={styles.termsLinkBold} onPress={() => setTermsModalVisible(true)}>
                      Terms & Conditions
                    </Text>{' '}
                    and confirm all provided information is accurate.
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ========================================================================= */}
        {/* BOTTOM STEP NAVIGATION BUTTONS (EXACT MATCH TO DESIGN SCREENSHOT) */}
        {/* ========================================================================= */}
        <View style={[styles.bottomBarContainer, isLight && { borderTopColor: '#E2E8F0' }]}>
          {/* PREV BUTTON */}
          {currentStep > 1 ? (
            <TouchableOpacity
              style={[styles.prevBtnOutline, isLight && { backgroundColor: '#FFFFFF', borderColor: '#F58220' }]}
              onPress={handlePrevStep}
              activeOpacity={0.8}
            >
              <Icon name="chevron-back" size={18} color="#F58220" style={{ marginRight: 4 }} />
              <Text style={styles.prevBtnText}>Prev</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {/* NEXT / SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.nextBtnSolid, loading && styles.disabledBtn]}
            onPress={handleNextStep}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {currentStep === 5 ? 'Submit Application' : 'Next'}
                </Text>
                <Icon name="chevron-forward" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isLight ? '#64748B' : '#8E8276' }]}>Already have an account? </Text>
          <TouchableOpacity onPress={handleBackToLogin}>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isLight && styles.containerLight]} edges={['top', 'bottom']}>
      {/* Top Bar Floating Theme Toggle */}
      <View style={[styles.topBarContainer, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeToggleButton, isLight && styles.themeToggleButtonLight]}
          activeOpacity={0.8}
        >
          <Icon
            name={isLight ? 'moon-outline' : 'sunny-outline'}
            size={17}
            color={isLight ? '#334155' : '#F59E0B'}
          />
          <Text style={[styles.themeToggleText, { color: isLight ? '#1E293B' : '#F1F5F9' }]}>
            {isLight ? 'Dark Mode' : 'Light Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* TVTI Campus Building Background Image */}
      <Image
        source={
          isLight
            ? require('../../../assets/backgroundlight.jpeg')
            : require('../../../assets/background.jpeg')
        }
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === 'web' && ({
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            zIndex: -2,
            objectFit: 'cover',
            objectPosition: 'center',
          } as any),
        ]}
        resizeMode="cover"
      />

      {/* Atmospheric Overlays */}
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              position: 'fixed',
              width: '100vw',
              height: '100vh',
              zIndex: -1,
              pointerEvents: 'none',
              background: isLight
                ? (isDesktop
                  ? 'radial-gradient(ellipse at 50% 45%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.28) 55%, rgba(255, 255, 255, 0.42) 88%), linear-gradient(to right, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.16) 48%, rgba(255, 255, 255, 0.34) 100%)'
                  : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.36) 0%, rgba(255, 255, 255, 0.16) 45%, rgba(255, 255, 255, 0.40) 100%)')
                : (isDesktop
                  ? 'radial-gradient(circle at 86% 8%, rgba(249, 115, 22, 0.18) 0%, rgba(249, 115, 22, 0.05) 35%, transparent 60%), linear-gradient(to right, rgba(15, 23, 42, 0.94) 0%, rgba(20, 28, 44, 0.88) 46%, rgba(10, 15, 26, 0.97) 100%)'
                  : 'linear-gradient(to bottom, rgba(15, 23, 42, 0.95) 0%, rgba(20, 28, 44, 0.90) 50%, rgba(10, 15, 26, 0.98) 100%)'),
            } as any,
          ]}
        />
      ) : (
        <LinearGradient
          colors={
            isLight
              ? ['rgba(255, 255, 255, 0.36)', 'rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.40)']
              : ['rgba(15, 23, 42, 0.95)', 'rgba(20, 28, 44, 0.90)', 'rgba(10, 15, 26, 0.98)']
          }
          style={StyleSheet.absoluteFill}
        />
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={isDesktop ? styles.desktopScrollContent : styles.mobileScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isDesktop ? (
            /* =================== DESKTOP 2-COLUMN VIEW =================== */
            <View style={styles.desktopContainer}>
              {/* Left Column: TVTI Branding, Hero Typography & 3D Clay Illustration */}
              <View style={styles.desktopLeftCol}>
                <View style={styles.desktopBrandRow}>
                  <Image
                    source={require('../../../assets/logo.png')}
                    style={styles.desktopLogo}
                    resizeMode="contain"
                  />
                  <View style={{ marginLeft: 14 }}>
                    <Text style={[styles.desktopBrandTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                      Twintec VTI
                    </Text>
                    <Text style={[styles.desktopBrandSub, { color: isLight ? '#475569' : '#A89F93' }]}>
                      Learning Management System
                    </Text>
                  </View>
                </View>

                <View style={styles.heroTextContainer}>
                  <Text style={[styles.heroLearnText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                    Learn
                  </Text>
                  <Text style={styles.heroHighlightText}>Build Your Skills</Text>
                  <Text style={styles.heroHighlightText}>Shape Your Future</Text>
                  <Text style={[styles.heroSubDescription, { color: isLight ? '#475569' : '#C5BCB3' }]}>
                    Twintec VTI Learning Management System{'\n'}Your journey towards a brighter future starts here.
                  </Text>
                </View>

                {/* Floating 3D Artwork */}
                <View style={styles.heroImageWrapper}>
                  <Image
                    source={require('../../../assets/login_hero_clay.png')}
                    style={styles.heroImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Right Column: Glassmorphism Register Card */}
              <View style={styles.desktopRightCol}>
                {renderRegisterCard()}
              </View>
            </View>
          ) : (
            /* =================== MOBILE 1-COLUMN VIEW =================== */
            <View style={styles.mobileContainer}>
              <View style={[styles.mobileHeader, { paddingTop: Math.max(insets.top, 24) }]}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={styles.mobileLogo}
                  resizeMode="contain"
                />
                <Text style={[styles.brandTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  Twintec VTI
                </Text>
                <Text style={[styles.brandSubtitle, { color: isLight ? '#475569' : '#A89F93' }]}>
                  Learning Management System
                </Text>
              </View>

              <View style={styles.mobileCardWrapper}>
                {renderRegisterCard()}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ========================================================================= */}
      {/* TERMS & CONDITIONS MODAL */}
      {/* ========================================================================= */}
      <Modal visible={termsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayDark}>
          <View style={[styles.termsModalCard, isLight && styles.termsModalCardLight]}>
            <View style={styles.termsModalHeader}>
              <Text style={[styles.termsModalTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                <Icon name="close" size={22} color={isLight ? '#0F172A' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350, marginVertical: 10 }}>
              <Text style={[styles.termsModalBodyText, { color: isLight ? '#334155' : '#C5BCB3' }]}>
                1. Acceptance of Terms: By submitting an application to TVTI, you agree to abide by all rules, regulations, and institutional policies.{'\n\n'}
                2. Application Review: All student applications are reviewed by TVTI Administrators. Registration details and credentials will be issued upon official approval.{'\n\n'}
                3. Course Fees & Payments: Payment confirmation or deposit slip receipts must be uploaded or settled physically at the TVTI counter prior to course commencement.{'\n\n'}
                4. Data Privacy: Your personal and educational details are securely maintained in accordance with institutional data protection guidelines.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.termsCloseBtn}
              onPress={() => {
                setAgreedToTerms(true);
                setTermsModalVisible(false);
              }}
            >
              <Text style={styles.termsCloseBtnText}>I Agree & Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* SUCCESS CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal visible={successModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayDark}>
          <View style={[styles.successModalCard, isLight && styles.successModalCardLight]}>
            <View style={styles.successIconCircle}>
              <Icon name="checkmark-circle" size={48} color="#16A34A" />
            </View>
            <Text style={[styles.successTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>Application Submitted!</Text>
            <Text style={[styles.successMessage, { color: isLight ? '#475569' : '#C5BCB3' }]}>
              Your registration application has been received and is now PENDING REVIEW by TVTI Administrators.
              {'\n\n'}
              Once approved, your unique Student Registration Number and login credentials will be delivered to your registered email address ({formData.email}).
            </Text>
            <TouchableOpacity style={styles.successBtn} onPress={handleGoToLogin}>
              <Text style={styles.successBtnText}>Go to Login Screen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* GENDER SELECTION DROPDOWN MODAL */}
      {/* ========================================================================= */}
      <Modal visible={genderModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity
          style={styles.modalOverlayDark}
          activeOpacity={1}
          onPress={() => setGenderModalVisible(false)}
        >
          <View style={[styles.dropdownModalCard, isLight && styles.dropdownModalCardLight]}>
            <View style={styles.dropdownModalHeader}>
              <Text style={[styles.dropdownModalTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>Select Gender</Text>
              <TouchableOpacity onPress={() => setGenderModalVisible(false)}>
                <Icon name="close" size={22} color={isLight ? '#0F172A' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>
            <View style={styles.dropdownOptionList}>
              {['Male', 'Female', 'Other'].map(opt => {
                const selected = formData.gender === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownOptionItem, isLight && styles.dropdownOptionItemLight, selected && styles.dropdownOptionItemActive]}
                    onPress={() => {
                      handleChange('gender', opt);
                      setGenderModalVisible(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionLabel, isLight && !selected && { color: '#0F172A' }, selected && styles.dropdownOptionLabelActive]}>
                      {opt}
                    </Text>
                    {selected && <Icon name="checkmark-circle" size={20} color="#F58220" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* RELATIONSHIP SELECTION DROPDOWN MODAL */}
      {/* ========================================================================= */}
      <Modal visible={relationshipModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity
          style={styles.modalOverlayDark}
          activeOpacity={1}
          onPress={() => setRelationshipModalVisible(false)}
        >
          <View style={[styles.dropdownModalCard, isLight && styles.dropdownModalCardLight]}>
            <View style={styles.dropdownModalHeader}>
              <Text style={[styles.dropdownModalTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>Select Relationship to Student</Text>
              <TouchableOpacity onPress={() => setRelationshipModalVisible(false)}>
                <Icon name="close" size={22} color={isLight ? '#0F172A' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>
            <View style={styles.dropdownOptionList}>
              {['Father', 'Mother', 'Legal Guardian', 'Other'].map(opt => {
                const selected = formData.guardian_relationship === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownOptionItem, isLight && styles.dropdownOptionItemLight, selected && styles.dropdownOptionItemActive]}
                    onPress={() => {
                      handleChange('guardian_relationship', opt);
                      setRelationshipModalVisible(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionLabel, isLight && !selected && { color: '#0F172A' }, selected && styles.dropdownOptionLabelActive]}>
                      {opt}
                    </Text>
                    {selected && <Icon name="checkmark-circle" size={20} color="#F58220" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  containerLight: {
    backgroundColor: '#F8FAFC',
  },

  /* ---------- Top Bar / Floating Theme Toggle ---------- */
  topBarContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  themeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    ...(Platform.OS === 'web'
      ? ({
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        cursor: 'pointer',
      } as any)
      : {}),
  },
  themeToggleButtonLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  themeToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginLeft: 6,
  },

  /* ---------- Mobile Layout Styles ---------- */
  mobileScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  mobileContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  mobileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mobileLogo: {
    width: 72,
    height: 72,
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 23,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#A89F93',
    fontWeight: '400',
    marginTop: 3,
  },
  mobileCardWrapper: {
    width: '100%',
  },

  /* ---------- Desktop Layout Styles ---------- */
  desktopScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 32,
  },
  desktopContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 1200,
    gap: 48,
  },
  desktopLeftCol: {
    flex: 1,
    maxWidth: 500,
  },
  desktopBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  desktopLogo: {
    width: 60,
    height: 60,
  },
  desktopBrandTitle: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  desktopBrandSub: {
    fontSize: 13,
    color: '#A89F93',
    fontWeight: '400',
    marginTop: 2,
  },
  heroTextContainer: {
    marginBottom: 20,
  },
  heroLearnText: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -0.3,
  },
  heroHighlightText: {
    fontSize: 36,
    color: '#FF6500',
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -0.3,
  },
  heroSubDescription: {
    fontSize: 14,
    color: '#C5BCB3',
    lineHeight: 22,
    marginTop: 14,
  },
  heroImageWrapper: {
    width: '100%',
    maxWidth: 420,
    height: 260,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 8,
    ...(Platform.OS === 'web'
      ? ({
        WebkitMaskImage: 'radial-gradient(ellipse 75% 72% at 50% 50%, black 50%, transparent 88%)',
        maskImage: 'radial-gradient(ellipse 75% 72% at 50% 50%, black 50%, transparent 88%)',
      } as any)
      : {}),
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  desktopRightCol: {
    flex: 1.25,
    maxWidth: 620,
    width: '100%',
  },
  desktopCard: {
    paddingVertical: 32,
    paddingHorizontal: 32,
  },
  desktopCardLight: {
    paddingVertical: 32,
    paddingHorizontal: 32,
  },
  desktopCardDark: {
    paddingVertical: 32,
    paddingHorizontal: 32,
  },

  /* ---------- Card Component Styles ---------- */
  card: {
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    elevation: 8,
  },
  cardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.80,
    shadowRadius: 30,
    elevation: 6,
    ...(Platform.OS === 'web'
      ? ({
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.10), 0 0 1px 1px rgba(255, 255, 255, 0.9)',
      } as any)
      : {}),
  },
  cardDark: {
    backgroundColor: 'rgba(20, 27, 38, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.80,
    shadowRadius: 24,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' } as any)
      : {}),
  },
  textInputLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    color: '#0F172A',
  },
  dobBoxLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  dropdownSelectTriggerLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  genderOptionChipLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  eduOptionBoxLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  photoUploadCardLight: {
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
    borderColor: '#CBD5E1',
  },
  courseCheckCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  paymentMethodChipLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  slipUploadBoxLight: {
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
    borderColor: '#CBD5E1',
  },
  termsModalCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  dropdownModalCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  dropdownOptionItemLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  successModalCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#FF6500',
    fontSize: 13,
    fontWeight: '600',
  },
  welcomeTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13.5,
    color: '#A89F93',
    lineHeight: 20,
    marginBottom: 20,
  },

  /* STEPPER INDICATOR HEADER */
  stepperContainer: {
    marginBottom: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  stepperLineBackground: {
    position: 'absolute',
    top: 15,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 1,
  },
  stepperLineProgress: {
    height: '100%',
    backgroundColor: '#FF6500',
  },
  stepperCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 2,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(20, 15, 11, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: '#FF6500',
    borderColor: '#FF6500',
  },
  stepCircleActive: {
    backgroundColor: '#FF6500',
    borderColor: '#FF6500',
  },
  stepCircleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#A89F93',
  },
  stepCircleTextActive: {
    color: '#FFFFFF',
  },

  /* ERROR BOX */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  errorBoxText: {
    flex: 1,
    color: '#F87171',
    fontSize: 13,
    lineHeight: 19,
  },

  /* SCROLL FORM CONTENT */
  scrollForm: {
    width: '100%',
  },
  scrollFormContent: {
    paddingBottom: 16,
  },
  stepSectionBox: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#D4CAC0',
    marginBottom: -4,
    marginTop: 6,
  },
  textInputStyle: {
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    borderWidth: 1.1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    color: '#FFFFFF',
  },

  /* DOB THREE INPUT ROW */
  dobThreeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dobBox: {
    flex: 1,
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    borderWidth: 1.1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dobInput: {
    width: '100%',
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* EMAIL OTP WRAPPER */
  emailOtpWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendOtpBtn: {
    backgroundColor: '#FF5E14',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendOtpBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  verifiedBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  otpCardBox: {
    backgroundColor: 'rgba(35, 25, 18, 0.65)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 101, 0, 0.3)',
    marginTop: 4,
  },
  otpInstructionText: {
    fontSize: 12,
    color: '#FF8C38',
    fontWeight: '600',
    marginBottom: 8,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  otpInputStyle: {
    flex: 1,
    // Allows the input to shrink on narrow mobile screens so the button stays
    // inside the centered OTP card instead of overflowing to the right.
    minWidth: 0,
    backgroundColor: 'rgba(16, 11, 7, 0.7)',
    borderWidth: 1,
    borderColor: '#FF6500',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
    color: '#FFFFFF',
  },
  verifyOtpBtn: {
    backgroundColor: '#FF5E14',
    paddingHorizontal: 14,
    minHeight: 42,
    borderRadius: 8,
    justifyContent: 'center',
  },
  verifyOtpBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  otpErrorText: {
    fontSize: 12,
    color: '#F87171',
    marginTop: 6,
  },
  otpSuccessText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 6,
  },

  /* GENDER SELECT CHIPS */
  genderSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOptionChip: {
    flex: 1,
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
  },
  genderOptionChipActive: {
    backgroundColor: 'rgba(255, 101, 0, 0.15)',
    borderColor: '#FF6500',
  },
  genderOptionText: {
    fontSize: 13,
    color: '#D4CAC0',
    fontWeight: '600',
  },
  genderOptionTextActive: {
    color: '#FF6500',
    fontWeight: '800',
  },

  /* EDU OPTIONS */
  eduOptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    padding: 12,
    borderRadius: 10,
  },
  eduOptionBoxActive: {
    borderColor: '#FF6500',
    backgroundColor: 'rgba(255, 101, 0, 0.15)',
  },
  eduOptionText: {
    fontSize: 13.5,
    color: '#D4CAC0',
    marginLeft: 10,
    fontWeight: '600',
  },
  eduOptionTextActive: {
    color: '#FF6500',
    fontWeight: '700',
  },

  /* PHOTO UPLOAD */
  photoInstructionsText: {
    fontSize: 13,
    color: '#A89F93',
    lineHeight: 18,
    marginBottom: 10,
  },
  photoUploadCard: {
    height: 200,
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPlaceholderBox: {
    alignItems: 'center',
  },
  cameraIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 101, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadPromptTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadPromptSub: {
    fontSize: 12,
    color: '#A89F93',
    marginTop: 2,
  },
  photoPreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photoPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoChangeBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(16, 11, 7, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  photoChangeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },

  /* COURSE CHECKBOX CARDS */
  coursesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syllabusLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syllabusLinkText: {
    fontSize: 12,
    color: '#FF6500',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  courseCheckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    padding: 12,
    borderRadius: 10,
  },
  courseCheckCardActive: {
    borderColor: '#FF6500',
    backgroundColor: 'rgba(255, 101, 0, 0.15)',
  },
  courseCheckTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  courseCheckCode: {
    fontSize: 11.5,
    color: '#A89F93',
    marginTop: 2,
  },

  /* PAYMENT METHOD CHIPS */
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentMethodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    paddingVertical: 12,
    borderRadius: 10,
  },
  paymentMethodChipActive: {
    borderColor: '#FF6500',
    backgroundColor: 'rgba(255, 101, 0, 0.15)',
  },
  paymentMethodText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#D4CAC0',
    marginLeft: 6,
  },
  paymentMethodTextActive: {
    color: '#FF6500',
    fontWeight: '800',
  },

  /* SLIP UPLOAD */
  slipUploadSection: {
    marginTop: 8,
  },
  slipUploadBox: {
    height: 130,
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 6,
  },
  slipPlaceholderBox: {
    alignItems: 'center',
  },
  slipPlaceholderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A89F93',
    marginTop: 6,
  },
  slipPreviewBox: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  slipPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  slipChangeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(16, 11, 7, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  slipChangeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },

  /* TERMS AGREEMENT */
  termsAgreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  customCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FF6500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  customCheckboxChecked: {
    backgroundColor: '#FF6500',
  },
  termsAgreementText: {
    fontSize: 12.5,
    color: '#C5BCB3',
    lineHeight: 18,
    flex: 1,
  },
  termsLinkBold: {
    color: '#FF6500',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* BOTTOM NAVIGATION BAR */
  bottomBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
    gap: 12,
    marginTop: 8,
  },
  prevBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#FF6500',
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6500',
  },
  nextBtnSolid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FF5E14',
    shadowColor: '#FF5E14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    color: '#8E8276',
    fontSize: 13.5,
  },
  link: {
    color: '#FF6500',
    fontSize: 13.5,
    fontWeight: '700',
  },

  /* MODALS */
  modalOverlayDark: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  termsModalCard: {
    backgroundColor: '#1E1712',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  termsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  termsModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  termsModalBodyText: {
    fontSize: 13,
    color: '#C5BCB3',
    lineHeight: 20,
  },
  termsCloseBtn: {
    backgroundColor: '#FF5E14',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  termsCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  successModalCard: {
    backgroundColor: '#1E1712',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  successIconCircle: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 13.5,
    color: '#C5BCB3',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  successBtn: {
    width: '100%',
    backgroundColor: '#FF5E14',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  successBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  /* DROPDOWN SELECT TRIGGER */
  dropdownSelectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    borderWidth: 1.1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* DROPDOWN MODAL */
  dropdownModalCard: {
    backgroundColor: '#1E1712',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 12,
  },
  dropdownModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dropdownOptionList: {
    gap: 8,
  },
  dropdownOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 11, 7, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dropdownOptionItemActive: {
    backgroundColor: 'rgba(255, 101, 0, 0.15)',
    borderColor: '#FF6500',
  },
  dropdownOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dropdownOptionLabelActive: {
    color: '#FF6500',
    fontWeight: '800',
  },
});
