import { ErrorHandler, AppError, NetworkError, AuthError, ValidationError, RateLimitError, ServerError } from '../errorHandler';
import { Alert } from 'react-native';

// Alert のモック
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('AppError', () => {
  it('should create AppError with all properties', () => {
    const error = new AppError('Test message', 'TEST_CODE', 400, '/test', 'GET');

    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.status).toBe(400);
    expect(error.url).toBe('/test');
    expect(error.method).toBe('GET');
    expect(error.timestamp).toBeCloseTo(Date.now(), -3);
  });

  it('should create ErrorInfo object', () => {
    const error = new AppError('Test message', 'TEST_CODE', 400, '/test', 'GET');
    const errorInfo = error.toErrorInfo();

    expect(errorInfo).toEqual({
      message: 'Test message',
      code: 'TEST_CODE',
      status: 400,
      url: '/test',
      method: 'GET',
      timestamp: error.timestamp,
    });
  });
});

describe('Specific Error Types', () => {
  it('should create NetworkError with default message', () => {
    const error = new NetworkError();

    expect(error.message).toBe('ネットワークエラーが発生しました');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.status).toBeUndefined();
  });

  it('should create AuthError with correct properties', () => {
    const error = new AuthError('Custom auth message', '/auth', 'POST');

    expect(error.message).toBe('Custom auth message');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.status).toBe(401);
    expect(error.url).toBe('/auth');
    expect(error.method).toBe('POST');
  });

  it('should create ValidationError with correct properties', () => {
    const error = new ValidationError('Validation failed');

    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.status).toBe(400);
  });

  it('should create RateLimitError with default message', () => {
    const error = new RateLimitError();

    expect(error.message).toBe('リクエストが多すぎます。しばらく待ってから再試行してください');
    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.status).toBe(429);
  });

  it('should create ServerError with default values', () => {
    const error = new ServerError();

    expect(error.message).toBe('サーバーエラーが発生しました');
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.status).toBe(500);
  });
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrors();
  });

  describe('handleError', () => {
    it('should handle AppError correctly', () => {
      const originalError = new NetworkError('Network failed');
      const result = errorHandler.handleError(originalError);

      expect(result).toBe(originalError);
      expect(Alert.alert).toHaveBeenCalledWith(
        'エラー',
        'ネットワークに接続できません。インターネット接続を確認してください。',
        [{ text: 'OK', style: 'default' }]
      );
    });

    it('should categorize regular Error as AppError', () => {
      const originalError = new Error('Regular error');
      const result = errorHandler.handleError(originalError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Regular error');
    });

    it('should categorize network errors', () => {
      const networkError = new Error('Network request failed');
      const result = errorHandler.handleError(networkError);

      expect(result).toBeInstanceOf(NetworkError);
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('should categorize auth errors', () => {
      const authError = new Error('401 Unauthorized');
      const result = errorHandler.handleError(authError);

      expect(result).toBeInstanceOf(AuthError);
      expect(result.code).toBe('AUTH_ERROR');
    });

    it('should categorize validation errors', () => {
      const validationError = new Error('400 Bad Request');
      const result = errorHandler.handleError(validationError);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should categorize rate limit errors', () => {
      const rateLimitError = new Error('429 Too Many Requests');
      const result = errorHandler.handleError(rateLimitError);

      expect(result).toBeInstanceOf(RateLimitError);
      expect(result.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should categorize server errors', () => {
      const serverError = new Error('500 Internal Server Error');
      const result = errorHandler.handleError(serverError);

      expect(result).toBeInstanceOf(ServerError);
      expect(result.code).toBe('SERVER_ERROR');
    });

    it('should handle string errors', () => {
      const result = errorHandler.handleError('String error message');

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('String error message');
    });

    it('should handle unknown error types', () => {
      const result = errorHandler.handleError({ unknown: 'error' });

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('予期しないエラーが発生しました');
    });

    it('should not show alert for non-important errors', () => {
      const validationError = new ValidationError('Input validation failed');
      errorHandler.handleError(validationError);

      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('error queue management', () => {
    it('should add errors to queue', () => {
      const error1 = new AppError('Error 1');
      const error2 = new AppError('Error 2');

      errorHandler.handleError(error1);
      errorHandler.handleError(error2);

      const recentErrors = errorHandler.getRecentErrors();
      expect(recentErrors).toHaveLength(2);
      expect(recentErrors[0].message).toBe('Error 1');
      expect(recentErrors[1].message).toBe('Error 2');
    });

    it('should limit queue size', () => {
      // Create more errors than the max queue size
      for (let i = 0; i < 55; i++) {
        errorHandler.handleError(new AppError(`Error ${i}`));
      }

      const recentErrors = errorHandler.getRecentErrors(100);
      expect(recentErrors.length).toBeLessThanOrEqual(50);
    });

    it('should get error statistics', () => {
      errorHandler.handleError(new NetworkError());
      errorHandler.handleError(new NetworkError());
      errorHandler.handleError(new AuthError());

      const stats = errorHandler.getErrorStats();
      expect(stats['NETWORK_ERROR']).toBe(2);
      expect(stats['AUTH_ERROR']).toBe(1);
    });

    it('should clear errors', () => {
      errorHandler.handleError(new AppError('Test error'));
      expect(errorHandler.getRecentErrors()).toHaveLength(1);

      errorHandler.clearErrors();
      expect(errorHandler.getRecentErrors()).toHaveLength(0);
    });
  });
});