# 音楽SNS Mobile App 実装計画

## プロジェクト概要

React Nativeを使用した音楽SNSモバイルアプリケーションの開発計画

## 技術スタック

### フロントエンド
- **React Native** (最新安定版)
- **TypeScript** (型安全性)
- **React Navigation** (ナビゲーション)
- **React Native Paper** または **NativeBase** (UIコンポーネント)
- **React Query** / **SWR** (データフェッチング・キャッシュ)
- **Zustand** / **Redux Toolkit** (状態管理)
- **React Hook Form** (フォーム管理)

### バックエンド
- **Supabase** (BaaS - Database, Auth, Storage, Realtime)
- **TypeScript**
- **Supabase Client** (データベースクライアント)
- **Supabase Auth** (認証)
- **Supabase Storage** (ファイルストレージ)
- **Supabase Realtime** (リアルタイム機能)

### 外部サービス
- **Spotify Web API** (楽曲検索・情報取得)
- **Supabase Storage** (画像・ファイルストレージ)
- **Supabase Functions** (サーバーレス関数)
- **OneSignal** / **Expo Notifications** (プッシュ通知)

### 開発・デプロイ
- **Expo** (開発・ビルド)
- **Supabase** (バックエンドホスティング)
- **GitHub Actions** (CI/CD)
- **Expo EAS** (アプリビルド・デプロイ)

## データベース設計（Supabase PostgreSQL）

### 主要テーブル

```sql
-- ユーザー（Supabase Authと連携）
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- 楽曲カテゴリ
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ユーザーの楽曲投稿
CREATE TABLE user_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  spotify_track_id TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 楽曲情報（Spotifyから取得・キャッシュ）
CREATE TABLE tracks (
  spotify_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  image_url TEXT,
  preview_url TEXT,
  external_url TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- フォロー関係
CREATE TABLE follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

-- コメント
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_track_id UUID REFERENCES user_tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- いいね
CREATE TABLE likes (
  user_track_id UUID REFERENCES user_tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_track_id, user_id)
);

-- 通知
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) ポリシー
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

## 実装フェーズ

### Phase 1: 基盤構築 (Week 1-2)

#### Week 1: プロジェクトセットアップ
- [ ] React Nativeプロジェクト作成（Expo CLI）
- [ ] TypeScript設定
- [ ] ESLint/Prettier設定
- [ ] 基本的なフォルダ構造作成
- [ ] 必要なライブラリインストール
- [ ] Git repository初期化

#### Week 2: Supabase基盤
- [ ] Supabaseプロジェクト作成
- [ ] データベーススキーマ設計・作成
- [ ] Row Level Security (RLS) ポリシー設定
- [ ] Supabase Client設定
- [ ] 認証設定（Email/Social Login）
- [ ] Storage バケット作成

### Phase 2: 認証・ユーザー管理 (Week 3-4)

#### Week 3: Supabase認証システム
- [ ] Supabase Auth設定
- [ ] ユーザー登録フロー実装
- [ ] ログイン/ログアウト実装
- [ ] プロフィール作成・更新
- [ ] セッション管理
- [ ] RLSポリシー設定

#### Week 4: ユーザー管理UI
- [ ] ログイン画面実装
- [ ] ユーザー登録画面実装
- [ ] 認証状態管理（Zustand/Redux）
- [ ] ナビゲーション設定（認証前/後）
- [ ] プロフィール編集画面

### Phase 3: 楽曲機能 (Week 5-7)

#### Week 5: Spotify API統合
- [ ] Spotify Web API設定
- [ ] 楽曲検索API実装
- [ ] 楽曲情報取得・キャッシュ
- [ ] プレビュー再生機能

#### Week 6: 楽曲投稿機能
- [ ] カテゴリ管理API
- [ ] 楽曲投稿API実装
- [ ] 楽曲追加画面UI
- [ ] カテゴリ選択UI
- [ ] 楽曲検索UI

#### Week 7: プロフィール画面
- [ ] マイページ実装
- [ ] 他人のプロフィール画面
- [ ] カテゴリ別楽曲表示
- [ ] 楽曲再生UI

### Phase 4: ソーシャル機能 (Week 8-10)

#### Week 8: フォロー機能
- [ ] フォロー/アンフォローAPI
- [ ] ユーザー検索API
- [ ] フォロー関係表示
- [ ] ユーザー検索画面

#### Week 9: タイムライン
- [ ] タイムラインAPI実装
- [ ] ホーム画面実装
- [ ] 投稿一覧表示
- [ ] 無限スクロール

#### Week 10: いいね機能
- [ ] いいねAPI実装
- [ ] いいねボタンUI
- [ ] いいね数表示
- [ ] いいねしたユーザー一覧

### Phase 5: コメント・通知 (Week 11-12)

#### Week 11: コメント機能
- [ ] コメントAPI実装
- [ ] 返信（ネスト）機能
- [ ] コメント表示UI
- [ ] コメント投稿UI

#### Week 12: 通知システム
- [ ] 通知テーブル・関数実装
- [ ] Supabase Realtimeでリアルタイム通知
- [ ] 通知画面実装
- [ ] プッシュ通知設定（Expo Notifications）

### Phase 6: 追加機能・最適化 (Week 13-14)

#### Week 13: 楽曲詳細・検索
- [ ] 楽曲詳細画面実装
- [ ] 高度な検索機能
- [ ] タグ機能実装
- [ ] 検索画面UI改善

#### Week 14: 最適化・テスト
- [ ] パフォーマンス最適化
- [ ] キャッシュ戦略実装
- [ ] エラーハンドリング強化
- [ ] ユニットテスト追加

### Phase 7: デプロイ・リリース (Week 15-16)

#### Week 15: デプロイ準備
- [ ] 本番環境設定
- [ ] CI/CD パイプライン構築
- [ ] セキュリティ監査
- [ ] 環境変数管理

#### Week 16: リリース
- [ ] ベータテスト
- [ ] バグ修正
- [ ] ストア申請準備
- [ ] リリース

## ファイル構造

### フロントエンド (React Native)

```
src/
├── components/           # 再利用可能なコンポーネント
│   ├── common/          # 汎用コンポーネント
│   ├── forms/           # フォームコンポーネント
│   └── music/           # 楽曲関連コンポーネント
├── screens/             # 画面コンポーネント
│   ├── auth/           # 認証関連画面
│   ├── home/           # ホーム画面
│   ├── profile/        # プロフィール画面
│   ├── search/         # 検索画面
│   └── settings/       # 設定画面
├── navigation/          # ナビゲーション設定
├── services/           # API呼び出し
├── stores/             # 状態管理
├── types/              # TypeScript型定義
├── utils/              # ユーティリティ関数
└── constants/          # 定数
```

### Supabase関連

```
supabase/
├── migrations/         # データベースマイグレーション
├── functions/          # Supabase Edge Functions
│   ├── spotify-search/ # Spotify API連携関数
│   └── notifications/  # 通知処理関数
└── config.toml        # Supabase設定

src/lib/
├── supabase.ts        # Supabaseクライアント設定
├── auth.ts            # 認証ヘルパー
├── database.ts        # データベース操作
└── types.ts           # データベース型定義
```

## 優先順位・リスク管理

### 高優先度
1. ユーザー認証・プロフィール
2. 楽曲投稿・表示機能
3. 基本的なソーシャル機能（フォロー・タイムライン）

### 中優先度
1. コメント・いいね機能
2. 通知システム
3. 検索機能

### 低優先度
1. 高度な検索・フィルタリング
2. プッシュ通知
3. 詳細な分析機能

### 主要リスク
1. **Spotify API制限**: 代替案として Apple Music API, YouTube API
2. **パフォーマンス**: 大量データ処理時の最適化
3. **モバイル対応**: デバイス間での一貫性
4. **スケーラビリティ**: ユーザー増加時のアーキテクチャ

## 成功指標

- [ ] ユーザー登録・ログイン完了率 > 80%
- [ ] 楽曲投稿機能の使用率 > 60%
- [ ] タイムライン閲覧時間 > 5分/セッション
- [ ] アプリクラッシュ率 < 1%
- [ ] API応答時間 < 500ms