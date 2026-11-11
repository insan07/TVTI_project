import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../config/theme';

export default function ViewerBackButton() {
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();

  return <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel="Go back"
    hitSlop={4}
    activeOpacity={0.65}
    onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
    style={styles.button}
  >
    <Icon name="chevron-back" size={22} color={isDark ? '#FFFFFF' : COLORS.primary} />
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
});
