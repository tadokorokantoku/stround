# Stround Mobile App

Stround音楽SNSアプリのReact Native（Expo）モバイルアプリケーション

## 🚀 クイックスタート

### セットアップ

```bash
# 依存関係をインストール
npm install

# 開発サーバー起動
npm start
```

### 開発

```bash
# iOS シミュレーター
npm run ios

# Android エミュレーター  
npm run android

# Web ブラウザ
npm run web
```

## 🧪 テスト

```bash
# テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage
```

## 🔧 開発ツール

```bash
# 型チェック
npm run typecheck

# リンター
npm run lint

# リンター（自動修正）
npm run lint:fix

# フォーマッター
npm run format
```

## 📁 ディレクトリ構成

```
src/
├── components/      # 再利用可能なUIコンポーネント
│   ├── common/     # 汎用コンポーネント
│   ├── music/      # 楽曲関連コンポーネント
│   └── timeline/   # タイムライン関連コンポーネント
├── screens/         # 画面コンポーネント
│   ├── auth/       # 認証画面
│   ├── main/       # メイン画面
│   ├── profile/    # プロフィール画面
│   └── track/      # 楽曲詳細画面
├── hooks/          # カスタムReactフック
├── services/       # API呼び出しとビジネスロジック
├── stores/         # グローバル状態管理
├── navigation/     # ナビゲーション設定
├── types/          # TypeScript型定義
├── constants/      # 定数
└── lib/           # 外部ライブラリ設定
```

## 🏗️ 技術スタック

- **React Native + Expo**: モバイルアプリフレームワーク
- **TypeScript**: 型安全な開発
- **React Navigation**: ナビゲーション
- **React Native Paper**: UIコンポーネント
- **Zustand**: 軽量状態管理
- **React Query**: データフェッチング・キャッシュ
- **React Hook Form**: フォーム管理

## 📱 主要機能

- ユーザー認証・登録
- 楽曲検索・投稿
- タイムライン表示
- フォロー機能
- いいね・コメント機能
- 通知システム
- プッシュ通知

## 🔧 設定

### 環境変数

必要な環境変数を設定してください：

```bash
# Supabase設定
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Spotify API設定
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
```

### Supabase設定

`src/lib/supabase.ts`でSupabaseクライアントを設定してください。

## 🚀 ビルド・デプロイ

```bash
# EAS Buildでビルド
npx eas build

# アプリストアへ送信
npx eas submit
```

## 🧪 テスト戦略

- **ユニットテスト**: サービス・ユーティリティ関数
- **統合テスト**: React Queryフック
- **コンポーネントテスト**: UIコンポーネント
- **モック**: 外部API・ネイティブモジュール

## 📝 開発ガイドライン

### コーディング規約

- TypeScriptの厳密モードを使用
- ESLint + Prettierでコード品質を保持
- Conventional Commitsでコミットメッセージを統一

### コンポーネント設計

- React.memoで不要な再レンダリングを防止
- useCallbackでコールバック関数を最適化
- カスタムフックでロジックを分離

### パフォーマンス最適化

- React Queryでデータキャッシュ
- FlatListの最適化設定
- 画像の遅延読み込み
- レート制限・リトライ機能