import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Avatar, Divider } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '../../constants';

interface FollowStats {
  followingCount: number;
  followersCount: number;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [followStats, setFollowStats] = useState<FollowStats>({ followingCount: 0, followersCount: 0 });

  useEffect(() => {
    if (user) {
      fetchFollowStats();
    }
  }, [user]);

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
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <Avatar.Text
              size={80}
              label={user?.user_metadata?.username?.charAt(0)?.toUpperCase() || 'U'}
              style={styles.avatar}
            />
            <Text style={styles.username}>
              {user?.user_metadata?.username || 'ユーザー'}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
            
            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statNumber}>{followStats.followingCount}</Text>
                <Text style={styles.statLabel}>フォロー中</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statNumber}>{followStats.followersCount}</Text>
                <Text style={styles.statLabel}>フォロワー</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>マイミュージック</Text>
          <Text style={styles.description}>
            楽曲カテゴリがここに表示されます
          </Text>
        </Card.Content>
      </Card>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  email: {
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 32,
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
    marginTop: 4,
  },
});