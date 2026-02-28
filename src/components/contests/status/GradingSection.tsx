'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  formatEntryTimestamp,
  formatEntryOwner,
  type ContestTaskRecord,
  type EntryApiItem,
} from './statusPage.helpers';

type GradingSectionProps = {
  slug: string;
  contestId: string;
  entries: EntryApiItem[];
  tasks: ContestTaskRecord[];
  canReview: boolean;
  currentUserId?: string | null;
  onJumpToPredictionResults?: () => void;
};

type ReviewStatus = 'CORRECT' | 'INCORRECT';
type QueueFilterStatus = 'ALL' | 'PENDING' | 'CORRECT' | 'INCORRECT';
type GroupedQueueParticipant = {
  participantId: string;
  owner: string;
  entries: EntryApiItem[];
};

type QueueResponse = {
  items?: EntryApiItem[];
  total?: number;
  limit?: number;
  offset?: number;
  error?: string;
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

const normalizeStatus = (value?: string | null): string => String(value || 'PENDING').toUpperCase();

const parseMetadata = (value: any) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value;
  return {};
};

const isPredictionTask = (task?: ContestTaskRecord | null) => {
  if (!task) return false;
  const kind = String(task.kind || '').toUpperCase();
  if (kind === 'PREDICTION') return true;
  const meta = parseMetadata(task.metadata);
  return meta.match_prediction === true;
};

const isPredictionEntry = (_entry: EntryApiItem, task?: ContestTaskRecord | null) => isPredictionTask(task);

const isAutoGradedEntry = (entry: EntryApiItem, task?: ContestTaskRecord | null) => {
  const entryType = String(entry.entry_type || '').toUpperCase();
  const status = normalizeStatus(entry.status);
  if (entry.mcq_option_id != null) return true;
  if (entry.code_hash != null || entryType === 'CODE' || entryType === 'QR') return true;
  if (isPredictionTask(task)) return true;
  if (status === 'CORRECT' || status === 'INCORRECT' || status === 'VALIDATED') return true;
  return false;
};

const REVIEWABLE_STATUSES = new Set(['PENDING', 'NEEDS_REVIEW', 'IN_REVIEW', 'SUBMITTED']);

const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?.*)?$/i.test(url);

const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(url);

const getDisplayScore = (entry: EntryApiItem, task?: ContestTaskRecord | null) => {
  if (typeof entry.score === 'number') return entry.score;
  const status = normalizeStatus(entry.status);
  if (status === 'CORRECT' || status === 'VALIDATED') return Number(task?.points ?? 1);
  return 0;
};

export default function GradingSection({
  slug,
  contestId,
  entries,
  tasks,
  canReview,
}: GradingSectionProps) {
  const t = useTranslations('OfferStatus');
  const [queueStatus, setQueueStatus] = useState<QueueFilterStatus>('PENDING');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [queueItems, setQueueItems] = useState<EntryApiItem[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueLoading, setQueueLoading] = useState(false);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const taskMap = useMemo(() => {
    const map = new Map<string, ContestTaskRecord>();
    tasks.forEach((task) => map.set(String(task.id), task));
    return map;
  }, [tasks]);

  const taskOrderIndex = useMemo(() => {
    const order = new Map<string, number>();
    tasks.forEach((task, index) => order.set(String(task.id), index));
    return order;
  }, [tasks]);

  const totalPossibleContestScore = useMemo(
    () => tasks.reduce((sum, task) => sum + Number(task.points ?? 1), 0),
    [tasks],
  );

  const summary = useMemo(() => {
    let pending = 0;
    let correct = 0;
    let incorrect = 0;
    entries.forEach((entry) => {
      const status = normalizeStatus(entry.status);
      if (status === 'PENDING' || status === 'IN_REVIEW' || status === 'NEEDS_REVIEW' || status === 'SUBMITTED') pending += 1;
      else if (status === 'INCORRECT') incorrect += 1;
      else correct += 1;
    });
    return { pending, correct, incorrect, total: entries.length };
  }, [entries]);

  useEffect(() => {
    if (!canReview) return;
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setQueueLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        params.set('offset', String(offset));
        if (queueStatus !== 'ALL') params.set('status', queueStatus);
        if (taskFilter !== 'all') params.set('task_id', taskFilter);
        if (query.trim()) params.set('q', query.trim());

        const response = await fetch(`/api/contests/by-slug/${encodeURIComponent(slug)}/entries?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as QueueResponse;
        if (!response.ok) {
          throw new Error(payload?.error || t('grading.queue.loadError'));
        }
        if (cancelled) return;
        setQueueItems(Array.isArray(payload.items) ? payload.items : []);
        setQueueTotal(typeof payload.total === 'number' ? payload.total : 0);
      } catch (error: any) {
        if (cancelled || controller.signal.aborted) return;
        setQueueItems([]);
        setQueueTotal(0);
        setNotice({ kind: 'error', text: error?.message || t('grading.queue.loadError') });
      } finally {
        if (!cancelled) setQueueLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [canReview, limit, offset, query, queueStatus, slug, t, taskFilter]);

  useEffect(() => {
    setOffset(0);
  }, [queueStatus, taskFilter, query]);

  const submitReview = async (entryId: string, status: ReviewStatus) => {
    if (!canReview || savingEntryId) return;
    const prevItems = queueItems;
    setSavingEntryId(entryId);
    setNotice(null);
    setQueueItems((items) => items.map((item) => (item.id === entryId ? { ...item, status } : item)));

    try {
      const response = await fetch(`/api/owner/contests/${contestId}/entries/${entryId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload?.error === 'PREDICTION_AUTO_GRADED' || payload?.code === 'PREDICTION_AUTO_GRADED') {
          throw new Error(t('grading.queue.predictionAutoGraded'));
        }
        throw new Error(payload?.error || t('grading.queue.reviewFailed'));
      }
      setNotice({ kind: 'success', text: t('grading.queue.reviewSaved') });
    } catch (error: any) {
      setQueueItems(prevItems);
      setNotice({ kind: 'error', text: error?.message || t('grading.queue.reviewFailed') });
    } finally {
      setSavingEntryId(null);
    }
  };

  const maxOffset = Math.max(Math.ceil(queueTotal / limit) - 1, 0) * limit;
  const currentPage = Math.floor(offset / limit) + 1;

  const groupedQueue = useMemo<GroupedQueueParticipant[]>(() => {
    const grouped = new Map<string, GroupedQueueParticipant>();
    queueItems.forEach((entry) => {
      const participantId = String(entry.identity_id || entry.user_id || 'unknown');
      if (!grouped.has(participantId)) {
        grouped.set(participantId, {
          participantId,
          owner: formatEntryOwner(entry, {
            participant: t('grading.participantFallback'),
            userLabel: (suffix) => t('grading.userLabel', { suffix }),
          }),
          entries: [],
        });
      }
      grouped.get(participantId)?.entries.push(entry);
    });

    return Array.from(grouped.values()).map((participant) => ({
      ...participant,
      entries: [...participant.entries].sort((a, b) => {
        const taskA = taskOrderIndex.get(String(a.task_id || '')) ?? Number.MAX_SAFE_INTEGER;
        const taskB = taskOrderIndex.get(String(b.task_id || '')) ?? Number.MAX_SAFE_INTEGER;
        if (taskA !== taskB) return taskA - taskB;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }),
    }));
  }, [queueItems, t, taskOrderIndex]);

  return (
    <section className="space-y-5 rounded-[28px] border border-border bg-surface/90 p-6 shadow-card">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/80">{t('grading.eyebrow')}</p>
        <h2 className="text-2xl font-semibold text-secondary">{t('grading.title')}</h2>
        <p className="text-sm text-muted">{t('grading.subtitle')}</p>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="chip">{t('grading.summary.pending')}: {summary.pending}</span>
        <span className="chip">{t('grading.summary.correct')}: {summary.correct}</span>
        <span className="chip">{t('grading.summary.incorrect')}: {summary.incorrect}</span>
        <span className="chip">{t('grading.summary.total')}: {summary.total}</span>
      </div>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            notice.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-600'
          }`}
        >
          {notice.text}
        </div>
      )}

      {canReview ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select className="select h-9 rounded-full px-4 text-xs font-semibold text-secondary" value={queueStatus} onChange={(event) => setQueueStatus(event.target.value as QueueFilterStatus)}>
              <option value="PENDING">{t('grading.queue.filters.pending')}</option>
              <option value="ALL">{t('grading.queue.filters.all')}</option>
              <option value="CORRECT">{t('grading.queue.filters.correct')}</option>
              <option value="INCORRECT">{t('grading.queue.filters.incorrect')}</option>
            </select>
            <select className="select h-9 rounded-full px-4 text-xs font-semibold text-secondary" value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)}>
              <option value="all">{t('grading.queue.filters.allTasks')}</option>
              {tasks.map((task, index) => <option key={task.id} value={String(task.id)}>{task.title || t('grading.queue.taskLabel', { index: index + 1 })}</option>)}
            </select>
            <input type="search" className="input ml-auto h-9 w-full rounded-full text-xs text-secondary sm:w-72" placeholder={t('grading.queue.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>

          <div className="flex items-center justify-between text-xs text-muted">
            <span>{t('grading.queue.paginationMeta', { total: queueTotal, limit, offset })}</span>
            <span>{t('grading.queue.pageLabel', { page: currentPage })}</span>
            <div className="flex gap-2">
              <button type="button" className="chip h-8 px-3 text-[11px]" disabled={queueLoading || offset <= 0} onClick={() => setOffset((prev) => Math.max(prev - limit, 0))}>{t('grading.queue.prev')}</button>
              <button type="button" className="chip h-8 px-3 text-[11px]" disabled={queueLoading || offset >= maxOffset} onClick={() => setOffset((prev) => Math.min(prev + limit, maxOffset))}>{t('grading.queue.next')}</button>
            </div>
          </div>

          {queueLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-elevated p-4 text-sm text-muted">{t('grading.queue.loading')}</div>
          ) : queueItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-elevated p-4 text-sm text-muted">{t('grading.queue.empty')}</div>
          ) : (
            <div className="space-y-4">
              {groupedQueue.map((participant) => {
                const participantPending = participant.entries.filter((entry) => REVIEWABLE_STATUSES.has(normalizeStatus(entry.status))).length;
                const participantCorrect = participant.entries.filter((entry) => ['CORRECT', 'VALIDATED'].includes(normalizeStatus(entry.status))).length;
                const participantIncorrect = participant.entries.filter((entry) => normalizeStatus(entry.status) === 'INCORRECT').length;
                const participantScore = participant.entries.reduce((sum, entry) => sum + getDisplayScore(entry, taskMap.get(String(entry.task_id || ''))), 0);

                return (
                  <article key={participant.participantId} className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-secondary">{participant.owner}</p>
                        <div className="flex flex-wrap gap-2 text-[11px] text-muted">
                          <span className="chip">{t('grading.totalScore')}: {participantScore}</span>
                          <span className="chip">{t('grading.maxScore')}: {totalPossibleContestScore}</span>
                          <span className="chip">{t('grading.summary.pending')}: {participantPending}</span>
                          <span className="chip">{t('grading.summary.correct')}: {participantCorrect}</span>
                          <span className="chip">{t('grading.summary.incorrect')}: {participantIncorrect}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {Array.from(new Set(participant.entries.map((entry) => String(entry.task_id || 'unknown')))).map((taskId) => {
                        const task = taskMap.get(taskId);
                        const taskEntries = participant.entries.filter((entry) => String(entry.task_id || 'unknown') === taskId);
                        return (
                          <section key={taskId} className="rounded-xl border border-border/70 bg-surface-elevated/50 p-3">
                            <p className="text-xs font-semibold text-secondary">{task?.title || t('grading.mine.noTask')} · {t('grading.queue.taskPoints', { points: Number(task?.points ?? 1) })}</p>
                            <div className="mt-2 space-y-2">
                              {taskEntries.map((entry) => {
                                const status = normalizeStatus(entry.status);
                                const tone = STATUS_TONE[status] || 'badge badge-muted';
                                const isSaving = savingEntryId === entry.id;
                                const isPrediction = isPredictionEntry(entry, task);
                                const autoGraded = isAutoGradedEntry(entry, task);
                                const canShowActions = canReview && !autoGraded && REVIEWABLE_STATUSES.has(status);
                                const displayScore = getDisplayScore(entry, task);
                                const mediaUrl = entry.asset_url || entry.evidence_image_url || '';
                                const hasMedia = Boolean(mediaUrl);

                                return (
                                  <div key={entry.id} className="rounded-lg border border-border/60 bg-surface p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <p className="text-xs text-muted">{formatEntryTimestamp(entry.created_at, { justNow: t('grading.justNow') })}</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-secondary">{t('grading.score')}: {displayScore}</span>
                                        <span className={tone}>{t(`statusLabels.${status.toLowerCase()}` as any) || status}</span>
                                      </div>
                                    </div>

                                    <div className="mt-2 text-xs text-muted">{entry.answer_text || entry.mcq_option_label || entry.code_submitted || t('grading.queue.noDetails')}</div>

                                    {hasMedia && (
                                      <div className="mt-2 flex items-center gap-2 text-xs">
                                        {isVideoUrl(mediaUrl) ? (
                                          <video src={mediaUrl} muted controls={false} preload="metadata" className="h-16 w-16 rounded-lg border object-cover" />
                                        ) : isImageUrl(mediaUrl) ? (
                                          <img src={mediaUrl} alt={t('grading.preview')} className="h-16 w-16 rounded-lg border object-cover" loading="lazy" />
                                        ) : (
                                          <div className="flex h-16 w-16 items-center justify-center rounded-lg border text-muted">📎</div>
                                        )}
                                        <a href={mediaUrl} target="_blank" rel="noreferrer" className="link text-xs">
                                          {isVideoUrl(mediaUrl)
                                            ? t('grading.openVideo')
                                            : isImageUrl(mediaUrl)
                                            ? t('grading.openImage')
                                            : t('grading.openFile')}
                                        </a>
                                      </div>
                                    )}

                                    {canShowActions ? (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <button type="button" className="btn btn-primary h-8 px-3 text-[11px] uppercase tracking-wide" disabled={isSaving || status === 'CORRECT'} onClick={() => submitReview(entry.id, 'CORRECT')}>{t('grading.queue.markCorrect')}</button>
                                        <button type="button" className="btn h-8 px-3 text-[11px] uppercase tracking-wide" disabled={isSaving || status === 'INCORRECT'} onClick={() => submitReview(entry.id, 'INCORRECT')}>{t('grading.queue.markIncorrect')}</button>
                                      </div>
                                    ) : autoGraded ? (
                                      <div className="mt-3 space-y-1 text-xs text-muted">
                                        <span className="badge badge-muted">{t('grading.autoGraded')}</span>
                                        <p>{isPrediction ? t('grading.predictionAutoGradedHint') : t('grading.autoGradedNoEdit')}</p>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-elevated p-4 text-sm text-muted">{t('grading.queue.readOnly')}</div>
      )}
    </section>
  );
}
