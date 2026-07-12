import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { setupNotificationListeners } from '../services/NotificationService';

import { AuthContext } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { API_URL } from '../config/constants';
import { COLORS } from '../config/theme';
import api from '../services/api';

// Import Screens
import UserManagementScreen from '../screens/Admin/UserManagementScreen';
import ProfileScreen from '../screens/Shared/ProfileScreen';
import ScheduleScreen from '../screens/Shared/ScheduleScreen';
import HomeScreen from '../screens/Student/HomeScreen';
import UploadVideoScreen from '../screens/Instructor/UploadVideoScreen';
import VideosScreen from '../screens/Student/VideosScreen';
import VideoPlayerScreen from '../screens/Student/VideoPlayerScreen';
import CourseManagementScreen from '../screens/Admin/CourseManagementScreen';
import BatchManagementScreen from '../screens/Admin/BatchManagementScreen';
import EnrollStudentScreen from '../screens/Admin/EnrollStudentScreen';
import InstructorHomeScreen from '../screens/Instructor/InstructorHomeScreen';
import InstructorPracticeScreen from '../screens/Instructor/PracticeSessionsScreen';
import StudentScheduleScreen from '../screens/Student/StudentScheduleScreen';
import NotificationsScreen from '../screens/Shared/NotificationsScreen';
import PostAnnouncementScreen from '../screens/Instructor/PostAnnouncementScreen';
import ResultsScreen from '../screens/Student/ResultsScreen';
import ManageResultsScreen from '../screens/Admin/ManageResultsScreen';
import MyStudentsScreen from '../screens/Instructor/MyStudentsScreen';

// Placeholders for missing screens to prevent crashes
const AdminDashboard = () => <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Admin Dashboard</Text></View>;

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const getCommonTabOptions = (insets: any) => ({
  tabBarStyle: { 
    backgroundColor: COLORS.tabBar, 
    borderTopWidth: 0,
    minHeight: 60 + (Platform.OS === 'ios' ? insets.bottom : 0),
    paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tabBarActiveTintColor: COLORS.tabBarActive,
  tabBarInactiveTintColor: COLORS.tabBarInactive,
  tabBarLabelStyle: { fontSize: 11, fontWeight: '500' as const, marginBottom: 4 },
  headerShown: false,
});

const AdminCoursesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CoursesMain" component={CourseManagementScreen} />
    <Stack.Screen name="Batches" component={BatchManagementScreen} />
  </Stack.Navigator>
);



const StudentTabs = ({ unreadCount, insets }: { unreadCount: number, insets: any }) => (
  <Tab.Navigator screenOptions={({ route }) => ({
    ...getCommonTabOptions(insets),
    tabBarIcon: ({ color, size }) => {
      let iconName: any = 'home';
      if (route.name === 'Home') iconName = 'home';
      else if (route.name === 'Videos') iconName = 'play-circle';
      else if (route.name === 'Practice') iconName = 'build'; 
      else if (route.name === 'Schedule') iconName = 'calendar';
      else if (route.name === 'Profile') iconName = 'person';
      return <Icon name={iconName} size={size} color={color} />;
    },
  })}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Videos" component={VideosScreen} options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }} />
    <Tab.Screen name="Schedule" component={StudentScheduleScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const InstructorTabs = ({ insets }: { insets: any }) => (
  <Tab.Navigator screenOptions={({ route }) => ({
    ...getCommonTabOptions(insets),
    tabBarIcon: ({ color, size }) => {
      let iconName: any = 'home';
      const isActive = color === COLORS.tabBarActive;
      if (route.name === 'Home') {
        iconName = isActive ? 'home' : 'home-outline';
      } else if (route.name === 'Videos') {
        iconName = isActive ? 'play-circle' : 'play-circle-outline';
      } else if (route.name === 'Practice') {
        iconName = isActive ? 'calendar' : 'calendar-outline';
      } else if (route.name === 'Profile') {
        iconName = isActive ? 'person' : 'person-outline';
      }
      return <Icon name={iconName} size={size} color={color} />;
    },
  })}>
    <Tab.Screen name="Home" component={InstructorHomeScreen} />
    <Tab.Screen name="Videos" component={UploadVideoScreen} />
    <Tab.Screen name="Practice" component={InstructorPracticeScreen} options={{ tabBarLabel: 'Schedule' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AdminTabs = ({ insets }: { insets: any }) => (
  <Tab.Navigator screenOptions={({ route }) => ({
    ...getCommonTabOptions(insets),
    tabBarIcon: ({ color, size }) => {
      let iconName: any = 'home';
      if (route.name === 'Home') iconName = 'speedometer';
      else if (route.name === 'Users') iconName = 'people';
      else if (route.name === 'Courses') iconName = 'library';
      else if (route.name === 'Results') iconName = 'stats-chart';
      else if (route.name === 'Profile') iconName = 'person';
      return <Icon name={iconName} size={size} color={color} />;
    },
  })}>
    <Tab.Screen name="Home" component={AdminDashboard} />
    <Tab.Screen name="Users" component={UserManagementScreen} />
    <Tab.Screen name="Courses" component={AdminCoursesStack} />
    <Tab.Screen name="Results" component={ManageResultsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const context = useContext(AuthContext);
  const navigationRef = useNavigationContainerRef();
  const [unreadCount, setUnreadCount] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (navigationRef) {
      setupNotificationListeners(navigationRef).then(fn => {
        unsubscribe = fn;
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigationRef]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (context?.userToken) {
      const fetchUnread = async () => {
        try {
          const res = await api.get('/notifications/unread-count');
          setUnreadCount(res.data.unread_count);
        } catch (e) {}
      };
      fetchUnread(); // Initial fetch
      interval = setInterval(fetchUnread, 30000); // Poll every 30s
    }
    return () => clearInterval(interval);
  }, [context?.userToken]);

  if (!context) {
    throw new Error('AppNavigator must be used within an AuthProvider');
  }

  const { isLoading, userToken, userRole } = context;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Shared header styling for stack screens (sub-pages only, not tab screens)
  const headerOptions = {
    headerStyle: { backgroundColor: COLORS.primary },
    headerTintColor: COLORS.secondary,
    headerTitleStyle: { fontWeight: '700' as const, fontSize: 17, color: '#fff' },
    headerBackTitleVisible: false,
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken == null ? (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              animationTypeForReplace: !userToken ? 'pop' : 'push',
            }}
          />
        ) : (
          <>
            {userRole === 'student' && (
              <>
                <Stack.Screen name="StudentApp">
                  {props => <StudentTabs {...props} unreadCount={unreadCount} insets={insets} />}
                </Stack.Screen>
                <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ ...headerOptions, headerShown: true, title: 'Video Player' }} />

                <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ ...headerOptions, headerShown: true, title: 'Notifications' }} />
                <Stack.Screen name="Results" component={ResultsScreen} options={{ ...headerOptions, headerShown: true, title: 'My Results' }} />
              </>
            )}
            {userRole === 'instructor' && (
              <>
                <Stack.Screen name="InstructorApp">
                  {props => <InstructorTabs {...props} insets={insets} />}
                </Stack.Screen>
                <Stack.Screen name="PostAnnouncement" component={PostAnnouncementScreen} options={{ ...headerOptions, headerShown: true, title: 'New Announcement' }} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ ...headerOptions, headerShown: true, title: 'Notifications' }} />
                <Stack.Screen name="MyStudents" component={MyStudentsScreen} options={{ ...headerOptions, headerShown: true, title: 'My Students' }} />
              </>
            )}
            {userRole === 'admin' && (
              <>
                <Stack.Screen name="AdminApp">
                  {props => <AdminTabs {...props} insets={insets} />}
                </Stack.Screen>
                <Stack.Screen name="EnrollStudent" component={EnrollStudentScreen} options={{ ...headerOptions, headerShown: true, title: 'Enroll Students' }} />
                <Stack.Screen name="PostAnnouncement" component={PostAnnouncementScreen} options={{ ...headerOptions, headerShown: true, title: 'New Announcement' }} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
