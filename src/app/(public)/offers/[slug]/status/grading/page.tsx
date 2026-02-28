'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import GradingSection from '@/components/contests/status/GradingSection';
import { getContest } from '@/lib/api_contests';
import type {
  ContestRecord,
  ContestTaskRecord,
  EntryApiItem,
} from '@/components/contests/status/statusPage.helpers';

export default function ContestStatusGradingPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const t = useTranslations('OfferStatus');
  const [contest, setContest] = useState<ContestRecord | null>(null);
  const [entries, setEntries] = useState<EntryApiItem[]>([]);
  const [tasks, setTasks] = useState<ContestTaskRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const contestData = await getContest(slug);
        const contestRow: ContestRecord | null = contestData?.contest ?? (contestData?.id ? contestData : null);
        if (!contestRow?.id) throw new Error(t('page.notFound'));

        const [entriesRes, tasksRes, meRes] = await Promise.all([
          fetch(`/api/contests/by-slug/${encodeURIComponent(slug)}/entries?limit=200`, {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch(`/api/public/contests/by-slug/${encodeURIComponent(slug)}/tasks`, { cache: 'no-store' }),
          fetch('/api/me', { credentials: 'include', cache: 'no-store' }),
        ]);

        const entriesJson = await entriesRes.json().catch(() => ({}));
        const tasksJson = await tasksRes.json().catch(() => ({}));
        const meJson = await meRes.json().catch(() => ({}));

        if (!cancelled) {
          setContest(contestRow);
          setEntries(Array.isArray(entriesJson?.items) ? entriesJson.items : []);
          setTasks(Array.isArray(tasksJson?.items) ? tasksJson.items : []);
          setCurrentUserId(meJson?.user?.id ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setContest(null);
          setEntries([]);
          setTasks([]);
          setCurrentUserId(null);
          setError(err?.message || t('page.loadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  const backHref = useMemo(() => `/offers/${slug}/status?section=grading`, [slug]);

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-text site-gradient">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-3xl border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/80">
                {t('grading.eyebrow')}
              </p>
              <h1 className="text-2xl font-semibold text-secondary">{t('grading.consoleTitle')}</h1>
              <p className="text-sm text-muted">{contest?.title || slug}</p>
            </div>
            <Link href={backHref} className="btn btn-secondary h-9 px-4 text-xs uppercase tracking-wide">
              {t('grading.backToStatus')}
            </Link>
          </div>
        </header>

        {loading && <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted">{t('page.loading')}</div>}

        {error && !loading && (
          <div className="rounded-3xl border border-danger/30 bg-danger/10 p-6 text-sm text-danger">
            {error}
          </div>
        )}

        {!loading && !error && contest && (
          <GradingSection
            slug={contest.slug || slug}
            contestId={contest.id}
            entries={entries}
            tasks={tasks}
            canReview
            currentUserId={currentUserId}
            onJumpToPredictionResults={() => {
              window.location.href = `/offers/${contest.slug || slug}/status?section=prediction-results`;
            }}
          />
        )}
      </div>
    </main>
  );
}
