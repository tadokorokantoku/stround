import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';

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
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user?.token) return;

    try {
      const response = await api.get('/api/notifications', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      if (response.data) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('通知取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user?.token) return;

    try {
      const response = await api.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      if (response.data) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('未読数取得エラー:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user?.token) return;

    try {
      await api.put(`/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

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
    if (!user?.token) return;

    try {
      await api.put('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

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
          
          // 新しい通知を追加
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
          
          // 通知の既読状態を更新
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

    // 初期データの取得
    fetchNotifications();
    fetchUnreadCount();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.token]);

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