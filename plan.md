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
- **Hono** (TypeScript Web Framework)
- **Supabase Client** (データベースクライアント)
- **Supabase Auth** (認証)
- **Supabase Storage** (ファイルストレージ)
- **Supabase Realtime** (リアルタイム機能)
- **Cloudflare Workers** / **Vercel Edge** (Honoデプロイ先)

### 外部サービス
- **Spotify Web API** (楽曲検索・情報取得)
- **Supabase Storage** (画像・ファイルストレージ)
- **OneSignal** / **Expo Notifications** (プッシュ通知)

### 開発・デプロイ
- **Expo** (開発・ビルド)
- **Supabase** (データベース・認証ホスティング)
- **Cloudflare Workers** / **Vercel** (Hono APIホスティング)
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

#### Week 2: Supabase & Hono基盤
- [ ] Supabaseプロジェクト作成
- [ ] データベーススキーマ設計・作成
- [ ] Row Level Security (RLS) ポリシー設定
- [ ] Hono APIプロジェクト作成
- [ ] Hono + Cloudflare Workers / Vercel設定
- [ ] Supabase Client設定（Hono側）
- [ ] CORS・ミドルウェア設定
- [ ] 認証設定（Email/Social Login）
- [ ] Storage バケット作成

### Phase 2: 認証・ユーザー管理 (Week 3-4)

#### Week 3: Hono API認証システム
- [x] Hono認証ミドルウェア実装
- [x] Supabase AuthとのJWT連携
- [x] ユーザー登録APIエンドポイント
- [x] ログイン/ログアウトAPI
- [x] プロフィール管理API
- [x] セッション検証ロジック
- [x] RLSポリシー設定

#### Week 4: ユーザー管理UI
- [x] ログイン画面実装
- [x] ユーザー登録画面実装
- [x] 認証状態管理（Zustand/Redux）
- [x] ナビゲーション設定（認証前/後）
- [x] プロフィール編集画面

### Phase 3: 楽曲機能 (Week 5-7)

#### Week 5: Hono + Spotify API統合
- [x] HonoでSpotify Web APIクライアント実装
- [x] 楽曲検索APIエンドポイント
- [x] 楽曲情報取得・Supabaseキャッシュ
- [x] Spotify OAuth認証フロー
- [x] プレビュー再生機能

#### Week 6: Hono楽曲投稿機能
- [x] カテゴリ管理APIエンドポイント
- [x] 楽曲投稿APIエンドポイント
- [x] 楽曲一覧取得API
- [x] 楽曲追加画面UI
- [x] カテゴリ選択UI
- [x] 楽曲検索UI

#### Week 7: プロフィール画面
- [x] マイページ実装
- [x] 他人のプロフィール画面
- [x] カテゴリ別楽曲表示
- [x] 楽曲再生UI

### Phase 4: ソーシャル機能 (Week 8-10)

#### Week 8: Honoフォロー機能
- [x] フォロー/アンフォローAPIエンドポイント
- [x] ユーザー検索APIエンドポイント
- [x] フォローリスト取得API
- [x] フォロー関係表示UI
- [x] ユーザー検索画面UI

#### Week 9: Honoタイムライン
- [x] タイムラインAPIエンドポイント
- [x] フォローユーザー投稿取得ロジック
- [x] ページネーション実装
- [x] ホーム画面UI実装
- [x] 投稿一覧表示UI
- [x] 無限スクロールUI

#### Week 10: Honoいいね機能
- [x] いいねAPIエンドポイント
- [x] いいね状態取得API
- [x] いいね数カウントAPI
- [x] いいねボタンUI
- [x] いいね数表示UI
- [x] いいねしたユーザー一覧UI

### Phase 5: コメント・通知 (Week 11-12)

#### Week 11: Honoコメント機能
- [x] コメントCRUD APIエンドポイント
- [x] 返信（ネスト）機能API
- [x] コメントツリー取得ロジック
- [x] コメント表示UI
- [x] コメント投稿UI
- [x] 返信UI

#### Week 12: Hono通知システム
- [x] 通知作成APIエンドポイント
- [x] 通知一覧取得API
- [x] 通知既読API
- [x] Supabase Realtimeでリアルタイム通知
- [x] 通知画面UI実装
- [x] プッシュ通知設定（Expo Notifications）

### Phase 6: 追加機能・最適化 (Week 13-14)

#### Week 13: 楽曲詳細・検索
- [x] 楽曲詳細画面実装
- [x] 高度な検索機能
- [x] タグ機能実装
- [x] 検索画面UI改善

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

### バックエンド構成

#### Hono API (TypeScript)
```
api/
├── src/
│   ├── routes/           # API ルート定義
│   │   ├── auth.ts      # 認証関連API
│   │   ├── users.ts     # ユーザー管理API
│   │   ├── tracks.ts    # 楽曲関連API
│   │   ├── comments.ts  # コメント関連API
│   │   └── search.ts    # 検索API
│   ├── middleware/      # ミドルウェア
│   │   ├── auth.ts      # 認証ミドルウェア
│   │   ├── cors.ts      # CORS設定
│   │   └── logger.ts    # ログ出力
│   ├── services/        # ビジネスロジック
│   │   ├── spotify.ts   # Spotify API連携
│   │   ├── supabase.ts  # Supabase操作
│   │   └── notifications.ts # 通知処理
│   ├── types/           # TypeScript型定義
│   └── utils/           # ユーティリティ関数
├── package.json
└── wrangler.toml       # Cloudflare Workers設定
```

#### Supabase関連
```
supabase/
├── migrations/         # データベースマイグレーション
├── seed.sql           # 初期データ
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