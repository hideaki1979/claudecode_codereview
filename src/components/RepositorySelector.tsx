/**
 * Repository Selector Component
 *
 * レポジトリ選択用のフォームコンポーネント
 */

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Github, Search } from 'lucide-react';

const repositorySchema = z.object({
  owner: z
    .string()
    .min(1, 'オーナー名を入力してください')
    .regex(/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i, 'GitHubユーザー名の形式が正しくありません'),
  repo: z
    .string()
    .min(1, 'リポジトリ名を入力してください')
    .regex(/^[a-z0-9_.-]+$/i, 'リポジトリ名の形式が正しくありません')
    .refine(name => !name.endsWith('.git'), 'リポジトリ名は.gitで終了することはできません')
    .refine(name => name != '.' && name !== '..', 'リポジトリ名として.と..は使用できません')
});

type RepositoryFormData = z.infer<typeof repositorySchema>;

interface RepositorySelectorProps {
  onSubmit: (owner: string, repo: string) => void;
  defaultValues?: {
    owner: string;
    repo: string;
  };
  isLoading?: boolean;
}

export function RepositorySelector({
  onSubmit,
  defaultValues,
  isLoading = false,
}: RepositorySelectorProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(!defaultValues);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<RepositoryFormData>({
    resolver: zodResolver(repositorySchema),
    mode: 'onChange',
    defaultValues: defaultValues || {
      owner: '',
      repo: '',
    },
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleFormSubmit = (data: RepositoryFormData): void => {
    onSubmit(data.owner, data.repo);
    setIsExpanded(false);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">リポジトリ選択</h2>
        </div>
        {defaultValues && !isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            変更
          </button>
        )}
      </div>

      {/* 現在のリポジトリ表示 */}
      {defaultValues && !isExpanded && (
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Github className="h-4 w-4 text-gray-400" />
            <span className="font-mono text-gray-900">
              {defaultValues.owner}/{defaultValues.repo}
            </span>
          </div>
        </div>
      )}

      {/* 入力フォーム */}
      {isExpanded && (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Owner Input */}
          <div>
            <label htmlFor="owner" className="mb-2 block text-sm font-medium text-gray-700">
              オーナー名
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              id="owner"
              type="text"
              placeholder="例: octocat"
              disabled={isLoading}
              className="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              {...register('owner')}
            />
            {errors.owner && (
              <p className="mt-1 text-xs text-red-600">{errors.owner.message}</p>
            )}
          </div>

          {/* Repository Input */}
          <div>
            <label htmlFor="repo" className="mb-2 block text-sm font-medium text-gray-700">
              リポジトリ名
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              id="repo"
              type="text"
              placeholder="例: hello-world"
              disabled={isLoading}
              className="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              {...register('repo')}
            />
            {errors.repo && <p className="mt-1 text-xs text-red-600">{errors.repo.message}</p>}
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              <Search className="h-4 w-4" />
              {isLoading ? '読み込み中...' : 'プルリクエストを取得'}
            </button>
            {defaultValues && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                disabled={isLoading}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>
      )}

      {/* ヘルプテキスト */}
      <div className="mt-4 text-xs text-gray-500">
        <p>GitHubの公開リポジトリまたはアクセス権限のあるプライベートリポジトリを指定できます。</p>
      </div>
    </div>
  );
}
