import { Alert } from 'react-native';

export interface ErrorInfo {
  message: string;
  code?: string;
  status?: number;
  timestamp: number;
  url?: string;
  method?: string;
}

export class AppError extends Error {
  public code?: string;
  public status?: number;
  public timestamp: number;
  public url?: string;
  public method?: string;

  constructor(
    message: string,
    code?: string,
    status?: number,
    url?: string,
    method?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.timestamp = Date.now();
    this.url = url;
    this.method = method;
  }

  toErrorInfo(): ErrorInfo {
    return {
      message: this.message,
      code: this.code,
      status: this.status,
      timestamp: this.timestamp,
      url: this.url,
      method: this.method,
    };
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'ネットワークエラーが発生しました', url?: string, method?: string) {
    super(message, 'NETWORK_ERROR', undefined, url, method);
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = '認証エラーが発生しました', url?: string, method?: string) {
    super(message, 'AUTH_ERROR', 401, url, method);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, url?: string, method?: string) {
    super(message, 'VALIDATION_ERROR', 400, url, method);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'リクエストが多すぎます。しばらく待ってから再試行してください', url?: string, method?: string) {
    super(message, 'RATE_LIMIT_ERROR', 429, url, method);
    this.name = 'RateLimitError';
  }
}

export class ServerError extends AppError {
  constructor(message: string = 'サーバーエラーが発生しました', status: number = 500, url?: string, method?: string) {
    super(message, 'SERVER_ERROR', status, url, method);
    this.name = 'ServerError';
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorInfo[] = [];
  private maxQueueSize = 50;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: unknown, context?: string): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = this.categorizeError(error);
    } else {
      appError = new AppError(
        typeof error === 'string' ? error : '予期しないエラーが発生しました'
      );
    }

    // エラーをログに記録
    this.logError(appError, context);

    // ユーザーに適切なエラーメッセージを表示
    this.showUserError(appError);

    return appError;
  }

  private categorizeError(error: Error): AppError {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return new NetworkError(error.message);
    }

    if (message.includes('401') || message.includes('unauthorized')) {
      return new AuthError(error.message);
    }

    if (message.includes('400') || message.includes('validation')) {
      return new ValidationError(error.message);
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return new RateLimitError(error.message);
    }

    if (message.includes('500') || message.includes('server')) {
      return new ServerError(error.message);
    }

    return new AppError(error.message);
  }

  private logError(error: AppError, context?: string): void {
    const errorInfo = error.toErrorInfo();
    
    // エラーキューに追加
    this.errorQueue.push(errorInfo);
    
    // キューサイズを制限
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // コンソールにログ出力
    console.error('Error occurred:', {
      ...errorInfo,
      context,
      stack: error.stack,
    });

    // TODO: 本番環境では外部ログサービスに送信
    // this.sendToLogService(errorInfo, context);
  }

  private showUserError(error: AppError): void {
    const userMessage = this.getUserMessage(error);
    
    // 重要でないエラーはアラートを表示しない
    if (this.shouldShowAlert(error)) {
      Alert.alert(
        'エラー',
        userMessage,
        [
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    }
  }

  private getUserMessage(error: AppError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'ネットワークに接続できません。インターネット接続を確認してください。';
      case 'AUTH_ERROR':
        return 'ログインが必要です。再度ログインしてください。';
      case 'VALIDATION_ERROR':
        return '入力内容に問題があります。';
      case 'RATE_LIMIT_ERROR':
        return 'リクエストが多すぎます。しばらく待ってから再試行してください。';
      case 'SERVER_ERROR':
        return 'サーバーで問題が発生しました。しばらく待ってから再試行してください。';
      default:
        return '予期しないエラーが発生しました。';
    }
  }

  private shouldShowAlert(error: AppError): boolean {
    // 認証エラーやネットワークエラーなど、重要なエラーのみアラート表示
    const importantErrorCodes = ['AUTH_ERROR', 'NETWORK_ERROR', 'SERVER_ERROR'];
    return importantErrorCodes.includes(error.code || '');
  }

  // エラー統計を取得
  getErrorStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    
    this.errorQueue.forEach(error => {
      const code = error.code || 'UNKNOWN';
      stats[code] = (stats[code] || 0) + 1;
    });

    return stats;
  }

  // 最近のエラーを取得
  getRecentErrors(limit: number = 10): ErrorInfo[] {
    return this.errorQueue.slice(-limit);
  }

  // エラーキューをクリア
  clearErrors(): void {
    this.errorQueue = [];
  }
}

export const errorHandler = ErrorHandler.getInstance();