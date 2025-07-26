import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheConfig {
  key: string;
  ttl: number; // Time to live in milliseconds
}

export class CacheService {
  private static instance: CacheService;
  
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async set(key: string, data: any, ttl: number = 5 * 60 * 1000): Promise<void> {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    try {
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const isExpired = Date.now() - cacheItem.timestamp > cacheItem.ttl;
      
      if (isExpired) {
        await this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async cleanExpired(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const now = Date.now();
      
      for (const key of keys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          try {
            const cacheItem = JSON.parse(cached);
            if (now - cacheItem.timestamp > cacheItem.ttl) {
              await AsyncStorage.removeItem(key);
            }
          } catch {
            // Invalid cache item, remove it
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  // 特定のプレフィックスを持つキャッシュを削除
  async clearByPrefix(prefix: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(key => key.startsWith(prefix));
      await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      console.error('Cache clear by prefix error:', error);
    }
  }

  // キャッシュサイズ管理
  async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Cache size calculation error:', error);
      return 0;
    }
  }

  // LRU (Least Recently Used) キャッシュクリーンアップ
  async cleanupLRU(maxItems: number = 100): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length <= maxItems) return;

      const cacheItems: { key: string; timestamp: number }[] = [];
      
      for (const key of keys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          try {
            const cacheItem = JSON.parse(cached);
            cacheItems.push({ key, timestamp: cacheItem.timestamp });
          } catch {
            // Invalid cache item, will be removed
            cacheItems.push({ key, timestamp: 0 });
          }
        }
      }

      // 古いものから削除
      cacheItems.sort((a, b) => a.timestamp - b.timestamp);
      const itemsToRemove = cacheItems.slice(0, keys.length - maxItems);
      const keysToRemove = itemsToRemove.map(item => item.key);
      
      await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      console.error('LRU cleanup error:', error);
    }
  }
}

// キャッシュキー生成ヘルパー
export const CacheKeys = {
  timeline: (page: number) => `timeline_${page}`,
  userTimeline: (userId: string, page: number) => `user_timeline_${userId}_${page}`,
  publicTimeline: (page: number) => `public_timeline_${page}`,
  userTracks: (userId?: string, categoryId?: string, page: number = 1) => 
    `user_tracks_${userId || 'all'}_${categoryId || 'all'}_${page}`,
  comments: (userTrackId: string) => `comments_${userTrackId}`,
  notifications: () => 'notifications',
  unreadCount: () => 'unread_count',
  categories: () => 'categories',
  searchTracks: (query: string) => `search_tracks_${query}`,
  followCounts: (userId: string) => `follow_counts_${userId}`,
  trackDetail: (trackId: string) => `track_detail_${trackId}`,
  userProfile: (userId: string) => `user_profile_${userId}`,
};

export const cacheService = CacheService.getInstance();