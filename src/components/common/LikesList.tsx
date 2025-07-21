import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Avatar, Surface, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '../../constants';

interface Like {
  id: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface LikesListProps {
  postId: string;
  onUserPress?: (userId: string) => void;
}

export default function LikesList({ postId, onUserPress }: LikesListProps) {
  const { session } = useAuthStore();
  const [likes, setLikes] = useState<Like[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);


  useEffect(() => {
    fetchLikes(1);
  }, [postId]);

  const fetchLikes = async (pageNumber: number) => {
    if (!session?.access_token) return;

    try {
      const isFirstPage = pageNumber === 1;
      if (isFirstPage) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/likes/post/${postId}?page=${pageNumber}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (isFirstPage) {
          setLikes(data.likes || []);
        } else {
          setLikes(prev => [...prev, ...(data.likes || [])]);
        }
        
        setHasMore(data.likes?.length === 20);
        setPage(pageNumber);
      } else {
        const errorData = await response.json();
        Alert.alert('エラー', errorData.error || 'いいね一覧の取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
      Alert.alert('エラー', 'ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      fetchLikes(page + 1);
    }
  };

  const renderLike = ({ item }: { item: Like }) => (
    <Surface style={styles.likeItem} elevation={1}>
      <Avatar.Image
        size={40}
        source={
          item.profiles.avatar_url
            ? { uri: item.profiles.avatar_url }
            : undefined
        }
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>
          {item.profiles.display_name || item.profiles.username}
        </Text>
        <Text style={styles.username}>@{item.profiles.username}</Text>
      </View>
    </Surface>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>いいね一覧を読み込み中...</Text>
      </View>
    );
  }

  if (likes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>まだいいねがありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>いいね（{likes.length}）</Text>
      <FlatList
        data={likes}
        renderItem={renderLike}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  likeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
  },
  avatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});