'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { listPublicContests } from '@/lib/api_contests';

type Contest = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  type: string;
  selection: string;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  prize_summary?: string | null;
  branding_theme?: { primary?: string; cover_url?: string } | null;
};

export default function OffersIndexPage() {
  const [items, setItems] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('Offers');
  const loadErrorMessage = t('errors.load');

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'endingSoon'>('newest');
  const [mountedAnimations, setMountedAnimations] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await listPublicContests();
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (err: any) {
        setError(err?.message || loadErrorMessage);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadErrorMessage]);

  useEffect(() => {
    let frame: number;
    frame = requestAnimationFrame(() => setMountedAnimations(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const uniqTypes = useMemo(() => {
    const set = new Set(items.map((c) => c.type).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [items]);

  const now = Date.now();
  const filtered = useMemo(() => {
    let arr = [...items];
    const needle = query.trim().toLowerCase();
    if (needle) {
      arr = arr.filter((contest) =>
        [contest.title, contest.description, contest.prize_summary]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(needle)),
      );
    }

    if (typeFilter !== 'ALL') {
      arr = arr.filter((contest) => contest.type === typeFilter);
    }

    if (statusFilter !== 'ALL') {
      arr =
        statusFilter === 'ACTIVE'
          ? arr.filter((contest) => !contest.ends_at || new Date(contest.ends_at).getTime() > now)
          : arr.filter((contest) => contest.ends_at && new Date(contest.ends_at).getTime() <= now);
    }

    arr.sort((a, b) => {
      if (sortBy === 'newest') {
        const da = a.starts_at ? +new Date(a.starts_at) : 0;
        const db = b.starts_at ? +new Date(b.starts_at) : 0;
        return db - da;
      }
      const da = a.ends_at ? +new Date(a.ends_at) : Number.POSITIVE_INFINITY;
      const db = b.ends_at ? +new Date(b.ends_at) : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return arr;
  }, [items, query, typeFilter, statusFilter, sortBy, now]);

  const totalLive = useMemo(
    () => items.filter((c) => !c.ends_at || new Date(c.ends_at).getTime() > now).length,
    [items, now],
  );
  const endingSoon = useMemo(
    () =>
      items.filter((c) => {
        if (!c.ends_at) return false;
        const remaining = +new Date(c.ends_at) - now;
        return remaining > 0 && remaining < 3 * 24 * 60 * 60 * 1000;
      }).length,
    [items, now],
  );
  const heroStats = [
    { label: t('hero.stats.live'), value: totalLive.toLocaleString() },
    { label: t('hero.stats.endingSoon'), value: endingSoon.toLocaleString() },
    { label: t('hero.stats.total'), value: items.length.toLocaleString() },
  ];
  const transitionBase = 'transition-all duration-500 ease-out';
  const appearClass = mountedAnimations ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6';

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary via-secondary to-secondary text-white">
      <section className="relative overflow-hidden px-6 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.4),_transparent_45%)]" />
        <div className="relative mx-auto max-w-6xl space-y-8">
          <div className={`space-y-4 ${transitionBase} ${appearClass}`}>
            <p className="text-xs uppercase tracking-[0.4em] text-primary-weak">{t('hero.studioTag')}</p>
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">{t('hero.headline')}</h1>
            <p className="max-w-2xl text-sm text-muted">{t('hero.subheading')}</p>
          </div>

          <div
            className={`flex flex-wrap items-center gap-3 ${transitionBase} ${appearClass}`}
            style={{ transitionDelay: '120ms' }}
          >
            <Link
              href="/offers/new"
              className="inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-text shadow shadow-[0_10px_30px_rgba(26,35,50,0.06)] transition hover:-translate-y-0.5 hover:bg-primary-weak focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {t('hero.cta.launch')}
            </Link>
            <Link href="#offers" className="inline-flex items-center text-sm text-primary-weak hover:text-white">
              {t('hero.cta.explore')}
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {heroStats.map((stat, index) => (
              <HeroStat
                key={stat.label}
                label={stat.label}
                value={stat.value}
                delay={200 + index * 80}
                mounted={mountedAnimations}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="relative -mt-10 rounded-t-[40px] bg-bg px-6 pb-16 pt-10 text-text" id="offers">
        <FiltersPanel
          query={query}
          onQuery={setQuery}
          type={typeFilter}
          onType={setTypeFilter}
          types={uniqTypes}
          status={statusFilter}
          onStatus={setStatusFilter}
          sortBy={sortBy}
          onSortBy={setSortBy}
        />

        {loading && <OffersSkeleton />}
        {error && <div className="mt-6 rounded-2xl border border-danger bg-[rgba(214,76,76,0.08)] px-4 py-3 text-danger">{error}</div>}

        {!loading && !error && filtered.length === 0 && <EmptyState />}

       {!loading && !error && filtered.length > 0 && (
          <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((contest, index) => (
              <OfferCard key={contest.id} contest={contest} index={index} mounted={mountedAnimations} />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}

function HeroStat({
  label,
  value,
  delay,
  mounted,
}: {
  label: string;
  value: string;
  delay: number;
  mounted: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-primary bg-white/5 px-4 py-5 backdrop-blur transition-all duration-500 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-xs uppercase tracking-[0.4em] text-primary-weak">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function FiltersPanel({
  query,
  onQuery,
  type,
  onType,
  types,
  status,
  onStatus,
  sortBy,
  onSortBy,
}: {
  query: string;
  onQuery: (v: string) => void;
  type: string;
  onType: (v: string) => void;
  types: string[];
  status: string;
  onStatus: (v: string) => void;
  sortBy: 'newest' | 'endingSoon';
  onSortBy: (v: 'newest' | 'endingSoon') => void;
}) {
  const filtersT = useTranslations('Offers.filters');
  const typeT = useTranslations('Offers.types');

  return (
    <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="text-muted">{filtersT('search.label')}</span>
          <input
            type="search"
            placeholder={filtersT('search.placeholder')}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-border px-4 py-2.5 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">{filtersT('type.label')}</span>
          <select
            value={type}
            onChange={(e) => onType(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-border px-4 py-2.5 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak"
          >
            {types.map((option) => (
              <option key={option} value={option}>
                {option === 'ALL'
                  ? filtersT('type.all')
                  : typeT.has(option as any)
                  ? typeT(option as any)
                  : option.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted">{filtersT('status.label')}</span>
          <select
            value={status}
            onChange={(e) => onStatus(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-border px-4 py-2.5 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak"
          >
            <option value="ALL">{filtersT('status.all')}</option>
            <option value="ACTIVE">{filtersT('status.active')}</option>
            <option value="ENDED">{filtersT('status.ended')}</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted">{filtersT('sort.label')}</span>
          <select
            value={sortBy}
            onChange={(e) => onSortBy(e.target.value as 'newest' | 'endingSoon')}
            className="mt-1 w-full rounded-2xl border border-border px-4 py-2.5 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak"
          >
            <option value="newest">{filtersT('sort.newest')}</option>
            <option value="endingSoon">{filtersT('sort.endingSoon')}</option>
          </select>
        </label>
      </div>
    </div>
  );
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getDaysRemaining(endsAt?: string | null) {
  if (!endsAt) return null;
  const deadline = new Date(endsAt).getTime();
  if (Number.isNaN(deadline)) return null;
  return Math.ceil((deadline - Date.now()) / MS_PER_DAY);
}

function OfferCard({
  contest,
  index,
  mounted,
}: {
  contest: Contest;
  index: number;
  mounted: boolean;
}) {
  const cardT = useTranslations('Offers.card');
  const typeT = useTranslations('Offers.types');
  const typeLabel = typeT.has(contest.type as any) ? typeT(contest.type as any) : contest.type.replace(/_/g, ' ');
  const isActive = !contest.ends_at || new Date(contest.ends_at).getTime() > Date.now();
  const daysRemaining = getDaysRemaining(contest.ends_at);
  const daysLabel =
    daysRemaining === null
      ? cardT('noDeadline')
      : daysRemaining <= 0
      ? cardT('ended')
      : cardT('daysLeft', { count: daysRemaining });

  const brandColor =
    contest.branding_theme?.primary ||
    (contest.type === 'RIDDLE'
      ? '#F97316'
      : contest.type === 'QR_CODE'
      ? '#0EA5E9'
      : contest.type === 'LEADERBOARD'
      ? '#14B8A6'
      : '#6366F1');

  return (
      <Link
        href={`/offers/${contest.slug}`}
        className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: `${index * 60}ms` }}
      >
      <div
        className="h-36 w-full bg-gradient-to-br"
        style={{
          backgroundImage: `linear-gradient(135deg, ${brandColor}, #0f172a)`,
        }}
      />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] ${
                  isActive ? 'bg-success-weak text-[#4D8A1F]' : 'bg-primary-weak text-muted'
                }`}
              >
                {isActive ? cardT('active') : cardT('closed')}
              </span>
              <span className="rounded-full bg-primary-weak px-2.5 py-1 text-[10px] font-semibold text-primary-hover capitalize tracking-wide">
                {typeLabel}
              </span>
            </div>
            <span className="text-muted tracking-normal normal-case">{daysLabel}</span>
          </div>
          {contest.prize_summary && (
            <span className="inline-flex rounded-full bg-primary-weak px-2.5 py-1 text-[11px] font-medium text-muted line-clamp-1">
              {contest.prize_summary}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text line-clamp-2">{contest.title}</h3>
          {contest.description && (
            <p className="text-sm text-muted line-clamp-3">{contest.description}</p>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between text-sm font-semibold text-primary-hover">
          <span>{cardT('viewDetails')}</span>
          <span className="transition group-hover:translate-x-1">{'\u2192'}</span>
        </div>
      </div>
    </Link>
  );
}

function OffersSkeleton() {
  return (
    <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="h-72 rounded-3xl border border-border bg-white/70 shadow-sm animate-pulse" />
      ))}
    </section>
  );
}

function EmptyState() {
  const emptyT = useTranslations('Offers.empty');

  return (
    <div className="mt-8 rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
      <div className="text-xl font-semibold text-text">{emptyT('title')}</div>
      <p className="mt-2 text-sm text-muted">{emptyT('description')}</p>
    </div>
  );
}

