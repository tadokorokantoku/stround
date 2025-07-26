import { CacheService, CacheKeys } from '../cacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage のモック
jest.mock('@react-native-async-storage/async-storage');

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = CacheService.getInstance();
  });

  describe('set and get', () => {
    it('should store and retrieve data correctly', async () => {
      const testData = { id: 1, name: 'test' };
      const key = 'test-key';

      await cacheService.set(key, testData);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        key,
        expect.stringContaining(JSON.stringify(testData))
      );

      // モック AsyncStorage.getItem の戻り値を設定
      const cacheItem = {
        data: testData,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheItem));

      const result = await cacheService.get(key);
      expect(result).toEqual(testData);
    });

    it('should return null for expired data', async () => {
      const testData = { id: 1, name: 'test' };
      const key = 'test-key';

      // 期限切れのキャッシュアイテムをモック
      const expiredCacheItem = {
        data: testData,
        timestamp: Date.now() - 10 * 60 * 1000, // 10分前
        ttl: 5 * 60 * 1000, // 5分のTTL
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredCacheItem));

      const result = await cacheService.get(key);
      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('should return null for non-existent data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove data correctly', async () => {
      const key = 'test-key';

      await cacheService.remove(key);

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      await cacheService.clear();

      expect(AsyncStorage.clear).toHaveBeenCalled();
    });
  });

  describe('clearByPrefix', () => {
    it('should clear data with specific prefix', async () => {
      const keys = ['prefix_1', 'prefix_2', 'other_key'];
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(keys);

      await cacheService.clearByPrefix('prefix_');

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['prefix_1', 'prefix_2']);
    });
  });

  describe('cleanExpired', () => {
    it('should remove expired items', async () => {
      const keys = ['key1', 'key2', 'key3'];
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(keys);

      // key1: 有効, key2: 期限切れ, key3: 無効なJSON
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify({
          data: 'valid',
          timestamp: Date.now(),
          ttl: 10 * 60 * 1000,
        }))
        .mockResolvedValueOnce(JSON.stringify({
          data: 'expired',
          timestamp: Date.now() - 20 * 60 * 1000,
          ttl: 10 * 60 * 1000,
        }))
        .mockResolvedValueOnce('invalid json');

      await cacheService.cleanExpired();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('key2');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('key3');
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(2);
    });
  });
});

describe('CacheKeys', () => {
  it('should generate correct timeline cache key', () => {
    expect(CacheKeys.timeline(1)).toBe('timeline_1');
    expect(CacheKeys.timeline(5)).toBe('timeline_5');
  });

  it('should generate correct user timeline cache key', () => {
    expect(CacheKeys.userTimeline('user123', 1)).toBe('user_timeline_user123_1');
    expect(CacheKeys.userTimeline('user456', 3)).toBe('user_timeline_user456_3');
  });

  it('should generate correct user tracks cache key', () => {
    expect(CacheKeys.userTracks('user123', 'category456', 1)).toBe('user_tracks_user123_category456_1');
    expect(CacheKeys.userTracks(undefined, undefined, 2)).toBe('user_tracks_all_all_2');
  });

  it('should generate correct search tracks cache key', () => {
    expect(CacheKeys.searchTracks('test query')).toBe('search_tracks_test query');
  });

  it('should generate correct comments cache key', () => {
    expect(CacheKeys.comments('track123')).toBe('comments_track123');
  });
});