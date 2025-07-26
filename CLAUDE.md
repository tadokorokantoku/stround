# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 開発コマンド

### フロントエンド（React Native）
- `npm start` - Expo development server開始
- `npm run android` - Android向けに開始
- `npm run ios` - iOS向けに開始
- `npm run web` - Web向けに開始
- `npm test` - テスト実行
- `npm run test:watch` - テスト監視モード
- `npm run test:coverage` - テストカバレッジ
- `npm run lint` - ESLint実行
- `npm run lint:fix` - ESLint自動修正
- `npm run format` - Prettier実行
- `npm run typecheck` - TypeScript型チェック

### バックエンド（Hono API）
- `cd backend && npm run dev` - Cloudflare Workers開発サーバー
- `cd backend && npm run deploy` - 本番デプロイ
- `cd backend && npm run build` - TypeScriptビルド
- `cd backend && npm run typecheck` - 型チェック

### モバイル専用
- `cd mobile && npm start` - モバイル専用Expo開発
- `cd mobile && npm run lint` - モバイル専用lint
- `cd mobile && npm run typecheck` - モバイル専用型チェック

### データベース
- `npx supabase start` - ローカルSupabase起動
- `npx supabase db reset` - データベースリセット
- `npx supabase db push` - マイグレーション適用

## プロジェクト構成

このプロジェクトは音楽SNSアプリ「Stround」で、モノレポ構成になっている：

### 主要ディレクトリ
- `/` - ルートのReact Nativeアプリ（メイン）
- `/mobile/` - モバイル専用のReact Nativeアプリ（リファクタリング後）
- `/backend/` - Hono + Cloudflare Workers API
- `/supabase/` - データベーススキーマとマイグレーション

### アーキテクチャ

**フロントエンド：**
- React Native (Expo)
- TypeScript
- React Navigation
- React Native Paper（UI）
- Zustand（状態管理）
- React Query（データフェッチング）
- React Hook Form（フォーム）

**バックエンド：**
- Hono（軽量Web framework）
- Cloudflare Workers（サーバーレス）
- Supabase（PostgreSQL + Auth + Storage + Realtime）
- Spotify Web API（楽曲検索）

**データベース設計：**
- `profiles` - ユーザープロフィール
- `user_tracks` - ユーザーの楽曲投稿
- `categories` - 楽曲カテゴリ
- `music` - 楽曲情報（Spotifyキャッシュ）
- `follows` - フォロー関係
- `likes` - いいね
- `comments` - コメント
- `notifications` - 通知

### コード規約
- 絶対パス import（`@/` prefix）
- TypeScript strict mode
- React Native Paper コンポーネント使用
- Supabase RLS（Row Level Security）適用済み
- JWT認証（Supabase Auth）

### 重要な機能
1. カテゴリ別楽曲投稿（「美しい曲」「学生時代の曲」等）
2. タイムライン（フォローユーザーの投稿）
3. Spotify楽曲検索・プレビュー再生
4. コメント・いいね機能
5. リアルタイム通知

### テスト
- Jest + React Native Testing Library
- カバレッジ取得：`src/` ディレクトリ
- セットアップファイル：`src/__tests__/setup.ts`

### 環境変数
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SPOTIFY_CLIENT_ID`（backend）
- `SPOTIFY_CLIENT_SECRET`（backend）

### 注意点
- `/mobile/` と root の両方にソースがあるがメインは `/mobile/`
- Supabaseマイグレーションは `supabase/migrations/` で管理
- Honoミドルウェアで認証を一括処理
- React Queryでキャッシュとリアルタイム更新を管理