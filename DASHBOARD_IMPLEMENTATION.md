# ダッシュボード実装ドキュメント

## 概要

自動化されたコード品質とセキュリティ評価を備えた、GitHubプルリクエストを分析するための包括的なNext.js 16ダッシュボードです。

## アーキテクチャ

### 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript (strictモード)
- **スタイリング**: Tailwind CSS 4
- **フォーム管理**: React Hook Form
- **バリデーション**: Zod (TypeScript優先のスキーマバリデーション)
- **アイコン**: Lucide React
- **日付フォーマット**: date-fns

## ファイル構造

```text
src/
├── app/
│   └── dashboard/
│       ├── page.tsx              # Server Component (メインページ)
│       ├── DashboardContent.tsx  # Client Component (フィルタリング)
│       ├── loading.tsx           # ローディングスケルトン
│       └── error.tsx             # エラーバウンダリ
├── components/
│   ├── PRCard.tsx                # PR表示カード
│   ├── AnalysisChart.tsx         # メトリクス可視化
│   └── PRFilter.tsx              # フィルターコンポーネント (Client)
├── types/
│   ├── dashboard.ts              # ダッシュボード固有の型
│   ├── github.ts                 # GitHub API の型
│   └── analysis.ts               # 分析結果の型
└── lib/
    ├── github/                   # GitHub API 統合
    ├── analysis/                 # 分析エンジン
    └── utils.ts                  # ヘルパー関数
```

## コンポーネントアーキテクチャ

### 1. ダッシュボードページ (Server Component)

**ファイル**: `src/app/dashboard/page.tsx`

**責務**:

- GitHub APIからPRデータを取得
- 分析エンジンを使用して各PRを分析
- インタラクティビティのためにクライアントコンポーネントにデータを渡す
- 適切なエラーハンドリングとローディング状態の実装

**主な機能**:

- ビルド/リクエスト時の非同期データ取得
- Promise.allによる並列PR分析
- 優雅なエラーハンドリング
- ローディング状態のためのSuspenseバウンダリ

**TypeScriptパターン**:

```typescript
async function fetchPRsWithAnalysis(): Promise<PRWithAnalysis[]> {
  // サーバーサイドのデータ取得
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const data = await fetchPRsWithAnalysis();
  return <DashboardContent initialData={data} />;
}
```

### 2. ダッシュボードコンテンツ (Client Component)

**ファイル**: `src/app/dashboard/DashboardContent.tsx`

**責務**:

- クライアントサイドのフィルタリングと検索
- フィルター用の状態管理
- フィルタリングされたPRリストのレンダリング
- 空の状態の処理

**主な機能**:

- 効率的なフィルタリングのための`useMemo`
- リアルタイムフィルター更新
- タイトル、番号、作成者での検索
- レスポンシブグリッドレイアウト

**TypeScriptパターン**:

```typescript
'use client';

export function DashboardContent({ initialData }: DashboardContentProps) {
  const [filters, setFilters] = useState<FilterOptions>({});
  const filteredData = useMemo(() => {
    // フィルターロジック
  }, [initialData, filters]);
}
```

### 3. PRカードコンポーネント

**ファイル**: `src/components/PRCard.tsx`

**責務**:

- PRメタデータと分析結果の表示
- 視覚的なリスクインジケーター
- メトリクス表示
- GitHub PRへのリンク

**主な機能**:

- リスクベースの色分け
- メトリクス用のレスポンシブグリッド
- 適切なARIAラベルを使用したアクセシブルなデザイン
- 視覚的階層のためのLucideアイコン

**デザインパターン**:

- リスクレベル用の設定オブジェクト
- データに基づく条件付きスタイリング
- セマンティックHTML構造

### 4. 分析チャートコンポーネント

**ファイル**: `src/components/AnalysisChart.tsx`

**責務**:

- 集計統計の可視化
- リスクと複雑さの分布
- サマリーメトリクスカード

**主な機能**:

- 分布用の横棒グラフ
- 色分けされたメトリクス
- パーセンテージ計算
- カウント付き凡例

**可視化アプローチ**:

- CSSベースのチャート（外部ライブラリなし）
- アクセシブルなカラーパレット
- レスポンシブレイアウト

### 5. フィルターコンポーネント

**ファイル**: `src/components/PRFilter.tsx`

**責務**:

- クライアントサイドのフィルターコントロール
- リアルタイムフォーム更新
- アクティブフィルター表示

**主な機能**:

- React Hook Form統合
- 変更時の自動送信
- リセット機能
- アクティブフィルターバッジ

**フォームパターン**:

```typescript
'use client';

const { register, handleSubmit, reset, watch } = useForm<FilterFormData>();

// フォーム変更時の自動送信
<form onChange={handleChange}>
  <select {...register('status')}>
```

## 型システム

### コア型

**PRWithAnalysis**: GitHub PRデータと分析結果を組み合わせる

```typescript
interface PRWithAnalysis {
  pr: GitHubPullRequest;
  analysis: AnalysisData;
}
```

**FilterOptions**: クライアントサイドのフィルター状態

```typescript
interface FilterOptions {
  status?: PRStatus | 'all';
  riskLevel?: RiskLevel | 'all';
  search?: string;
}
```

**DashboardStats**: 集計メトリクス

```typescript
interface DashboardStats {
  total: number;
  open: number;
  merged: number;
  closed: number;
  highRisk: number;
  criticalRisk: number;
}
```

## 実装されたベストプラクティス

### TypeScript

- ✅ すべての関数に明示的な戻り値の型
- ✅ 適切なジェネリック制約
- ✅ 結果型のための判別共用体
- ✅ `any`型を使用しない
- ✅ 適切な場所での型推論
- ✅ React 19互換性のためのReact.JSX.Element

### Next.js 16

- ✅ デフォルトでServer Components
- ✅ 必要な場合のみClient Components ('use client')
- ✅ 適切なデータ取得パターン
- ✅ ローディングとエラー状態
- ✅ SEO用のメタデータエクスポート

### React

- ✅ フックのベストプラクティス (useMemo, useState)
- ✅ 適切なコンポーネント構成
- ✅ アクセシブルなHTML構造
- ✅ レスポンシブデザインパターン

### スタイリング

- ✅ Tailwind CSSユーティリティクラス
- ✅ 一貫したカラーパレット
- ✅ モバイルファーストのレスポンシブデザイン
- ✅ WCAG 2.1 AAアクセシビリティ

## 設定

### 必須環境変数

```bash
GITHUB_TOKEN=your_github_token_here
```

### リポジトリ設定

`src/app/dashboard/page.tsx`を更新して、リポジトリを指定します:

```typescript
const { data: prs } = await listPullRequests({
  owner: 'your-org',      // これを変更
  repo: 'your-repo',      // これを変更
  state: 'all',
  per_page: 20,
});
```

## ダッシュボードの実行

### 開発

```bash
npm run dev
# http://localhost:3000/dashboard にアクセス
```

### プロダクションビルド

```bash
npm run build
npm run start
```

### 型チェック

```bash
npx tsc --noEmit
```

### リント

```bash
npm run lint
```

## パフォーマンスの考慮事項

1. **サーバーサイドデータ取得**: PRはサーバー上で取得され分析されます
2. **クライアントサイドフィルタリング**: API呼び出しなしで高速かつ即座にフィルタリング
3. **メモ化**: useMemoが不要な再計算を防ぎます
4. **並列分析**: 並行PR分析のためのPromise.all
5. **スケルトンローディング**: ローディング状態による知覚パフォーマンス

## アクセシビリティ機能

- セマンティックHTML構造
- 適切な見出し階層
- 必要な場所でのARIAラベル
- キーボードナビゲーションサポート
- 高コントラストカラー
- フォーカスインジケーター

## 拡張ポイント

### 新しいフィルターの追加

1. `src/types/dashboard.ts`の`FilterOptions`型を更新
2. `PRFilter.tsx`にフォームフィールドを追加
3. `DashboardContent.tsx`のフィルターロジックを更新

### 新しいメトリクスの追加

1. `src/types/analysis.ts`の`AnalysisData`型を更新
2. `src/lib/analysis/`に計算ロジックを追加
3. `PRCard.tsx`または`AnalysisChart.tsx`に表示

### スタイリングのカスタマイズ

すべてのスタイリングはTailwindクラスを使用しています。以下を変更してください:

- コンポーネントファイル内のカラーパレット
- グリッドクラスのスペーシングとレイアウト
- レスポンシブブレークポイント (sm:, md:, lg:)

## 既知の制限事項

1. **静的リポジトリ**: 現在はハードコードされたリポジトリから取得
2. **ページネーションなし**: 固定数のPRを取得（20件）
3. **リアルタイム更新なし**: データはページロード時に取得
4. **ローカル分析**: すべての分析はサーバー上で実行

## 今後の機能拡張

- [ ] 動的リポジトリ選択
- [ ] ページネーションサポート
- [ ] Webhook経由のリアルタイム更新
- [ ] 分析結果のエクスポート
- [ ] PR間の比較
- [ ] 履歴トレンド分析
- [ ] チームパフォーマンスメトリクス

## トラブルシューティング

### TypeScriptエラー

- すべての依存関係がインストールされていることを確認
- 型が見つからない場合は`npm install`を実行
- tsconfig.jsonに適切なパスがあることを確認

### GitHub APIエラー

- GITHUB_TOKENが設定されていることを確認
- トークン権限を確認（リポジトリアクセス）
- レート制限を超えていないことを確認

### スタイリングの問題

- .nextキャッシュをクリア: `rm -rf .next`
- 再ビルド: `npm run build`
- Tailwind CSSが設定されていることを確認

## 実装上の決定

### なぜServer Components?

- より良いパフォーマンス（静的コンテンツ用のクライアントサイドJSなし）
- データベース/APIへの直接アクセス
- SEOの改善
- バンドルサイズの削減

### なぜReact Hook Form?

- 優れたTypeScriptサポート
- 最小限の再レンダリング
- 簡単なバリデーション統合
- 小さなバンドルサイズ

### なぜLucide React?

- モダンで一貫したアイコンセット
- ツリーシェイク可能
- TypeScriptサポート
- 軽量

### なぜdate-fns?

- モジュール式（必要なものだけインポート）
- moment.jsよりも優れた国際化サポート
- TypeScriptフレンドリー
- アクティブなメンテナンス

## ライセンス

MIT - 詳細はプロジェクトルートを参照してください
