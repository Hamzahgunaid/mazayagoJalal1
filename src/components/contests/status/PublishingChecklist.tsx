'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type ChecklistStatus = 'done' | 'in-progress' | 'pending';

export type PublishingChecklistItem = {
  id: string;
  title: string;
  description: string;
  status: ChecklistStatus;
  meta?: string;
  action?: {
    label: string;
    href: string;
  };
};

type PublishingChecklistProps = {
  items: PublishingChecklistItem[];
  lastUpdated?: string;
};

const STATUS_COPY: Record<ChecklistStatus, { label: string; tone: string; dot: string }> = {
  done: {
    label: 'Ready',
    tone: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  'in-progress': {
    label: 'In progress',
    tone: 'text-amber-600',
    dot: 'bg-amber-400',
  },
  pending: {
    label: 'Not started',
    tone: 'text-slate-400',
    dot: 'bg-slate-300',
  },
};

export default function PublishingChecklist({ items, lastUpdated }: PublishingChecklistProps) {
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const visibleItems = useMemo(() => {
    if (!showOnlyPending) return items;
    return items.filter((item) => item.status !== 'done');
  }, [items, showOnlyPending]);

  const doneCount = items.filter((item) => item.status === 'done').length;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Operational Checklist</p>
          <h2 className="text-2xl font-semibold text-slate-900">Publishing readiness</h2>
          <p className="text-sm text-slate-500">
            Track the essentials before announcing winners or switching the offer to public.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 text-sm md:items-end">
          <div className="text-base font-semibold text-slate-900">
            {doneCount}/{items.length} complete
          </div>
          <button
            type="button"
            onClick={() => setShowOnlyPending((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
          >
            {showOnlyPending ? 'Show all items' : 'Show pending only'}
          </button>
          {lastUpdated && <p className="text-xs text-slate-400">Updated {lastUpdated}</p>}
        </div>
      </header>

      <div className="space-y-3">
        {visibleItems.map((item) => {
          const statusMeta = STATUS_COPY[item.status];
          return (
            <article
              key={item.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-white"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dot}`} aria-hidden />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {statusMeta.label}
                    </p>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
                {item.action ? (
                  <Link
                    href={item.action.href}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    {item.action.label}
                  </Link>
                ) : (
                  <span className={`text-xs font-semibold ${statusMeta.tone}`}>{statusMeta.label}</span>
                )}
              </div>
              {(item.meta || item.status === 'in-progress') && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {item.meta && <span>{item.meta}</span>}
                  {item.status === 'in-progress' && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                      Needs attention
                    </span>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
