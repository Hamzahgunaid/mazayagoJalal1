'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  formatEntryOwner,
  formatEntryTimestamp,
  formatEntryTitle,
  formatStatusLabel,
  safeDate,
  type ContestTaskRecord,
  type EntryApiItem,
} from './statusPage.helpers';

type FilterMode = 'all' | 'correct' | 'incorrect';

type EntriesEvaluationPanelProps = {
  entries: EntryApiItem[];
  tasks?: ContestTaskRecord[];
};

type EntryView = {
  entry: EntryApiItem;
  title: string;
  owner: string;
  status: string;
  taskId: string | null;
  createdAt: number;
  createdAtLabel: string;
};

type TaskGroup = {
  id: string;
  label: string;
  latestAt: number;
  entries: EntryView[];
};

type UserGroup = {
  id: string;
  owner: string;
  latestAt: number;
  latestLabel: string;
  entries: EntryView[];
  tasks?: TaskGroup[];
};

const STATUS_TONE: Record<string, string> = {
  CORRECT: 'badge badge-success',
  VALIDATED: 'badge badge-success',
  INCORRECT: 'badge border-danger/30 bg-danger/10 text-danger',
  PENDING: 'badge border-warning/30 bg-warning/10 text-warning',
  IN_REVIEW: 'badge border-warning/30 bg-warning/10 text-warning',
  NEEDS_REVIEW: 'badge border-warning/30 bg-warning/10 text-warning',
  SUBMITTED: 'badge badge-muted',
};

const TASK_FILTER_ALL = 'all';
const TASK_FILTER_UNASSIGNED = 'unassigned';

export default function EntriesEvaluationPanel({ entries, tasks = [] }: EntriesEvaluationPanelProps) {
  const t = useTranslations('OfferStatus');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [query, setQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<string>(TASK_FILTER_ALL);
  const statusLabels = useMemo(
    () => ({
      CORRECT: t('statusLabels.correct'),
      VALIDATED: t('statusLabels.validated'),
      INCORRECT: t('statusLabels.incorrect'),
      PENDING: t('statusLabels.pending'),
      IN_REVIEW: t('statusLabels.inReview'),
      NEEDS_REVIEW: t('statusLabels.needsReview'),
      SUBMITTED: t('statusLabels.submitted'),
    }),
    [t],
  );

  const normalizedEntries = useMemo(
    () =>
      entries
        .map((entry) => ({
          entry,
          title: formatEntryTitle(entry, t('entries.fallbackTitle')),
          owner: formatEntryOwner(entry, {
            participant: t('entries.participantFallback'),
            userLabel: (suffix) => t('entries.userLabel', { suffix }),
          }),
          status: String(entry.status || 'SUBMITTED').toUpperCase(),
          taskId: entry.task_id ? String(entry.task_id) : null,
          createdAt: safeDate(entry.created_at)?.getTime() ?? 0,
          createdAtLabel: formatEntryTimestamp(entry.created_at, { justNow: t('entries.justNow') }),
        }))
        .sort((a, b) => b.createdAt - a.createdAt),
    [entries],
  );

  const taskOptions = useMemo(
    () =>
      tasks.map((task, index) => ({
        id: String(task.id),
        label: task.title?.trim() || t('entries.taskLabel', { index: index + 1 }),
      })),
    [tasks],
  );

  const taskLabelById = useMemo(() => {
    const map = new Map<string, string>();
    taskOptions.forEach((task) => {
      map.set(task.id, task.label);
    });
    return map;
  }, [taskOptions]);

  const hasMultipleTasks = taskOptions.length > 1;
  const hasUnassigned = useMemo(
    () => normalizedEntries.some((item) => !item.taskId),
    [normalizedEntries],
  );

  useEffect(() => {
    if (!hasMultipleTasks) {
      if (taskFilter !== TASK_FILTER_ALL) {
        setTaskFilter(TASK_FILTER_ALL);
      }
      return;
    }
    if (taskFilter === TASK_FILTER_UNASSIGNED && !hasUnassigned) {
      setTaskFilter(TASK_FILTER_ALL);
      return;
    }
    if (
      taskFilter !== TASK_FILTER_ALL &&
      taskFilter !== TASK_FILTER_UNASSIGNED &&
      !taskOptions.some((task) => task.id === taskFilter)
    ) {
      setTaskFilter(TASK_FILTER_ALL);
    }
  }, [hasMultipleTasks, hasUnassigned, taskFilter, taskOptions]);

  const counts = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    normalizedEntries.forEach(({ status }) => {
      if (status === 'CORRECT' || status === 'VALIDATED') correct += 1;
      if (status === 'INCORRECT') incorrect += 1;
    });
    return { total: normalizedEntries.length, correct, incorrect };
  }, [normalizedEntries]);

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return normalizedEntries.filter(({ entry, title, owner, status, taskId }) => {
      const isCorrect = status === 'CORRECT' || status === 'VALIDATED';
      const isIncorrect = status === 'INCORRECT';
      if (filter === 'correct' && !isCorrect) return false;
      if (filter === 'incorrect' && !isIncorrect) return false;
      if (hasMultipleTasks && taskFilter !== TASK_FILTER_ALL) {
        if (taskFilter === TASK_FILTER_UNASSIGNED) return !taskId;
        if (taskId !== taskFilter) return false;
      }
      if (!needle) return true;
      const searchText = [
        title,
        owner,
        entry.answer_text,
        entry.mcq_option_label,
        entry.code_submitted,
        entry.prediction_winner,
      ]
        .filter((value) => typeof value === 'string' && value.trim())
        .join(' ')
        .toLowerCase();
      return searchText.includes(needle);
    });
  }, [filter, hasMultipleTasks, normalizedEntries, query, taskFilter]);

  const groupedEntries = useMemo<UserGroup[]>(() => {
    if (filteredEntries.length === 0) return [];
    const groups = new Map<string, UserGroup & { taskMap?: Map<string, TaskGroup> }>();

    filteredEntries.forEach((item) => {
      const groupKey = item.entry.identity_id ? String(item.entry.identity_id) : item.entry.user_id ? String(item.entry.user_id) : item.owner;
      const existing = groups.get(groupKey);
      const group = existing ?? {
        id: groupKey,
        owner: item.owner,
        latestAt: item.createdAt,
        latestLabel: item.createdAtLabel,
        entries: [],
      };

      if (item.createdAt > group.latestAt) {
        group.latestAt = item.createdAt;
        group.latestLabel = item.createdAtLabel;
        group.owner = item.owner;
      }

      if (hasMultipleTasks) {
        const taskKey = item.taskId || TASK_FILTER_UNASSIGNED;
        const taskLabel =
          taskKey === TASK_FILTER_UNASSIGNED
            ? t('entries.filters.noTask')
            : taskLabelById.get(taskKey) || t('entries.taskLabelShort', { code: taskKey.slice(-4) });
        if (!group.taskMap) {
          group.taskMap = new Map();
        }
        const taskGroup = group.taskMap.get(taskKey) || {
          id: taskKey,
          label: taskLabel,
          latestAt: item.createdAt,
          entries: [],
        };
        if (item.createdAt > taskGroup.latestAt) {
          taskGroup.latestAt = item.createdAt;
        }
        taskGroup.entries.push(item);
        group.taskMap.set(taskKey, taskGroup);
      } else {
        group.entries.push(item);
      }

      groups.set(groupKey, group);
    });

    return Array.from(groups.values())
      .map((group) => {
        if (hasMultipleTasks && group.taskMap) {
          const tasks = Array.from(group.taskMap.values())
            .map((taskGroup) => ({
              ...taskGroup,
              entries: taskGroup.entries.sort((a, b) => b.createdAt - a.createdAt),
            }))
            .sort((a, b) => b.latestAt - a.latestAt);
          return {
            id: group.id,
            owner: group.owner,
            latestAt: group.latestAt,
            latestLabel: group.latestLabel,
            entries: [],
            tasks,
          };
        }
        return {
          id: group.id,
          owner: group.owner,
          latestAt: group.latestAt,
          latestLabel: group.latestLabel,
          entries: group.entries.sort((a, b) => b.createdAt - a.createdAt),
        };
      })
      .sort((a, b) => b.latestAt - a.latestAt);
  }, [filteredEntries, hasMultipleTasks, taskLabelById]);

  const renderEntryCard = (item: EntryView) => {
    const tone = STATUS_TONE[item.status] || 'badge badge-muted';
    const scoreLine =
      item.entry.prediction_team_a_score != null && item.entry.prediction_team_b_score != null
        ? t('entries.scoreLine', {
            scoreA: item.entry.prediction_team_a_score,
            scoreB: item.entry.prediction_team_b_score,
          })
        : null;
    const winnerLine = item.entry.prediction_winner
      ? t('entries.winnerLine', { winner: item.entry.prediction_winner })
      : null;
    const statusLabel =
      statusLabels[item.status] ||
      formatStatusLabel(item.status, { fallback: t('statusLabels.draft'), overrides: statusLabels });
    return (
      <article key={item.entry.id} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-secondary">{item.title}</p>
            <p className="text-xs text-muted">
              {item.owner} | {item.createdAtLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={tone}>{statusLabel}</span>
            {item.entry.score != null && (
              <span className="badge badge-muted">
                {t('entries.scoreBadge', { score: item.entry.score })}
              </span>
            )}
          </div>
        </div>
        {(scoreLine || winnerLine) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
            {scoreLine && <span>{scoreLine}</span>}
            {winnerLine && <span>{winnerLine}</span>}
          </div>
        )}
      </article>
    );
  };

  return (
    <section className="space-y-5 rounded-[28px] border border-border bg-surface/90 p-6 shadow-card">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/80">
              {t('entries.eyebrow')}
            </p>
            <h2 className="text-2xl font-semibold text-secondary">{t('entries.title')}</h2>
          </div>
          <div className="text-xs text-muted">
            {t('entries.stats', {
              correct: counts.correct,
              incorrect: counts.incorrect,
              total: counts.total,
            })}
          </div>
        </div>
        <p className="text-sm text-muted">
          {t('entries.subtitle')}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'correct', 'incorrect'] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`chip h-8 px-3 text-[11px] font-semibold uppercase tracking-wide ${
              filter === mode
                ? 'border-primary bg-primary text-white'
                : 'text-secondary hover:border-primary/40'
            }`}
            onClick={() => setFilter(mode)}
          >
            {mode === 'all'
              ? t('entries.filters.all')
              : mode === 'correct'
              ? t('entries.filters.correct')
              : t('entries.filters.incorrect')}
          </button>
        ))}
        {hasMultipleTasks && (
          <select
            value={taskFilter}
            onChange={(event) => setTaskFilter(event.target.value)}
            className="select h-9 rounded-full px-4 text-xs font-semibold text-secondary"
          >
            <option value={TASK_FILTER_ALL}>{t('entries.filters.allTasks')}</option>
            {taskOptions.map((task) => (
              <option key={task.id} value={task.id}>
                {task.label}
              </option>
            ))}
            {hasUnassigned && (
              <option value={TASK_FILTER_UNASSIGNED}>{t('entries.filters.noTask')}</option>
            )}
          </select>
        )}
        <input
          type="search"
          className="input ml-auto h-9 w-full rounded-full text-xs text-secondary sm:w-64"
          placeholder={t('entries.searchPlaceholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {groupedEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-elevated p-5 text-sm text-muted">
          {t('entries.empty')}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedEntries.map((group) => (
            <section key={group.id} className="rounded-2xl border border-border bg-surface-elevated/80 p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-secondary">{group.owner}</p>
                <span className="text-xs text-muted">
                  {t('entries.lastEntry', { time: group.latestLabel })}
                </span>
              </div>
              {hasMultipleTasks ? (
                <div className="mt-4 space-y-4">
                  {(group.tasks ?? []).map((taskGroup) => (
                    <div key={taskGroup.id} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {taskGroup.label}
                      </p>
                      <div className="mt-3 space-y-3">{taskGroup.entries.map(renderEntryCard)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 space-y-3">{group.entries.map(renderEntryCard)}</div>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
