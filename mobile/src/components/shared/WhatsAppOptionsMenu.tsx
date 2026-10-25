import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Animated,
  Easing,
  Platform,
  Dimensions,
  Pressable
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';

export interface MenuOption {
  id: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface WhatsAppOptionsMenuProps {
  options: MenuOption[];
  triggerIconColor?: string;
  triggerIconSize?: number;
  triggerStyle?: object;
  align?: 'right' | 'left';
  customTrigger?: React.ReactNode;
  visible?: boolean;
  onClose?: () => void;
  topOffset?: number;
  rightOffset?: number;
}

export const WhatsAppOptionsMenu: React.FC<WhatsAppOptionsMenuProps> = ({
  options,
  triggerIconColor = '#0F172A',
  triggerIconSize = 22,
  triggerStyle,
  align = 'right',
  customTrigger,
  visible: externalVisible,
  onClose: externalOnClose,
  topOffset,
  rightOffset
}) => {
  const [internalVisible, setInternalVisible] = useState(false);
  const triggerRef = useRef<View>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right?: number; left?: number } | null>(null);

  const isControlled = externalVisible !== undefined;
  const isVisible = isControlled ? externalVisible : internalVisible;

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      animValue.setValue(0);
      Animated.timing(animValue, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    } else {
      animValue.setValue(0);
    }
  }, [isVisible]);

  const handleOpen = () => {
    if (triggerRef.current && typeof triggerRef.current.measureInWindow === 'function') {
      triggerRef.current.measureInWindow((x, y, width, height) => {
        const windowWidth = Dimensions.get('window').width;
        const calcTop = y + height + (topOffset || 4);

        if (align === 'left') {
          const calcLeft = Math.max(8, x);
          setMenuPos({ top: calcTop, left: calcLeft });
        } else {
          const calcRight = Math.max(8, windowWidth - (x + width) + (rightOffset || 0));
          setMenuPos({ top: calcTop, right: calcRight });
        }
        setInternalVisible(true);
      });
    } else {
      setMenuPos(null);
      setInternalVisible(true);
    }
  };

  const handleClose = () => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 120,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      if (isControlled) {
        if (externalOnClose) externalOnClose();
      } else {
        setInternalVisible(false);
      }
    });
  };

  const handleOptionPress = (option: MenuOption) => {
    handleClose();
    // Execute onPress after closing animation
    setTimeout(() => {
      option.onPress();
    }, 130);
  };

  const opacity = animValue;
  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });

  const getPositionStyle = () => {
    if (menuPos) {
      if (align === 'left') {
        return { top: menuPos.top, left: menuPos.left };
      }
      return { top: menuPos.top, right: menuPos.right };
    }
    // Fallback if measurement unavailable
    return align === 'left' ? { top: 56, left: 16 } : { top: 56, right: 16 };
  };

  return (
    <View ref={triggerRef} collapsable={false}>
      {!isControlled && (
        <TouchableOpacity
          style={[
            styles.triggerBtn,
            isVisible && styles.triggerBtnActive,
            triggerStyle
          ]}
          onPress={isVisible ? handleClose : handleOpen}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {customTrigger ? (
            customTrigger
          ) : (
            <Icon name="ellipsis-vertical" size={triggerIconSize} color={triggerIconColor} />
          )}
        </TouchableOpacity>
      )}

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlayBackdrop}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.menuCard,
                  getPositionStyle(),
                  {
                    opacity,
                    transform: [{ scale }, { translateY }]
                  }
                ]}
              >
                {options.map((option, index) => (
                  <Pressable
                    key={option.id}
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemPressed,
                      option.disabled && styles.menuItemDisabled,
                      index < options.length - 1 && styles.menuItemBorder,
                    ]}
                    disabled={option.disabled}
                    onPress={() => handleOptionPress(option)}
                  >
                    <Text
                      style={[
                        styles.menuItemText,
                        option.destructive && styles.menuItemTextDestructive,
                        option.disabled && styles.menuItemTextDisabled,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  triggerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerBtnActive: {
    backgroundColor: '#F1F5F9',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  menuCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 170,
    maxWidth: 240,
    zIndex: 999999,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 18px rgba(0, 0, 0, 0.14)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  menuItemPressed: {
    backgroundColor: '#F1F5F9',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  menuItemText: {
    fontSize: 14.5,
    fontWeight: '400',
    color: '#1E293B',
    letterSpacing: 0.1,
  },
  menuItemTextDestructive: {
    color: '#DC2626',
    fontWeight: '500',
  },
  menuItemTextDisabled: {
    color: '#94A3B8',
  },
});

export default WhatsAppOptionsMenu;
