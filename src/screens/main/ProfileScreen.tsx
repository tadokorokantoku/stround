import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Avatar, Divider } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();

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
});