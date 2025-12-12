import { z } from 'zod';

/**
 * リクエストバリデーション用のZodスキーマ
 */

// 共通バリデーション
const ownerSchema = z
  .string()
  .min(1, 'オーナー名は必須です')
  .max(39, 'オーナー名が長すぎます')
  .regex(/^[a-zA-Z0-9_-]+$/, 'オーナー名に無効な文字が含まれています');

const repoSchema = z
  .string()
  .min(1, 'リポジトリ名は必須です')
  .max(100, 'リポジトリ名が長すぎます')
  .regex(/^[a-zA-Z0-9_-]+$/, 'リポジトリ名に無効な文字が含まれています');

const pullNumberSchema = z
  .number()
  .int('プルリクエスト番号は整数である必要があります')
  .positive('プルリクエスト番号は正の数である必要があります');

// プルリクエスト一覧取得用クエリスキーマ
export const listPullRequestsQuerySchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  state: z.enum(['open', 'closed', 'all']).optional().default('open'),
  sort: z
    .enum(['created', 'updated', 'popularity', 'long-running'])
    .optional()
    .default('created'),
  direction: z.enum(['asc', 'desc']).optional().default('desc'),
  per_page: z
    .number()
    .int('per_pageは整数である必要があります')
    .min(1, 'per_pageは1以上である必要があります')
    .max(100, 'per_pageは100以下である必要があります')
    .optional()
    .default(30),
  page: z
    .number()
    .int('pageは整数である必要があります')
    .positive('pageは正の数である必要があります')
    .optional()
    .default(1),
});

// プルリクエスト詳細取得用ボディスキーマ
export const getPullRequestBodySchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  pull_number: pullNumberSchema,
});

/**
 * バリデーションヘルパー関数
 */

/**
 * プルリクエスト一覧取得のクエリパラメータをバリデーション
 */
export function validateListQuery(query: unknown) {
  return listPullRequestsQuerySchema.safeParse(query);
}

/**
 * プルリクエスト詳細取得のリクエストボディをバリデーション
 */
export function validateGetBody(body: unknown) {
  return getPullRequestBodySchema.safeParse(body);
}

/**
 * URLSearchParamsを型付きオブジェクトに変換
 */
export function parseSearchParams(searchParams: URLSearchParams): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (const [key, value] of searchParams.entries()) {
    // 数値文字列を数値に変換
    const trimmedValue = value.trim();
    if (trimmedValue !== '' && /^\d+$/.test(trimmedValue)) {
      params[key] = Number(trimmedValue);
    } else {
      params[key] = value;
    }
  }

  return params;
}

/**
 * GitHubトークンの形式をバリデーション
 */
export function isValidTokenFormat(token: string): boolean {
  return (
    token.startsWith('ghp_') ||
    token.startsWith('gho_') ||
    token.startsWith('ghu_') ||
    token.startsWith('ghs_') ||
    token.startsWith('github_pat_')
  );
}
