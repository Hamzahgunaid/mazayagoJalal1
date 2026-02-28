'use client';

import { useTranslations } from 'next-intl';

type Props = {
  q: string;
  onQ: (value: string) => void;
  types: string[];
  type?: string | 'ALL';
  onType: (value: string) => void;
  status?: string | 'ALL';
  onStatus: (value: string) => void;
  sortBy?: 'newest' | 'endingSoon';
  onSortBy: (value: 'newest' | 'endingSoon') => void;
};

export default function ChallengesFilters({
  q,
  onQ,
  types,
  type = 'ALL',
  onType,
  status = 'ALL',
  onStatus,
  sortBy = 'newest',
  onSortBy,
}: Props) {
  const t = useTranslations('ChallengesFilters');
  const typeT = useTranslations('Offers.types');

  const statusOptions = [
    { value: 'ALL', label: t('status.options.all') },
    { value: 'ACTIVE', label: t('status.options.active') },
    { value: 'ENDED', label: t('status.options.ended') },
  ];

  const sortOptions: { value: 'newest' | 'endingSoon'; label: string }[] = [
    { value: 'newest', label: t('sort.options.newest') },
    { value: 'endingSoon', label: t('sort.options.endingSoon') },
  ];

  const getTypeLabel = (value: string) => {
    if (value === 'ALL') return t('types.all');
    if ((typeT as any).has?.(value as any)) {
      return typeT(value as any);
    }
    try {
      return typeT(value as any);
    } catch {
      return value.replace(/_/g, ' ');
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-lg shadow-slate-200/40">
      <header className="flex flex-col gap-1 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{t('heading.badge')}</p>
          <h2 className="text-lg font-semibold text-slate-900">{t('heading.title')}</h2>
          <p className="text-sm text-slate-500">{t('heading.subtitle')}</p>
        </div>
        <div className="hidden rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-600 md:inline-flex">
          {t('heading.hint')}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <label className="flex flex-col space-y-2 rounded-2xl border border-slate-100 p-4 shadow-inner">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{t('search.label')}</span>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.65" y1="16.65" x2="21" y2="21" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => onQ(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-400">{t('search.helper')}</span>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{t('status.label')}</span>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-inner">
              <select
                value={status}
                onChange={(e) => onStatus(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="text-sm">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{t('sort.label')}</span>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-inner">
              <select
                value={sortBy}
                onChange={(e) => onSortBy(e.target.value as 'newest' | 'endingSoon')}
                className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between pb-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t('types.label')}</p>
          <span className="text-xs text-slate-400">{t('types.helper')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {types.map((value) => {
            const isActive = value === type;
            return (
              <button
                key={value}
                onClick={() => onType(value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-400/40'
                    : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
                title={getTypeLabel(value)}
              >
                {getTypeLabel(value)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
