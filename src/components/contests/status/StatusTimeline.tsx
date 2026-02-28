'use client';

import { useMemo, useState } from 'react';

type TimelineStatus = 'complete' | 'current' | 'upcoming';
type TimelineMode = 'schedule' | 'review';
type TrendRange = '7d' | '30d';

type TimelineCheckpoint = {
  id: string;
  title: string;
  date: string;
  description: string;
  status: TimelineStatus;
  meta?: string;
};

type EntryBreakdown = {
  id: string;
  label: string;
  value: number;
  change: number;
  accent: string;
};

type EntrySummary = {
  total: number;
  lastUpdated: string;
  breakdown: EntryBreakdown[];
  trend: Record<TrendRange, number[]>;
};

export type StatusTimelineProps = {
  schedule: TimelineCheckpoint[];
  review: TimelineCheckpoint[];
  entrySummary: EntrySummary;
};

const STATUS_META: Record<TimelineStatus, { dot: string; border: string; text: string }> = {
  complete: {
    dot: 'bg-emerald-500 ring-emerald-200',
    border: 'border-emerald-500/20',
    text: 'text-emerald-600',
  },
  current: {
    dot: 'bg-indigo-500 ring-indigo-200 animate-pulse',
    border: 'border-indigo-500/30',
    text: 'text-indigo-600',
  },
  upcoming: {
    dot: 'bg-slate-200 ring-slate-200',
    border: 'border-slate-200',
    text: 'text-slate-400',
  },
};

const VIEW_TABS: { id: TimelineMode; label: string; helper: string }[] = [
  { id: 'schedule', label: 'Schedule', helper: 'Opening & milestone dates' },
  { id: 'review', label: 'Review flow', helper: 'Judging + QA states' },
];

const TREND_RANGES: { id: TrendRange; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];

export default function StatusTimeline({ schedule, review, entrySummary }: StatusTimelineProps) {
  const [mode, setMode] = useState<TimelineMode>('schedule');
  const [trendRange, setTrendRange] = useState<TrendRange>('7d');

  const activeTimeline = mode === 'schedule' ? schedule : review;
  const trendSeries = entrySummary.trend[trendRange] ?? [];
  const trendMax = Math.max(...trendSeries, 1);
  const maxBreakdownValue = useMemo(
    () => Math.max(...entrySummary.breakdown.map((item) => item.value), 1),
    [entrySummary.breakdown]
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Timeline & Entries</p>
          <h2 className="text-2xl font-semibold text-slate-900">Key phases & submission health</h2>
          <p className="text-sm text-slate-500">
            Switch between launch schedule and review workflow, then monitor throughput for every entry status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {VIEW_TABS.map((tab) => {
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`rounded-2xl border px-4 py-2 text-left transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="block text-sm font-semibold">{tab.label}</span>
                <span className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{tab.helper}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {mode === 'schedule' ? 'Launch milestones' : 'Review workflow'}
              </p>
              <p className="text-xs text-slate-500">
                {mode === 'schedule' ? 'Public-facing timeline' : 'Internal review checkpoints'}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-1 text-xs font-medium text-slate-600 hover:border-slate-300"
            >
              Sync calendar
            </button>
          </div>

          <ol className="mt-6 space-y-5">
            {activeTimeline.map((item, index) => {
              const meta = STATUS_META[item.status];
              const isLast = index === activeTimeline.length - 1;
              return (
                <li key={item.id} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className={`relative mt-1 h-3 w-3 rounded-full ring-4 ${meta.dot}`} aria-hidden />
                    {!isLast && <span className={`mt-1 w-px flex-1 border-l ${meta.border}`} aria-hidden />}
                  </div>
                  <div className="flex-1 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${meta.text}`}>
                        {item.status === 'complete'
                          ? 'Done'
                          : item.status === 'current'
                          ? 'Live'
                          : 'Upcoming'}
                      </span>
                      {item.meta && (
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500">
                          {item.meta}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{item.description}</p>
                    <p className="mt-2 font-mono text-xs text-slate-700">{item.date}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900/90 p-6 text-white shadow-lg ring-1 ring-slate-900/10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">Entries pulse</p>
              <p className="text-3xl font-semibold">{entrySummary.total}</p>
              <p className="text-xs text-white/70">{entrySummary.lastUpdated}</p>
            </div>
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-xs">
              {TREND_RANGES.map((range) => {
                const isActive = trendRange === range.id;
                return (
                  <button
                    key={range.id}
                    type="button"
                    onClick={() => setTrendRange(range.id)}
                    className={`rounded-full px-3 py-1 font-medium transition ${
                      isActive ? 'bg-white text-slate-900' : 'text-white/70'
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex h-28 items-end gap-1">
            {trendSeries.map((value, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={`${trendRange}-${index}`}
                className="flex-1 rounded-full bg-gradient-to-t from-indigo-500/30 to-white/90 transition hover:from-indigo-400/50"
                style={{ height: `${Math.max((value / trendMax) * 100, 8)}%` }}
              >
                <span className="sr-only">Entries {value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            {entrySummary.breakdown.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium">{item.label}</p>
                  <div className="text-xs text-white/70">
                    {item.value}{' '}
                    <span className={item.change >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {item.change >= 0 ? '+' : ''}
                      {item.change}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${item.accent}`}
                    style={{ width: `${(item.value / maxBreakdownValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
