import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Searchbar, Card, Avatar, Button } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '../../constants';

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

export default function SearchScreen() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>({});

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
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
        setSearchResults(data.profiles || []);
        
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

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="ユーザーを検索"
        onChangeText={setSearchQuery}
        value={searchQuery}
        onSubmitEditing={() => searchUsers(searchQuery)}
        style={styles.searchbar}
      />
      
      {searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {searchQuery ? '検索結果が見つかりません' : 'ユーザーを検索してください'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    elevation: 2,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});