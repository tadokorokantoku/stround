import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { UserTrack, Track, User, Comment } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import CommentsList from '../../components/common/CommentsList';
import CommentInput from '../../components/common/CommentInput';
import UserTrackLikeButton from '../../components/common/UserTrackLikeButton';
import MusicPlayer from '../../components/music/MusicPlayer';

type TrackDetailScreenRouteProp = RouteProp<RootStackParamList, 'TrackDetail'>;
type TrackDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TrackDetail'>;

interface Props {
  route: TrackDetailScreenRouteProp;
  navigation: TrackDetailScreenNavigationProp;
}

interface UserWithTrack {
  user: User;
  userTrack: UserTrack;
}

export default function TrackDetailScreen({ route }: Props) {
  const { userTrack } = route.params;
  const { user: currentUser } = useAuthStore();
  const [track, setTrack] = useState<Track | null>(null);
  const [usersWithTrack, setUsersWithTrack] = useState<UserWithTrack[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    loadTrackDetails();
  }, [userTrack.spotifyTrackId]);

  const loadTrackDetails = async () => {
    try {
      setLoading(true);

      // 楽曲情報を取得
      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .select('*')
        .eq('spotify_id', userTrack.spotifyTrackId)
        .single();

      if (trackError) {
        console.error('Track loading error:', trackError);
      } else if (trackData) {
        setTrack({
          spotifyId: trackData.spotify_id,
          title: trackData.title,
          artist: trackData.artist,
          album: trackData.album,
          imageUrl: trackData.image_url,
          previewUrl: trackData.preview_url,
          externalUrl: trackData.external_url,
          durationMs: trackData.duration_ms,
          createdAt: trackData.created_at,
        });
      }

      // この楽曲を登録している他のユーザーを取得
      const { data: userTracksData, error: userTracksError } = await supabase
        .from('user_tracks')
        .select(`
          *,
          user:profiles(*),
          category:categories(*)
        `)
        .eq('spotify_track_id', userTrack.spotifyTrackId)
        .order('created_at', { ascending: false });

      if (userTracksError) {
        console.error('User tracks loading error:', userTracksError);
      } else if (userTracksData) {
        const usersData = userTracksData.map(ut => ({
          user: {
            id: ut.user.id,
            username: ut.user.username,
            displayName: ut.user.display_name,
            bio: ut.user.bio,
            profileImageUrl: ut.user.avatar_url,
            createdAt: ut.user.created_at,
            updatedAt: ut.user.updated_at,
          },
          userTrack: {
            id: ut.id,
            userId: ut.user_id,
            categoryId: ut.category_id,
            spotifyTrackId: ut.spotify_track_id,
            comment: ut.comment,
            createdAt: ut.created_at,
            category: ut.category ? {
              id: ut.category.id,
              name: ut.category.name,
              description: ut.category.description,
              isDefault: ut.category.is_default,
              createdAt: ut.category.created_at,
            } : undefined,
          },
        }));
        setUsersWithTrack(usersData);
      }

      // コメントを取得
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('user_track_id', userTrack.id)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('Comments loading error:', commentsError);
      } else if (commentsData) {
        const formattedComments = commentsData.map(comment => ({
          id: comment.id,
          userTrackId: comment.user_track_id,
          userId: comment.user_id,
          content: comment.content,
          parentCommentId: comment.parent_comment_id,
          createdAt: comment.created_at,
          user: comment.user ? {
            id: comment.user.id,
            username: comment.user.username,
            displayName: comment.user.display_name,
            bio: comment.user.bio,
            profileImageUrl: comment.user.avatar_url,
            createdAt: comment.user.created_at,
            updatedAt: comment.user.updated_at,
          } : undefined,
        }));
        setComments(formattedComments);
      }

      // いいね数を取得
      const { count: likeCountData, error: likeCountError } = await supabase
        .from('likes')
        .select('*', { count: 'exact' })
        .eq('user_track_id', userTrack.id);

      if (!likeCountError && likeCountData !== null) {
        setLikeCount(likeCountData);
      }

    } catch (error) {
      console.error('Error loading track details:', error);
      Alert.alert('エラー', '楽曲詳細の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAdded = (newComment: Comment) => {
    setComments(prev => [newComment, ...prev]);
  };

  const openSpotify = async () => {
    if (track?.externalUrl) {
      try {
        const { Linking } = require('react-native');
        await Linking.openURL(track.externalUrl);
      } catch (error) {
        console.error('Error opening Spotify:', error);
        Alert.alert('エラー', 'Spotifyを開けませんでした');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1db954" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 楽曲情報セクション */}
      {track && (
        <View style={styles.trackSection}>
          <View style={styles.trackInfo}>
            <Image source={{ uri: track.imageUrl }} style={styles.albumArt} />
            <View style={styles.trackDetails}>
              <Text style={styles.trackTitle}>{track.title}</Text>
              <Text style={styles.trackArtist}>{track.artist}</Text>
              {track.album && <Text style={styles.trackAlbum}>{track.album}</Text>}
            </View>
          </View>
          
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.spotifyButton} onPress={openSpotify}>
              <Ionicons name="logo-spotify" size={20} color="#fff" />
              <Text style={styles.spotifyButtonText}>Spotifyで開く</Text>
            </TouchableOpacity>
            
            {track.previewUrl && (
              <MusicPlayer 
                previewUrl={track.previewUrl}
                title={track.title}
                artist={track.artist}
              />
            )}
          </View>
        </View>
      )}

      {/* いいねボタン */}
      <View style={styles.likeSection}>
        <UserTrackLikeButton 
          userTrack={userTrack}
          onLikeCountChange={setLikeCount}
        />
        <Text style={styles.likeCount}>{likeCount}件のいいね</Text>
      </View>

      {/* この楽曲を登録しているユーザー一覧 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>この楽曲を登録しているユーザー</Text>
        {usersWithTrack.map(({ user, userTrack: ut }) => (
          <View key={`${user.id}-${ut.id}`} style={styles.userItem}>
            <View style={styles.userInfo}>
              <Image 
                source={{ uri: user.profileImageUrl || 'https://via.placeholder.com/40' }} 
                style={styles.avatar}
              />
              <View style={styles.userDetails}>
                <Text style={styles.username}>{user.displayName || user.username}</Text>
                <Text style={styles.category}>{ut.category?.name}</Text>
                {ut.comment && <Text style={styles.userComment}>{ut.comment}</Text>}
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* コメントセクション */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>コメント ({comments.length})</Text>
        
        {currentUser && (
          <CommentInput
            userTrackId={userTrack.id}
            onCommentAdded={handleCommentAdded}
          />
        )}

        <CommentsList 
          comments={comments}
          userTrackId={userTrack.id}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  trackSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  trackInfo: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  albumArt: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 15,
  },
  trackDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  trackArtist: {
    fontSize: 16,
    color: '#666',
    marginBottom: 3,
  },
  trackAlbum: {
    fontSize: 14,
    color: '#999',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1db954',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  spotifyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  likeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  likeCount: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  userItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  userInfo: {
    flexDirection: 'row',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  category: {
    fontSize: 14,
    color: '#1db954',
    fontWeight: '600',
    marginBottom: 3,
  },
  userComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});