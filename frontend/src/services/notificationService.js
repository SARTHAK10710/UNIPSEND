import messaging from '@react-native-firebase/messaging';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import api from './api';

export const requestPermission = async () => {
  try {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log(
        '[Notifications] iOS permission:',
        enabled ? 'granted' : 'denied'
      );
      return enabled;
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  } catch (err) {
    console.log('[Notifications] permission error:', err.message);
    return false;
  }
};

export const initNotifications = async () => {
  try {
    const permitted = await requestPermission();
    if (!permitted) {
      console.log('[Notifications] permission not granted');
      return null;
    }

    const token = await messaging().getToken();
    console.log('[Notifications] FCM token:', token);

    if (token) {
      await api.post('/user/fcm-token', { token });
      console.log('[Notifications] token saved to backend');
    }

    return token;
  } catch (err) {
    console.log('[Notifications] init error:', err.message);
    return null;
  }
};

export const onForegroundMessage = (callback) => {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log('[Notifications] foreground message:', remoteMessage);
    callback && callback(remoteMessage);
  });
  return unsubscribe;
};

export const onNotificationTap = (navigation) => {
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('[Notifications] opened from quit:', remoteMessage);
        handleNavigation(navigation, remoteMessage.data?.screen);
      }
    });

  const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('[Notifications] opened from background:', remoteMessage);
    handleNavigation(navigation, remoteMessage.data?.screen);
  });

  return unsubscribe;
};

const handleNavigation = (navigation, screen) => {
  if (!navigation || !screen) return;

  const validScreens = [
    'Home',
    'Spending',
    'Investment',
    'Rewards',
    'Subscriptions',
    'Profile',
  ];

  if (validScreens.includes(screen)) {
    navigation.navigate(screen);
  }
};

export const showLocalAlert = (remoteMessage) => {
  const { title, body } = remoteMessage?.notification || {};

  if (title && body) {
    Alert.alert(title, body, [
      { text: 'Dismiss' },
      { text: 'View', onPress: () => {} },
    ]);
  }
};

export const onTokenRefresh = () => {
  return messaging().onTokenRefresh(async (token) => {
    console.log('[Notifications] token refreshed:', token);
    try {
      await api.post('/user/fcm-token', { token });
    } catch (err) {
      console.log('[Notifications] token refresh save error:', err.message);
    }
  });
};

export default {
  requestPermission,
  initNotifications,
  onForegroundMessage,
  onNotificationTap,
  showLocalAlert,
  onTokenRefresh,
};
