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
  LayoutRectangle
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const CustomFloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const [tabLayouts, setTabLayouts] = useState<{ [key: number]: LayoutRectangle }>({});

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

  const translateX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(44)).current;
  const liquidScaleX = useRef(new Animated.Value(1)).current;
  const liquidScaleY = useRef(new Animated.Value(1)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  const [hasMeasured, setHasMeasured] = useState(false);

  useEffect(() => {
    if (activeIndex !== -1 && tabLayouts[activeIndex]) {
      const { x, width } = tabLayouts[activeIndex];

      if (!hasMeasured) {
        translateX.setValue(x);
        indicatorWidth.setValue(width);
        setHasMeasured(true);
      } else {
        // Silky-Smooth Liquid Physics Spring Animation
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: x,
            tension: 45,
            friction: 7.5,
            useNativeDriver: false,
          }),
          Animated.spring(indicatorWidth, {
            toValue: width,
            tension: 45,
            friction: 7.5,
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(liquidScaleX, {
              toValue: 1.16,
              duration: 120,
              useNativeDriver: false,
            }),
            Animated.spring(liquidScaleX, {
              toValue: 1.0,
              tension: 75,
              friction: 6,
              useNativeDriver: false,
            }),
          ]),
          Animated.sequence([
            Animated.timing(liquidScaleY, {
              toValue: 0.84,
              duration: 120,
              useNativeDriver: false,
            }),
            Animated.spring(liquidScaleY, {
              toValue: 1.0,
              tension: 75,
              friction: 6,
              useNativeDriver: false,
            }),
          ]),
        ]).start();

        // Trigger liquid splash ripple wave
        rippleScale.setValue(0.3);
        rippleOpacity.setValue(0.65);
        Animated.parallel([
          Animated.timing(rippleScale, {
            toValue: 1.7,
            duration: 380,
            useNativeDriver: false,
          }),
          Animated.timing(rippleOpacity, {
            toValue: 0,
            duration: 380,
            useNativeDriver: false,
          }),
        ]).start();
      }
    }
  }, [activeIndex, tabLayouts]);

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

  return (
    <View style={[styles.outerWrapper, { bottom: Math.max(insets.bottom + 10, 16) }]}>
      {/* Liquid Dark Black Glass Dock Container */}
      <View style={styles.tabBarContainer}>
        {/* Top Rim Glossy Liquid Reflection */}
        <View style={styles.capsuleTopSheen} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={[
            styles.scrollContent,
            !isScrollable && { flex: 1, justifyContent: 'space-between' }
          ]}
        >
          {/* Liquid Animated Background Bubble Pill */}
          {hasMeasured && (
            <Animated.View
              style={[
                styles.liquidIndicator,
                {
                  width: indicatorWidth,
                  transform: [
                    { translateX },
                    { scaleX: liquidScaleX },
                    { scaleY: liquidScaleY },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#FFA000', '#F97316', '#EA580C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.liquidGradient}
              />
              {/* Glossy liquid active pill highlight sheen */}
              <View style={styles.liquidGlossSheen} />

              {/* Liquid splash ripple halo wave */}
              <Animated.View
                style={[
                  styles.liquidRippleHalo,
                  {
                    transform: [{ scale: rippleScale }],
                    opacity: rippleOpacity,
                  },
                ]}
              />
            </Animated.View>
          )}

          {visibleRoutes.map((route, idx) => {
            const index = state.routes.findIndex((r) => r.key === route.key);
            const isFocused = state.index === index;
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
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                LayoutAnimation.configureNext({
                  duration: 280,
                  update: { type: 'spring', springDamping: 0.8 },
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
                ]}
              >
                <Icon
                  name={iconName as any}
                  size={20}
                  color={isFocused ? '#FFFFFF' : '#94A3B8'}
                />
                {isFocused && (
                  <Text style={styles.activeLabel} numberOfLines={1}>
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
    maxWidth: 480,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  tabBarContainer: {
    backgroundColor: '#090A0E', // Deep liquid pitch black background
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 420,
    width: '100%',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)', // Glossy liquid drop glass rim
    ...Platform.select({
      web: {
        boxShadow: '0px 14px 36px rgba(0, 0, 0, 0.75), 0px 4px 20px rgba(249, 115, 22, 0.25)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 14,
      },
    }),
  },
  capsuleTopSheen: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 1,
    zIndex: 3,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  liquidIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 18px rgba(249, 115, 22, 0.55)',
      },
      default: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.55,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  liquidGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  liquidGlossSheen: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 1,
  },
  liquidRippleHalo: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignSelf: 'center',
    top: -8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    zIndex: 2,
  },
  inactiveTabItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  activeTabItem: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 44,
  },
  activeLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
});


