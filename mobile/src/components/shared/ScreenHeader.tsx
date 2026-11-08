import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { HEADER_THEME } from '../../config/headerTheme';
import { WhatsAppOptionsMenu, MenuOption } from './WhatsAppOptionsMenu';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  options?: MenuOption[];
  containerStyle?: object;
}

import { useTheme } from '../../context/ThemeContext';

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack,
  onBackPress,
  rightElement,
  options,
  containerStyle,
}) => {
  const navigation = useNavigation<any>();
  let isDark = false;
  try {
    const theme = useTheme();
    isDark = theme?.isDark ?? false;
  } catch (e) {
    isDark = false;
  }

  // Show back navigation button unless explicitly disabled with showBack={false}
  const canGoBack = showBack !== undefined ? showBack : true;

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    }
  };

  return (
    <View
      style={[
        styles.headerCardContainer,
        isDark ? {
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderBottomColor: 'rgba(255, 255, 255, 0.10)',
        } : {
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          borderBottomColor: 'rgba(226, 232, 240, 0.85)',
        },
        containerStyle,
      ]}
    >
      <BlurView
        intensity={Platform.OS === 'android' ? 30 : 50}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.headerLeftGroup}>
        {canGoBack ? (
          <TouchableOpacity
            style={styles.normalBackNav}
            onPress={handleBack}
            activeOpacity={0.65}
            hitSlop={HEADER_THEME.backIconHitSlop}
          >
            <Icon
              name={HEADER_THEME.backIconName}
              size={HEADER_THEME.backIconSize}
              color={isDark ? '#FFFFFF' : HEADER_THEME.backIconColor}
            />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleWrapper}>
          <Text
            style={[
              styles.headerTitle,
              isDark && { color: '#FFFFFF' },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {HEADER_THEME.showSubtitle && !!subtitle ? (
            <Text
              style={[
                styles.headerSubtitle,
                isDark && { color: '#94A3B8' },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {options && options.length > 0 ? (
          <View style={styles.rightGroup}>
            <WhatsAppOptionsMenu options={options} />
          </View>
        ) : rightElement ? (
          <View style={styles.rightGroup}>{rightElement}</View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HEADER_THEME.paddingHorizontal,
    paddingVertical: HEADER_THEME.paddingVertical,
    backgroundColor: HEADER_THEME.backgroundColor,
    borderBottomWidth: HEADER_THEME.borderBottomWidth,
    borderBottomColor: HEADER_THEME.borderBottomColor,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.03)' },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: HEADER_THEME.elevation,
      },
    }),
    zIndex: 100,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  normalBackNav: {
    marginRight: HEADER_THEME.backIconSpacingRight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: HEADER_THEME.fontFamily,
    fontSize: HEADER_THEME.titleFontSize,
    lineHeight: HEADER_THEME.titleLineHeight,
    fontWeight: HEADER_THEME.titleFontWeight,
    color: HEADER_THEME.titleColor,
    letterSpacing: HEADER_THEME.titleLetterSpacing,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  headerSubtitle: {
    fontFamily: HEADER_THEME.fontFamily,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ScreenHeader;
