import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const CustomFloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  // Helper to determine ultra-modern premium icon name for each route
  const getTabIcon = (routeName: string, isFocused: boolean): keyof typeof Icon.glyphMap => {
    switch (routeName) {
      case 'Home':
        return isFocused ? 'home' : 'home-outline';
      case 'Videos':
      case 'Uploads':
        return isFocused ? 'play-circle' : 'play-circle-outline';
      case 'Schedule':
      case 'Practice':
        return isFocused ? 'calendar-clear' : 'calendar-clear-outline';
      case 'Users':
        return isFocused ? 'people-circle' : 'people-circle-outline';
      case 'Courses':
      case 'CoursesMain':
        return isFocused ? 'library' : 'library-outline';
      case 'Results':
        return isFocused ? 'stats-chart' : 'stats-chart-outline';
      case 'PostAnnouncement':
        return isFocused ? 'megaphone' : 'megaphone-outline';
      case 'Profile':
        return isFocused ? 'person' : 'person-outline';
      default:
        return isFocused ? 'grid' : 'grid-outline';
    }
  };

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

  if (visibleRoutes.length === 0) return null;

  return (
    <View style={[styles.outerWrapper, { bottom: Math.max(insets.bottom + 10, 16) }]}>
      <View style={styles.tabBarContainer}>
        {visibleRoutes.map((route) => {
          const index = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];

          const label =
            options.tabBarLabel !== undefined
              ? String(options.tabBarLabel)
              : options.title !== undefined
              ? options.title
              : route.name;

          const iconName = getTabIcon(route.name, isFocused);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
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
                name={iconName}
                size={20}
                color={isFocused ? '#FFFFFF' : '#E4E4E7'}
              />
              {isFocused && (
                <Text style={styles.activeLabel} numberOfLines={1}>
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#343436', // Sleek dark charcoal capsule background matching user image
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 420,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.28)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
      },
    }),
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  inactiveTabItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  activeTabItem: {
    backgroundColor: '#F58220', // Suitable vibrant TVTI brand orange pill active highlight
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
