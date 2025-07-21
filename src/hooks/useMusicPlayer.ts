import { useState, useCallback } from 'react';

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

interface MusicPlayerState {
  currentTrack: Track | null;
  isPlayerVisible: boolean;
  isPlaying: boolean;
}

export const useMusicPlayer = () => {
  const [state, setState] = useState<MusicPlayerState>({
    currentTrack: null,
    isPlayerVisible: false,
    isPlaying: false,
  });

  const playTrack = useCallback((track: Track) => {
    setState({
      currentTrack: track,
      isPlayerVisible: true,
      isPlaying: false, // プレイヤーが開かれた時点では停止状態
    });
  }, []);

  const closePlayer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlayerVisible: false,
      isPlaying: false,
    }));
  }, []);

  const setIsPlaying = useCallback((playing: boolean) => {
    setState(prev => ({
      ...prev,
      isPlaying: playing,
    }));
  }, []);

  return {
    currentTrack: state.currentTrack,
    isPlayerVisible: state.isPlayerVisible,
    isPlaying: state.isPlaying,
    playTrack,
    closePlayer,
    setIsPlaying,
  };
};