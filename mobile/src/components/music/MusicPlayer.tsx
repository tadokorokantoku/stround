import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Card, IconButton, Text, ProgressBar } from 'react-native-paper';
import { useAudioPlayer } from 'expo-audio';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  image_url: string | null;
  preview_url: string | null;
  external_url: string;
  duration_ms: number | null;
}

interface MusicPlayerProps {
  track: Track | null;
  onClose: () => void;
}

export default function MusicPlayer({ track, onClose }: MusicPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [player, setPlayer] = useState<any>(null);

  useEffect(() => {
    if (track) {
      loadAudio();
    }
    return () => {
      if (player) {
        player.remove();
      }
    };
  }, [track]);

  const loadAudio = async () => {
    if (!track?.preview_url) {
      Alert.alert('プレビュー再生不可', 'この楽曲にはプレビューが提供されていません');
      return;
    }

    try {
      setIsLoading(true);
      if (player) {
        player.remove();
        setPlayer(null);
      }
      const newPlayer = useAudioPlayer({ uri: track.preview_url });
      setPlayer(newPlayer);
      // 状態監視
      const interval = setInterval(() => {
        if (newPlayer) {
          setPosition(newPlayer.currentTime * 1000);
          setDuration(newPlayer.duration * 1000 || 30000);
        }
      }, 200);
      return () => clearInterval(interval);
    } catch (error) {
      console.error('Audio load error:', error);
      Alert.alert('エラー', '音楽の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (!player) return;
    try {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error('Play/Pause error:', error);
      Alert.alert('エラー', '再生操作に失敗しました');
    }
  };

  const handleSeek = async (progress: number) => {
    if (!player || !duration) return;
    try {
      const newPosition = progress * duration;
      player.seekTo(newPosition / 1000);
    } catch (error) {
      console.error('Seek error:', error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleOpenSpotify = () => {
    if (track?.external_url) {
      // TODO: Linking.openURL(track.external_url)を実装
      Alert.alert('Spotify', 'Spotifyでフル楽曲を聴くことができます');
    }
  };

  if (!track) return null;

  const progress = duration > 0 ? position / duration : 0;
  const isPlaying = player ? player.playing : false;

  return (
    <Card style={styles.container} elevation={8}>
      <Card.Content style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.trackInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {track.artist}
            </Text>
          </View>
          <IconButton
            icon="close"
            size={24}
            onPress={onClose}
          />
        </View>

        {/* プレイヤーコントロール */}
        <View style={styles.controls}>
          <IconButton
            icon={isPlaying ? "pause" : "play"}
            size={32}
            disabled={isLoading || !track.preview_url}
            onPress={handlePlayPause}
            iconColor={isLoading ? "#ccc" : "#1976d2"}
          />
        </View>

        {/* プログレスバー */}
        {track.preview_url && (
          <View style={styles.progressSection}>
            <ProgressBar
              progress={progress}
              style={styles.progressBar}
              color="#1976d2"
            />
            <View style={styles.timeLabels}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        )}

        {/* プレビュー情報 */}
        {track.preview_url ? (
          <Text style={styles.previewNote}>30秒のプレビュー再生</Text>
        ) : (
          <Text style={styles.previewNote}>プレビューが利用できません</Text>
        )}

        {/* Spotifyで聴くボタン */}
        <View style={styles.spotifyButton}>
          <IconButton
            icon="spotify"
            size={20}
            mode="contained"
            onPress={handleOpenSpotify}
            iconColor="#1DB954"
          />
          <Text style={styles.spotifyText}>Spotifyで聴く</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  content: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  artist: {
    fontSize: 14,
    color: '#666',
  },
  controls: {
    alignItems: 'center',
    marginVertical: 8,
  },
  progressSection: {
    marginVertical: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  previewNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginVertical: 4,
  },
  spotifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  spotifyText: {
    fontSize: 14,
    color: '#1DB954',
    marginLeft: 8,
    fontWeight: '500',
  },
});