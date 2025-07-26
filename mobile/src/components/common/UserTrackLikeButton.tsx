import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { apiService } from '../../services/api';

interface UserTrackLikeButtonProps {
  userTrackId: string;
  onLikeChange?: (isLiked: boolean, count: number) => void;
}

export const UserTrackLikeButton: React.FC<UserTrackLikeButtonProps> = ({ 
  userTrackId,
  onLikeChange 
}) => {
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLikeStatus();
  }, [userTrackId]);

  const fetchLikeStatus = async () => {
    if (!user) return;

    try {
      // APIサービスにいいね状態を取得する関数を追加する必要があります
      const response = await apiService.getLikes(userTrackId);
      
      // レスポンス形式に応じて調整
      if (response.likes) {
        const userLike = response.likes.find((like: any) => like.user_id === user.id);
        setIsLiked(!!userLike);
        setLikeCount(response.likes.length);
      }
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  const handleLikePress = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    try {
      if (isLiked) {
        await apiService.unlikeUserTrack(userTrackId);
      } else {
        await apiService.likeUserTrack(userTrackId);
      }

      const newIsLiked = !isLiked;
      const newCount = newIsLiked ? likeCount + 1 : likeCount - 1;
      
      setIsLiked(newIsLiked);
      setLikeCount(newCount);
      
      onLikeChange?.(newIsLiked, newCount);
    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('エラー', 'いいねの処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <IconButton
        icon={isLiked ? 'heart' : 'heart-outline'}
        iconColor={isLiked ? '#e91e63' : '#666'}
        size={20}
        onPress={handleLikePress}
        disabled={isLoading}
        style={styles.button}
      />
      <Text style={[styles.count, isLiked && styles.likedCount]}>
        {likeCount}
      </Text>
    </View>
  );
};

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