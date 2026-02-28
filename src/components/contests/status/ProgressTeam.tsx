'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

type TaskProgress = {
  id: string;
  title: string;
  description: string;
  kind?: string | null;
  roundLabel?: string | null;
  points?: number | null;
  options?: {
    id?: string | null;
    label?: string | null;
    is_correct?: boolean | null;
  }[];
};

type StatusProgressTeamProps = {
  slug: string;
  tasks: TaskProgress[];
};

export default function StatusProgressTeam({ slug, tasks }: StatusProgressTeamProps) {
  const t = useTranslations('OfferStatus');
  return (
    <section className="space-y-6 rounded-[28px] border border-border bg-surface/90 p-6 shadow-card">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/80">
          {t('progress.eyebrow')}
        </p>
        <h2 className="text-2xl font-semibold text-secondary">{t('progress.title')}</h2>
        <p className="text-sm text-muted">{t('progress.subtitle')}</p>
      </div>

      <article className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-secondary">{t('progress.tasksTitle')}</p>
          </div>
          <Link
            href={`/offers/${slug}/manage?tab=rounds`}
            className="chip h-8 px-3 text-[11px] font-semibold uppercase tracking-wide text-secondary hover:border-primary/40"
          >
            {t('progress.manageTasks')}
          </Link>
        </header>

        <div className="mt-5 space-y-4">
          {tasks.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
              {t('progress.noTasks')}
            </p>
          )}
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-2xl border border-border bg-surface-elevated/80 p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-secondary">
                    {task.title || t('progress.task.untitled')}
                  </p>
                  <p className="text-xs text-muted">
                    {task.description || t('progress.task.noDescription')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-muted">
                    {task.kind && <span>{task.kind.replace(/_/g, ' ')}</span>}
                    {task.roundLabel && <span>{task.roundLabel}</span>}
                  </div>
                </div>
                {task.points != null && (
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-soft">
                    {t('progress.task.points', { points: task.points })}
                  </span>
                )}
              </div>
              {task.options && task.options.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                  {task.options.map((option, index) => (
                    <span
                      key={option.id || `${task.id}-option-${index}`}
                      className="chip h-8 px-3 text-[11px] text-secondary"
                    >
                      {option.label || t('progress.task.optionLabel', { index: index + 1 })}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
