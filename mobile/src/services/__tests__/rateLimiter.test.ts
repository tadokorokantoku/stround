import { RateLimiter, RetryManager } from '../rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = RateLimiter.getInstance();
    rateLimiter.reset();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const result = await rateLimiter.checkRateLimit('/test');

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should block requests exceeding rate limit', async () => {
      // timeline endpoint has maxRequests: 30
      for (let i = 0; i < 30; i++) {
        await rateLimiter.checkRateLimit('/timeline');
      }

      const result = await rateLimiter.checkRateLimit('/timeline');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(2000);
    });

    it('should normalize endpoints correctly', async () => {
      // These should all be treated as the same endpoint
      await rateLimiter.checkRateLimit('/timeline?page=1');
      await rateLimiter.checkRateLimit('/timeline?page=2');
      await rateLimiter.checkRateLimit('/timeline');

      const stats = rateLimiter.getStats();
      expect(stats['/timeline'].requests).toBe(3);
    });

    it('should remove UUID and numeric IDs from endpoints', async () => {
      await rateLimiter.checkRateLimit('/comments/550e8400-e29b-41d4-a716-446655440000');
      await rateLimiter.checkRateLimit('/comments/123');
      await rateLimiter.checkRateLimit('/comments');

      const stats = rateLimiter.getStats();
      expect(stats['/comments'].requests).toBe(3);
    });

    it('should clean up old requests', async () => {
      // Mock Date.now to simulate time passage
      const originalNow = Date.now;
      let currentTime = originalNow();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      await rateLimiter.checkRateLimit('/test');

      // Move time forward by 2 minutes (beyond the window)
      currentTime += 2 * 60 * 1000;

      await rateLimiter.checkRateLimit('/test');

      const stats = rateLimiter.getStats();
      expect(stats['/test'].requests).toBe(1); // Only the recent request should count

      Date.now = originalNow;
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await rateLimiter.checkRateLimit('/timeline');
      await rateLimiter.checkRateLimit('/timeline');
      await rateLimiter.checkRateLimit('/notifications');

      const stats = rateLimiter.getStats();

      expect(stats['/timeline'].requests).toBe(2);
      expect(stats['/notifications'].requests).toBe(1);
      expect(stats['/timeline'].lastRequest).toBeCloseTo(Date.now(), -3);
    });
  });

  describe('reset', () => {
    it('should reset all rate limits', async () => {
      await rateLimiter.checkRateLimit('/test');
      expect(rateLimiter.getStats()).toEqual(expect.objectContaining({
        '/test': expect.any(Object)
      }));

      rateLimiter.reset();
      expect(rateLimiter.getStats()).toEqual({});
    });

    it('should reset specific endpoint', async () => {
      await rateLimiter.checkRateLimit('/timeline');
      await rateLimiter.checkRateLimit('/notifications');

      rateLimiter.resetEndpoint('/timeline');

      const stats = rateLimiter.getStats();
      expect(stats['/timeline']).toBeUndefined();
      expect(stats['/notifications']).toBeDefined();
    });
  });
});

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = RetryManager.getInstance();
    retryManager.resetStats();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(
        retryManager.executeWithRetry(operation, { maxAttempts: 2 })
      ).rejects.toThrow('Persistent error');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry for non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('400 Bad Request'));

      // Mock shouldRetry to return false for 400 errors
      const shouldRetry = (error: any) => !error.message.includes('400');

      await expect(
        retryManager.executeWithRetry(operation, { shouldRetry })
      ).rejects.toThrow('400 Bad Request');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff by default', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const startTime = Date.now();

      await retryManager.executeWithRetry(operation, {
        baseDelay: 100,
        maxDelay: 1000,
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should take at least the base delay time (with some tolerance for test timing)
      expect(totalTime).toBeGreaterThan(150); // 100ms + 200ms (exponential) - some tolerance
    });

    it('should use linear backoff when exponentialBackoff is false', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const startTime = Date.now();

      await retryManager.executeWithRetry(operation, {
        baseDelay: 100,
        exponentialBackoff: false,
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should take approximately the base delay time
      expect(totalTime).toBeGreaterThan(90);
      expect(totalTime).toBeLessThan(200);
    });

    it('should respect maxDelay', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const startTime = Date.now();

      await retryManager.executeWithRetry(operation, {
        baseDelay: 1000,
        maxDelay: 200, // Lower than exponential would calculate
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should not exceed maxDelay * attempts
      expect(totalTime).toBeLessThan(500); // 200ms * 2 attempts + tolerance
    });

    it('should apply jitter to prevent thundering herd', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      // Run multiple times to see if delays vary
      const delays: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await retryManager.executeWithRetry(operation, { baseDelay: 100 });
        const endTime = Date.now();
        delays.push(endTime - startTime);
        operation.mockClear();
        operation
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValue('success');
      }

      // Check that delays are not all identical (jitter is applied)
      const uniqueDelays = new Set(delays.map(d => Math.floor(d / 10))); // Group by 10ms
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('default shouldRetry logic', () => {
    it('should retry for server errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry for rate limit errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ status: 429 })
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry for timeout errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ status: 408 })
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry for network-related errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry for client errors', async () => {
      const operation = jest.fn().mockRejectedValue({ status: 400 });

      await expect(retryManager.executeWithRetry(operation)).rejects.toEqual({ status: 400 });
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});