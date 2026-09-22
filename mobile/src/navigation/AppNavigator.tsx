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
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
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
import MyStudentsScreen from '../screens/Instructor/MyStudentsScreen';
import ForceChangePasswordScreen from '../screens/Auth/ForceChangePasswordScreen';
import AdminSlotManagementScreen from '../screens/Admin/AdminSlotManagementScreen';
import ApplicationsManagementScreen from '../screens/Admin/ApplicationsManagementScreen';
import PdfViewerScreen from '../screens/Student/PdfViewerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const getCommonTabOptions = (insets: any) => ({
  tabBarStyle: {
    backgroundColor: COLORS.tabBar,
    borderTopWidth: 0,
    minHeight: 60 + (Platform.OS === 'ios' ? insets.bottom : 0),
    paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
    paddingTop: 6,
    boxShadow: '0px -4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 8,
  },
  tabBarItemStyle: {
    maxWidth: 150,
    marginHorizontal: 'auto',
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



import { CustomFloatingTabBar } from '../components/navigation/CustomFloatingTabBar';

const StudentTabs = ({ unreadCount }: { unreadCount: number; insets: any }) => (
  <Tab.Navigator
    tabBar={(props) => <CustomFloatingTabBar {...props} />}
    screenOptions={{ headerShown: false }}
    backBehavior="history"
  >
    <Tab.Screen name="Home" options={{ tabBarLabel: 'Home' }}>
      {(props) => <HomeScreen {...props} unreadCount={unreadCount} />}
    </Tab.Screen>
    <Tab.Screen name="Videos" options={{ tabBarLabel: 'Uploads' }}>
      {(props) => <VideosScreen {...props} unreadCount={unreadCount} />}
    </Tab.Screen>
    <Tab.Screen name="Schedule" options={{ tabBarLabel: 'Schedule' }}>
      {(props) => <StudentScheduleScreen {...props} unreadCount={unreadCount} />}
    </Tab.Screen>
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
);

const InstructorTabs = ({ insets }: { insets: any }) => (
  <Tab.Navigator
    tabBar={(props) => <CustomFloatingTabBar {...props} />}
    screenOptions={{ headerShown: false }}
    backBehavior="history"
  >
    <Tab.Screen name="Home" component={InstructorHomeScreen} options={{ tabBarLabel: 'Home' }} />
    <Tab.Screen
      name="Uploads"
      component={UploadVideoScreen}
      options={{
        tabBarLabel: 'Uploads',
      }}
    />
    <Tab.Screen
      name="Practice"
      component={InstructorPracticeScreen}
      options={{
        tabBarLabel: 'Schedule',
      }}
    />
    <Tab.Screen
      name="PostAnnouncement"
      component={PostAnnouncementScreen}
      options={{
        tabBarLabel: 'Notices',
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Profile',
      }}
    />
  </Tab.Navigator>
);

const AdminTabs = ({ insets }: { insets: any }) => (
  <Tab.Navigator
    tabBar={(props) => <CustomFloatingTabBar {...props} />}
    screenOptions={{ headerShown: false }}
    backBehavior="history"
  >
    <Tab.Screen name="Home" component={AdminDashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
    <Tab.Screen name="Users" component={UserManagementScreen} options={{ tabBarLabel: 'Users' }} />
    <Tab.Screen name="Courses" component={AdminCoursesStack} options={{ tabBarLabel: 'Courses' }} />
    <Tab.Screen name="Practice" component={AdminSlotManagementScreen} options={{ tabBarLabel: 'Slots' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
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
        } catch (e) { }
      };
      fetchUnread(); // Initial fetch
      interval = setInterval(fetchUnread, 10000); // Poll every 10s
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

  const normalizedRole = userRole
    ? String(userRole).toLowerCase()
    : context?.user?.role
      ? String(context.user.role).toLowerCase()
      : 'student';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animation: 'slide_from_right'
        }}
      >
        {userToken == null ? (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              animationTypeForReplace: !userToken ? 'pop' : 'push',
            }}
          />
        ) : context?.user?.must_change_password ? (
          <Stack.Screen name="ForceChangePassword" component={ForceChangePasswordScreen} />
        ) : (
          <>
            {normalizedRole === 'instructor' ? (
              <>
                <Stack.Screen name="InstructorApp">
                  {props => <InstructorTabs {...props} insets={insets} />}
                </Stack.Screen>
                <Stack.Screen name="MyStudents" component={MyStudentsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ headerShown: false }} />
              </>
            ) : normalizedRole === 'admin' ? (
              <>
                <Stack.Screen name="AdminApp">
                  {props => <AdminTabs {...props} insets={insets} />}
                </Stack.Screen>
                <Stack.Screen name="EnrollStudent" component={EnrollStudentScreen} options={{ headerShown: false }} />
                <Stack.Screen name="PostAnnouncement" component={PostAnnouncementScreen} options={{ headerShown: false }} />
                <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ headerShown: false }} />
              </>
            ) : (
              <>
                <Stack.Screen name="StudentApp">
                  {props => <StudentTabs {...props} unreadCount={unreadCount} insets={insets} />}
                </Stack.Screen>
                <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Results" component={ResultsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ headerShown: false }} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
