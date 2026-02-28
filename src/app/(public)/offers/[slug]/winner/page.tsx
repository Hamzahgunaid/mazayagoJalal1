'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getContest, listWinners } from '@/lib/api_contests';
import { formatStatusLabel } from '@/components/contests/status/statusPage.helpers';

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
};

type Winner = {
  id?: string;
  user_id?: string;
  entry_id?: string | null;
  published_at?: string | null;
  prize_id?: string | null;
  prize_name?: string | null;
  prize_description?: string | null;
  user_display_name?: string | null;
  user_avatar_url?: string | null;
  user?: {
    name?: string | null;
    display_name?: string | null;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
};

function displayWinnerName(w: Winner, fallback: string) {
  const candidates = [
    w.user_display_name,
    w.user?.display_name,
    w.user?.full_name,
    w.user?.name,
    w.user?.email,
  ];
  const firstValid = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return firstValid?.trim() || fallback;
}
function fmt(v?: string | null) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(+d) ? '' : d.toLocaleString();
}

function normalizeWinner(raw: any): Winner {
  if (!raw || typeof raw !== 'object') return raw;
  const baseUser = raw.user || {};
  const userDisplay =
    raw.user_display_name ||
    baseUser.display_name ||
    baseUser.full_name ||
    baseUser.name ||
    baseUser.email ||
    null;
  const avatar = raw.user_avatar_url || baseUser.avatar_url || null;
  return {
    ...raw,
    user_display_name: userDisplay,
    user_avatar_url: avatar,
  };
}

export default function OfferWinnersPage({ params, searchParams }: any) {
  const { slug } = params as { slug: string };
  const debug = (searchParams?.debug ?? '').toString() === '1';
  const t = useTranslations('OfferWinnersPage');
  const tSelection = useTranslations('OfferManage.selectionOptions');
  const tStatus = useTranslations('OfferStatus.statusLabels');

  const base = useMemo(() => process.env.NEXT_PUBLIC_BASE_URL || '', []);
  const [contest, setContest] = useState<Contest | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [trace, setTrace] = useState<Record<string, any>>({});
  const statusLabelOverrides = useMemo(
    () => ({
      ACTIVE: tStatus('active'),
      PAUSED: tStatus('paused'),
      ENDED: tStatus('ended'),
      DRAFT: tStatus('draft'),
      CORRECT: tStatus('correct'),
      VALIDATED: tStatus('validated'),
      INCORRECT: tStatus('incorrect'),
      PENDING: tStatus('pending'),
      IN_REVIEW: tStatus('inReview'),
      NEEDS_REVIEW: tStatus('needsReview'),
      SUBMITTED: tStatus('submitted'),
    }),
    [tStatus],
  );
  const selectionLabelOverrides = useMemo(
    () => ({
      RANDOM_FROM_CORRECT: tSelection('randomFromCorrect'),
      EVERY_CODE: tSelection('everyCode'),
      TOP_SCORE: tSelection('topScore'),
      FASTEST_TIME: tSelection('fastestTime'),
      MOST_CODES: tSelection('mostCodes'),
    }),
    [tSelection],
  );

  async function safeJson(res: Response) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function fetchWinnersBySlug(theSlug: string) {
    const url = `${base}/api/public/contests/by-slug/${encodeURIComponent(theSlug)}/winners`;
    const r = await fetch(url, { cache: 'no-store' });
    const data = await safeJson(r);
    return { ok: r.ok, data };
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const t: Record<string, any> = {};
      try {
        const cData = await getContest(slug);
        const c: Contest | null = cData?.contest ?? (cData?.id ? cData : null);
        setContest(c);
        t.contestFetch = [{ ok: !!c, where: 'by-slug' }];

        let collected: Winner[] = [];
        const bySlug = await fetchWinnersBySlug(slug).catch(() => ({ ok: false, data: null }));
        t.winnersSlug = [{ ok: bySlug.ok }];

        if (bySlug.ok) {
          const arr = bySlug.data?.winners;
          if (Array.isArray(arr)) collected = arr.map(normalizeWinner);
        }

        if (collected.length === 0 && c?.id) {
          const legacy = await listWinners(c.id).catch(() => ({ items: [] }));
          const arr = Array.isArray(legacy?.items) ? legacy.items : Array.isArray(legacy) ? legacy : [];
          if (Array.isArray(arr)) collected = arr.map(normalizeWinner);
          t.winnersLegacy = [{ ok: true, size: arr?.length ?? 0 }];
        }

        setWinners(collected);
      } catch (error: any) {
        t.error = error?.message || String(error);
        setContest(null);
        setWinners([]);
      } finally {
        setTrace(t);
        setLoading(false);
      }
    })();
  }, [slug, base]);

  if (loading) return <main className="p-6">{t('page.loading')}</main>;
  if (!contest) return <main className="p-6">{t('page.notFound')}</main>;

  const startedAt = contest.starts_at ? new Date(contest.starts_at) : null;
  const endsAt = contest.ends_at ? new Date(contest.ends_at) : null;
  const totalWinners = winners.length;
  const spotlight = winners[0];
  const timeline = winners.slice(1);
  const winnerFallback = t('fallbacks.winnerName');
  const timelineLabel = t('hero.timelineRange', {
    start: startedAt ? startedAt.toLocaleDateString() : t('hero.tba'),
    end: endsAt ? endsAt.toLocaleDateString() : t('hero.tba'),
  });
  const selectionLabel = formatStatusLabel(contest.selection, {
    fallback: t('fallbacks.unknownValue'),
    overrides: selectionLabelOverrides,
  });
  const statusLabel = formatStatusLabel(contest.status, {
    fallback: t('fallbacks.unknownValue'),
    overrides: statusLabelOverrides,
  });

  return (
    <main className="space-y-12 bg-gradient-to-b from-secondary via-secondary to-bg text-text">
      <section className="relative overflow-hidden rounded-b-[40px] bg-gradient-to-br from-primary-hover via-primary to-secondary px-6 py-14 text-white shadow-[0_40px_120px_rgba(15,23,42,0.35)]">
        <div className="mx-auto max-w-5xl space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-primary-weak">{t('hero.eyebrow')}</p>
          <h1 className="text-3xl font-bold md:text-4xl">{contest.title}</h1>
          {contest.description && <p className="max-w-3xl text-sm text-primary-weak">{contest.description}</p>}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-primary-weak p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-weak">{t('hero.totalWinners')}</p>
              <p className="mt-2 text-2xl font-semibold">{totalWinners}</p>
            </div>
            <div className="rounded-2xl bg-primary-weak p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-weak">{t('hero.selection')}</p>
              <p className="mt-2 text-lg font-medium">{selectionLabel}</p>
            </div>
            <div className="rounded-2xl bg-primary-weak p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-weak">{t('hero.status')}</p>
              <p className="mt-2 text-lg font-medium">{statusLabel}</p>
            </div>
            <div className="rounded-2xl bg-primary-weak p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-weak">{t('hero.timeline')}</p>
              <p className="mt-2 text-sm font-medium">{timelineLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6">
        <section className="rounded-3xl border border-border bg-white p-6 shadow shadow-[0_12px_28px_rgba(26,35,50,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-text">{t('content.title')}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
              <a href={`/offers/${contest.slug}`} className="text-primary-hover hover:text-primary-hover">
                {t('content.backToOffer')}
              </a>
            </div>
          </div>

          {totalWinners === 0 ? (
            <p className="mt-5 text-sm text-muted">{t('content.empty')}</p>
          ) : (
            <div className="mt-5 space-y-6">
              {spotlight && (
                <div className="rounded-3xl bg-gradient-to-br from-accent-weak to-white p-5 ring-1 ring-accent">
                  <p className="text-xs uppercase tracking-[0.3em] text-accent-hover">{t('spotlight.label')}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    {spotlight.user_avatar_url ? (
                      <img
                        src={spotlight.user_avatar_url}
                        alt={displayWinnerName(spotlight, winnerFallback)}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-white"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-accent text-white grid place-items-center text-xl font-semibold">
                        {displayWinnerName(spotlight, winnerFallback).slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-text truncate">
                        {displayWinnerName(spotlight, winnerFallback)}
                      </div>
                      <p className="text-xs text-muted">
                        {t('winner.published', {
                          date: fmt(spotlight.published_at) || t('fallbacks.unknownDate'),
                        })}
                      </p>
                      {spotlight.prize_name && (
                        <p className="text-xs text-accent-hover">
                          {t('winner.prize', { prize: spotlight.prize_name })}
                        </p>
                      )}
                      {spotlight.user_id && (
                        <p className="text-xs text-muted">{t('winner.id', { id: spotlight.user_id })}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {timeline.length > 0 && (
                <ol className="space-y-4 border-l border-border pl-4">
                  {timeline.map((winner, idx) => (
                    <li key={winner.id || winner.entry_id || idx} className="relative rounded-2xl bg-bg p-4 shadow-sm">
                      <span className="absolute -left-2 top-5 h-2 w-2 rounded-full bg-primary-weak" />
                      <div className="flex items-center gap-3">
                        {winner.user_avatar_url ? (
                          <img
                            src={winner.user_avatar_url}
                            alt={displayWinnerName(winner, winnerFallback)}
                            className="h-10 w-10 rounded-full object-cover ring-1 ring-white"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-border text-muted grid place-items-center text-sm font-semibold">
                            {displayWinnerName(winner, winnerFallback).slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-text">
                            {displayWinnerName(winner, winnerFallback)}
                          </div>
                          <p className="text-xs text-muted">
                            {t('winner.published', {
                              date: fmt(winner.published_at) || t('fallbacks.unknownDate'),
                            })}
                          </p>
                          {winner.prize_name && (
                            <p className="text-xs text-muted">
                              {t('winner.prize', { prize: winner.prize_name })}
                            </p>
                          )}
                          {winner.user_id && (
                            <p className="text-xs text-muted">{t('winner.id', { id: winner.user_id })}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>

        <section className="grid gap-6">
          <div className="rounded-3xl border border-border bg-white p-5 shadow">
            <h3 className="text-base font-semibold text-text">{t('insights.title')}</h3>
            <p className="mt-3 text-sm text-muted">{t('insights.body')}</p>
          </div>
        </section>

        {debug && (
          <section className="rounded-3xl border border-border bg-white p-5 shadow">
            <h3 className="text-base font-semibold text-text">{t('debug.title')}</h3>
            <pre className="mt-3 max-h-64 overflow-auto rounded-2xl bg-bg p-4 text-xs text-muted">
              {JSON.stringify(trace, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}






