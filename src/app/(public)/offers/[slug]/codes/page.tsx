'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import QrCodeBatches from '@/components/contests/status/QrCodeBatches';
import { getContest } from '@/lib/api_contests';
import type { ContestRecord } from '@/components/contests/status/statusPage.helpers';

export default function OfferCodesPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const t = useTranslations('OfferCodes');
  const [contest, setContest] = useState<ContestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getContest(slug);
        const fetched: ContestRecord | null = data?.contest ?? (data?.id ? data : null);
        if (!fetched?.id) {
          throw new Error(t('page.notFound'));
        }
        if (cancelled) return;
        setContest(fetched);
      } catch (err: any) {
        if (!cancelled) {
          setContest(null);
          setError(err?.message || t('page.error'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  const manageHref = `/offers/${contest?.slug || slug}/manage?tab=codes`;
  const statusHref = `/offers/${slug}/status`;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-800">
      <div className="mx-auto max-w-5xl space-y-6">
        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            {t('page.loading')}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-600 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && contest && (
          <QrCodeBatches
            contestId={contest.id}
            manageHref={manageHref}
            statusHref={statusHref}
            offerTitle={contest.title ?? undefined}
          />
        )}
      </div>
    </main>
  );
}
