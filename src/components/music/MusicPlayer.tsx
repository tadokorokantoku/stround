import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Card, IconButton, Text, ProgressBar } from 'react-native-paper';
import { Audio } from 'expo-av';

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
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (track) {
      loadAudio();
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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

      // 既存の音声を停止・アンロード
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // Audioモードを設定
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 新しい音声をロード
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.preview_url },
        { shouldPlay: false }
      );

      setSound(newSound);

      // 音声の情報を取得
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis || 30000); // デフォルト30秒
      }

      // 再生状況を監視
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis || 0);
          setIsPlaying(status.isPlaying || false);
          
          // 再生終了時の処理
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
          }
        }
      });

    } catch (error) {
      console.error('Audio load error:', error);
      Alert.alert('エラー', '音楽の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
      }
    } catch (error) {
      console.error('Play/Pause error:', error);
      Alert.alert('エラー', '再生操作に失敗しました');
    }
  };

  const handleSeek = async (progress: number) => {
    if (!sound || !duration) return;

    try {
      const newPosition = progress * duration;
      await sound.setPositionAsync(newPosition);
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