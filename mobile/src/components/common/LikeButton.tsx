import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '../../constants';

interface LikeButtonProps {
  postId: string;
  initialLikeCount?: number;
  initialIsLiked?: boolean;
  onLikeChange?: (isLiked: boolean, count: number) => void;
}

export default function LikeButton({ 
  postId, 
  initialLikeCount = 0, 
  initialIsLiked = false,
  onLikeChange 
}: LikeButtonProps) {
  const { session } = useAuthStore();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    // 初期状態を取得
    fetchLikeStatus();
    fetchLikeCount();
  }, [postId]);

  const fetchLikeStatus = async () => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/likes/status/${postId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.isLiked);
      }
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  const fetchLikeCount = async () => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/likes/count/${postId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLikeCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching like count:', error);
    }
  };

  const handleLikePress = async () => {
    if (!session?.access_token) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const url = isLiked 
        ? `${API_BASE_URL}/api/likes/${postId}`
        : `${API_BASE_URL}/api/likes`;

      const body = !isLiked ? JSON.stringify({ post_id: postId }) : undefined;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      if (response.ok) {
        const newIsLiked = !isLiked;
        const newCount = newIsLiked ? likeCount + 1 : likeCount - 1;
        
        setIsLiked(newIsLiked);
        setLikeCount(newCount);
        
        onLikeChange?.(newIsLiked, newCount);
      } else {
        const errorData = await response.json();
        Alert.alert('エラー', errorData.error || 'いいねの処理に失敗しました');
      }
    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('エラー', 'ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <IconButton
        icon={isLiked ? 'heart' : 'heart-outline'}
        iconColor={isLiked ? '#e91e63' : '#666'}
        size={24}
        onPress={handleLikePress}
        disabled={isLoading}
        style={styles.button}
      />
      <Text style={[styles.count, isLiked && styles.likedCount]}>
        {likeCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    margin: 0,
  },
  count: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  likedCount: {
    color: '#e91e63',
    fontWeight: 'bold',
  },
});