import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  useWindowDimensions,
  ScrollView
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function PasswordResetSuccessScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleGoToLogin = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  const renderSuccessCard = () => (
    <View style={[styles.card, isDesktop && styles.desktopCard]}>
      <View style={styles.iconCircle}>
        <Icon name="checkmark" size={36} color="#FFFFFF" />
      </View>

      <Text style={styles.welcomeTitle}>Password Reset Successful</Text>
      <Text style={styles.welcomeSubtitle}>
        Your password has been changed successfully. You can now sign in using your new credentials.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleGoToLogin}
        activeOpacity={0.88}
      >
        <Text style={styles.buttonText}>Go to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Background Image */}
      <Image
        source={require('../../../assets/background.jpeg')}
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
              background: isDesktop
                ? 'radial-gradient(circle at 86% 8%, rgba(255, 115, 0, 0.22) 0%, rgba(255, 90, 0, 0.08) 35%, transparent 60%), linear-gradient(to right, rgba(14, 10, 7, 0.92) 0%, rgba(14, 10, 7, 0.64) 46%, rgba(14, 10, 7, 0.82) 100%)'
                : 'linear-gradient(to bottom, rgba(14, 10, 7, 0.88) 0%, rgba(14, 10, 7, 0.70) 50%, rgba(14, 10, 7, 0.92) 100%)',
            } as any,
          ]}
        />
      ) : (
        <LinearGradient
          colors={[
            'rgba(14, 10, 7, 0.88)',
            'rgba(14, 10, 7, 0.65)',
            'rgba(14, 10, 7, 0.90)',
          ]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={isDesktop ? styles.desktopScrollContent : styles.mobileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isDesktop ? (
          /* =================== DESKTOP 2-COLUMN VIEW =================== */
          <View style={styles.desktopContainer}>
            {/* Left Column: TVTI Branding */}
            <View style={styles.desktopLeftCol}>
              <View style={styles.desktopBrandRow}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={styles.desktopLogo}
                  resizeMode="contain"
                />
                <View style={{ marginLeft: 14 }}>
                  <Text style={styles.desktopBrandTitle}>Twintec VTI</Text>
                  <Text style={styles.desktopBrandSub}>Learning Management System</Text>
                </View>
              </View>

              <View style={styles.heroTextContainer}>
                <Text style={styles.heroLearnText}>Learn</Text>
                <Text style={styles.heroHighlightText}>Build Your Skills</Text>
                <Text style={styles.heroHighlightText}>Shape Your Future</Text>
                <Text style={styles.heroSubDescription}>
                  Twintec VTI Learning Management System{'\n'}Your journey towards a brighter future starts here.
                </Text>
              </View>

              <View style={styles.heroImageWrapper}>
                <Image
                  source={require('../../../assets/login_hero_clay.jpg')}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Right Column: Glassmorphism Success Card */}
            <View style={styles.desktopRightCol}>
              {renderSuccessCard()}
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
              <Text style={styles.brandTitle}>Twintec VTI</Text>
              <Text style={styles.brandSubtitle}>Learning Management System</Text>
            </View>

            <View style={styles.mobileCardWrapper}>
              {renderSuccessCard()}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0B08',
  },

  /* ---------- Mobile Layout Styles ---------- */
  mobileScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  mobileContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  mobileHeader: {
    alignItems: 'center',
    marginBottom: 26,
  },
  mobileLogo: {
    width: 76,
    height: 76,
    marginBottom: 12,
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
    paddingVertical: 40,
    paddingHorizontal: 36,
  },
  desktopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 1140,
    gap: 60,
  },
  desktopLeftCol: {
    flex: 1.15,
    maxWidth: 540,
  },
  desktopBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  desktopLogo: {
    width: 62,
    height: 62,
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
    fontSize: 38,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -0.3,
  },
  heroHighlightText: {
    fontSize: 38,
    color: '#FF6500',
    fontWeight: '800',
    lineHeight: 46,
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
    maxWidth: 440,
    height: 270,
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
    flex: 1,
    maxWidth: 470,
    width: '100%',
  },
  desktopCard: {
    paddingVertical: 44,
    paddingHorizontal: 36,
    borderRadius: 22,
    backgroundColor: 'rgba(28, 20, 15, 0.42)',
    borderColor: 'rgba(255, 255, 255, 0.13)',
  },

  /* ---------- Card Component Styles ---------- */
  card: {
    backgroundColor: 'rgba(28, 20, 15, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 22,
    paddingVertical: 36,
    paddingHorizontal: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' } as any)
      : {}),
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  welcomeTitle: {
    fontSize: 23,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#A89F93',
    lineHeight: 22,
    marginBottom: 28,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FF5E14',
    height: 48,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5E14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
});
