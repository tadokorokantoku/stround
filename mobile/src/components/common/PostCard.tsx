import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Surface, Text, Avatar, IconButton, Portal, Modal } from 'react-native-paper';
import LikeButton from './LikeButton';
import LikesList from './LikesList';

interface Post {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  like_count?: number;
  is_liked?: boolean;
  comment_count?: number;
}

interface PostCardProps {
  post: Post;
  onCommentPress?: (postId: string) => void;
  onUserPress?: (userId: string) => void;
}

export default function PostCard({ post, onCommentPress, onUserPress }: PostCardProps) {
  const [likesModalVisible, setLikesModalVisible] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}日前`;
    } else if (diffHours > 0) {
      return `${diffHours}時間前`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes}分前` : '今';
    }
  };

  const handleLikeCountPress = () => {
    setLikesModalVisible(true);
  };

  const handleUserPress = () => {
    onUserPress?.(post.profiles.id);
  };

  return (
    <>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
            <Avatar.Image
              size={40}
              source={
                post.profiles.avatar_url
                  ? { uri: post.profiles.avatar_url }
                  : undefined
              }
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.displayName}>
                {post.profiles.display_name || post.profiles.username}
              </Text>
              <Text style={styles.username}>
                @{post.profiles.username} · {formatDate(post.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.postText}>{post.content}</Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionButton}>
            <IconButton
              icon="comment-outline"
              size={20}
              onPress={() => onCommentPress?.(post.id)}
              style={styles.iconButton}
            />
            <Text style={styles.actionCount}>
              {post.comment_count || 0}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleLikeCountPress}
          >
            <LikeButton
              postId={post.id}
              initialLikeCount={post.like_count}
              initialIsLiked={post.is_liked}
            />
          </TouchableOpacity>
        </View>
      </Surface>

      <Portal>
        <Modal
          visible={likesModalVisible}
          onDismiss={() => setLikesModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <LikesList
            postId={post.id}
            onUserPress={(userId) => {
              setLikesModalVisible(false);
              onUserPress?.(userId);
            }}
          />
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  postText: {
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 32,
  },
  iconButton: {
    margin: 0,
  },
  actionCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    height: '70%',
  },
});