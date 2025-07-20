export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '';

export const DEFAULT_CATEGORIES = [
  { name: '最も美しいと思う曲', key: 'beautiful' },
  { name: 'ドライブ中に流したい曲', key: 'drive' },
  { name: '仕事中によく聞く曲', key: 'work' },
  { name: '学生時代によく聴いた曲', key: 'student' },
];