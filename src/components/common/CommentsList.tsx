import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { CommentItem } from './CommentItem';
import { apiService } from '../../services/api';

interface CommentProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  user_track_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  profiles: CommentProfile;
  replies?: Comment[];
}

interface CommentsResponse {
  comments: Comment[];
  page: number;
  limit: number;
  total: number;
}

interface CommentsListProps {
  userTrackId: string;
  refreshTrigger?: number; // 外部から更新をトリガーするためのプロップ
}

export const CommentsList: React.FC<CommentsListProps> = ({ 
  userTrackId,
  refreshTrigger 
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchComments = async (pageNum: number = 1, append: boolean = false) => {
    try {
      const response: CommentsResponse = await apiService.getComments(userTrackId, pageNum);
      
      if (append) {
        setComments(prev => [...prev, ...response.comments]);
      } else {
        setComments(response.comments);
      }
      
      setHasMore(response.comments.length === response.limit);
      setPage(pageNum + 1);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      Alert.alert('エラー', 'コメントの取得に失敗しました');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    try {
      await fetchComments(1, false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      await fetchComments(page, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReply = async (parentCommentId: string, content: string) => {
    try {
      await apiService.createReply(userTrackId, content, parentCommentId);
      await handleRefresh(); // コメントツリーを再取得
    } catch (error) {
      console.error('Reply failed:', error);
      throw error;
    }
  };

  const handleUpdate = async () => {
    await handleRefresh(); // コメントリストを更新
  };

  useEffect(() => {
    const loadInitialComments = async () => {
      setLoading(true);
      try {
        await fetchComments(1, false);
      } finally {
        setLoading(false);
      }
    };

    loadInitialComments();
  }, [userTrackId]);

  // 外部からの更新トリガーに反応
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      handleRefresh();
    }
  }, [refreshTrigger]);

  const renderComment = ({ item }: { item: Comment }) => (
    <CommentItem
      comment={item}
      userTrackId={userTrackId}
      onReply={handleReply}
      onUpdate={handleUpdate}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>まだコメントがありません</Text>
      <Text style={styles.emptySubtext}>最初のコメントを投稿してみましょう</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>コメントを読み込み中...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={comments}
      renderItem={renderComment}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  footerLoader: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});