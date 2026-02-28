'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type EntryPreview = {
  id: string;
  entry_type?: string | null;
  task_id?: string | null;
  round_id?: string | null;
  answer_text?: string | null;
  mcq_option_label?: string | null;
  code_submitted?: string | null;
  asset_url?: string | null;
  evidence_image_url?: string | null;
  prediction_team_a_score?: number | null;
  prediction_team_b_score?: number | null;
  prediction_winner?: string | null;
  score?: number | null;
  elapsed_ms?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type ContestTask = {
  id: string;
  title?: string | null;
  description?: string | null;
  kind?: string | null;
  points?: number | null;
  metadata?: any;
};

type ParticipantEntriesPanelProps = {
  slug: string;
  heading?: string;
  description?: string;
  className?: string;
  refreshToken?: number;
};

export default function ParticipantEntriesPanel({
  slug,
  heading,
  description,
  className,
  refreshToken,
}: ParticipantEntriesPanelProps) {
  const t = useTranslations('OfferDetail.entriesPanel');
  const locale = useLocale();
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );
  const formatDate = (value?: string | null) => {
    if (!value) return t('justNow');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return dateFormatter.format(date);
  };
  const [entries, setEntries] = useState<EntryPreview[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ContestTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchEntries = async () => {
      setEntriesLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/contests/by-slug/${encodeURIComponent(slug)}/entries?mine=1&limit=100`,
          {
            cache: 'no-store',
            credentials: 'include',
          },
        );
        if (!response.ok) {
          const json = await response.json().catch(() => ({}));
          throw new Error(json?.error || t('errorFallback'));
        }
        const json = await response.json();
        if (!cancelled) {
          const rows: EntryPreview[] = Array.isArray(json?.items) ? json.items : [];
          setEntries(rows);
        }
      } catch (err: any) {
        if (!cancelled) {
          setEntries([]);
          setError(err?.message || t('errorFallback'));
        }
      } finally {
        if (!cancelled) setEntriesLoading(false);
      }
    };

    void fetchEntries();
    return () => {
      cancelled = true;
    };
  }, [slug, refreshToken, t]);

  useEffect(() => {
    let cancelled = false;
    const fetchTasks = async () => {
      setTasksLoading(true);
      try {
        const response = await fetch(
          `/api/public/contests/by-slug/${encodeURIComponent(slug)}/tasks`,
          { cache: 'no-store' },
        );
        if (!response.ok) {
          throw new Error(t('errorTasks'));
        }
        const json = await response.json().catch(() => ({}));
        if (!cancelled) {
          const rows: ContestTask[] = Array.isArray(json?.items)
            ? json.items
                .filter((task: any) => task && task.id)
                .map((task: any) => ({
                  id: String(task.id),
                  title: task.title ?? null,
                  description: task.description ?? null,
                  kind: typeof task.kind === 'string' ? task.kind : null,
                  points:
                    typeof task.points === 'number'
                      ? task.points
                      : Number.isFinite(Number(task.points))
                      ? Number(task.points)
                      : null,
                  metadata: task.metadata ?? null,
                }))
            : [];
          setTasks(rows);
        }
      } catch {
        if (!cancelled) {
          setTasks([]);
        }
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    };

    void fetchTasks();
    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  const hasEntries = entries.length > 0;
  const hasTasks = tasks.length > 0;
  const showTasksSection = tasksLoading || hasTasks;
  const NO_TASK_KEY = '__no_task__';

  const entriesByTaskId = useMemo(() => {
    const map: Record<string, EntryPreview[]> = {};
    entries.forEach((entry) => {
      const key = entry.task_id ? String(entry.task_id) : NO_TASK_KEY;
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    });
    return map;
  }, [entries]);
  const taskMetaById = useMemo(() => {
    const map = new Map<string, ContestTask>();
    tasks.forEach((task) => {
      if (task?.id) {
        map.set(String(task.id), task);
      }
    });
    return map;
  }, [tasks]);

  const unassignedEntries = entriesByTaskId[NO_TASK_KEY] ?? [];

  const formatAttachmentLabel = (index: number, isImage: boolean) =>
    isImage ? t('attachments.image') : t('attachments.generic', { index });

  const renderEntryCards = (items: EntryPreview[], marginClass = 'mt-5') => (
    <div className={`${marginClass} grid gap-4`}>
      {items.map((entry) => {
        const hasPredictionScore =
          entry.prediction_team_a_score != null && entry.prediction_team_b_score != null;
        const taskMeta = entry.task_id ? taskMetaById.get(String(entry.task_id)) : undefined;
        const rawMeta =
          typeof taskMeta?.metadata === 'object' && taskMeta.metadata !== null
            ? taskMeta.metadata
            : {};
        const teamALabel =
          (typeof rawMeta?.team_a === 'string' && rawMeta.team_a.trim()) || t('cards.predictionTeamA');
        const teamBLabel =
          (typeof rawMeta?.team_b === 'string' && rawMeta.team_b.trim()) || t('cards.predictionTeamB');
        let predictionWinnerLabel: string | null = null;
        if (entry.prediction_winner) {
          const normalized = entry.prediction_winner.toLowerCase();
          if (normalized === 'team_a') predictionWinnerLabel = teamALabel;
          else if (normalized === 'team_b') predictionWinnerLabel = teamBLabel;
          else if (normalized === 'draw') predictionWinnerLabel = t('cards.predictionDraw');
          else predictionWinnerLabel = entry.prediction_winner;
        }
        return (
          <article
            key={entry.id}
            className="rounded-2xl border border-border bg-bg p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-strong"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-text">
                  {entry.answer_text?.trim() ||
                    entry.mcq_option_label?.trim() ||
                    entry.code_submitted?.trim() ||
                    (entry.asset_url || entry.evidence_image_url
                      ? t('cards.mediaEntry')
                      : t('cards.genericEntry'))}
                </div>
                <div className="text-xs text-muted">{formatDate(entry.created_at)}</div>
              </div>
              {entry.entry_type && (
                <span className="rounded-full bg-border/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">
                  {entry.entry_type.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {(entry.score != null || entry.elapsed_ms != null) && (
              <div className="mt-3 text-xs text-muted">
                {entry.score != null && (
                  <span className="mr-3">
                    {t('cards.scoreLabel')}{' '}
                    <span className="font-medium">{entry.score}</span>
                  </span>
                )}
                {entry.elapsed_ms != null && (
                  <span>
                    {t('cards.timeLabel')}{' '}
                    <span className="font-medium">
                      {Math.round(entry.elapsed_ms / 1000)}s
                    </span>
                  </span>
                )}
              </div>
            )}

            {hasPredictionScore && (
              <div className="mt-3 space-y-1 text-xs text-text">
                <div>
                  {t('cards.predictionScore', {
                    teamAScore: entry.prediction_team_a_score ?? 0,
                    teamBScore: entry.prediction_team_b_score ?? 0,
                  })}
                </div>
                {predictionWinnerLabel && (
                  <div>{t('cards.predictionWinner', { value: predictionWinnerLabel })}</div>
                )}
              </div>
            )}

            {[entry.asset_url, entry.evidence_image_url]
              .filter((url): url is string => !!url)
              .map((url, idx) => {
                const isImage = /\.(jpe?g|png|gif|webp|svg|bmp|heic)$/i.test(
                  url.split('?')[0] || '',
                );
                return (
                  <a
                    key={`${entry.id}-asset-${idx}`}
                    href={url}
                    className="mt-3 inline-flex flex-col text-xs font-medium text-primary-hover hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {isImage ? (
                      <img
                        src={url}
                        alt={t('attachments.alt', { index: idx + 1 })}
                        className="mb-1 max-h-32 w-full rounded-xl border border-border object-cover"
                      />
                    ) : null}
                    <span>{formatAttachmentLabel(idx + 1, isImage)}</span>
                  </a>
                );
              })}
          </article>
        );
      })}
    </div>
  );

  if (!entriesLoading && !hasEntries) {
    return null;
  }

  return (
    <section
      className={`rounded-3xl border border-border bg-white p-6 shadow-sm ${className ?? ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">
            {heading ?? t('defaultHeading')}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {description ?? t('defaultDescription')}
          </p>
        </div>
        {entriesLoading && <div className="text-xs text-muted">{t('loading')}</div>}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-danger bg-[rgba(214,76,76,0.08)] p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {entriesLoading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`loading-${idx}`}
              className="animate-pulse rounded-2xl border border-border bg-bg p-4"
            >
              <div className="h-3 w-36 rounded-full bg-border" />
              <div className="mt-3 h-3 w-48 rounded-full bg-border" />
              <div className="mt-3 h-3 w-32 rounded-full bg-border" />
            </div>
          ))}
        </div>
      ) : showTasksSection ? (
        <div className="mt-6 space-y-6">
          {tasksLoading && tasks.length === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={`task-loading-${idx}`}
                  className="animate-pulse rounded-3xl border border-border bg-bg/70 p-5"
                >
                  <div className="h-4 w-32 rounded-full bg-border" />
                  <div className="mt-3 h-3 w-48 rounded-full bg-border" />
                </div>
              ))}
            </div>
          )}

          {tasks.map((task, index) => {
            const taskEntries = entriesByTaskId[String(task.id)] ?? [];
            return (
              <div
                key={task.id || `task-${index}`}
                className="rounded-3xl border border-border bg-bg/80 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-text">
                      {task.title || t('taskFallback', { index: index + 1 })}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-muted">
                      {(task.kind || t('taskKindFallback')).replace(/_/g, ' ')}
                      {typeof task.points === 'number' && (
                        <span className="ml-2 text-muted">
                          {t('taskPoints', { points: task.points })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {task.description && (
                  <p className="mt-3 text-sm text-muted">{task.description}</p>
                )}
                {taskEntries.length > 0 ? (
                  renderEntryCards(taskEntries, 'mt-4')
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-border bg-white/70 p-4 text-sm text-muted">
                    {t('taskEmpty')}
                  </p>
                )}
              </div>
            );
          })}

          {unassignedEntries.length > 0 && (
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-text">{t('other')}</div>
              <p className="text-xs text-muted">{t('otherDescription')}</p>
              {renderEntryCards(unassignedEntries, 'mt-4')}
            </div>
          )}

          {!hasEntries && (
            <div className="rounded-2xl border border-dashed border-border bg-bg/60 p-6 text-sm text-muted">
              {t('noEntries')}
            </div>
          )}
        </div>
      ) : !hasEntries ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-bg/60 p-6 text-sm text-muted">
          {t('noEntries')}
        </div>
      ) : (
        renderEntryCards(entries)
      )}
    </section>
  );
}
