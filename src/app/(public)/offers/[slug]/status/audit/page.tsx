'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import AuditLogPanel from '@/components/contests/status/AuditLogPanel';
import { getContest } from '@/lib/api_contests';
import type { ContestAuditLog, ContestRecord } from '@/components/contests/status/statusPage.helpers';

export default function AuditLogsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const t = useTranslations('OfferAudit');
  const [contest, setContest] = useState<ContestRecord | null>(null);
  const [logs, setLogs] = useState<ContestAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setLogsError(null);
      setContest(null);
      setLogs([]);
      try {
        const data = await getContest(slug);
        const fetched: ContestRecord | null = data?.contest ?? (data?.id ? data : null);
        if (!fetched?.id) {
          if (!cancelled) {
            setError(t('page.notFound'));
          }
          return;
        }
        if (cancelled) return;
        setContest(fetched);
        try {
          const items = await fetchContestAuditLogs(fetched.id);
          if (!cancelled) setLogs(items);
        } catch (err: any) {
          if (!cancelled) {
            setLogs([]);
            setLogsError(t('page.logsError'));
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(t('page.loadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  const subtitle = contest?.title
    ? t('page.subtitleWithTitle', { title: contest.title })
    : t('page.subtitle');

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-800">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">{t('page.eyebrow')}</p>
              <h1 className="text-2xl font-semibold text-slate-900">{t('page.title')}</h1>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
            <Link
              href={`/offers/${contest?.slug || slug}/status`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300"
            >
              {t('page.backToStatus')}
            </Link>
          </div>
        </header>

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            {t('page.loading')}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && contest && logsError && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600 shadow-sm">
            {logsError}
          </div>
        )}

        {!loading && !error && contest && <AuditLogPanel logs={logs} />}
      </div>
    </main>
  );
}

async function fetchContestAuditLogs(contestId: string): Promise<ContestAuditLog[]> {
  const response = await fetch(`/api/owner/contests/${contestId}/audit-logs`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error || 'Unable to load audit logs.');
  }
  return Array.isArray(json?.items) ? (json.items as ContestAuditLog[]) : [];
}
