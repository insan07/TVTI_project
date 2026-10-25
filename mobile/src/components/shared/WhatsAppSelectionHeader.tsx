import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import WhatsAppOptionsMenu, { MenuOption } from './WhatsAppOptionsMenu';

export interface WhatsAppSelectionHeaderAction {
  id: string;
  icon: string; // Ionicons icon name e.g. "checkmark-done", "download-outline", "trash-outline"
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  title?: string;
}

export interface WhatsAppSelectionHeaderProps {
  visible: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  actions?: WhatsAppSelectionHeaderAction[];
  moreOptions?: MenuOption[];
  containerStyle?: object;
}

export const WhatsAppSelectionHeader: React.FC<WhatsAppSelectionHeaderProps> = ({
  visible,
  selectedCount,
  onClearSelection,
  actions = [],
  moreOptions,
  containerStyle
}) => {
  const animValue = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [visible]);

  if (!visible && (animValue as any)._value === 0) {
    return null;
  }

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });

  return (
    <Animated.View
      style={[
        styles.selectionHeaderContainer,
        containerStyle,
        {
          opacity: animValue,
          transform: [{ translateY }]
        }
      ]}
    >
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onClearSelection}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.countText}>
          {selectedCount}
        </Text>
      </View>

      <View style={styles.rightSection}>
        {actions.map(action => {
          const isDisabled = action.disabled || selectedCount === 0;
          return (
            <TouchableOpacity
              key={action.id}
              style={[styles.iconBtn, isDisabled && styles.iconBtnDisabled]}
              disabled={isDisabled}
              onPress={action.onPress}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name={action.icon as any}
                size={22}
                color={action.color || '#FFFFFF'}
              />
            </TouchableOpacity>
          );
        })}

        {moreOptions && moreOptions.length > 0 && (
          <WhatsAppOptionsMenu
            options={moreOptions}
            triggerIconColor="#FFFFFF"
            triggerIconSize={22}
            triggerStyle={styles.optionsTriggerBtn}
          />
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  selectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    zIndex: 1000,
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)' },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 6,
      },
    }),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  countText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
  optionsTriggerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
});

export default WhatsAppSelectionHeader;
