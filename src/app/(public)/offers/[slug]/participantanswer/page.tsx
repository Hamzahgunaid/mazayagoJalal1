'use client';

import { useEffect, useState } from 'react';
import ParticipantEntriesPanel from '@/components/offers/ParticipantEntriesPanel';
import { getContest } from '@/lib/api_contests';


export default function ParticipantAnswersPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [contest, setContest] = useState<any | null>(null);
  const [loadingContest, setLoadingContest] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getContest(slug);
        if (!cancelled) {
          setContest(data?.contest || data || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setContest(null);
          setError(err?.message || 'Failed to load contest details.');
        }
      } finally {
        if (!cancelled) setLoadingContest(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Participant history</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {contest ? contest.title : 'Offer entries'}
          </h1>
          <p className="text-sm text-slate-600">
            Review every answer, upload, and QR submission you've made for this offer. Entries remain
            private to you unless the organizer shares them.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <a href={`/offers/${slug}`} className="inline-flex items-center text-indigo-600 hover:underline">
              &larr; Back to offer
            </a>
            <a href={`/offers/${slug}/manage`} className="inline-flex items-center text-indigo-600 hover:underline">
              Open manage page
            </a>
          </div>
        </header>

        {loadingContest && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading offer details...
          </div>
        )}
        {!loadingContest && !contest && !error && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-rose-600 shadow-sm">
            Offer not found.
          </div>
        )}
        {error && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-rose-600 shadow-sm">
            {error}
          </div>
        )}

        <ParticipantEntriesPanel slug={slug} />

      </div>
    </main>
  );
}



