/**
 * PR Filter Component
 *
 * Client-side filter component with React Hook Form and Zod validation
 */

'use client';

import { useForm } from 'react-hook-form';
import { Filter, RotateCcw, Search } from 'lucide-react';
import type { FilterOptions } from '@/types/dashboard';

type FilterFormData = {
  status: 'all' | 'open' | 'closed' | 'merged';
  riskLevel: 'all' | 'low' | 'medium' | 'high' | 'critical';
  search?: string;
};

interface PRFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  defaultValues?: FilterOptions;
}

export function PRFilter({ onFilterChange, defaultValues }: PRFilterProps): React.JSX.Element {
  const { register, handleSubmit, reset, watch } = useForm<FilterFormData>({
    defaultValues: {
      status: defaultValues?.status || 'all',
      riskLevel: defaultValues?.riskLevel || 'all',
      search: defaultValues?.search || '',
    },
  });

  // Watch form changes and apply filters in real-time
  // eslint-disable-next-line react-hooks/incompatible-library
  const formValues = watch();

  const onSubmit = (data: FilterFormData): void => {
    const filters: FilterOptions = {
      status: data.status === 'all' ? undefined : (data.status as FilterOptions['status']),
      riskLevel: data.riskLevel === 'all' ? undefined : (data.riskLevel as FilterOptions['riskLevel']),
      search: data.search || undefined,
    };
    onFilterChange(filters);
  };

  const handleReset = (): void => {
    reset({
      status: 'all',
      riskLevel: 'all',
      search: '',
    });
    onFilterChange({});
  };

  // Auto-submit on form change
  const handleChange = (): void => {
    handleSubmit(onSubmit)();
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">フィルター</h2>
      </div>

      <form onChange={handleChange} className="space-y-4">
        {/* Search Input */}
        <div>
          <label htmlFor="search" className="mb-2 block text-sm font-medium text-gray-700">
            PR検索
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="search"
              type="text"
              placeholder="タイトルまたは番号で検索..."
              className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('search')}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status" className="mb-2 block text-sm font-medium text-gray-700">
            ステータス
          </label>
          <select
            id="status"
            className="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            {...register('status')}
          >
            <option value="all">すべて</option>
            <option value="open">オープン</option>
            <option value="merged">マージ済み</option>
            <option value="closed">クローズ</option>
          </select>
        </div>

        {/* Risk Level Filter */}
        <div>
          <label htmlFor="riskLevel" className="mb-2 block text-sm font-medium text-gray-700">
            リスクレベル
          </label>
          <select
            id="riskLevel"
            className="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            {...register('riskLevel')}
          >
            <option value="all">すべて</option>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
            <option value="critical">クリティカル</option>
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          onClick={handleReset}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <RotateCcw className="h-4 w-4" />
          フィルターをリセット
        </button>
      </form>

      {/* Active Filters Display */}
      {(formValues.status !== 'all' || formValues.riskLevel !== 'all' || formValues.search) && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="text-xs font-semibold text-gray-500 mb-2">適用中のフィルター</div>
          <div className="flex flex-wrap gap-2">
            {formValues.status !== 'all' && (
              <FilterBadge label={`ステータス: ${formValues.status === 'open' ? 'オープン' : formValues.status === 'merged' ? 'マージ済み' : 'クローズ'}`} />
            )}
            {formValues.riskLevel !== 'all' && (
              <FilterBadge label={`リスク: ${formValues.riskLevel === 'low' ? '低' : formValues.riskLevel === 'medium' ? '中' : formValues.riskLevel === 'high' ? '高' : 'クリティカル'}`} />
            )}
            {formValues.search && (
              <FilterBadge label={`検索: "${formValues.search}"`} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface FilterBadgeProps {
  label: string;
}

function FilterBadge({ label }: FilterBadgeProps): React.JSX.Element {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
      {label}
    </span>
  );
}
