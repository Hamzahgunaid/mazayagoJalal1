'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

type CodeBatch = {
  id: string;
  name: string;
  created_at?: string | null;
  pattern?: string | null;
  total_codes?: number;
  redeemed_codes?: number;
  remaining_codes?: number;
};

type CodeInsight = {
  id: string;
  batch_id?: string | null;
  batch_name?: string | null;
  tag?: string | null;
  sku?: string | null;
  max_redemptions?: number | null;
  redemptions_count?: number | null;
  expires_at?: string | null;
  created_at?: string | null;
  code_hash_hex?: string | null;
  entry_id?: string | null;
  entry_status?: string | null;
  entry_created_at?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  user_avatar_url?: string | null;
};

type CodesStats = {
  total: number;
  redeemed: number;
  exhausted: number;
  unused: number;
  available: number;
};

type CodesPagination = {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
};

type QrCodeBatchesProps = {
  contestId: string;
  manageHref: string;
  statusHref?: string;
  offerTitle?: string;
};

const PAGE_LIMITS = [25, 50, 100, 200];
const DEFAULT_LIMIT = 50;

const emptyStats: CodesStats = {
  total: 0,
  redeemed: 0,
  exhausted: 0,
  unused: 0,
  available: 0,
};

type FormatDateOptions = {
  fallback?: string;
  locale?: string;
  withTime?: boolean;
};

const formatDate = (value?: string | null, options: FormatDateOptions = {}) => {
  const fallback = options.fallback ?? 'n/a';
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (options.locale) {
    return options.withTime ? date.toLocaleString(options.locale) : date.toLocaleDateString(options.locale);
  }
  return options.withTime ? date.toLocaleString() : date.toLocaleDateString();
};

const safeNumber = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const safeText = (value?: string | null, fallback = 'n/a') =>
  value && value.trim() ? value : fallback;

const formatCount = (value?: number | null, locale?: string) =>
  safeNumber(value).toLocaleString(locale);

const maskHash = (hash?: string | null, showFull?: boolean, fallback = 'n/a') => {
  if (!hash) return fallback;
  if (showFull || hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

type StatusKey = 'unused' | 'active' | 'exhausted';

const resolveStatus = (code: CodeInsight): StatusKey => {
  const max = safeNumber(code.max_redemptions) || 1;
  const used = safeNumber(code.redemptions_count);
  if (used <= 0) return 'unused';
  if (used >= max) return 'exhausted';
  return 'active';
};

const statusBadge = (status: StatusKey) => {
  switch (status) {
    case 'active':
      return 'border-primary/30 bg-primary-weak/70 text-primary';
    case 'exhausted':
      return 'border-danger/30 bg-danger/10 text-danger';
    case 'unused':
    default:
      return 'border-border bg-surface text-muted';
  }
};

type StatTone = 'primary' | 'secondary' | 'accent' | 'success' | 'danger';

const statToneStyles: Record<StatTone, { card: string; dot: string; value: string }> = {
  primary: {
    card: 'border-primary/30 bg-primary-weak/70',
    dot: 'bg-primary',
    value: 'text-secondary',
  },
  secondary: {
    card: 'border-secondary/20 bg-secondary/10',
    dot: 'bg-secondary',
    value: 'text-secondary',
  },
  accent: {
    card: 'border-accent/30 bg-accent/10',
    dot: 'bg-accent',
    value: 'text-secondary',
  },
  success: {
    card: 'border-success/30 bg-success/10',
    dot: 'bg-success',
    value: 'text-secondary',
  },
  danger: {
    card: 'border-danger/30 bg-danger/10',
    dot: 'bg-danger',
    value: 'text-secondary',
  },
};

type StatCardProps = {
  label: string;
  value: number;
  tone: StatTone;
  helper?: string;
  compact?: boolean;
  locale?: string;
};

function StatCard({ label, value, tone, helper, compact, locale }: StatCardProps) {
  const styles = statToneStyles[tone];
  return (
    <div
      className={`rounded-2xl border shadow-sm ${styles.card} ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div
        className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted ${
          compact ? 'text-[10px]' : ''
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        {label}
      </div>
      <div
        className={`${compact ? 'mt-2 text-lg' : 'mt-3 text-2xl'} font-semibold ${styles.value} tabular-nums`}
      >
        {formatCount(value, locale)}
      </div>
      {helper && (
        <div className={`mt-2 text-xs text-muted ${compact ? 'text-[11px]' : ''}`}>
          {helper}
        </div>
      )}
    </div>
  );
}

type MetaItemProps = {
  label: string;
  value: string;
  dimmed?: boolean;
};

function MetaItem({ label, value, dimmed }: MetaItemProps) {
  const isDimmed = Boolean(dimmed);
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-xs text-muted">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</div>
      <div
        className={`mt-1 text-sm font-semibold ${isDimmed ? 'text-muted' : 'text-text'}`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

export default function QrCodeBatches({
  contestId,
  manageHref,
  statusHref,
  offerTitle,
}: QrCodeBatchesProps) {
  const t = useTranslations('OfferCodes');
  const locale = useLocale();
  const notAvailableLabel = t('common.notAvailable');
  const multipleLabel = t('common.multiple');
  const [batches, setBatches] = useState<CodeBatch[]>([]);
  const [codes, setCodes] = useState<CodeInsight[]>([]);
  const [stats, setStats] = useState<CodesStats>(emptyStats);
  const [pagination, setPagination] = useState<CodesPagination>({
    limit: DEFAULT_LIMIT,
    offset: 0,
    total: 0,
    hasMore: false,
  });
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);
  const [showFullHash, setShowFullHash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const activeBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatch) || null,
    [batches, selectedBatch],
  );
  const statusLabelMap = useMemo(
    () => ({
      unused: t('status.unused'),
      active: t('status.active'),
      exhausted: t('status.exhausted'),
    }),
    [t],
  );
  const totalCount = Math.max(stats.total, 0);
  const availableCount = Math.max(stats.available, 0);
  const exhaustedCount = Math.max(stats.exhausted, 0);
  const percentOfTotal = (value: number) => (totalCount ? Math.round((value / totalCount) * 100) : 0);

  const overallCards = [
    {
      id: 'total',
      label: t('stats.total'),
      value: totalCount,
      tone: 'secondary' as const,
      helper: t('stats.availableHelper', { count: formatCount(availableCount, locale) }),
    },
    {
      id: 'available',
      label: t('stats.available'),
      value: availableCount,
      tone: 'primary' as const,
      helper: t('stats.readyHelper', {
        percent: formatCount(percentOfTotal(availableCount), locale),
      }),
    },
    {
      id: 'exhausted',
      label: t('stats.exhausted'),
      value: exhaustedCount,
      tone: 'danger' as const,
      helper: t('stats.usedHelper', {
        percent: formatCount(percentOfTotal(exhaustedCount), locale),
      }),
    },
  ];

  const batchTotal = safeNumber(activeBatch?.total_codes ?? stats.total);
  const batchUsed = safeNumber(activeBatch?.redeemed_codes ?? stats.redeemed);
  const batchAvailable = safeNumber(activeBatch?.remaining_codes ?? stats.available);
  const percentOfBatch = (value: number) => (batchTotal ? Math.round((value / batchTotal) * 100) : 0);
  const batchCards = [
    {
      id: 'batch-total',
      label: t('stats.total'),
      value: batchTotal,
      tone: 'secondary' as const,
      helper: t('stats.availableHelper', { count: formatCount(batchAvailable, locale) }),
    },
    {
      id: 'batch-used',
      label: t('stats.used'),
      value: batchUsed,
      tone: 'accent' as const,
      helper: t('stats.usedHelper', { percent: formatCount(percentOfBatch(batchUsed), locale) }),
    },
    {
      id: 'batch-available',
      label: t('stats.available'),
      value: batchAvailable,
      tone: 'success' as const,
      helper: t('stats.remainingHelper', {
        percent: formatCount(percentOfBatch(batchAvailable), locale),
      }),
    },
  ];

  const displayCards = activeBatch ? batchCards : overallCards;
  const batchMeta = useMemo(() => {
    if (!activeBatch) return null;

    const resolveField = (values: Array<string | null | undefined>) => {
      const cleaned = values.map((value) => value?.trim()).filter(Boolean) as string[];
      if (!cleaned.length) return notAvailableLabel;
      const [first] = cleaned;
      return cleaned.every((value) => value === first) ? first : multipleLabel;
    };

    const tagValue = resolveField(codes.map((code) => code.tag));
    const skuValue = resolveField(codes.map((code) => code.sku));
    const expiresRaw = resolveField(codes.map((code) => code.expires_at));

    return {
      pattern: safeText(activeBatch.pattern, notAvailableLabel),
      createdAt: formatDate(activeBatch.created_at, { fallback: notAvailableLabel, locale }),
      tag: tagValue,
      sku: skuValue,
      expires:
        expiresRaw === notAvailableLabel || expiresRaw === multipleLabel
          ? expiresRaw
          : formatDate(expiresRaw, { fallback: notAvailableLabel, locale }),
    };
  }, [activeBatch, codes, locale, multipleLabel, notAvailableLabel]);


  useEffect(() => {
    setOffset(0);
  }, [selectedBatch, statusFilter, limit]);

  useEffect(() => {
    if (selectedBatch && !batches.some((batch) => batch.id === selectedBatch)) {
      setSelectedBatch('');
    }
  }, [batches, selectedBatch]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadInsights() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
        });
        if (selectedBatch) params.set('batch', selectedBatch);
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

        const res = await fetch(
          `/api/owner/contests/${contestId}/codes/insights?${params.toString()}`,
          {
            cache: 'no-store',
            credentials: 'include',
            signal: controller.signal,
          },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || t('state.loadError'));
        }

        if (!active) return;
        setBatches(Array.isArray(json?.batches) ? json.batches : []);
        setCodes(Array.isArray(json?.codes) ? json.codes : []);
        setStats(json?.stats || emptyStats);
        setPagination(
          json?.pagination || {
            limit,
            offset,
            total: 0,
            hasMore: false,
          },
        );
      } catch (err: any) {
        if (!active || err?.name === 'AbortError') return;
        setError(err?.message || t('state.loadError'));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInsights();

    return () => {
      active = false;
      controller.abort();
    };
  }, [contestId, selectedBatch, statusFilter, limit, offset, refreshToken, t]);

  const currentPage = pagination.total
    ? Math.min(Math.ceil(pagination.total / pagination.limit), Math.floor(pagination.offset / pagination.limit) + 1)
    : 1;
  const totalPages = pagination.total ? Math.ceil(pagination.total / pagination.limit) : 1;
  const startIndex = pagination.total ? offset + 1 : 0;
  const endIndex = pagination.total ? Math.min(offset + limit, pagination.total) : 0;

  const handleCopy = async (hash?: string | null) => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => {
        setCopiedHash((current) => (current === hash ? null : current));
      }, 1200);
    } catch {
      // ignore clipboard failures
    }
  };

  const resetFilters = () => {
    setSelectedBatch('');
    setStatusFilter('all');
    setOffset(0);
  };

  const headerSubtitle = offerTitle
    ? t('header.subtitleWithTitle', { title: offerTitle })
    : t('header.subtitle');

  return (
    <section className="relative space-y-6 overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.45)]">
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-primary-weak/70 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-16 top-24 h-40 w-40 rounded-full bg-accent/15 blur-3xl"
        aria-hidden="true"
      />
      <header className="flex flex-col gap-4 border-b border-border/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">
            {t('header.eyebrow')}
          </p>
          <h2 className="text-2xl font-semibold text-text">{t('header.title')}</h2>
          <p className="text-sm text-muted">{headerSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {statusHref && (
            <Link className="rv-btn" href={statusHref}>
              {t('header.backStatus')}
            </Link>
          )}
          <button
            className="rv-btn"
            type="button"
            onClick={() => setRefreshToken((prev) => prev + 1)}
            disabled={loading}
          >
            {t('header.refresh')}
          </button>
          <a
            href={manageHref}
            className="rv-btn-primary px-4 py-2 shadow-sm"
            target="_blank"
            rel="noreferrer"
          >
            {t('header.openManager')}
          </a>
        </div>
      </header>

      <div className="rounded-2xl border border-primary/20 bg-primary-weak/60 p-4 text-xs text-secondary shadow-sm">
        <div className="flex gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              {t('storageNote.label')}
            </p>
            <p className="mt-2 text-xs text-muted">
              {t('storageNote.body')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayCards.map((card) => (
          <StatCard
            key={card.id}
            label={card.label}
            value={card.value}
            tone={card.tone}
            helper={card.helper}
            locale={locale}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
          {t('state.loadingInventory')}
        </div>
      )}

      <div className={`grid gap-6 lg:grid-cols-[280px,1fr] ${loading ? 'opacity-60' : ''}`}>
        <aside className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            <span>{t('batchList.title')}</span>
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-muted">
              {t('batchList.count', { count: formatCount(batches.length, locale) })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedBatch('')}
            className={`group w-full rounded-2xl border px-4 py-3 text-left text-sm shadow-sm transition ${
              selectedBatch === ''
                ? 'border-primary/40 bg-primary-weak/70 text-secondary shadow-md'
                : 'border-border bg-surface hover:border-primary/30 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t('batchList.all')}</span>
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                {t('batchList.overview')}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">{t('batchList.overviewBody')}</p>
          </button>
          {batches.map((batch) => {
            const total = safeNumber(batch.total_codes);
            const redeemed = safeNumber(batch.redeemed_codes);
            const percent = total ? Math.min(100, Math.round((redeemed / total) * 100)) : 0;
            return (
              <button
                key={batch.id}
                type="button"
                onClick={() => setSelectedBatch(batch.id)}
                className={`group w-full rounded-2xl border px-4 py-3 text-left text-sm shadow-sm transition ${
                  selectedBatch === batch.id
                    ? 'border-primary/40 bg-primary-weak/70 text-secondary shadow-md'
                    : 'border-border bg-surface hover:border-primary/30 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{batch.name}</span>
                  <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {formatCount(percent, locale)}%
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted">
                  {t('batchList.remaining', {
                    remaining: formatCount(batch.remaining_codes, locale),
                    total: formatCount(total, locale),
                  })}
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-primary-weak/60">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-hover"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </button>
            );
          })}
        </aside>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface-elevated/80 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {t('batchFocus.title')}
                </p>
                <h3 className="text-lg font-semibold text-text">
                  {activeBatch?.name || t('batchFocus.all')}
                </h3>
                <p className="text-xs text-muted">
                  {activeBatch
                    ? t('batchFocus.descriptionSelected')
                    : t('batchFocus.descriptionAll')}
                </p>
              </div>
              {activeBatch && (
                <button className="rv-btn" type="button" onClick={() => setSelectedBatch('')}>
                  {t('batchFocus.clear')}
                </button>
              )}
            </div>
            <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-xs text-muted">
              {activeBatch ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <MetaItem
                      label={t('meta.pattern')}
                      value={batchMeta?.pattern ?? notAvailableLabel}
                      dimmed={batchMeta?.pattern === notAvailableLabel}
                    />
                    <MetaItem
                      label={t('meta.created')}
                      value={batchMeta?.createdAt ?? notAvailableLabel}
                      dimmed={batchMeta?.createdAt === notAvailableLabel}
                    />
                    <MetaItem
                      label={t('meta.tag')}
                      value={batchMeta?.tag ?? notAvailableLabel}
                      dimmed={
                        batchMeta?.tag === notAvailableLabel || batchMeta?.tag === multipleLabel
                      }
                    />
                    <MetaItem
                      label={t('meta.sku')}
                      value={batchMeta?.sku ?? notAvailableLabel}
                      dimmed={
                        batchMeta?.sku === notAvailableLabel || batchMeta?.sku === multipleLabel
                      }
                    />
                    <MetaItem
                      label={t('meta.expires')}
                      value={batchMeta?.expires ?? notAvailableLabel}
                      dimmed={
                        batchMeta?.expires === notAvailableLabel ||
                        batchMeta?.expires === multipleLabel
                      }
                    />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                      <span>{t('batchFocus.usage')}</span>
                      <span>
                        {t('batchFocus.usageValue', {
                          percent: formatCount(percentOfBatch(batchUsed), locale),
                        })}
                      </span>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-primary-weak/70">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${percentOfBatch(batchUsed)}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p>{t('batchFocus.selectHint')}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-elevated/80 p-4 shadow-sm backdrop-blur space-y-3">
            <div className="grid gap-3 lg:grid-cols-[1fr,0.8fr,0.6fr]">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {t('filters.status')}
                <select
                  className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal text-text"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">{t('filters.statusAll')}</option>
                  <option value="unused">{t('filters.statusUnused')}</option>
                  <option value="active">{t('filters.statusActive')}</option>
                  <option value="exhausted">{t('filters.statusExhausted')}</option>
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {t('filters.pageSize')}
                <select
                  className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal text-text"
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                >
                  {PAGE_LIMITS.map((size) => (
                    <option key={size} value={size}>
                      {t('filters.rows', { count: formatCount(size, locale) })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                <input
                  type="checkbox"
                  checked={showFullHash}
                  onChange={(event) => setShowFullHash(event.target.checked)}
                />
                {t('filters.showFullHash')}
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                {t('filters.matchCount', { count: formatCount(pagination.total, locale) })}
              </span>
              <button className="rv-btn" type="button" onClick={resetFilters}>
                {t('filters.reset')}
              </button>
            </div>
          </div>

          {codes.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-elevated/70 p-8 text-center">
              <p className="text-sm font-semibold text-text">{t('state.emptyTitle')}</p>
              <p className="mt-1 text-xs text-muted">
                {t('state.emptyBody')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-primary-weak/50 text-xs uppercase tracking-[0.2em] text-muted backdrop-blur">
                  <tr>
                    <th className="p-3 text-left">{t('table.codeHash')}</th>
                    <th className="p-3 text-left">{t('table.status')}</th>
                    <th className="p-3 text-left">{t('table.uses')}</th>
                    <th className="p-3 text-left">{t('table.lastActivity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => {
                    const status = resolveStatus(code);
                    const max = safeNumber(code.max_redemptions) || 1;
                    const used = safeNumber(code.redemptions_count);
                    const usagePercent = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
                    const usageBar =
                      status === 'exhausted'
                        ? 'bg-danger'
                        : status === 'active'
                        ? 'bg-primary'
                        : 'bg-border';
                    const lastActivity = code.entry_created_at
                      ? `${safeText(code.user_name, notAvailableLabel)} | ${formatDate(
                          code.entry_created_at,
                          { fallback: notAvailableLabel, locale, withTime: true },
                        )}`
                      : t('table.noActivity');
                    return (
                      <tr
                        key={code.id}
                        className="border-t border-border transition hover:bg-primary-weak/30 odd:bg-surface even:bg-primary-weak/20"
                      >
                        <td className="p-3 font-mono text-xs text-text">
                          <div className="flex items-center gap-2">
                            <span title={code.code_hash_hex || undefined}>
                              {maskHash(code.code_hash_hex, showFullHash, notAvailableLabel)}
                            </span>
                            <button
                              type="button"
                              className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted transition hover:border-primary/40 hover:bg-primary-weak/50"
                              onClick={() => handleCopy(code.code_hash_hex)}
                              disabled={!code.code_hash_hex}
                            >
                              {copiedHash === code.code_hash_hex ? t('table.copied') : t('table.copy')}
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(
                              status,
                            )}`}
                          >
                            {statusLabelMap[status]}
                          </span>
                        </td>
                        <td className="p-3 text-text">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-text tabular-nums">
                              {formatCount(used, locale)}/{formatCount(max, locale)}
                            </span>
                            <div className="h-1.5 w-20 rounded-full bg-primary-weak/70">
                              <div
                                className={`h-1.5 rounded-full ${usageBar}`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-muted">{lastActivity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <div className="space-y-1">
              <div className="font-medium text-text">
                {t('pagination.showing', {
                  start: formatCount(startIndex, locale),
                  end: formatCount(endIndex, locale),
                  total: formatCount(pagination.total, locale),
                })}
              </div>
              <div className="text-xs text-muted">
                {t('pagination.page', {
                  current: formatCount(currentPage, locale),
                  totalPages: formatCount(totalPages, locale),
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="rv-btn"
                type="button"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                {t('pagination.previous')}
              </button>
              <button
                className="rv-btn"
                type="button"
                onClick={() => setOffset(offset + limit)}
                disabled={!pagination.hasMore}
              >
                {t('pagination.next')}
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
