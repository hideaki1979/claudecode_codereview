# ダッシュボード クイックスタートガイド

## 実装内容

以下の機能を備えた、完全に機能するNext.js 16ダッシュボード:

- ステータスとリスクレベルによるリアルタイムフィルタリング
- PRタイトルと作成者での検索機能
- ビジュアルメトリクスとチャート
- Tailwind CSSによるレスポンシブデザイン
- 全体にわたるTypeScript型安全性
- 最適なパフォーマンスのためのServer Components
- インタラクティビティのためのClient Components

## 作成されたファイル

### ページとレイアウト
- `/src/app/dashboard/page.tsx` - メインダッシュボード (Server Component)
- `/src/app/dashboard/DashboardContent.tsx` - クライアントサイドフィルタリング
- `/src/app/dashboard/loading.tsx` - ローディングスケルトン
- `/src/app/dashboard/error.tsx` - エラーバウンダリ

### コンポーネント
- `/src/components/PRCard.tsx` - メトリクス付きPR表示カード
- `/src/components/AnalysisChart.tsx` - チャートと可視化
- `/src/components/PRFilter.tsx` - フィルターコントロール (React Hook Form)

### 型定義
- `/src/types/dashboard.ts` - ダッシュボード固有の型

### ユーティリティ
- `/src/lib/utils.ts` - ヘルパー関数

## インストールされた依存関係

```json
{
  "react-hook-form": "^7.x",
  "lucide-react": "^0.x"
}
```

## 実行方法

### 1. 開発サーバーの起動
```bash
npm run dev
```

### 2. ダッシュボードを開く
以下のURLにアクセス: http://localhost:3000/dashboard

### 3. リポジトリの設定（オプション）

`/src/app/dashboard/page.tsx` の23行目を編集:

```typescript
const { data: prs } = await listPullRequests({
  owner: 'your-username',  // これを変更
  repo: 'your-repo',       // これを変更
  state: 'all',
  per_page: 20,
});
```

## 機能

### フィルターオプション
- **ステータス**: すべて、オープン、マージ済み、クローズ
- **リスクレベル**: すべて、低、中、高、クリティカル
- **検索**: タイトル、PR番号、または作成者でフィルター

### 表示されるメトリクス
- リスクスコア (0-100)
- 複雑度スコア (0-100)
- 変更されたファイル数
- 変更された行数
- リスクレベル（視覚的なバッジ）
- 複雑度レベル
- 影響レベル
- 推奨事項

### チャート
- リスク分布（横棒グラフ）
- 複雑度分布（横棒グラフ）
- サマリー統計カード

## アーキテクチャのハイライト

### Server Components（高速、SEOフレンドリー）
- メインダッシュボードページ
- GitHub APIからのデータ取得
- PR分析エンジン

### Client Components（インタラクティブ）
- フィルターコントロール
- 検索機能
- 状態管理

### TypeScriptベストプラクティス
- 明示的な戻り値の型
- `any`型を使用しない
- 判別共用体
- 適切なジェネリック制約
- React 19用のReact.JSX.Element

### Next.js 16の規約
- App Router
- デフォルトでServer Components
- 適切なデータ取得
- ローディングとエラー状態
- メタデータエクスポート

## 実装のテスト

### 型チェック
```bash
npx tsc --noEmit
```

### リントチェック
```bash
npm run lint
```

### ビルドチェック
```bash
npm run build
```

## よくある問題

### "No PRs found"
- GitHubトークンが設定されているか確認
- リポジトリのオーナー/名前を確認
- トークンにリポジトリアクセス権があるか確認

### TypeScriptエラー
```bash
rm -rf node_modules
npm install
```

### スタイリングの問題
```bash
rm -rf .next
npm run dev
```

## 次のステップ

### リポジトリのカスタマイズ
1. `page.tsx`のリポジトリ設定を更新
2. `.env.local`に`GITHUB_TOKEN`を設定
3. 開発サーバーを再起動

### フィルターの追加
1. `FilterOptions`型にフィールドを追加
2. `PRFilter.tsx`にフォームコントロールを追加
3. `DashboardContent.tsx`のフィルターロジックを更新

### 分析の拡張
1. `src/types/analysis.ts`の分析型を更新
2. `src/lib/analysis/`に計算ロジックを追加
3. コンポーネントに新しいメトリクスを表示

## ファイルパスリファレンス

すべてのファイルは`@/`エイリアスを使用した絶対パスを使用:

```typescript
import { PRCard } from '@/components/PRCard';
import type { PRWithAnalysis } from '@/types/dashboard';
import { analyzePullRequest } from '@/lib/analysis';
```

## パフォーマンスノート

- サーバーサイドデータ取得（クライアントサイドAPIコールなし）
- Promise.allによる並列PR分析
- クライアントサイドフィルタリング（即座に更新）
- メモ化されたフィルター計算
- スケルトンローディング状態

## アクセシビリティ

- セマンティックHTML構造
- 適切なARIAラベル
- キーボードナビゲーション
- 高コントラストカラー
- フォーカスインジケーター
- スクリーンリーダーフレンドリー

## ドキュメント

詳細な技術ドキュメントは`DASHBOARD_IMPLEMENTATION.md`を参照してください。

## 成功基準

✓ すべてのTypeScript型がパス
✓ ESLintエラーなし
✓ Server Componentsが正しく使用されている
✓ Client Componentsは必要な場所でのみ使用
✓ React Hook Formが統合されている
✓ Lucideアイコンが実装されている
✓ Tailwind CSSスタイリングが適用されている
✓ レスポンシブデザインが動作している
✓ ローディング状態が実装されている
✓ エラーバウンダリが追加されている
✓ フィルタリングが正しく動作している
✓ 検索機能が動作している
✓ チャートが正しく表示されている
