import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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
    password: '',
    confirmPassword: '',
    desired_course: '',
  });
  
  const [courses, setCourses] = useState<{_id: string, title: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/courses/active').catch(() => null);
        if (res && res.data) {
          setCourses(res.data);
          if (res.data.length > 0) {
            setFormData(prev => ({ ...prev, desired_course: res.data[0]._id }));
          }
        } else {
          const mock = [{_id: '1', title: 'Web Development'}, {_id: '2', title: 'Network Engineering'}];
          setCourses(mock);
          setFormData(prev => ({ ...prev, desired_course: mock[0]._id }));
        }
      } catch (e) {
        console.warn('Failed to fetch courses', e);
      } finally {
        setFetchingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    setErrorMsg('');
    const { name, nic, email, phone, password, confirmPassword, desired_course } = formData;
    
    if (!name || !nic || !email || !phone || !password || !confirmPassword || !desired_course) {
      setErrorMsg('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/register', {
        name,
        email,
        password,
        phone,
        nic,
        desired_course
      });
      
      Alert.alert(
        "Registration Successful", 
        "Registration submitted. Awaiting admin approval.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Registration failed');
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
        <Text style={styles.brandTitle}>Student Registration</Text>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.cardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.card} contentContainerStyle={{ paddingBottom: 60 + insets.bottom }} showsVerticalScrollIndicator={false}>
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

          <View style={styles.inputContainer}>
            <Icon name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} placeholder="Full Name" placeholderTextColor={COLORS.textMuted}
              value={formData.name} onChangeText={(val) => handleChange('name', val)} 
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Icon name="card-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} placeholder="NIC Number" placeholderTextColor={COLORS.textMuted}
              value={formData.nic} onChangeText={(val) => handleChange('nic', val)} 
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Icon name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.textMuted}
              value={formData.email} onChangeText={(val) => handleChange('email', val)} 
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Icon name="call-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" placeholderTextColor={COLORS.textMuted}
              value={formData.phone} onChangeText={(val) => handleChange('phone', val)} 
            />
          </View>
          
          <View style={[styles.inputContainer, { paddingVertical: 0 }]}>
            <Icon name="library-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <View style={{flex: 1}}>
              {fetchingCourses ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{paddingVertical: 14}} />
              ) : (
                <Picker
                  selectedValue={formData.desired_course}
                  onValueChange={(val) => handleChange('desired_course', val)}
                  style={styles.picker}
                >
                  {courses.map(c => (
                    <Picker.Item key={c._id} label={c.title} value={c._id} color={COLORS.textPrimary} />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} placeholder="Password" secureTextEntry={!showPassword} placeholderTextColor={COLORS.textMuted}
              value={formData.password} onChangeText={(val) => handleChange('password', val)} 
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Icon name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} placeholder="Confirm Password" secureTextEntry={!showConfirmPassword} placeholderTextColor={COLORS.textMuted}
              value={formData.confirmPassword} onChangeText={(val) => handleChange('confirmPassword', val)} 
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Icon name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.link}>Login Here</Text>
            </TouchableOpacity>
          </View>
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
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: SPACING.md,
  },
  brandTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    ...FONTS.bold,
  },
  cardContainer: {
    flex: 1,
    marginTop: -32,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: SPACING.xxl,
    ...SHADOW.md,
  },
  error: {
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
    ...FONTS.medium,
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
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.regular,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOW.md,
  },
  buttonText: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    ...FONTS.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
  },
  footerText: {
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  link: {
    color: COLORS.secondary,
    ...FONTS.semiBold,
  }
});
