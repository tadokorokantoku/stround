import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAuth } from './useAuth';

// 通知の表示設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [notification, setNotification] = useState<Notifications.Notification>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // プッシュ通知の許可を取得
  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        alert('プッシュ通知の許可が得られませんでした');
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
    } else {
      alert('プッシュ通知は実機でのみ動作します');
    }

    return token;
  };

  // プッシュトークンをサーバーに送信
  const sendPushTokenToServer = async (token: string) => {
    if (!user?.token) return;

    try {
      // TODO: サーバーにプッシュトークンを保存するAPIを実装
      console.log('プッシュトークンをサーバーに送信:', token);
      // await api.post('/api/users/push-token', { token }, {
      //   headers: { Authorization: `Bearer ${user.token}` }
      // });
    } catch (error) {
      console.error('プッシュトークン送信エラー:', error);
    }
  };

  // 通知をタップした時の処理
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    console.log('通知タップ:', data);
    
    // 通知の種類に応じて画面遷移などの処理を行う
    if (data.type === 'like') {
      // いいね通知の場合、該当の投稿画面に遷移
      console.log('いいね通知:', data.related_id);
    } else if (data.type === 'comment' || data.type === 'reply') {
      // コメント/返信通知の場合、該当の投稿画面に遷移
      console.log('コメント通知:', data.related_id);
    } else if (data.type === 'follow') {
      // フォロー通知の場合、フォロワーのプロフィール画面に遷移
      console.log('フォロー通知:', data.related_id);
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        sendPushTokenToServer(token);
      }
    });

    // 通知受信時のリスナー
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('通知受信:', notification);
      setNotification(notification);
    });

    // 通知タップ時のリスナー
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  // ローカル通知の送信（テスト用）
  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: { seconds: 1 },
    });
  };

  return {
    expoPushToken,
    notification,
    sendLocalNotification,
  };
}