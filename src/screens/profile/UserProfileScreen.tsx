import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Alert } from 'react-native';
import { 
  Text, 
  Button, 
  Card, 
  Avatar, 
  Chip,
  Surface,
  IconButton,
  ActivityIndicator 
} from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import MusicPlayer from '../../components/music/MusicPlayer';
import TrackItem from '../../components/music/TrackItem';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';

interface Category {
  id: string;
  name: string;
  description: string | null;
  track_count: number;
  is_default: boolean;
}

interface UserTrack {
  id: string;
  comment: string | null;
  created_at: string;
  music: {
    spotify_id: string;
    title: string;
    artist: string;
    album: string;
    image_url: string | null;
    preview_url: string | null;
    external_url: string;
    duration_ms: number | null;
  };
  categories: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  followers: { count: number }[];
  following: { count: number }[];
}

interface UserProfileScreenProps {
  route: {
    params: {
      userId: string;
    };
  };
  navigation: any;
}

export default function UserProfileScreen({ route, navigation }: UserProfileScreenProps) {
  const { userId } = route.params;
  const { user } = useAuthStore();
  const { currentTrack, isPlayerVisible, playTrack, closePlayer } = useMusicPlayer();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    fetchProfile();
    fetchCategories();
    if (!isOwnProfile) {
      checkFollowStatus();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchUserTracks(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const fetchProfile = async () => {
    try {
      // TODO: API エンドポイントを使用してプロフィールを取得
      // 現在はSupabaseクライアントを直接使用
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          followers:follows!follows_following_id_fkey(count),
          following:follows!follows_follower_id_fkey(count)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
      Alert.alert('エラー', 'プロフィールの取得に失敗しました', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // TODO: userTracks APIを使用してカテゴリを取得
      // 現在はSupabaseクライアントを直接使用
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at');

      if (error) throw error;

      // カテゴリにtrack_countを追加（暫定実装）
      const categoriesWithCount = data?.map(cat => ({
        ...cat,
        track_count: 0 // TODO: 実際の楽曲数を取得
      })) || [];

      setCategories(categoriesWithCount);
      
      // 最初のカテゴリを選択
      if (categoriesWithCount.length > 0) {
        setSelectedCategoryId(categoriesWithCount[0].id);
      }
    } catch (error) {
      console.error('カテゴリ取得エラー:', error);
    }
  };

  const fetchUserTracks = async (categoryId: string) => {
    setTracksLoading(true);
    try {
      // TODO: userTracks APIを使用
      // 現在はSupabaseクライアントを直接使用
      const { data, error } = await supabase
        .from('user_tracks')
        .select(`
          *,
          categories!user_tracks_category_id_fkey(*),
          music!user_tracks_spotify_track_id_fkey(*)
        `)
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserTracks(data || []);
    } catch (error) {
      console.error('楽曲取得エラー:', error);
      Alert.alert('エラー', '楽曲の取得に失敗しました');
    } finally {
      setTracksLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setIsFollowing(!!data);
    } catch (error) {
      console.error('フォロー状態確認エラー:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || followLoading) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // アンフォロー
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // フォロー
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId,
          });

        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('フォロー処理エラー:', error);
      Alert.alert('エラー', 'フォロー処理に失敗しました');
    } finally {
      setFollowLoading(false);
    }
  };

  const renderTrackItem = ({ item }: { item: UserTrack }) => (
    <TrackItem
      userTrack={item}
      onPlay={playTrack}
      showCategory={false}
      showUser={false}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
      </View>

      {/* プロフィールヘッダー */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <Avatar.Text
              size={80}
              label={profile?.username?.charAt(0)?.toUpperCase() || 'U'}
              style={styles.avatar}
            />
            <Text style={styles.username}>
              {profile?.display_name || profile?.username || 'ユーザー'}
            </Text>
            {profile?.username && profile?.display_name && (
              <Text style={styles.usernameSmall}>@{profile.username}</Text>
            )}
            {profile?.bio && (
              <Text style={styles.bio}>{profile.bio}</Text>
            )}
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile?.followers[0]?.count || 0}</Text>
                <Text style={styles.statLabel}>フォロワー</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile?.following[0]?.count || 0}</Text>
                <Text style={styles.statLabel}>フォロー中</Text>
              </View>
            </View>
            
            {/* フォローボタン（自分以外の場合） */}
            {!isOwnProfile && (
              <View style={styles.actionButtons}>
                <Button
                  mode={isFollowing ? "outlined" : "contained"}
                  onPress={handleFollow}
                  loading={followLoading}
                  disabled={followLoading}
                  style={styles.followButton}
                >
                  {isFollowing ? 'フォロー中' : 'フォロー'}
                </Button>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* カテゴリ選択 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>
            {isOwnProfile ? 'マイミュージック' : `${profile?.display_name || profile?.username}の音楽`}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <Chip
                key={category.id}
                selected={selectedCategoryId === category.id}
                onPress={() => setSelectedCategoryId(category.id)}
                style={styles.categoryChip}
                textStyle={{
                  color: selectedCategoryId === category.id ? '#fff' : '#666'
                }}
              >
                {category.name} ({category.track_count})
              </Chip>
            ))}
          </ScrollView>
        </Card.Content>
      </Card>

      {/* 楽曲リスト */}
      {selectedCategoryId && (
        <Card style={[styles.card, styles.tracksCard]}>
          <Card.Content>
            {tracksLoading ? (
              <View style={styles.tracksLoading}>
                <ActivityIndicator size="small" />
                <Text style={styles.loadingText}>楽曲を読み込み中...</Text>
              </View>
            ) : userTracks.length > 0 ? (
              <FlatList
                data={userTracks}
                renderItem={renderTrackItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.trackSeparator} />}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {isOwnProfile 
                    ? 'このカテゴリにはまだ楽曲がありません'
                    : 'このカテゴリには楽曲がありません'
                  }
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* 音楽プレイヤー */}
      {isPlayerVisible && (
        <MusicPlayer
          track={currentTrack}
          onClose={closePlayer}
        />
      )}
    </ScrollView>
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
    paddingHorizontal: 8,
    paddingTop: 50,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  usernameSmall: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  followButton: {
    minWidth: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryScroll: {
    marginHorizontal: -8,
  },
  categoryChip: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  tracksCard: {
    marginBottom: 16,
  },
  tracksLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  trackSeparator: {
    height: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});