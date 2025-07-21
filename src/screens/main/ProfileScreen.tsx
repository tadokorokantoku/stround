import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Alert } from 'react-native';
import { 
  Text, 
  Button, 
  Card, 
  Avatar, 
  Divider, 
  Chip,
  ActivityIndicator 
} from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../constants';
import MusicPlayer from '../../components/music/MusicPlayer';
import TrackItem from '../../components/music/TrackItem';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';

interface FollowStats {
  followingCount: number;
  followersCount: number;
}

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
}

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { currentTrack, isPlayerVisible, playTrack, closePlayer } = useMusicPlayer();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followStats, setFollowStats] = useState<FollowStats>({ followingCount: 0, followersCount: 0 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFollowStats();
      fetchCategories();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchUserTracks(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const fetchProfile = async () => {
    try {
      if (user) {
        const profile: Profile = {
          id: user.id,
          username: user.user_metadata?.username || 'user',
          display_name: user.user_metadata?.display_name || null,
          bio: user.user_metadata?.bio || null,
          profile_image_url: null,
        };
        setProfile(profile);
      }
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
      Alert.alert('エラー', 'プロフィールの取得に失敗しました');
    }
  };

  const fetchFollowStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/follows/status/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFollowStats({
          followingCount: data.followingCount,
          followersCount: data.followersCount,
        });
      }
    } catch (error) {
      console.error('フォロー統計の取得に失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    
    try {
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
    if (!user) return;
    
    setTracksLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_tracks')
        .select(`
          *,
          categories!user_tracks_category_id_fkey(*),
          music!user_tracks_spotify_track_id_fkey(*)
        `)
        .eq('user_id', user.id)
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
            <Text style={styles.email}>{user?.email}</Text>
            {profile?.bio && (
              <Text style={styles.bio}>{profile.bio}</Text>
            )}
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{followStats.followersCount}</Text>
                <Text style={styles.statLabel}>フォロワー</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{followStats.followingCount}</Text>
                <Text style={styles.statLabel}>フォロー中</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* カテゴリ選択 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>マイミュージック</Text>
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
                <Text style={styles.emptyStateText}>この カテゴリにはまだ楽曲がありません</Text>
                <Button mode="outlined" onPress={() => {}} style={styles.addMusicButton}>
                  楽曲を追加する
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* 設定メニュー */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>設定</Text>
          <Button
            mode="outlined"
            onPress={() => {}}
            style={styles.menuButton}
          >
            プロフィール編集
          </Button>
          <Button
            mode="outlined"
            onPress={() => {}}
            style={styles.menuButton}
          >
            設定
          </Button>
          <Divider style={styles.divider} />
          <Button
            mode="contained"
            onPress={signOut}
            style={styles.logoutButton}
            buttonColor="#B00020"
          >
            ログアウト
          </Button>
        </Card.Content>
      </Card>

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
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
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
    marginBottom: 16,
    textAlign: 'center',
  },
  addMusicButton: {
    marginTop: 8,
  },
  menuButton: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  logoutButton: {
    marginTop: 8,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
});