import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, Searchbar, Card, Avatar, Button, SegmentedButtons, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '../../constants';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { UserTrack, Track, User } from '../../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  profile_image_url?: string;
}

interface FollowStatus {
  [userId: string]: boolean;
}

interface SearchTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  image_url?: string;
  preview_url?: string;
  external_url: string;
  user_tracks_count: number;
}

interface SearchUserTrack {
  id: string;
  comment?: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  category: {
    id: string;
    name: string;
  };
  track: SearchTrack;
}

type SearchType = 'users' | 'tracks' | 'tags';

export default function SearchScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const [searchType, setSearchType] = useState<SearchType>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [trackResults, setTrackResults] = useState<SearchTrack[]>([]);
  const [userTrackResults, setUserTrackResults] = useState<SearchUserTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags] = useState<string[]>(['美しい曲', '学生時代の曲', 'ドライブ用', '仕事中に聴く曲', '切ない系', 'テンション上がる曲']);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profiles/search/${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserResults(data.profiles || []);
        
        // 各ユーザーのフォロー状態を確認
        const statusPromises = data.profiles.map(async (profile: UserProfile) => {
          try {
            const statusResponse = await fetch(`${API_BASE_URL}/api/follows/status/${profile.id}`, {
              headers: {
                'Authorization': `Bearer ${user?.access_token}`,
              },
            });
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              return { userId: profile.id, isFollowing: statusData.isFollowing };
            }
          } catch (error) {
            console.error('フォロー状態確認エラー:', error);
          }
          return { userId: profile.id, isFollowing: false };
        });

        const statuses = await Promise.all(statusPromises);
        const statusMap: FollowStatus = {};
        statuses.forEach(({ userId, isFollowing }) => {
          statusMap[userId] = isFollowing;
        });
        setFollowStatus(statusMap);
      }
    } catch (error) {
      console.error('ユーザー検索エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchTracks = async (query: string) => {
    if (!query.trim()) {
      setTrackResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/music/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTrackResults(data.tracks || []);
      }
    } catch (error) {
      console.error('楽曲検索エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchByTags = async (tags: string[]) => {
    if (tags.length === 0) {
      setUserTrackResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-tracks/search/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserTrackResults(data.userTracks || []);
      }
    } catch (error) {
      console.error('タグ検索エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    switch (searchType) {
      case 'users':
        searchUsers(searchQuery);
        break;
      case 'tracks':
        searchTracks(searchQuery);
        break;
      case 'tags':
        searchByTags(selectedTags);
        break;
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    const isCurrentlyFollowing = followStatus[targetUserId];
    const endpoint = isCurrentlyFollowing ? 'unfollow' : 'follow';

    try {
      const response = await fetch(`${API_BASE_URL}/api/follows/${endpoint}/${targetUserId}`, {
        method: isCurrentlyFollowing ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setFollowStatus(prev => ({
          ...prev,
          [targetUserId]: !isCurrentlyFollowing,
        }));
      }
    } catch (error) {
      console.error('フォロー操作エラー:', error);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleTrackPress = (track: SearchTrack) => {
    // Create a dummy UserTrack for navigation
    const userTrack: UserTrack = {
      id: '',
      userId: '',
      categoryId: '',
      spotifyTrackId: track.id,
      comment: null,
      createdAt: '',
      track: {
        spotifyId: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album || null,
        imageUrl: track.image_url || null,
        previewUrl: track.preview_url || null,
        externalUrl: track.external_url || null,
        createdAt: '',
      }
    };
    
    navigation.navigate('TrackDetail', { userTrack });
  };

  const handleUserTrackPress = (userTrack: SearchUserTrack) => {
    const navUserTrack: UserTrack = {
      id: userTrack.id,
      userId: userTrack.user.id,
      categoryId: userTrack.category.id,
      spotifyTrackId: userTrack.track.id,
      comment: userTrack.comment || null,
      createdAt: userTrack.created_at,
      user: {
        id: userTrack.user.id,
        username: userTrack.user.username,
        displayName: userTrack.user.display_name || null,
        bio: null,
        profileImageUrl: userTrack.user.avatar_url || null,
        createdAt: '',
        updatedAt: '',
      },
      category: {
        id: userTrack.category.id,
        name: userTrack.category.name,
        description: null,
        isDefault: true,
        createdAt: '',
      },
      track: {
        spotifyId: userTrack.track.id,
        title: userTrack.track.title,
        artist: userTrack.track.artist,
        album: userTrack.track.album || null,
        imageUrl: userTrack.track.image_url || null,
        previewUrl: userTrack.track.preview_url || null,
        externalUrl: userTrack.track.external_url || null,
        createdAt: '',
      }
    };
    
    navigation.navigate('TrackDetail', { userTrack: navUserTrack });
  };

  const renderUserItem = ({ item }: { item: UserProfile }) => (
    <Card style={styles.userCard}>
      <Card.Content>
        <View style={styles.userRow}>
          <View style={styles.userInfo}>
            <Avatar.Text
              size={50}
              label={item.display_name?.charAt(0)?.toUpperCase() || 'U'}
              style={styles.avatar}
            />
            <View style={styles.userText}>
              <Text style={styles.displayName}>{item.display_name || item.username}</Text>
              <Text style={styles.username}>@{item.username}</Text>
              {item.bio && <Text style={styles.bio}>{item.bio}</Text>}
            </View>
          </View>
          {user?.id !== item.id && (
            <Button
              mode={followStatus[item.id] ? "outlined" : "contained"}
              onPress={() => toggleFollow(item.id)}
              compact
            >
              {followStatus[item.id] ? 'フォロー中' : 'フォロー'}
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderTrackItem = ({ item }: { item: SearchTrack }) => (
    <TouchableOpacity onPress={() => handleTrackPress(item)}>
      <Card style={styles.trackCard}>
        <Card.Content>
          <View style={styles.trackRow}>
            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={styles.trackImage} />
            )}
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
              {item.album && <Text style={styles.trackAlbum} numberOfLines={1}>{item.album}</Text>}
              <Text style={styles.trackCount}>{item.user_tracks_count}人が登録</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderUserTrackItem = ({ item }: { item: SearchUserTrack }) => (
    <TouchableOpacity onPress={() => handleUserTrackPress(item)}>
      <Card style={styles.userTrackCard}>
        <Card.Content>
          <View style={styles.userTrackHeader}>
            <Avatar.Text
              size={30}
              label={item.user.display_name?.charAt(0)?.toUpperCase() || 'U'}
              style={styles.smallAvatar}
            />
            <View style={styles.userTrackUserInfo}>
              <Text style={styles.userTrackUsername}>
                {item.user.display_name || item.user.username}
              </Text>
              <Chip style={styles.categoryChip} textStyle={styles.categoryChipText}>
                {item.category.name}
              </Chip>
            </View>
          </View>
          
          <View style={styles.trackRow}>
            {item.track.image_url && (
              <Image source={{ uri: item.track.image_url }} style={styles.trackImage} />
            )}
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={2}>{item.track.title}</Text>
              <Text style={styles.trackArtist} numberOfLines={1}>{item.track.artist}</Text>
              {item.track.album && <Text style={styles.trackAlbum} numberOfLines={1}>{item.track.album}</Text>}
              {item.comment && <Text style={styles.userComment} numberOfLines={2}>{item.comment}</Text>}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const getPlaceholderText = () => {
    switch (searchType) {
      case 'users': return 'ユーザーを検索';
      case 'tracks': return '楽曲を検索（タイトル・アーティスト）';
      case 'tags': return 'タグで検索';
      default: return '検索';
    }
  };

  const getEmptyText = () => {
    switch (searchType) {
      case 'users': 
        return searchQuery ? 'ユーザーが見つかりません' : 'ユーザーを検索してください';
      case 'tracks': 
        return searchQuery ? '楽曲が見つかりません' : '楽曲を検索してください';
      case 'tags': 
        return selectedTags.length > 0 ? '該当する投稿が見つかりません' : 'タグを選択してください';
      default: 
        return '検索してください';
    }
  };

  const getCurrentResults = () => {
    switch (searchType) {
      case 'users': return userResults;
      case 'tracks': return trackResults;
      case 'tags': return userTrackResults;
      default: return [];
    }
  };

  const renderCurrentResults = () => {
    const results = getCurrentResults();
    
    if (results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{getEmptyText()}</Text>
        </View>
      );
    }

    switch (searchType) {
      case 'users':
        return (
          <FlatList
            data={userResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'tracks':
        return (
          <FlatList
            data={trackResults}
            renderItem={renderTrackItem}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'tags':
        return (
          <FlatList
            data={userTrackResults}
            renderItem={renderUserTrackItem}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchTypeContainer}>
        <SegmentedButtons
          value={searchType}
          onValueChange={(value) => {
            setSearchType(value as SearchType);
            setSearchQuery('');
            setSelectedTags([]);
            setUserResults([]);
            setTrackResults([]);
            setUserTrackResults([]);
          }}
          buttons={[
            { value: 'users', label: 'ユーザー' },
            { value: 'tracks', label: '楽曲' },
            { value: 'tags', label: 'タグ' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {searchType !== 'tags' ? (
        <Searchbar
          placeholder={getPlaceholderText()}
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={handleSearch}
          style={styles.searchbar}
        />
      ) : (
        <View style={styles.tagsContainer}>
          <Text style={styles.tagsTitle}>カテゴリーを選択:</Text>
          <View style={styles.tagsGrid}>
            {availableTags.map((tag) => (
              <Chip
                key={tag}
                selected={selectedTags.includes(tag)}
                onPress={() => handleTagToggle(tag)}
                style={[
                  styles.tagChip,
                  selectedTags.includes(tag) && styles.selectedTagChip
                ]}
                textStyle={[
                  styles.tagChipText,
                  selectedTags.includes(tag) && styles.selectedTagChipText
                ]}
              >
                {tag}
              </Chip>
            ))}
          </View>
          {selectedTags.length > 0 && (
            <Button
              mode="contained"
              onPress={handleSearch}
              style={styles.searchButton}
              loading={loading}
            >
              検索
            </Button>
          )}
        </View>
      )}
      
      {renderCurrentResults()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchTypeContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {
    backgroundColor: '#fff',
  },
  searchbar: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  tagsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    borderRadius: 8,
    elevation: 2,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagChip: {
    backgroundColor: '#f0f0f0',
  },
  selectedTagChip: {
    backgroundColor: '#2196F3',
  },
  tagChipText: {
    color: '#333',
  },
  selectedTagChipText: {
    color: '#fff',
  },
  searchButton: {
    marginTop: 8,
  },
  resultsList: {
    flex: 1,
  },
  userCard: {
    margin: 8,
    marginHorizontal: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  userText: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#888',
  },
  trackCard: {
    margin: 8,
    marginHorizontal: 16,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  trackAlbum: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  trackCount: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  userTrackCard: {
    margin: 8,
    marginHorizontal: 16,
  },
  userTrackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  smallAvatar: {
    marginRight: 8,
  },
  userTrackUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userTrackUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  categoryChip: {
    backgroundColor: '#e3f2fd',
    height: 24,
  },
  categoryChipText: {
    fontSize: 12,
    color: '#1976d2',
  },
  userComment: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});