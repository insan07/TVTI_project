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
  Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

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

  const renderStepIndicator = () => {
    const totalSteps = 5;
    return (
      <View style={styles.stepperContainer}>
        {/* Progress Line */}
        <View style={styles.stepperLineBackground}>
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* DARK NAVY TOP BACKGROUND GRADIENT MATCHING SCREENSHOT */}
      <View style={[styles.topGradientBackground, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBrandRow}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.brandLogoImg}
            resizeMode="contain"
          />
          <Text style={styles.topBrandTitleText}>TVTI Student Portal</Text>
        </View>
      </View>

      {/* MAIN WHITE CARD CONTAINER WITH ROUNDED TOP */}
      <KeyboardAvoidingView
        style={styles.mainCardWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.whiteCardContainer}>
          {/* STEPPER INDICATOR HEADER */}
          {renderStepIndicator()}

          {/* STEP TITLE */}
          <Text style={styles.stepTitleHeading}>{getStepTitle()}</Text>

          {/* ERROR BOX */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* FORM CONTENT SCROLLVIEW */}
          <ScrollView
            style={styles.scrollForm}
            contentContainerStyle={styles.scrollFormContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ========================================================================= */}
            {/* STEP 1: YOUR PERSONAL DETAILS */}
            {/* ========================================================================= */}
            {currentStep === 1 && (
              <View style={styles.stepSectionBox}>
                <Text style={styles.fieldLabel}>First Name *</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="Enter your first name"
                  placeholderTextColor="#9CA3AF"
                  value={firstName}
                  onChangeText={setFirstName}
                />

                <Text style={styles.fieldLabel}>Last Name *</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="Enter your last name"
                  placeholderTextColor="#9CA3AF"
                  value={lastName}
                  onChangeText={setLastName}
                />

                <Text style={styles.fieldLabel}>Date Of Birth *</Text>
                <View style={styles.dobThreeRow}>
                  <View style={styles.dobBox}>
                    <TextInput
                      style={styles.dobInput}
                      placeholder="DD"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={2}
                      value={dobDD}
                      onChangeText={handleDobDDChange}
                    />
                  </View>
                  <View style={styles.dobBox}>
                    <TextInput
                      style={styles.dobInput}
                      placeholder="MM"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={2}
                      value={dobMM}
                      onChangeText={handleDobMMChange}
                    />
                  </View>
                  <View style={styles.dobBox}>
                    <TextInput
                      style={styles.dobInput}
                      placeholder="YYYY"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={4}
                      value={dobYYYY}
                      onChangeText={handleDobYYYYChange}
                    />
                  </View>
                </View>

                {/* Email & OTP Row */}
                <Text style={styles.fieldLabel}>Email Address *</Text>
                <View style={styles.emailOtpWrapper}>
                  <TextInput
                    style={[styles.textInputStyle, { flex: 1, marginBottom: 0 }]}
                    placeholder="name@example.com"
                    placeholderTextColor="#9CA3AF"
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
                  <View style={styles.otpCardBox}>
                    <Text style={styles.otpInstructionText}>
                      Enter the 6-digit OTP verification code sent to your email:
                    </Text>
                    <View style={styles.otpRow}>
                      <TextInput
                        style={styles.otpInputStyle}
                        placeholder="123456"
                        placeholderTextColor="#9CA3AF"
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

                <Text style={styles.fieldLabel}>Mobile Number *</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="0771234567 or +94771234567"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(val) => handleChange('phone', val)}
                />

                <Text style={styles.fieldLabel}>Gender *</Text>
                <TouchableOpacity
                  style={styles.dropdownSelectTrigger}
                  onPress={() => setGenderModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownLeftRow}>
                    <Icon name="male-female-outline" size={18} color="#F58220" style={{ marginRight: 10 }} />
                    <Text style={styles.dropdownSelectText}>{formData.gender || 'Select Gender'}</Text>
                  </View>
                  <Icon name="chevron-down-outline" size={18} color="#6B7280" />
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>National ID Number (NIC) - Optional</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="e.g. 199812345678 or 987654321V"
                  placeholderTextColor="#9CA3AF"
                  value={formData.nic}
                  onChangeText={(val) => handleChange('nic', val)}
                />

                <Text style={styles.fieldLabel}>Residential Address *</Text>
                <TextInput
                  style={[styles.textInputStyle, { height: 74, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="e.g. No. 12, Main Street, Colombo 03"
                  placeholderTextColor="#9CA3AF"
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
                <Text style={styles.fieldLabel}>Parent / Guardian Full Name *</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="Enter parent or guardian's name"
                  placeholderTextColor="#9CA3AF"
                  value={formData.guardian_name}
                  onChangeText={(val) => handleChange('guardian_name', val)}
                />

                <Text style={styles.fieldLabel}>Relationship to Student *</Text>
                <TouchableOpacity
                  style={styles.dropdownSelectTrigger}
                  onPress={() => setRelationshipModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownLeftRow}>
                    <Icon name="people-outline" size={18} color="#F58220" style={{ marginRight: 10 }} />
                    <Text style={styles.dropdownSelectText}>{formData.guardian_relationship || 'Select Relationship'}</Text>
                  </View>
                  <Icon name="chevron-down-outline" size={18} color="#6B7280" />
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Guardian Mobile Number *</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="e.g. 0771234567"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={formData.guardian_phone}
                  onChangeText={(val) => handleChange('guardian_phone', val)}
                />

                <Text style={styles.fieldLabel}>Guardian Occupation (Optional)</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="e.g. Civil Engineer, Teacher, Merchant"
                  placeholderTextColor="#9CA3AF"
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
                <Text style={styles.fieldLabel}>Highest Education Level Attained *</Text>
                <View style={{ gap: 8, marginBottom: 12 }}>
                  {['Below O/L', 'O/L Completed', 'A/L Completed', 'Diploma / Higher Ed', 'NVQ Certified', 'Other Qualification'].map(lvl => (
                    <TouchableOpacity
                      key={lvl}
                      style={[styles.eduOptionBox, formData.education_level === lvl && styles.eduOptionBoxActive]}
                      onPress={() => handleChange('education_level', lvl)}
                    >
                      <Icon
                        name={formData.education_level === lvl ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={formData.education_level === lvl ? "#F58220" : "#9CA3AF"}
                      />
                      <Text style={[styles.eduOptionText, formData.education_level === lvl && styles.eduOptionTextActive]}>
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {formData.education_level === 'Below O/L' && (
                  <View style={{ marginTop: 2 }}>
                    <Text style={styles.fieldLabel}>Current Grade Level *</Text>
                    <TextInput
                      style={styles.textInputStyle}
                      placeholder="e.g. Grade 8, Grade 9, Grade 10"
                      placeholderTextColor="#9CA3AF"
                      value={formData.grade_level}
                      onChangeText={(val) => handleChange('grade_level', val)}
                    />
                  </View>
                )}

                <Text style={styles.fieldLabel}>School or Institute Name *</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="e.g. Royal College, Colombo"
                  placeholderTextColor="#9CA3AF"
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
                <Text style={styles.photoInstructionsText}>
                  Please upload a clear passport-style headshot photo for your official TVTI student ID card & profile records.
                </Text>

                <TouchableOpacity
                  style={styles.photoUploadCard}
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
                      <Text style={styles.uploadPromptTitle}>Tap to Upload Photo</Text>
                      <Text style={styles.uploadPromptSub}>Supports PNG, JPG, JPEG up to 5MB</Text>
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
                  <Text style={styles.fieldLabel}>Select Desired Courses *</Text>
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
                          style={[styles.courseCheckCard, selected && styles.courseCheckCardActive]}
                          onPress={() => toggleCourse(course._id)}
                        >
                          <Icon
                            name={selected ? "checkbox" : "square-outline"}
                            size={20}
                            color={selected ? "#F58220" : "#9CA3AF"}
                          />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.courseCheckTitle}>{course.title}</Text>
                            {course.code ? <Text style={styles.courseCheckCode}>Code: {course.code}</Text> : null}
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

                <Text style={styles.fieldLabel}>Payment Method *</Text>
                <View style={styles.paymentMethodRow}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodChip,
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
                        formData.payment_method === 'bank_transfer' && styles.paymentMethodTextActive
                      ]}
                    >
                      Bank Slip Upload
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentMethodChip,
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
                    <Text style={styles.fieldLabel}>Upload Bank Deposit Receipt Photo *</Text>
                    <TouchableOpacity style={styles.slipUploadBox} onPress={pickPaymentSlip}>
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
                          <Text style={styles.slipPlaceholderTitle}>Tap to Upload Bank Receipt</Text>
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
                  <Text style={styles.termsAgreementText}>
                    I agree to the{' '}
                    <Text style={styles.termsLinkBold} onPress={() => setTermsModalVisible(true)}>
                      Terms & Conditions
                    </Text>{' '}
                    and confirm all provided information is accurate.
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* ========================================================================= */}
          {/* BOTTOM STEP NAVIGATION BUTTONS (EXACT MATCH TO DESIGN SCREENSHOT) */}
          {/* ========================================================================= */}
          <View style={styles.bottomBarContainer}>
            {/* PREV BUTTON */}
            {currentStep > 1 ? (
              <TouchableOpacity
                style={styles.prevBtnOutline}
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
        </View>
      </KeyboardAvoidingView>

      {/* ========================================================================= */}
      {/* TERMS & CONDITIONS MODAL */}
      {/* ========================================================================= */}
      <Modal visible={termsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.termsModalCard}>
            <View style={styles.termsModalHeader}>
              <Text style={styles.termsModalTitle}>Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                <Icon name="close" size={22} color="#18181B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350, marginVertical: 10 }}>
              <Text style={styles.termsModalBodyText}>
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
      {/* SUCCESS CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal visible={successModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Icon name="checkmark-circle" size={48} color="#16A34A" />
            </View>
            <Text style={styles.successTitle}>Application Submitted!</Text>
            <Text style={styles.successMessage}>
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
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Select Gender</Text>
              <TouchableOpacity onPress={() => setGenderModalVisible(false)}>
                <Icon name="close" size={22} color="#18181B" />
              </TouchableOpacity>
            </View>
            <View style={styles.dropdownOptionList}>
              {['Male', 'Female', 'Other'].map(opt => {
                const selected = formData.gender === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownOptionItem, selected && styles.dropdownOptionItemActive]}
                    onPress={() => {
                      handleChange('gender', opt);
                      setGenderModalVisible(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionLabel, selected && styles.dropdownOptionLabelActive]}>
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
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Select Relationship to Student</Text>
              <TouchableOpacity onPress={() => setRelationshipModalVisible(false)}>
                <Icon name="close" size={22} color="#18181B" />
              </TouchableOpacity>
            </View>
            <View style={styles.dropdownOptionList}>
              {['Father', 'Mother', 'Legal Guardian', 'Other'].map(opt => {
                const selected = formData.guardian_relationship === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownOptionItem, selected && styles.dropdownOptionItemActive]}
                    onPress={() => {
                      handleChange('guardian_relationship', opt);
                      setRelationshipModalVisible(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionLabel, selected && styles.dropdownOptionLabelActive]}>
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
    backgroundColor: '#1E253B',
  },
  topGradientBackground: {
    backgroundColor: '#1E253B',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoImg: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  topBrandTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* MAIN WHITE CARD CONTAINER */
  mainCardWrapper: {
    flex: 1,
  },
  whiteCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    overflow: 'hidden',
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
    top: 16,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#E5E7EB',
    zIndex: 1,
  },
  stepperLineProgress: {
    height: '100%',
    backgroundColor: '#F58220',
  },
  stepperCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 2,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  stepCircleActive: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  stepCircleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  stepCircleTextActive: {
    color: '#FFFFFF',
  },

  /* STEP TITLE HEADING */
  stepTitleHeading: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1E253B',
    textAlign: 'center',
    marginBottom: 16,
  },

  /* ERROR BANNER */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
    fontWeight: '600',
  },

  /* SCROLL FORM CONTENT */
  scrollForm: {
    flex: 1,
  },
  scrollFormContent: {
    paddingBottom: 20,
  },
  stepSectionBox: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: -4,
    marginTop: 6,
  },
  textInputStyle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1E253B',
  },

  /* DOB THREE INPUT ROW */
  dobThreeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dobBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dobInput: {
    width: '100%',
    paddingVertical: 11,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#1E253B',
  },

  /* EMAIL OTP WRAPPER */
  emailOtpWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendOtpBtn: {
    backgroundColor: '#F58220',
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
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  otpCardBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginTop: 4,
  },
  otpInstructionText: {
    fontSize: 12,
    color: '#C2410C',
    fontWeight: '600',
    marginBottom: 8,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
  },
  otpInputStyle: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F58220',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
  },
  verifyOtpBtn: {
    backgroundColor: '#F58220',
    paddingHorizontal: 14,
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
    color: '#DC2626',
    marginTop: 6,
  },
  otpSuccessText: {
    fontSize: 12,
    color: '#059669',
    marginTop: 6,
  },

  /* GENDER SELECT CHIPS */
  genderSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOptionChip: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  genderOptionChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F58220',
  },
  genderOptionText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  genderOptionTextActive: {
    color: '#F58220',
    fontWeight: '800',
  },

  /* EDU OPTIONS */
  eduOptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    borderRadius: 10,
  },
  eduOptionBoxActive: {
    borderColor: '#F58220',
    backgroundColor: '#FFF7ED',
  },
  eduOptionText: {
    fontSize: 13.5,
    color: '#374151',
    marginLeft: 10,
    fontWeight: '600',
  },
  eduOptionTextActive: {
    color: '#F58220',
    fontWeight: '700',
  },

  /* PHOTO UPLOAD */
  photoInstructionsText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 10,
  },
  photoUploadCard: {
    height: 220,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPlaceholderBox: {
    alignItems: 'center',
  },
  cameraIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadPromptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E253B',
  },
  uploadPromptSub: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: 'rgba(30, 37, 59, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
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
    color: '#F58220',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  courseCheckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    borderRadius: 10,
  },
  courseCheckCardActive: {
    borderColor: '#F58220',
    backgroundColor: '#FFF7ED',
  },
  courseCheckTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E253B',
  },
  courseCheckCode: {
    fontSize: 11.5,
    color: '#6B7280',
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 10,
  },
  paymentMethodChipActive: {
    borderColor: '#F58220',
    backgroundColor: '#FFF7ED',
  },
  paymentMethodText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 6,
  },
  paymentMethodTextActive: {
    color: '#F58220',
    fontWeight: '800',
  },

  /* SLIP UPLOAD */
  slipUploadSection: {
    marginTop: 8,
  },
  slipUploadBox: {
    height: 140,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
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
    fontWeight: '700',
    color: '#6B7280',
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
    backgroundColor: 'rgba(30, 37, 59, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
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
    borderWidth: 2,
    borderColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  customCheckboxChecked: {
    backgroundColor: '#F58220',
  },
  termsAgreementText: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 18,
    flex: 1,
  },
  termsLinkBold: {
    color: '#F58220',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* BOTTOM NAVIGATION BAR */
  bottomBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  prevBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: '#F58220',
    backgroundColor: '#FFFFFF',
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F58220',
  },
  nextBtnSolid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F58220',
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  disabledBtn: {
    opacity: 0.6,
  },

  /* MODALS */
  modalOverlayDark: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  termsModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 440,
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
    color: '#1E253B',
  },
  termsModalBodyText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  termsCloseBtn: {
    backgroundColor: '#F58220',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  successIconCircle: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E253B',
    textAlign: 'center',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 13.5,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  successBtn: {
    width: '100%',
    backgroundColor: '#1E253B',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#1E253B',
  },

  /* DROPDOWN MODAL */
  dropdownModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  dropdownModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E253B',
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownOptionItemActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F58220',
  },
  dropdownOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dropdownOptionLabelActive: {
    color: '#F58220',
    fontWeight: '800',
  },
});
