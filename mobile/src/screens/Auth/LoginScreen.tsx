import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Dimensions, ScrollView } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const authContext = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      return;
    }
    setErrorMsg('');
    try {
      await authContext?.login(email, password);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Invalid credentials or server error');
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
        <Text style={styles.brandTitle}>Twintec VTI</Text>
        <Text style={styles.brandSubtitle}>Learning Management System</Text>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.cardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.card} contentContainerStyle={{ paddingBottom: 60 + insets.bottom }} showsVerticalScrollIndicator={false}>
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSubtitle}>Sign in to continue</Text>
          
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

          <View style={styles.inputContainer}>
            <Icon name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Email address"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Icon name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin}
            disabled={authContext?.isLoading}
          >
            {authContext?.isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Register Here</Text>
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
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xxxl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: SPACING.md,
  },
  brandTitle: {
    fontSize: 28,
    color: '#FFFFFF',
    ...FONTS.bold,
  },
  brandSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    ...FONTS.regular,
    marginTop: SPACING.xs,
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
  welcomeTitle: {
    fontSize: 22,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: SPACING.xs,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    ...FONTS.regular,
    marginBottom: SPACING.xxl,
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
