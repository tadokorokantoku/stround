import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { 
  Text, 
  Card, 
  Avatar, 
  IconButton,
  Button,
  ActivityIndicator,
  Chip
} from 'react-native-paper';
import { useNotifications } from '../../hooks/useNotifications';

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

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    await fetchUnreadCount();
    setRefreshing(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return 'heart';
      case 'comment':
        return 'comment';
      case 'reply':
        return 'reply';
      case 'follow':
        return 'account-plus';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like':
        return '#FF6B6B';
      case 'comment':
        return '#4ECDC4';
      case 'reply':
        return '#45B7D1';
      case 'follow':
        return '#96CEB4';
      default:
        return '#95E1D3';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return '今';
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}日前`;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <Card 
      style={[
        styles.notificationCard,
        !item.is_read && styles.unreadNotification
      ]}
    >
      <TouchableOpacity
        onPress={() => !item.is_read && markAsRead(item.id)}
        style={styles.notificationContent}
      >
        <View style={styles.notificationHeader}>
          <Avatar.Image
            size={48}
            source={{ 
              uri: item.related_user?.profile_image_url || 'https://via.placeholder.com/48' 
            }}
          />
          <View style={styles.notificationMain}>
            <View style={styles.notificationTitleRow}>
              <IconButton
                icon={getNotificationIcon(item.type)}
                iconColor={getNotificationColor(item.type)}
                size={20}
                style={styles.notificationTypeIcon}
              />
              {!item.is_read && (
                <Chip
                  style={styles.unreadChip}
                  textStyle={styles.unreadChipText}
                  compact
                >
                  新着
                </Chip>
              )}
            </View>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>通知を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>通知</Text>
        {unreadCount > 0 && (
          <Button
            mode="text"
            onPress={markAllAsRead}
            style={styles.markAllButton}
          >
            すべて既読
          </Button>
        )}
      </View>

      {unreadCount > 0 && (
        <Text style={styles.unreadCountText}>
          {unreadCount}件の未読通知があります
        </Text>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>通知はありません</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.notificationsList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  markAllButton: {
    marginLeft: 8,
  },
  unreadCountText: {
    padding: 16,
    paddingBottom: 8,
    fontSize: 14,
    color: '#666',
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  notificationsList: {
    padding: 16,
    paddingTop: 8,
  },
  notificationCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    backgroundColor: '#f8f9ff',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationMain: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTypeIcon: {
    margin: 0,
    marginRight: 8,
  },
  unreadChip: {
    height: 24,
    backgroundColor: '#2196F3',
    marginLeft: 'auto',
  },
  unreadChipText: {
    fontSize: 12,
    color: '#fff',
  },
  notificationMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
});