import React, { useState } from 'react';
import { View, StyleSheet, Image, Pressable, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, IconButton, Menu, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { apiService } from '../../services/api';
import { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface TimelinePostProps {
  post: {
    id: string;
    comment: string | null;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
    categories: {
      id: string;
      name: string;
      description: string | null;
    };
    music: {
      id: string;
      title: string;
      artist: string;
      album: string | null;
      image_url: string | null;
      preview_url: string | null;
      external_url: string;
    } | null;
    likes_count: number;
    is_liked_by_user: boolean;
    comments_count: number;
  };
  currentUserId?: string;
  onLikePress?: () => void;
  onCommentPress?: () => void;
}

export default function TimelinePost({ 
  post, 
  currentUserId, 
  onLikePress, 
  onCommentPress 
}: TimelinePostProps) {
  const navigation = useNavigation<NavigationProp>();
  const [isLiked, setIsLiked] = useState(post.is_liked_by_user);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [menuVisible, setMenuVisible] = useState(false);
  const [liking, setLiking] = useState(false);

  const handleLikePress = async () => {
    if (liking) return;
    
    try {
      setLiking(true);
      const previousLiked = isLiked;
      const previousCount = likesCount;
      
      // Optimistic update
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
      
      if (isLiked) {
        await apiService.unlikeUserTrack(post.id);
      } else {
        await apiService.likeUserTrack(post.id);
      }
      
      onLikePress?.();
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked);
      setLikesCount(likesCount);
      
      console.error('Failed to toggle like:', error);
      Alert.alert('エラー', 'いいねの操作に失敗しました');
    } finally {
      setLiking(false);
    }
  };

  const handlePlayPreview = () => {
    if (post.music?.preview_url) {
      // TODO: Implement audio preview
      Alert.alert('プレビュー', '音楽プレビュー機能は実装予定です');
    } else {
      Alert.alert('プレビューなし', 'この楽曲にはプレビューがありません');
    }
  };

  const handleOpenSpotify = () => {
    if (post.music?.external_url) {
      // TODO: Open Spotify link
      Alert.alert('Spotify', 'Spotifyで開く機能は実装予定です');
    }
  };

  const handleTrackPress = () => {
    if (post.music) {
      // Convert post to UserTrack format for navigation
      const userTrack = {
        id: post.id,
        userId: post.profiles.id,
        categoryId: post.categories.id,
        spotifyTrackId: post.music.id,
        comment: post.comment,
        createdAt: post.created_at,
        user: {
          id: post.profiles.id,
          username: post.profiles.username,
          displayName: post.profiles.display_name,
          bio: null,
          profileImageUrl: post.profiles.avatar_url,
          createdAt: '',
          updatedAt: '',
        },
        category: {
          id: post.categories.id,
          name: post.categories.name,
          description: post.categories.description,
          isDefault: true,
          createdAt: '',
        },
        track: {
          spotifyId: post.music.id,
          title: post.music.title,
          artist: post.music.artist,
          album: post.music.album,
          imageUrl: post.music.image_url,
          previewUrl: post.music.preview_url,
          externalUrl: post.music.external_url,
          createdAt: '',
        }
      };
      
      navigation.navigate('TrackDetail', { userTrack });
    }
  };

  const relativeTime = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {post.profiles.avatar_url ? (
            <Image source={{ uri: post.profiles.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
              <Text style={styles.placeholderText}>
                {(post.profiles.display_name || post.profiles.username).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.displayName}>
              {post.profiles.display_name || post.profiles.username}
            </Text>
            <Text style={styles.username}>@{post.profiles.username}</Text>
            <Text style={styles.timestamp}>{relativeTime}</Text>
          </View>
        </View>
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item onPress={handleOpenSpotify} title="Spotifyで開く" />
          {post.music?.preview_url && (
            <Menu.Item onPress={handlePlayPreview} title="プレビュー再生" />
          )}
        </Menu>
      </View>

      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{post.categories.name}</Text>
      </View>

      {post.music && (
        <TouchableOpacity style={styles.musicInfo} onPress={handleTrackPress}>
          {post.music.image_url && (
            <Image source={{ uri: post.music.image_url }} style={styles.albumArt} />
          )}
          <View style={styles.musicDetails}>
            <Text style={styles.trackTitle} numberOfLines={2}>
              {post.music.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {post.music.artist}
            </Text>
            {post.music.album && (
              <Text style={styles.album} numberOfLines={1}>
                {post.music.album}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {post.comment && (
        <View style={styles.commentSection}>
          <Text style={styles.comment}>{post.comment}</Text>
        </View>
      )}

      <Divider />
      
      <View style={styles.actions}>
        <Pressable 
          style={styles.actionButton}
          onPress={handleLikePress}
          disabled={liking}
        >
          <IconButton
            icon={isLiked ? 'heart' : 'heart-outline'}
            iconColor={isLiked ? '#e91e63' : '#666'}
            size={20}
          />
          <Text style={[styles.actionText, isLiked && { color: '#e91e63' }]}>
            {likesCount}
          </Text>
        </Pressable>

        <Pressable 
          style={styles.actionButton}
          onPress={onCommentPress}
        >
          <IconButton
            icon="comment-outline"
            iconColor="#666"
            size={20}
          />
          <Text style={styles.actionText}>{post.comments_count}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 8,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  placeholderAvatar: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  musicInfo: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
  },
  albumArt: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  musicDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  artist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  album: {
    fontSize: 12,
    color: '#999',
  },
  commentSection: {
    padding: 16,
    paddingTop: 0,
  },
  comment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
});