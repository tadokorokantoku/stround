import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Surface, Text, Avatar, IconButton } from 'react-native-paper';
import { CommentsList } from './CommentsList';
import { CommentInput } from './CommentInput';
import { UserTrackLikeButton } from './UserTrackLikeButton';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Track {
  spotify_id: string;
  title: string;
  artist: string;
  album: string | null;
  image_url: string | null;
  preview_url: string | null;
  external_url: string;
}

interface UserTrack {
  id: string;
  user_id: string;
  category_id: string;
  spotify_track_id: string;
  comment: string | null;
  comment_count?: number;
  created_at: string;
  profiles: Profile;
  categories: Category;
  tracks?: Track;
}

interface UserTrackCardProps {
  userTrack: UserTrack;
  onUserPress?: (userId: string) => void;
  onTrackPress?: (trackId: string) => void;
}

export const UserTrackCard: React.FC<UserTrackCardProps> = ({
  userTrack,
  onUserPress,
  onTrackPress,
}) => {
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const handleUserPress = () => {
    onUserPress?.(userTrack.profiles.id);
  };

  const handleCommentPress = () => {
    setCommentsVisible(true);
  };

  const handleCommentPosted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCloseComments = () => {
    setCommentsVisible(false);
  };

  return (
    <>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
            <Avatar.Image
              size={40}
              source={
                userTrack.profiles.avatar_url
                  ? { uri: userTrack.profiles.avatar_url }
                  : undefined
              }
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.displayName}>
                {userTrack.profiles.display_name || userTrack.profiles.username}
              </Text>
              <Text style={styles.username}>
                @{userTrack.profiles.username} · {formatDate(userTrack.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.categoryContainer}>
          <Text style={styles.categoryName}>{userTrack.categories.name}</Text>
        </View>

        {userTrack.tracks && (
          <TouchableOpacity 
            style={styles.trackInfo}
            onPress={() => onTrackPress?.(userTrack.tracks!.spotify_id)}
          >
            {userTrack.tracks.image_url && (
              <Avatar.Image
                size={60}
                source={{ uri: userTrack.tracks.image_url }}
                style={styles.trackImage}
              />
            )}
            <View style={styles.trackDetails}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {userTrack.tracks.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {userTrack.tracks.artist}
              </Text>
              {userTrack.tracks.album && (
                <Text style={styles.trackAlbum} numberOfLines={1}>
                  {userTrack.tracks.album}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {userTrack.comment && (
          <View style={styles.userComment}>
            <Text style={styles.commentText}>{userTrack.comment}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCommentPress}>
            <IconButton
              icon="comment-outline"
              size={20}
              onPress={handleCommentPress}
              style={styles.iconButton}
            />
            <Text style={styles.actionCount}>
              {userTrack.comment_count || 0}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionButton}>
            <UserTrackLikeButton userTrackId={userTrack.id} />
          </View>
        </View>
      </Surface>

      <Modal
        visible={commentsVisible}
        onRequestClose={handleCloseComments}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>コメント</Text>
            <TouchableOpacity onPress={handleCloseComments}>
              <IconButton icon="close" size={24} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <CommentsList 
              userTrackId={userTrack.id} 
              refreshTrigger={refreshTrigger}
            />
          </View>
          
          <CommentInput
            userTrackId={userTrack.id}
            onCommentPosted={handleCommentPosted}
          />
        </View>
      </Modal>
    </>
  );
};

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
  categoryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  trackInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  trackImage: {
    marginRight: 12,
  },
  trackDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  trackAlbum: {
    fontSize: 12,
    color: '#999',
  },
  userComment: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    fontStyle: 'italic',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
});