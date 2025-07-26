import { supabase } from '../lib/supabase';
import { cacheService, CacheKeys } from './cacheService';
import { errorHandler, NetworkError, AuthError, RateLimitError, ServerError } from './errorHandler';
import { rateLimiter, retryManager } from './rateLimiter';

const API_BASE_URL = 'http://localhost:8787/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTTL: number = 5 * 60 * 1000 // 5分デフォルト
  ): Promise<T> {
    // GET リクエストでキャッシュキーがある場合、キャッシュをチェック
    if ((!options.method || options.method === 'GET') && cacheKey) {
      const cached = await cacheService.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return retryManager.executeWithRetry(async () => {
      // レート制限チェック
      const rateLimitResult = await rateLimiter.checkRateLimit(endpoint);
      if (!rateLimitResult.allowed) {
        throw new RateLimitError(
          'リクエストが多すぎます。しばらく待ってから再試行してください',
          endpoint,
          options.method || 'GET'
        );
      }

      try {
        const headers = await this.getAuthHeaders();
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            ...headers,
            ...options.headers,
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Network error' }));
          this.handleHttpError(response.status, error.error, endpoint, options.method);
        }

        const data = await response.json();

        // GET リクエストでキャッシュキーがある場合、レスポンスをキャッシュ
        if ((!options.method || options.method === 'GET') && cacheKey) {
          await cacheService.set(cacheKey, data, cacheTTL);
        }

        return data;
      } catch (error) {
        // ネットワークエラーやフェッチエラーをハンドリング
        if (error instanceof TypeError || error?.name === 'TypeError') {
          throw new NetworkError('ネットワークに接続できません', endpoint, options.method);
        }
        throw error;
      }
    }, {
      maxAttempts: 3,
      baseDelay: 1000,
      shouldRetry: (error) => this.shouldRetryRequest(error),
    });
  }

  private handleHttpError(status: number, message: string, endpoint: string, method?: string): never {
    switch (status) {
      case 401:
        throw new AuthError(message || '認証が必要です', endpoint, method);
      case 403:
        throw new AuthError(message || 'アクセスが拒否されました', endpoint, method);
      case 429:
        throw new RateLimitError(message, endpoint, method);
      case 400:
      case 422:
        throw errorHandler.handleError(new Error(message || '入力内容に問題があります'), `${method} ${endpoint}`);
      case 500:
      case 502:
      case 503:
      case 504:
        throw new ServerError(message || 'サーバーエラーが発生しました', status, endpoint, method);
      default:
        throw errorHandler.handleError(new Error(message || `HTTP ${status}`), `${method} ${endpoint}`);
    }
  }

  private shouldRetryRequest(error: any): boolean {
    // 認証エラーや400番台エラー（レート制限以外）はリトライしない
    if (error instanceof AuthError && error.status !== 429) {
      return false;
    }
    
    // バリデーションエラーはリトライしない
    if (error?.status === 400 || error?.status === 422) {
      return false;
    }

    return true;
  }

  // Timeline endpoints
  async getTimeline(page: number = 1, limit: number = 20): Promise<any> {
    return this.request(
      `/timeline?page=${page}&limit=${limit}`,
      {},
      CacheKeys.timeline(page),
      2 * 60 * 1000 // 2分
    );
  }

  async getPublicTimeline(page: number = 1, limit: number = 20): Promise<any> {
    return this.request(
      `/timeline/public?page=${page}&limit=${limit}`,
      {},
      CacheKeys.publicTimeline(page),
      2 * 60 * 1000
    );
  }

  async getUserTimeline(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.request(
      `/timeline/user/${userId}?page=${page}&limit=${limit}`,
      {},
      CacheKeys.userTimeline(userId, page),
      3 * 60 * 1000 // 3分
    );
  }

  // Follow endpoints
  async followUser(userId: string): Promise<any> {
    const result = await this.request(`/follows/${userId}`, {
      method: 'POST',
    });

    // フォロー関連とタイムラインのキャッシュを無効化
    await this.invalidateFollowCaches();
    await this.invalidateTimelineCaches();

    return result;
  }

  async unfollowUser(userId: string): Promise<any> {
    const result = await this.request(`/follows/${userId}`, {
      method: 'DELETE',
    });

    // フォロー関連とタイムラインのキャッシュを無効化
    await this.invalidateFollowCaches();
    await this.invalidateTimelineCaches();

    return result;
  }

  async getFollowStatus(followerId: string, followingId: string): Promise<any> {
    return this.request(`/follows/status/${followerId}/${followingId}`);
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.request(`/follows/followers/${userId}?page=${page}&limit=${limit}`);
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.request(`/follows/following/${userId}?page=${page}&limit=${limit}`);
  }

  async getFollowCounts(userId: string): Promise<any> {
    return this.request(
      `/follows/counts/${userId}`,
      {},
      CacheKeys.followCounts(userId),
      3 * 60 * 1000 // 3分
    );
  }

  // Like endpoints
  async likeUserTrack(userTrackId: string): Promise<any> {
    const result = await this.request('/likes', {
      method: 'POST',
      body: JSON.stringify({ user_track_id: userTrackId }),
    });

    // タイムラインのキャッシュを無効化
    await this.invalidateTimelineCaches();

    return result;
  }

  async unlikeUserTrack(userTrackId: string): Promise<any> {
    const result = await this.request(`/likes/${userTrackId}`, {
      method: 'DELETE',
    });

    // タイムラインのキャッシュを無効化
    await this.invalidateTimelineCaches();

    return result;
  }

  async getLikes(userTrackId: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.request(`/likes/user-track/${userTrackId}?page=${page}&limit=${limit}`);
  }

  // Comment endpoints
  async createComment(userTrackId: string, content: string, parentCommentId?: string): Promise<any> {
    const result = await this.request('/comments', {
      method: 'POST',
      body: JSON.stringify({ 
        user_track_id: userTrackId, 
        content,
        parent_comment_id: parentCommentId 
      }),
    });

    // コメントとタイムラインのキャッシュを無効化
    await this.invalidateCommentsCaches(userTrackId);
    await this.invalidateTimelineCaches();

    return result;
  }

  async createReply(userTrackId: string, content: string, parentCommentId: string): Promise<any> {
    return this.createComment(userTrackId, content, parentCommentId);
  }

  async getComments(userTrackId: string, page: number = 1, limit: number = 50): Promise<any> {
    return this.request(
      `/comments/user-track/${userTrackId}?page=${page}&limit=${limit}`,
      {},
      CacheKeys.comments(userTrackId),
      2 * 60 * 1000 // 2分
    );
  }

  async getComment(commentId: string): Promise<any> {
    return this.request(`/comments/${commentId}`);
  }

  async updateComment(commentId: string, content: string): Promise<any> {
    return this.request(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(commentId: string): Promise<any> {
    return this.request(`/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // User track endpoints
  async getUserTracks(userId?: string, categoryId?: string, page: number = 1, limit: number = 20): Promise<any> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (userId) params.append('user_id', userId);
    if (categoryId) params.append('category_id', categoryId);
    
    return this.request(
      `/user-tracks?${params.toString()}`,
      {},
      CacheKeys.userTracks(userId, categoryId, page),
      5 * 60 * 1000 // 5分
    );
  }

  async createUserTrack(categoryId: string, spotifyTrackId: string, comment?: string): Promise<any> {
    const result = await this.request('/user-tracks', {
      method: 'POST',
      body: JSON.stringify({ 
        category_id: categoryId, 
        spotify_track_id: spotifyTrackId,
        comment 
      }),
    });

    // タイムラインとユーザートラックのキャッシュを無効化
    await this.invalidateTimelineCaches();
    await this.invalidateUserTracksCaches();

    return result;
  }

  // Category endpoints
  async getCategories(): Promise<any> {
    return this.request(
      '/categories',
      {},
      CacheKeys.categories(),
      30 * 60 * 1000 // 30分
    );
  }

  // Music endpoints
  async searchTracks(query: string, limit: number = 20): Promise<any> {
    return this.request(
      `/music/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {},
      CacheKeys.searchTracks(query),
      10 * 60 * 1000 // 10分
    );
  }

  async getTrack(trackId: string): Promise<any> {
    return this.request(
      `/music/track/${trackId}`,
      {},
      CacheKeys.trackDetail(trackId),
      15 * 60 * 1000 // 15分
    );
  }

  // Notification endpoints
  async getNotifications(): Promise<any> {
    return this.request(
      '/notifications',
      {},
      CacheKeys.notifications(),
      1 * 60 * 1000 // 1分
    );
  }

  async getUnreadNotificationCount(): Promise<any> {
    return this.request(
      '/notifications/unread-count',
      {},
      CacheKeys.unreadCount(),
      30 * 1000 // 30秒
    );
  }

  async markNotificationAsRead(notificationId: string): Promise<any> {
    const result = await this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });

    // 通知キャッシュを無効化
    await this.invalidateNotificationsCaches();

    return result;
  }

  async markAllNotificationsAsRead(): Promise<any> {
    const result = await this.request('/notifications/read-all', {
      method: 'PUT',
    });

    // 通知キャッシュを無効化
    await this.invalidateNotificationsCaches();

    return result;
  }

  // キャッシュ無効化メソッド
  private async invalidateTimelineCaches(): Promise<void> {
    await cacheService.clearByPrefix('timeline_');
    await cacheService.clearByPrefix('user_timeline_');
    await cacheService.clearByPrefix('public_timeline_');
  }

  private async invalidateUserTracksCaches(): Promise<void> {
    await cacheService.clearByPrefix('user_tracks_');
  }

  private async invalidateCommentsCaches(userTrackId?: string): Promise<void> {
    if (userTrackId) {
      await cacheService.remove(CacheKeys.comments(userTrackId));
    } else {
      await cacheService.clearByPrefix('comments_');
    }
  }

  private async invalidateNotificationsCaches(): Promise<void> {
    await cacheService.remove(CacheKeys.notifications());
    await cacheService.remove(CacheKeys.unreadCount());
  }

  private async invalidateFollowCaches(): Promise<void> {
    await cacheService.clearByPrefix('follow_counts_');
  }
}

export const apiService = new ApiService();