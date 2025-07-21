import React, { useState, useCallback } from 'react';
import { 
  FlatList, 
  RefreshControl, 
  View, 
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import TimelinePost from './TimelinePost';
import { apiService } from '../../services/api';

interface TimelineListProps {
  posts: any[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  currentUserId?: string;
  onRefresh: () => void;
  onLoadMore: () => void;
  onPostUpdate?: () => void;
}

export default function TimelineList({
  posts,
  loading,
  refreshing,
  hasMore,
  currentUserId,
  onRefresh,
  onLoadMore,
  onPostUpdate,
}: TimelineListProps) {
  const renderPost = useCallback(
    ({ item }: { item: any }) => (
      <TimelinePost
        post={item}
        currentUserId={currentUserId}
        onLikePress={onPostUpdate}
        onCommentPress={() => {
          // TODO: Navigate to comments screen
          console.log('Navigate to comments for post:', item.id);
        }}
      />
    ),
    [currentUserId, onPostUpdate]
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#1976d2" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.emptyText}>タイムラインを読み込み中...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>投稿がありません</Text>
        <Text style={styles.emptyText}>
          フォローしているユーザーの投稿がここに表示されます
        </Text>
      </View>
    );
  };

  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={keyExtractor}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#1976d2']}
        />
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});