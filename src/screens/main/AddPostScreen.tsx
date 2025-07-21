import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  FlatList, 
  Image, 
  TouchableOpacity,
  Alert,
} from 'react-native';
import { 
  Text, 
  Searchbar,
  Button,
  Card,
  Chip,
  TextInput,
  Portal,
  Modal,
  ActivityIndicator,
} from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '../../constants';

interface Track {
  id?: string;
  spotify_id: string;
  title: string;
  artist: string;
  album: string;
  image_url: string | null;
  preview_url: string | null;
  external_url: string;
  duration_ms?: number | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
}

export default function AddPostScreen() {
  const { session } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      const data = await response.json();
      
      if (response.ok) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const searchTracks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/music/search?q=${encodeURIComponent(query)}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.tracks);
      }
    } catch (error) {
      console.error('Error searching tracks:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const addTrackToLibrary = async () => {
    if (!selectedTrack || !selectedCategory || !session) {
      Alert.alert('エラー', '楽曲とカテゴリを選択してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          category_id: selectedCategory.id,
          spotify_track_id: selectedTrack.spotify_id,
          comment: comment.trim() || null,
        }),
      });

      if (response.ok) {
        Alert.alert('成功', '楽曲をライブラリに追加しました', [
          {
            text: 'OK',
            onPress: () => {
              setSelectedTrack(null);
              setSelectedCategory(null);
              setComment('');
              setSearchQuery('');
              setSearchResults([]);
            },
          },
        ]);
      } else {
        const errorData = await response.json();
        Alert.alert('エラー', errorData.error || '楽曲の追加に失敗しました');
      }
    } catch (error) {
      console.error('Error adding track:', error);
      Alert.alert('エラー', '楽曲の追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity onPress={() => setSelectedTrack(item)}>
      <Card 
        style={[
          styles.trackCard,
          selectedTrack?.spotify_id === item.spotify_id && styles.selectedTrack
        ]}
      >
        <View style={styles.trackContent}>
          <Image
            source={{ 
              uri: item.image_url || 'https://via.placeholder.com/60x60?text=🎵' 
            }}
            style={styles.trackImage}
          />
          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
            <Text style={styles.trackAlbum} numberOfLines={1}>{item.album}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderCategoryChip = (category: Category) => (
    <Chip
      key={category.id}
      mode={selectedCategory?.id === category.id ? 'outlined' : 'flat'}
      selected={selectedCategory?.id === category.id}
      onPress={() => {
        setSelectedCategory(category);
        setShowCategoryModal(false);
      }}
      style={styles.categoryChip}
    >
      {category.name}
    </Chip>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>楽曲をライブラリに追加</Text>

        {/* Music Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>楽曲を検索</Text>
          <Searchbar
            placeholder="アーティスト名や楽曲名を入力"
            onChangeText={(query) => {
              setSearchQuery(query);
              searchTracks(query);
            }}
            value={searchQuery}
            style={styles.searchbar}
            loading={searchLoading}
          />

          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              renderItem={renderTrackItem}
              keyExtractor={(item) => item.spotify_id}
              style={styles.searchResults}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Selected Track Display */}
        {selectedTrack && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>選択された楽曲</Text>
            <Card style={styles.selectedTrackCard}>
              <View style={styles.trackContent}>
                <Image
                  source={{ 
                    uri: selectedTrack.image_url || 'https://via.placeholder.com/80x80?text=🎵' 
                  }}
                  style={styles.selectedTrackImage}
                />
                <View style={styles.trackInfo}>
                  <Text style={styles.selectedTrackTitle}>{selectedTrack.title}</Text>
                  <Text style={styles.selectedTrackArtist}>{selectedTrack.artist}</Text>
                  <Text style={styles.selectedTrackAlbum}>{selectedTrack.album}</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>カテゴリを選択</Text>
          <Button
            mode="outlined"
            onPress={() => setShowCategoryModal(true)}
            style={styles.categoryButton}
            icon="tag"
          >
            {selectedCategory ? selectedCategory.name : 'カテゴリを選択してください'}
          </Button>
        </View>

        {/* Comment Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>コメント (任意)</Text>
          <TextInput
            placeholder="この楽曲についてのコメントを入力..."
            multiline
            numberOfLines={3}
            value={comment}
            onChangeText={setComment}
            style={styles.commentInput}
          />
        </View>

        {/* Add Button */}
        <Button
          mode="contained"
          onPress={addTrackToLibrary}
          disabled={!selectedTrack || !selectedCategory || loading}
          loading={loading}
          style={styles.addButton}
        >
          ライブラリに追加
        </Button>
      </ScrollView>

      {/* Category Selection Modal */}
      <Portal>
        <Modal
          visible={showCategoryModal}
          onDismiss={() => setShowCategoryModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>カテゴリを選択</Text>
          <ScrollView style={styles.categoryList}>
            {categories.map(renderCategoryChip)}
          </ScrollView>
          <Button onPress={() => setShowCategoryModal(false)}>
            閉じる
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
    paddingHorizontal: 16,
    color: '#333',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  searchbar: {
    marginBottom: 16,
    elevation: 2,
  },
  searchResults: {
    maxHeight: 300,
  },
  trackCard: {
    marginBottom: 8,
    elevation: 2,
  },
  selectedTrack: {
    borderColor: '#6200ee',
    borderWidth: 2,
  },
  trackContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  trackImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  trackAlbum: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  selectedTrackCard: {
    elevation: 3,
    backgroundColor: '#f8f9fa',
  },
  selectedTrackImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  selectedTrackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  selectedTrackArtist: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  selectedTrackAlbum: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  categoryButton: {
    padding: 8,
  },
  commentInput: {
    backgroundColor: '#fff',
  },
  addButton: {
    margin: 16,
    padding: 8,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryChip: {
    margin: 4,
  },
});