import { Platform } from 'react-native';
import api from './api';

const getMessaging = () => {
  if (Platform.OS === 'web') return null;
  try {
    return require('@react-native-firebase/messaging').default;
  } catch (e) {
    console.warn('Firebase messaging not available on this platform:', e);
    return null;
  }
};

/**
 * Request permission and get the FCM token.
 * Call this once after the user logs in.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const messaging = getMessaging();
    if (!messaging) return null;

    // Request permission (iOS requires explicit request; Android 13+ also needs it)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('Push notification permission denied');
      return null;
    }

    // Get the FCM device token
    const token = await messaging().getToken();
    console.log('FCM Token:', token);

    // Send token to backend to store against the user
    if (token) {
      await api.post('/users/fcm-token', { token }).catch(e =>
        console.warn('Failed to register FCM token with backend:', e)
      );
    }

    return token;
  } catch (error) {
    console.warn('Failed to get FCM token:', error);
    return null;
  }
}

/**
 * Set up foreground & background notification listeners.
 * Call this once in AppNavigator.
 */
export const setupNotificationListeners = async (navigationRef: any) => {
  if (Platform.OS === 'web') {
    return () => {};
  }

  try {
    const messaging = getMessaging();
    if (!messaging) return () => {};

    // Foreground: message received while app is open
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage: any) => {
      console.log('FCM Message received in foreground:', remoteMessage);
    });

    // When user taps a notification that opened/resumed the app
    messaging().onNotificationOpenedApp((remoteMessage: any) => {
      if (!navigationRef?.isReady()) return;
      handleNotificationNavigation(remoteMessage?.data, navigationRef);
    });

    // App opened from a QUIT state via notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage && navigationRef?.isReady()) {
          handleNotificationNavigation(remoteMessage?.data, navigationRef);
        }
      });

    // Set background message handler (must be outside React component lifecycle)
    messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('FCM Background message:', remoteMessage);
    });

    return () => {
      unsubscribeForeground();
    };
  } catch (error) {
    console.warn('Failed to setup push notification listeners:', error);
    return () => {};
  }
};

function handleNotificationNavigation(data: any, navigationRef: any) {
  if (!data) return;
  if (data.type === 'session_booked' || data.type === 'booking_confirmed') {
    navigationRef.navigate('Schedule');
  } else if (data.type === 'new_video') {
    navigationRef.navigate('Videos');
  } else if (data.type === 'announcement') {
    navigationRef.navigate('Notifications');
  } else if (data.type === 'new_result') {
    navigationRef.navigate('Results');
  }
}
