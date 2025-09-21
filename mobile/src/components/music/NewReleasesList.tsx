import React, { useCallback, memo } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import TrackItem from './TrackItem';

interface NewReleasesListProps {
  tracks: any[];
  loading: boolean;
  onRefresh: () => void;
}

const NewReleasesList = memo(function NewReleasesList({
  tracks,
  loading,
  onRefresh,
}: NewReleasesListProps) {
  const renderTrack = useCallback(
    ({ item }: { item: any }) => (
      <TrackItem
        track={item}
        onPress={() => {
          // TODO: Navigate to track detail or add to playlist
          console.log('Track pressed:', item.title);
        }}
      />
    ),
    []
  );

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.emptyText}>新着楽曲を読み込み中...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>新着楽曲がありません</Text>
        <Text style={styles.emptyText}>
          Spotifyの新着楽曲が見つかりませんでした
        </Text>
      </View>
    );
  }, [loading]);

  const keyExtractor = useCallback((item: any) => item.spotify_id, []);

  return (
    <FlatList
      data={tracks}
      renderItem={renderTrack}
      keyExtractor={keyExtractor}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={onRefresh}
          colors={['#1976d2']}
        />
      }
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={!tracks.length ? styles.emptyListContainer : undefined}
    />
  );
});

export default NewReleasesList;

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});