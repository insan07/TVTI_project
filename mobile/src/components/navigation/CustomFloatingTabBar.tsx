import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  LayoutAnimation,
  UIManager,
  ScrollView,
  Animated,
  LayoutRectangle,
  Keyboard,
  PanResponder,
  Vibration,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !(globalThis as any).nativeFabricUIManager) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Crisp, subtle haptic feedback
const triggerHaptic = (type: 'tick' | 'grab' | 'drop' = 'tick') => {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (type === 'tick') navigator.vibrate(6);
        else if (type === 'grab') navigator.vibrate(8);
        else if (type === 'drop') navigator.vibrate(12);
      }
    } else {
      if (type === 'tick') {
        Vibration.vibrate(8);
      } else if (type === 'grab') {
        Vibration.vibrate(10);
      } else if (type === 'drop') {
        Vibration.vibrate(14);
      }
    }
  } catch (_e) {
    // Graceful fallback
  }
};

export const CustomFloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [tabLayouts, setTabLayouts] = useState<{ [key: number]: LayoutRectangle }>({});
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Dragging states
  const [isDragging, setIsDragging] = useState(false);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);

  const isDraggingRef = useRef(false);
  const dragHoverIndexRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const tabLayoutsRef = useRef<{ [key: number]: LayoutRectangle }>({});
  const activeIndexRef = useRef(0);
  const currentTranslateXRef = useRef(0);
  const currentIndicatorWidthRef = useRef(44);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Filter visible routes (ignore hidden screens like MyStudents)
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    if (options.tabBarButton && typeof options.tabBarButton === 'function') {
      const btn = options.tabBarButton({} as any);
      if (btn === null) return false;
    }
    if ((options.tabBarItemStyle as any)?.display === 'none') {
      return false;
    }
    return true;
  });

  const activeIndex = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index]?.key
  );

  const visibleRoutesRef = useRef(visibleRoutes);
  const navigationRef = useRef(navigation);

  useEffect(() => {
    tabLayoutsRef.current = tabLayouts;
  }, [tabLayouts]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    visibleRoutesRef.current = visibleRoutes;
    navigationRef.current = navigation;
  }, [visibleRoutes, navigation]);

  const translateX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(44)).current;
  const indicatorScale = useRef(new Animated.Value(1)).current;

  const [hasMeasured, setHasMeasured] = useState(false);

  // Keep track of real-time animated values for drag mathematics
  useEffect(() => {
    const xListener = translateX.addListener(({ value }) => {
      currentTranslateXRef.current = value;
    });
    const widthListener = indicatorWidth.addListener(({ value }) => {
      currentIndicatorWidthRef.current = value;
    });
    return () => {
      translateX.removeListener(xListener);
      indicatorWidth.removeListener(widthListener);
    };
  }, [translateX, indicatorWidth]);

  // Spring to current active tab layout when not dragging
  useEffect(() => {
    if (isDraggingRef.current) return;

    if (activeIndex !== -1 && tabLayouts[activeIndex]) {
      const { x, width } = tabLayouts[activeIndex];

      if (!hasMeasured) {
        translateX.setValue(x);
        indicatorWidth.setValue(width);
        setHasMeasured(true);
      } else {
        triggerHaptic('tick');

        // Clean, responsive Apple-calibrated spring animation
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: x,
            tension: 68,
            friction: 9.5,
            useNativeDriver: false,
          }),
          Animated.spring(indicatorWidth, {
            toValue: width,
            tension: 68,
            friction: 9.5,
            useNativeDriver: false,
          }),
          Animated.spring(indicatorScale, {
            toValue: 1.0,
            tension: 68,
            friction: 9,
            useNativeDriver: false,
          }),
        ]).start();
      }
    }
  }, [activeIndex, tabLayouts]);

  const snapToTab = (idx: number) => {
    const layout = tabLayoutsRef.current[idx];
    if (layout) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: layout.x,
          tension: 68,
          friction: 9.5,
          useNativeDriver: false,
        }),
        Animated.spring(indicatorWidth, {
          toValue: layout.width,
          tension: 68,
          friction: 9.5,
          useNativeDriver: false,
        }),
        Animated.spring(indicatorScale, {
          toValue: 1.0,
          tension: 68,
          friction: 9,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const finishDrag = () => {
    isDraggingRef.current = false;
    setIsDragging(false);

    triggerHaptic('drop');

    const targetIdx = dragHoverIndexRef.current ?? activeIndexRef.current;
    setDragHoverIndex(null);
    dragHoverIndexRef.current = null;

    const routes = visibleRoutesRef.current;
    const nav = navigationRef.current;
    const curActive = activeIndexRef.current;

    if (targetIdx !== -1 && targetIdx !== curActive && routes[targetIdx]) {
      const route = routes[targetIdx];
      const event = nav.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        LayoutAnimation.configureNext({
          duration: 220,
          update: { type: 'spring', springDamping: 0.85 },
          create: { type: 'linear', property: 'opacity' },
          delete: { type: 'linear', property: 'opacity' },
        });
        nav.navigate(route.name, route.params);
      } else {
        snapToTab(curActive);
      }
    } else {
      snapToTab(curActive);
    }
  };

  // PanResponder for smooth, precision drag navigation
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        setIsDragging(true);

        triggerHaptic('grab');

        const curActive = activeIndexRef.current;
        dragStartXRef.current = currentTranslateXRef.current;
        dragHoverIndexRef.current = curActive;
        setDragHoverIndex(curActive);

        // Subtle lift scale when picked up
        Animated.spring(indicatorScale, {
          toValue: 1.04,
          tension: 80,
          friction: 8,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (!isDraggingRef.current) return;

        const rawX = dragStartXRef.current + gestureState.dx;
        const layouts = tabLayoutsRef.current;
        const tabIndices = Object.keys(layouts).map(Number).sort((a, b) => a - b);
        if (tabIndices.length === 0) return;

        const firstTab = layouts[tabIndices[0]];
        const lastTab = layouts[tabIndices[tabIndices.length - 1]];
        const minX = firstTab?.x ?? 0;
        const curWidth = currentIndicatorWidthRef.current;
        const maxX = (lastTab?.x ?? 0) + (lastTab?.width ?? 0) - curWidth;

        const clampedX = Math.max(minX, Math.min(maxX, rawX));
        translateX.setValue(clampedX);

        // Find closest tab to indicator center
        const bubbleCenter = clampedX + curWidth / 2;
        const routes = visibleRoutesRef.current;
        let closestIdx = activeIndexRef.current;
        let minDistance = Infinity;

        for (let i = 0; i < routes.length; i++) {
          const layout = layouts[i];
          if (layout) {
            const tabCenter = layout.x + layout.width / 2;
            const dist = Math.abs(bubbleCenter - tabCenter);
            if (dist < minDistance) {
              minDistance = dist;
              closestIdx = i;
            }
          }
        }

        if (dragHoverIndexRef.current !== closestIdx) {
          dragHoverIndexRef.current = closestIdx;
          setDragHoverIndex(closestIdx);
          triggerHaptic('tick');
        }
      },
      onPanResponderRelease: () => {
        finishDrag();
      },
      onPanResponderTerminate: () => {
        finishDrag();
      },
    })
  ).current;

  if (visibleRoutes.length === 0) return null;

  const isScrollable = visibleRoutes.length > 5;

  const handleLayout = (index: number, layout: LayoutRectangle) => {
    setTabLayouts((prev) => {
      if (prev[index]?.x === layout.x && prev[index]?.width === layout.width) {
        return prev;
      }
      return { ...prev, [index]: layout };
    });
  };

  if (isKeyboardVisible) {
    return null;
  }

  return (
    <View style={[styles.outerWrapper, { bottom: Math.max(insets.bottom + 10, 16) }]}>
      {/* Clean, Elegant Floating Dock */}
      <View
        {...panResponder.panHandlers}
        style={[
          styles.tabBarContainer,
          isDark ? styles.tabBarContainerDark : styles.tabBarContainerLight,
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'android' ? 30 : 50}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          horizontal
          scrollEnabled={isScrollable && !isDragging}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            !isScrollable && { flex: 1, justifyContent: 'space-between' }
          ]}
        >
          {/* Crisp, Modern Active Indicator Pill */}
          {hasMeasured && (
            <Animated.View
              style={[
                styles.activeIndicator,
                isDragging && styles.activeIndicatorDragging,
                {
                  width: indicatorWidth,
                  transform: [
                    { translateX },
                    { scale: indicatorScale },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.indicatorGradient}
              />
            </Animated.View>
          )}

          {visibleRoutes.map((route, idx) => {
            const index = state.routes.findIndex((r) => r.key === route.key);
            const isFocused = state.index === index;
            const isHovered = isDragging && dragHoverIndex === idx;
            const { options } = descriptors[route.key];

            const label =
              options.tabBarLabel !== undefined
                ? String(options.tabBarLabel)
                : options.title !== undefined
                  ? options.title
                  : route.name;

            let iconName = 'ellipse-outline';
            if (route.name === 'Home') iconName = 'home';
            else if (route.name === 'AdminDashboard') iconName = 'home';
            else if (route.name === 'AdminCourses') iconName = 'book';
            else if (route.name === 'AdminBatches') iconName = 'layers';
            else if (route.name === 'AdminSlots') iconName = 'calendar';
            else if (route.name === 'ManageResults') iconName = 'podium';
            else if (route.name === 'AdminAnnouncements') iconName = 'megaphone';
            else if (route.name === 'AdminUsers') iconName = 'people';
            else if (route.name === 'Videos' || route.name === 'Uploads') iconName = 'play-circle';
            else if (route.name === 'Schedule' || route.name === 'Practice') iconName = 'calendar';
            else if (route.name === 'PostAnnouncement') iconName = 'megaphone';
            else if (route.name === 'Profile') iconName = 'person';
            else if (route.name === 'Users') iconName = 'people';
            else if (route.name === 'Courses') iconName = 'book';
            else if (route.name === 'Results') iconName = 'podium';

            const onPress = () => {
              if (isDraggingRef.current) return;

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                LayoutAnimation.configureNext({
                  duration: 220,
                  update: { type: 'spring', springDamping: 0.85 },
                  create: { type: 'linear', property: 'opacity' },
                  delete: { type: 'linear', property: 'opacity' },
                });
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const iconColor = (isFocused && !isDragging) || isHovered
              ? '#FFFFFF'
              : (isDark ? '#94A3B8' : '#64748B');

            return (
              <TouchableOpacity
                key={route.key}
                onLayout={(e) => handleLayout(idx, e.nativeEvent.layout)}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={(options as any).tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.8}
                style={[
                  styles.tabItem,
                  isFocused ? styles.activeTabItem : styles.inactiveTabItem,
                  Platform.OS === 'web' && ({ cursor: isDragging ? 'grabbing' : 'pointer' } as any),
                ]}
              >
                <Icon
                  name={iconName as any}
                  size={20}
                  color={iconColor}
                />
                {isFocused && (
                  <Text
                    style={[
                      styles.activeLabel,
                      isDragging && dragHoverIndex !== idx && styles.dimmedActiveLabel,
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  tabBarContainer: {
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 5,
    maxWidth: 400,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  tabBarContainerDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.50)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
      },
    }),
  },
  tabBarContainerLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0px 8px 24px rgba(15, 23, 42, 0.08)',
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 6,
      },
    }),
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 3px 12px rgba(249, 115, 22, 0.32)',
        cursor: 'grab' as any,
      },
      default: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.30,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  activeIndicatorDragging: {
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 18px rgba(249, 115, 22, 0.45)',
        cursor: 'grabbing' as any,
      },
      default: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  indicatorGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    zIndex: 2,
  },
  inactiveTabItem: {
    width: 44,
    backgroundColor: 'transparent',
  },
  activeTabItem: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  activeLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
    letterSpacing: 0.1,
  },
  dimmedActiveLabel: {
    opacity: 0.35,
  },
});





