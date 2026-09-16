import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { HEADER_THEME } from '../../config/headerTheme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  containerStyle?: object;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack,
  onBackPress,
  rightElement,
  containerStyle,
}) => {
  const navigation = useNavigation<any>();
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
    <View style={[styles.headerCardContainer, containerStyle]}>
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
              color={HEADER_THEME.backIconColor}
            />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleWrapper}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {HEADER_THEME.showSubtitle && !!subtitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightElement ? <View style={styles.rightGroup}>{rightElement}</View> : null}
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
