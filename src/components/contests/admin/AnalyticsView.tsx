'use client';

import { useEffect, useMemo, useState } from 'react';

type MetricKey =
  | 'participants'
  | 'entries'
  | 'correct'
  | 'incorrect'
  | 'winners'
  | 'codes_redeemed';

type DailyPoint = { d: string; c: number };

type AnalyticsResponse = Record<MetricKey, number> & { daily: DailyPoint[] };

export default function AnalyticsView({
  contestId,
  compact,
}: {
  contestId: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/owner/contests/${contestId}/analytics`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load analytics');
        const json = (await res.json()) as AnalyticsResponse;
        if (isActive) setData(json);
      } catch (err: any) {
        if (!isActive) return;
        setError(err?.message || 'Failed to load analytics');
        setData(null);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    load();
    return () => {
      isActive = false;
    };
  }, [contestId]);

  const metrics: { key: MetricKey; label: string }[] = useMemo(
    () => [
      { key: 'participants', label: 'Participants' },
      { key: 'entries', label: 'Entries' },
      { key: 'correct', label: 'Correct entries' },
      { key: 'incorrect', label: 'Incorrect entries' },
      { key: 'winners', label: 'Winners' },
      { key: 'codes_redeemed', label: 'Codes redeemed' },
    ],
    []
  );

  if (loading) return <div className="text-sm text-slate-500">Loading analytics...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data) return <div className="text-sm text-slate-500">No analytics available yet.</div>;

  const maxDaily = data.daily?.reduce((max, point) => Math.max(max, point?.c || 0), 0) || 0;

  return (
    <div className="space-y-4">
      <div
        className={`grid gap-3 ${
          compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
        }`}
      >
        {metrics.map(({ key, label }) => (
          <div key={key} className="p-4 rounded-2xl border bg-white/80 shadow-sm">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-2xl font-bold">
              {typeof data[key] === 'number'
                ? data[key].toLocaleString(undefined, { maximumFractionDigits: 0 })
                : '0'}
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="p-4 rounded-2xl border bg-white/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-700">Daily activity</div>
            <div className="text-xs text-slate-500">Based on contest entries</div>
          </div>
          {data.daily && data.daily.length > 0 ? (
            <div className="grid grid-cols-12 gap-1 items-end h-40">
              {data.daily.map((point) => {
                const ratio = maxDaily ? point.c / maxDaily : 0;
                const height = Math.max(6, Math.round(ratio * 100));
                return (
                  <div
                    key={point.d}
                    title={`${point.d}: ${point.c}`}
                    className="bg-slate-900/80 rounded"
                    style={{ height: `${height}%` }}
                  ></div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No entry activity yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
