'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { ContestTaskRecord, EntryApiItem } from './statusPage.helpers';

type GradingSummarySectionProps = {
  slug: string;
  entries: EntryApiItem[];
  tasks: ContestTaskRecord[];
};

const STATUS_PENDING = new Set(['PENDING', 'IN_REVIEW', 'NEEDS_REVIEW', 'SUBMITTED']);
const STATUS_AUTO = new Set(['VALIDATED']);
const STATUS_FINAL = new Set(['CORRECT', 'INCORRECT']);

export default function GradingSummarySection({ slug, entries, tasks }: GradingSummarySectionProps) {
  const t = useTranslations('OfferStatus');

  const counters = useMemo(() => {
    let pending = 0;
    let auto = 0;
    let finalized = 0;
    entries.forEach((entry) => {
      const status = String(entry.status || '').toUpperCase();
      if (STATUS_PENDING.has(status)) pending += 1;
      else if (STATUS_AUTO.has(status)) auto += 1;
      else if (STATUS_FINAL.has(status)) finalized += 1;
    });
    return { pending, auto, finalized, total: entries.length };
  }, [entries]);

  const signals = useMemo(() => {
    const hasMcq = tasks.some((task) => String(task.kind || '').toUpperCase() === 'MCQ');
    const hasPrediction = tasks.some((task) => {
      const kind = String(task.kind || '').toUpperCase();
      if (kind === 'PREDICTION') return true;
      if (!task.metadata) return false;
      if (typeof task.metadata === 'string') {
        try {
          return JSON.parse(task.metadata)?.match_prediction === true;
        } catch {
          return false;
        }
      }
      return task.metadata?.match_prediction === true;
    });
    const hasUploads = tasks.some((task) => ['UPLOAD_PHOTO', 'UPLOAD_VIDEO'].includes(String(task.kind || '').toUpperCase()));
    const hasText = tasks.some((task) => ['TEXT', 'RIDDLE', 'QUESTION'].includes(String(task.kind || '').toUpperCase()));
    const hasCodes = entries.some((entry) => Boolean(entry.code_submitted || entry.code_hash));
    return { hasMcq, hasPrediction, hasUploads, hasText, hasCodes };
  }, [entries, tasks]);

  return (
    <section className="space-y-5 rounded-[28px] border border-border bg-surface/90 p-6 shadow-card">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/80">{t('grading.eyebrow')}</p>
        <h2 className="text-2xl font-semibold text-secondary">{t('grading.summaryOnly.title')}</h2>
        <p className="text-sm text-muted">{t('grading.summaryOnly.subtitle')}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label={t('grading.summary.pending')} value={counters.pending} />
        <SummaryCard label={t('grading.summary.auto')} value={counters.auto} />
        <SummaryCard label={t('grading.summary.correct')} value={counters.finalized} />
        <SummaryCard label={t('grading.summary.total')} value={counters.total} />
      </div>

      <article className="rounded-2xl border border-border bg-surface-elevated/80 p-4 text-sm text-muted">
        <p className="text-sm font-semibold text-secondary">{t('grading.summaryOnly.howItWorks')}</p>
        <ul className="mt-2 list-disc space-y-1 ps-5">
          {signals.hasMcq && <li>{t('grading.summaryOnly.rules.mcq')}</li>}
          {signals.hasCodes && <li>{t('grading.summaryOnly.rules.code')}</li>}
          {signals.hasUploads && <li>{t('grading.summaryOnly.rules.upload')}</li>}
          {signals.hasText && <li>{t('grading.summaryOnly.rules.text')}</li>}
          {signals.hasPrediction && <li>{t('grading.summaryOnly.rules.prediction')}</li>}
          <li>{t('grading.summaryOnly.rules.manual')}</li>
        </ul>
      </article>

      <div>
        <Link href={`/offers/${slug}/status/grading`} className="btn btn-primary h-10 px-5 text-xs uppercase tracking-wide">
          {t('grading.summaryOnly.openConsole')}
        </Link>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-secondary">{value.toLocaleString()}</p>
    </div>
  );
}
