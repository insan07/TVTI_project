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
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../config/theme';
import { useTabGlassBackdrop } from './TabGlassBackdrop';
import { floatingTabBarBottom } from './floatingTabBarLayout';

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
  const { width: windowWidth } = useWindowDimensions();
  const { isDark } = useTheme();
  const blurTarget = useTabGlassBackdrop();
  const reduceMotionRef = useRef(false);
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
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) reduceMotionRef.current = enabled;
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
      reduceMotionRef.current = enabled;
    });
    return () => { mounted = false; subscription.remove(); };
  }, []);

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
  const jelly = useRef(new Animated.Value(0)).current;

  const animateIndicator = (layout: LayoutRectangle, immediate = false) => {
    translateX.stopAnimation();
    indicatorWidth.stopAnimation();
    indicatorScale.stopAnimation();
    jelly.stopAnimation();
    if (immediate || reduceMotionRef.current) {
      translateX.setValue(layout.x);
      indicatorWidth.setValue(layout.width);
      indicatorScale.setValue(1);
      jelly.setValue(0);
      return;
    }
    // Stretch horizontally on travel, then wobble back into a rounded droplet.
    jelly.setValue(1);
    Animated.parallel([
      Animated.spring(translateX, { toValue: layout.x, tension: 92, friction: 9, useNativeDriver: false }),
      Animated.spring(indicatorWidth, { toValue: layout.width, tension: 92, friction: 9, useNativeDriver: false }),
      Animated.spring(indicatorScale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: false }),
      Animated.spring(jelly, { toValue: 0, tension: 145, friction: 5.5, useNativeDriver: false }),
    ]).start();
  };

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

  // Follow layout changes as the selected label expands its tab.
  useEffect(() => {
    if (isDraggingRef.current) return;
    const layout = tabLayouts[activeIndex];
    if (activeIndex === -1 || !layout) return;
    animateIndicator(layout, !hasMeasured);
    if (!hasMeasured) setHasMeasured(true);
  }, [activeIndex, tabLayouts]);

  const snapToTab = (idx: number) => {
    const layout = tabLayoutsRef.current[idx];
    if (layout) animateIndicator(layout);
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
        if (!reduceMotionRef.current) LayoutAnimation.configureNext({
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

        translateX.stopAnimation();
        indicatorWidth.stopAnimation();
        if (reduceMotionRef.current) return;
        jelly.stopAnimation();
        jelly.setValue(-0.35);
        // Lift the glass droplet while it follows the finger.
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
        if (!reduceMotionRef.current) {
          jelly.setValue(Math.min(1, Math.abs(gestureState.vx) * 0.42 + 0.18));
        }

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
        isDraggingRef.current = false;
        setIsDragging(false);
        setDragHoverIndex(null);
        dragHoverIndexRef.current = null;
        snapToTab(activeIndexRef.current);
      },
    })
  ).current;

  if (visibleRoutes.length === 0) return null;

  const isScrollable = visibleRoutes.length > 5;
  const showActiveLabel = windowWidth >= 380 || visibleRoutes.length <= 4;

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
    <View pointerEvents="box-none" style={[styles.outerWrapper, { bottom: floatingTabBarBottom(insets.bottom) }]}>
      {/* Translucent dock with a reflected rim and a clear center. */}
      <View
        {...panResponder.panHandlers}
        style={[
          styles.tabBarContainer,
          isDark ? styles.tabBarContainerDark : styles.tabBarContainerLight,
        ]}
      >
        {Platform.OS !== 'web' && (Platform.OS !== 'android' || blurTarget) && (
          <BlurView
            pointerEvents="none"
            intensity={40}
            tint={isDark ? 'dark' : 'light'}
            blurTarget={blurTarget}
            blurMethod="dimezisBlurViewSdk31Plus"
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          pointerEvents="none"
          colors={isDark
            ? ['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.06)']
            : ['rgba(255, 255, 255, 0.60)', 'rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.24)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[styles.dockRim, { backgroundColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.95)' }]} />

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
          {/* The active droplet stretches and settles with a damped spring. */}
          {hasMeasured && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeIndicator,
                isDark ? styles.activeIndicatorDark : styles.activeIndicatorLight,
                isDragging && styles.activeIndicatorDragging,
                {
                  width: indicatorWidth,
                  transform: [
                    { translateX },
                    { scale: indicatorScale },
                    { scaleX: jelly.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.94, 1, 1.16], extrapolate: 'clamp' }) },
                    { scaleY: jelly.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.06, 1, 0.86], extrapolate: 'clamp' }) },
                  ],
                },
              ]}
            >
              <View style={styles.indicatorFill} />
              <View style={styles.dropletReflection} />
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

              triggerHaptic('tick');
              if (isFocused) snapToTab(idx);

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                if (!reduceMotionRef.current) LayoutAnimation.configureNext({
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
              ? COLORS.textOnPrimary
              : (isDark ? '#CBD5E1' : COLORS.textSecondary);

            return (
              <TouchableOpacity
                key={route.key}
                onLayout={(e) => handleLayout(idx, e.nativeEvent.layout)}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.9}
                style={[
                  styles.tabItem,
                  isFocused && showActiveLabel ? styles.activeTabItem : styles.inactiveTabItem,
                  Platform.OS === 'web' && ({ cursor: isDragging ? 'grabbing' : 'pointer' } as any),
                ]}
              >
                <Icon
                  name={iconName as any}
                  size={20}
                  color={iconColor}
                />
                {isFocused && showActiveLabel && (
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
    borderRadius: 32,
    paddingHorizontal: 6,
    paddingVertical: 5,
    maxWidth: 400,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  tabBarContainerDark: {
    backgroundColor: 'rgba(26, 26, 26, 0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(22px) saturate(175%)',
        WebkitBackdropFilter: 'blur(22px) saturate(175%)',
        boxShadow: '0 12px 36px -8px rgba(0, 0, 0, 0.50), inset 0 1px 0 rgba(255, 255, 255, 0.26), inset 0 -1px 0 rgba(255, 255, 255, 0.06)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.76)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(22px) saturate(175%)',
        WebkitBackdropFilter: 'blur(22px) saturate(175%)',
        boxShadow: '0 12px 36px -8px rgba(26, 26, 26, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(255, 255, 255, 0.38)',
      },
      default: {
        shadowColor: COLORS.primary,
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
    paddingHorizontal: 4,
    paddingVertical: 4,
    position: 'relative',
  },
  dockRim: {
    position: 'absolute',
    top: 0,
    left: 26,
    right: 26,
    height: 1,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 4,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 1,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 3px 12px rgba(245, 130, 32, 0.32)',
        cursor: 'grab' as any,
      },
      default: {
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.30,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  activeIndicatorLight: {
    backgroundColor: COLORS.tabBarActive,
    borderColor: 'rgba(255, 255, 255, 0.88)',
  },
  activeIndicatorDark: {
    backgroundColor: COLORS.tabBarActive,
    borderColor: 'rgba(255, 255, 255, 0.40)',
  },
  activeIndicatorDragging: {
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 18px rgba(245, 130, 32, 0.45)',
        cursor: 'grabbing' as any,
      },
      default: {
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  indicatorFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.tabBarActive,
    borderRadius: 22,
  },
  dropletReflection: {
    position: 'absolute',
    top: 2,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.70)',
    borderRadius: 1,
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
    color: COLORS.textOnPrimary,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
    letterSpacing: 0.1,
  },
  dimmedActiveLabel: {
    opacity: 0.35,
  },
});





