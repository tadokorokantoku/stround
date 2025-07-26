export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfter?: number;
}

export interface RequestInfo {
  endpoint: string;
  timestamp: number;
  count: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private requestHistory: Map<string, RequestInfo[]> = new Map();
  private globalConfig: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1分
    retryAfter: 1000, // 1秒
  };

  private endpointConfigs: Map<string, RateLimitConfig> = new Map([
    ['/timeline', { maxRequests: 30, windowMs: 60 * 1000, retryAfter: 2000 }],
    ['/notifications', { maxRequests: 20, windowMs: 60 * 1000, retryAfter: 3000 }],
    ['/likes', { maxRequests: 50, windowMs: 60 * 1000, retryAfter: 1000 }],
    ['/comments', { maxRequests: 20, windowMs: 60 * 1000, retryAfter: 2000 }],
    ['/music/search', { maxRequests: 15, windowMs: 60 * 1000, retryAfter: 4000 }],
  ]);

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  async checkRateLimit(endpoint: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const config = this.getConfigForEndpoint(endpoint);
    const now = Date.now();
    const key = this.getKey(endpoint);

    // 古いリクエストをクリーンアップ
    this.cleanupOldRequests(key, now, config.windowMs);

    const requests = this.requestHistory.get(key) || [];
    const requestCount = requests.reduce((sum, req) => sum + req.count, 0);

    if (requestCount >= config.maxRequests) {
      return {
        allowed: false,
        retryAfter: config.retryAfter || this.globalConfig.retryAfter,
      };
    }

    // リクエストを記録
    this.recordRequest(key, endpoint, now);

    return { allowed: true };
  }

  private getConfigForEndpoint(endpoint: string): RateLimitConfig {
    // エンドポイントパスを正規化（クエリパラメータやIDを除去）
    const normalizedEndpoint = this.normalizeEndpoint(endpoint);
    return this.endpointConfigs.get(normalizedEndpoint) || this.globalConfig;
  }

  private normalizeEndpoint(endpoint: string): string {
    // /timeline/user/123 -> /timeline/user
    // /comments/456 -> /comments
    // /music/search?q=test -> /music/search
    
    let normalized = endpoint.split('?')[0]; // クエリパラメータを除去
    
    // UUIDやIDらしきパスセグメントを除去
    normalized = normalized.replace(/\/[a-f0-9-]{36}$/i, ''); // UUID
    normalized = normalized.replace(/\/\d+$/, ''); // 数字のID
    
    return normalized;
  }

  private getKey(endpoint: string): string {
    // 同一エンドポイントのリクエストをグループ化
    return this.normalizeEndpoint(endpoint);
  }

  private cleanupOldRequests(key: string, now: number, windowMs: number): void {
    const requests = this.requestHistory.get(key);
    if (!requests) return;

    const cutoff = now - windowMs;
    const validRequests = requests.filter(req => req.timestamp > cutoff);
    
    if (validRequests.length === 0) {
      this.requestHistory.delete(key);
    } else {
      this.requestHistory.set(key, validRequests);
    }
  }

  private recordRequest(key: string, endpoint: string, timestamp: number): void {
    const requests = this.requestHistory.get(key) || [];
    
    // 同じタイムスタンプのリクエストがあれば count を増やす
    const existingRequest = requests.find(req => 
      Math.abs(req.timestamp - timestamp) < 1000 // 1秒以内
    );

    if (existingRequest) {
      existingRequest.count++;
    } else {
      requests.push({
        endpoint,
        timestamp,
        count: 1,
      });
    }

    this.requestHistory.set(key, requests);
  }

  // 統計情報を取得
  getStats(): { [endpoint: string]: { requests: number; lastRequest: number } } {
    const stats: { [endpoint: string]: { requests: number; lastRequest: number } } = {};
    
    this.requestHistory.forEach((requests, key) => {
      const totalRequests = requests.reduce((sum, req) => sum + req.count, 0);
      const lastRequest = Math.max(...requests.map(req => req.timestamp));
      
      stats[key] = {
        requests: totalRequests,
        lastRequest,
      };
    });

    return stats;
  }

  // レート制限をリセット
  reset(): void {
    this.requestHistory.clear();
  }

  // 特定のエンドポイントのレート制限をリセット
  resetEndpoint(endpoint: string): void {
    const key = this.getKey(endpoint);
    this.requestHistory.delete(key);
  }
}

export class RetryManager {
  private static instance: RetryManager;
  private retryQueue: Map<string, number> = new Map();

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
      exponentialBackoff?: boolean;
      shouldRetry?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      exponentialBackoff = true,
      shouldRetry = this.defaultShouldRetry,
    } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts || !shouldRetry(error)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt, baseDelay, maxDelay, exponentialBackoff);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private defaultShouldRetry(error: any): boolean {
    // ネットワークエラー、サーバーエラー、レート制限エラーはリトライ
    if (error?.status) {
      return error.status >= 500 || error.status === 429 || error.status === 408;
    }

    // ネットワーク関連のエラーメッセージ
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch')
    );
  }

  private calculateDelay(
    attempt: number,
    baseDelay: number,
    maxDelay: number,
    exponentialBackoff: boolean
  ): number {
    if (!exponentialBackoff) {
      return Math.min(baseDelay, maxDelay);
    }

    // 指数バックオフ + ジッター
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10%のジッター
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // リトライ統計
  getRetryStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    this.retryQueue.forEach((count, key) => {
      stats[key] = count;
    });
    return stats;
  }

  // リトライ統計をリセット
  resetStats(): void {
    this.retryQueue.clear();
  }
}

export const rateLimiter = RateLimiter.getInstance();
export const retryManager = RetryManager.getInstance();