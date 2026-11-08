import { Platform, PermissionsAndroid } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from './api';

// Configure foreground notification handling (heads-up banner, sound, badge)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const getMessaging = () => {
  if (Platform.OS === 'web') return null;
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    return messaging;
  } catch (e) {
    return null;
  }
};

/**
 * Request notification permissions and register push tokens (Expo and/or FCM).
 * Call this on login and session restoration.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // 1. Android 13+ (API 33+) explicit runtime permission
    if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33) {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      } catch (e) {
        console.warn('[NotificationService] Android 13+ POST_NOTIFICATIONS request failed:', e);
      }
    }

    // 2. Android notification channel (High importance for heads-up banner & sound)
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Twintec VTI Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF5E14',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      } catch (e) {
        console.warn('[NotificationService] Failed to set notification channel:', e);
      }
    }

    // 3. Expo Notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    let expoPushToken: string | null = null;
    let fcmToken: string | null = null;

    // 4. Get Expo Push Token
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId ||
        'd81fd55d-4476-433d-b4d2-2fd051c61361';
      const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
      expoPushToken = tokenRes.data;
      console.log('[NotificationService] Expo Push Token obtained:', expoPushToken);
    } catch (e) {
      console.warn('[NotificationService] Could not obtain Expo push token:', e);
    }

    // 5. Get Firebase FCM token if available
    try {
      const messaging = getMessaging();
      if (messaging) {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (enabled) {
          fcmToken = await messaging().getToken();
          console.log('[NotificationService] FCM Token obtained:', fcmToken);
        }
      }
    } catch (e) {
      console.warn('[NotificationService] Could not obtain FCM token:', e);
    }

    // 6. Send tokens to backend
    const activeToken = expoPushToken || fcmToken;
    if (activeToken) {
      await api.post('/users/fcm-token', {
        token: activeToken,
        expo_push_token: expoPushToken,
        fcm_token: fcmToken,
      }).catch(e =>
        console.warn('[NotificationService] Failed to register push token with backend:', e)
      );
    }

    return activeToken;
  } catch (error) {
    console.warn('[NotificationService] Push registration failed:', error);
    return null;
  }
}

/**
 * Set up foreground & background notification listeners and tap navigation.
 * Call this in AppNavigator.
 */
export const setupNotificationListeners = async (navigationRef: any) => {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const cleanups: (() => void)[] = [];

  // A. Listen for notification interactions (user tapped a notification banner)
  try {
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (navigationRef?.isReady && navigationRef.isReady()) {
        handleNotificationNavigation(data, navigationRef);
      }
    });
    cleanups.push(() => responseSub.remove());
  } catch (e) {
    console.warn('[NotificationService] Failed to add notification response listener:', e);
  }

  // B. Firebase listeners (if available in native build)
  try {
    const messaging = getMessaging();
    if (messaging) {
      // Foreground: message received while app is open -> schedule local notification banner
      const unsubscribeForeground = messaging().onMessage(async (remoteMessage: any) => {
        console.log('[NotificationService] FCM Message received in foreground:', remoteMessage);
        const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Twintec VTI';
        const body = remoteMessage.notification?.body || remoteMessage.data?.message || remoteMessage.data?.body || '';
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: remoteMessage.data || {},
              sound: 'default',
            },
            trigger: null,
          });
        } catch (err) {
          console.warn('[NotificationService] Failed to schedule foreground banner:', err);
        }
      });
      cleanups.push(unsubscribeForeground);

      // User tapped notification from background
      messaging().onNotificationOpenedApp((remoteMessage: any) => {
        if (navigationRef?.isReady && navigationRef.isReady()) {
          handleNotificationNavigation(remoteMessage?.data, navigationRef);
        }
      });

      // App opened from a QUIT state via notification
      messaging()
        .getInitialNotification()
        .then((remoteMessage: any) => {
          if (remoteMessage && navigationRef?.isReady && navigationRef.isReady()) {
            handleNotificationNavigation(remoteMessage?.data, navigationRef);
          }
        });

      // Background message handler
      messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
        console.log('[NotificationService] FCM Background message:', remoteMessage);
      });
    }
  } catch (error) {
    console.warn('[NotificationService] Failed to setup push notification listeners:', error);
  }

  return () => {
    cleanups.forEach(fn => fn());
  };
};

function handleNotificationNavigation(data: any, navigationRef: any) {
  if (!data) return;
  const type = data.type || '';
  if (
    type === 'session_booked' ||
    type === 'booking_confirmed' ||
    type === 'booking_rejected' ||
    type === 'booking_cancelled' ||
    type === 'cancellation_approved' ||
    type === 'cancellation_rejected' ||
    type === 'practice_slots' ||
    type === 'schedule_change' ||
    type === 'batch_assigned'
  ) {
    navigationRef.navigate('Notifications');
  } else if (type === 'new_video' || type === 'material') {
    navigationRef.navigate('Videos');
  } else if (type === 'announcement') {
    navigationRef.navigate('Notifications');
  } else if (type === 'new_result' || type === 'certificate') {
    navigationRef.navigate('Results');
  } else {
    navigationRef.navigate('Notifications');
  }
}
