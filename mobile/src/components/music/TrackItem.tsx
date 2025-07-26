import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, IconButton, Surface, Avatar } from 'react-native-paper';

interface Track {
  spotify_id: string;
  title: string;
  artist: string;
  album: string;
  image_url: string | null;
  preview_url: string | null;
  external_url: string;
  duration_ms: number | null;
}

interface UserTrack {
  id: string;
  comment: string | null;
  created_at: string;
  music: Track;
  categories?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface TrackItemProps {
  userTrack: UserTrack;
  onPlay: (track: Track) => void;
  showCategory?: boolean;
  showUser?: boolean;
  user?: {
    id: string;
    username: string;
    display_name: string | null;
    profile_image_url: string | null;
  };
}

export default function TrackItem({ 
  userTrack, 
  onPlay, 
  showCategory = false,
  showUser = false,
  user 
}: TrackItemProps) {
  const { music, comment, categories } = userTrack;

  const handlePlay = () => {
    onPlay(music);
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card style={styles.container}>
      <Card.Content style={styles.content}>
        {/* ユーザー情報（オプション） */}
        {showUser && user && (
          <View style={styles.userSection}>
            <Avatar.Text
              size={32}
              label={user.username?.charAt(0)?.toUpperCase() || 'U'}
              style={styles.userAvatar}
            />
            <Text style={styles.userName}>
              {user.display_name || user.username}
            </Text>
            {showCategory && categories && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{categories.name}</Text>
              </View>
            )}
          </View>
        )}

        {/* メイントラック情報 */}
        <View style={styles.trackInfo}>
          {/* アルバムアート */}
          <TouchableOpacity onPress={handlePlay} style={styles.albumArtContainer}>
            <Surface style={styles.albumArt} elevation={2}>
              {music.image_url ? (
                // TODO: Image componentを使用してアルバムアートを表示
                <Text style={styles.albumArtPlaceholder}>🎵</Text>
              ) : (
                <Text style={styles.albumArtPlaceholder}>🎵</Text>
              )}
              {/* プレビュー再生可能インジケーター */}
              {music.preview_url && (
                <View style={styles.playOverlay}>
                  <IconButton
                    icon="play"
                    size={20}
                    iconColor="#fff"
                    onPress={handlePlay}
                  />
                </View>
              )}
            </Surface>
          </TouchableOpacity>

          {/* トラック詳細 */}
          <View style={styles.trackDetails}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {music.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {music.artist}
            </Text>
            <Text style={styles.trackAlbum} numberOfLines={1}>
              {music.album}
            </Text>
            {music.duration_ms && (
              <Text style={styles.duration}>
                {formatDuration(music.duration_ms)}
              </Text>
            )}

            {/* カテゴリ（ユーザー情報を表示しない場合） */}
            {!showUser && showCategory && categories && (
              <View style={styles.inlineCategory}>
                <Text style={styles.inlineCategoryText}>{categories.name}</Text>
              </View>
            )}

            {/* コメント */}
            {comment && (
              <Text style={styles.comment} numberOfLines={2}>
                💬 {comment}
              </Text>
            )}
          </View>

          {/* アクションボタン */}
          <View style={styles.actions}>
            <IconButton
              icon="play"
              size={28}
              disabled={!music.preview_url}
              onPress={handlePlay}
              iconColor={music.preview_url ? "#1976d2" : "#ccc"}
              style={styles.playButton}
            />
            <IconButton
              icon="heart-outline"
              size={24}
              onPress={() => {}}
              iconColor="#666"
            />
            <IconButton
              icon="comment-outline"
              size={24}
              onPress={() => {}}
              iconColor="#666"
            />
          </View>
        </View>

        {/* 追加情報 */}
        <View style={styles.metadata}>
          <Text style={styles.timestamp}>
            {new Date(userTrack.created_at).toLocaleDateString('ja-JP', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {!music.preview_url && (
            <Text style={styles.noPreview}>プレビュー不可</Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  content: {
    paddingVertical: 12,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    marginRight: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  albumArtContainer: {
    marginRight: 12,
  },
  albumArt: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  albumArtPlaceholder: {
    fontSize: 20,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackDetails: {
    flex: 1,
    marginRight: 8,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 1,
  },
  trackAlbum: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    color: '#999',
  },
  inlineCategory: {
    marginTop: 4,
  },
  inlineCategoryText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  comment: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actions: {
    alignItems: 'center',
  },
  playButton: {
    margin: 0,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  noPreview: {
    fontSize: 11,
    color: '#f44336',
    backgroundColor: '#ffebee',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});