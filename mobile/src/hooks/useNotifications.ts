import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { apiService } from '../services/api';

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  related_user?: {
    id: string;
    username: string;
    display_name?: string;
    profile_image_url?: string;
  };
}

export const useNotifications = () => {
  const { user, session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!session?.access_token) return;
    try {
      const response = await apiService.getNotifications();
      if (response) {
        setNotifications(response);
      }
    } catch (error) {
      console.error('通知取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!session?.access_token) return;
    try {
      const response = await apiService.getUnreadNotificationCount();
      if (response && typeof response.count === 'number') {
        setUnreadCount(response.count);
      }
    } catch (error) {
      console.error('未読数取得エラー:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!session?.access_token) return;
    try {
      await apiService.markNotificationAsRead(notificationId);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      await fetchUnreadCount();
    } catch (error) {
      console.error('既読処理エラー:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!session?.access_token) return;
    try {
      await apiService.markAllNotificationsAsRead();
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          is_read: true
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('全既読処理エラー:', error);
    }
  };

  // リアルタイム通知の監視
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('新しい通知:', payload.new);
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('通知更新:', payload.new);
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(notification =>
              notification.id === updatedNotification.id
                ? updatedNotification
                : notification
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('通知チャンネル状態:', status);
      });

    fetchNotifications();
    fetchUnreadCount();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, session?.access_token]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
};