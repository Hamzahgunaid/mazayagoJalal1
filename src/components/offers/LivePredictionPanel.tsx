'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type PredictionTask = {
  id: string;
  kind: string;
  title?: string | null;
  metadata?: any;
  options?: { id?: string | null; label?: string | null }[] | null;
};

type TotalsRow = {
  task_id: string;
  answer_kind: string;
  answer_key: string | null;
  count: number;
};

type LivePredictionPanelProps = {
  slug: string;
  contestType?: string | null;
  tasks: PredictionTask[];
  rulesJson?: any;
};

type CountsByWinner = Record<string, number>;

const POLL_INTERVAL_MS = 30_000;

const parseJsonValue = (value: any) => {
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

const isPredictionMatchTask = (task: PredictionTask) => {
  const kind = String(task.kind || '').toUpperCase();
  const meta = parseJsonValue(task.metadata);
  return kind === 'PREDICTION' || meta.match_prediction === true;
};

const getPredictionMeta = (task: PredictionTask, rulesJson: any, teamAFallback: string, teamBFallback: string) => {
  const meta = parseJsonValue(task.metadata);
  const rules = parseJsonValue(rulesJson);
  const teamA = String(meta.teamA || meta.team_a || rules.teamA || rules.team_a || teamAFallback);
  const teamB = String(meta.teamB || meta.team_b || rules.teamB || rules.team_b || teamBFallback);
  const allowDraw = meta.allowDraw ?? meta.allow_draw;
  const allowDrawResolved = allowDraw === undefined ? true : allowDraw !== false;
  return { teamA, teamB, allowDraw: allowDrawResolved };
};

const isPredictionRelevantTask = (task: PredictionTask) => {
  const kind = String(task.kind || '').toUpperCase();
  if (isPredictionMatchTask(task)) return true;
  return kind === 'MCQ' || kind === 'ANSWER_TEXT' || kind === 'TEXT';
};

export default function LivePredictionPanel({
  slug,
  contestType,
  tasks,
  rulesJson,
}: LivePredictionPanelProps) {
  const t = useTranslations('OfferDetail');
  const locale = useLocale();
  const [enabled, setEnabled] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [totals, setTotals] = useState<TotalsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isPredictionContest = String(contestType || '').toUpperCase() === 'PREDICTION';
  const predictionTasks = useMemo(
    () => tasks.filter((task) => task?.id && isPredictionRelevantTask(task)),
    [tasks],
  );

  const shouldRender = isPredictionContest && predictionTasks.length > 0;

  useEffect(() => {
    if (!shouldRender || !enabled) return;
    let cancelled = false;

    const load = async () => {
      try {
        if (!cancelled) setLoading(true);
        const response = await fetch(
          `/api/public/contests/by-slug/${encodeURIComponent(slug)}/prediction-stats`,
          { cache: 'no-store' },
        );
        if (response.status === 204) {
          if (!cancelled) {
            setAllowed(false);
            setEnabled(false);
          }
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          totals?: TotalsRow[];
        };
        if (!payload.ok) {
          if (!cancelled) {
            setAllowed(false);
            setError(true);
          }
          return;
        }
        if (!cancelled) {
          setAllowed(true);
          setError(false);
          setTotals(Array.isArray(payload.totals) ? payload.totals : []);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, shouldRender, slug]);

  const totalsByTask = useMemo(() => {
    const map: Record<string, Record<string, CountsByWinner>> = {};
    totals.forEach((row) => {
      const taskId = row.task_id;
      if (!taskId) return;
      if (!map[taskId]) map[taskId] = {};
      const kind = row.answer_kind || 'UNKNOWN';
      if (!map[taskId][kind]) map[taskId][kind] = {};
      const key = row.answer_key ?? 'TOTAL';
      map[taskId][kind][key] = (map[taskId][kind][key] || 0) + (row.count || 0);
    });
    return map;
  }, [totals]);

  const totalResponses = useMemo(
    () => totals.reduce((sum, row) => sum + (row?.count || 0), 0),
    [totals],
  );

  if (!shouldRender || !enabled || allowed !== true) return null;

  const teamAFallback = t('enterNow.prediction.teamAFallback');
  const teamBFallback = t('enterNow.prediction.teamBFallback');
  const totalLabel = t('livePrediction.totalLabel');

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-bg via-white to-success-weak p-6 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-success via-primary to-success"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text">{t('livePrediction.title')}</h3>
            <p className="mt-1 text-xs text-muted">{t('livePrediction.subtitle')}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-success bg-success-weak px-3 py-1 text-xs font-semibold text-[#4D8A1F]">
            <span className="h-2 w-2 rounded-full bg-success-weak0 animate-pulse" />
            {t('livePrediction.liveBadge')}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white/80 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('livePrediction.responsesLabel')}
            </div>
            <div className="mt-1 text-lg font-semibold text-text">
              {totalResponses.toLocaleString(locale)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white/80 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('livePrediction.tasksLabel')}
            </div>
            <div className="mt-1 text-lg font-semibold text-text">
              {predictionTasks.length.toLocaleString(locale)}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-danger bg-[rgba(214,76,76,0.08)] px-4 py-3 text-xs text-danger">
            {t('livePrediction.error')}
          </div>
        ) : loading && totals.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-white/70 px-4 py-3 text-xs text-muted">
            {t('livePrediction.empty')}
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-6">
        {predictionTasks.map((task, index) => {
          const isMatchPrediction = isPredictionMatchTask(task);
          const kind = String(task.kind || '').toUpperCase();
          const isMcq = !isMatchPrediction && kind === 'MCQ';
          const isText = !isMatchPrediction && !isMcq && (kind === 'ANSWER_TEXT' || kind === 'TEXT');
          const kindTotals = totalsByTask[task.id] || {};
          const counts = isMatchPrediction
            ? kindTotals.PREDICTION || {}
            : isMcq
            ? kindTotals.MCQ || {}
            : kindTotals.TEXT || {};

          let options: { key: string; label: string }[] = [];
          if (isMatchPrediction) {
            const meta = getPredictionMeta(task, rulesJson, teamAFallback, teamBFallback);
            options = [
              { key: 'TEAM_A', label: meta.teamA },
              ...(meta.allowDraw ? [{ key: 'DRAW', label: t('livePrediction.drawLabel') }] : []),
              { key: 'TEAM_B', label: meta.teamB },
            ];
          } else if (isMcq && Array.isArray(task.options) && task.options.length > 0) {
            options = task.options.map((option, optIndex) => ({
              key: String(option.id ?? `opt-${optIndex}`),
              label: option.label || t('livePrediction.optionFallback', { index: optIndex + 1 }),
            }));
          } else if (isText) {
            options = [{ key: 'TOTAL', label: t('livePrediction.responsesLabel') }];
          }

          const optionKeys = new Set(options.map((opt) => opt.key));
          const extraOptions = Object.keys(counts)
            .filter((key) => !optionKeys.has(key))
            .map((key) => ({ key, label: key }));
          options = [...options, ...extraOptions];

          if (options.length === 0) {
            options = [{ key: 'TOTAL', label: totalLabel }];
          }

          const total = options.reduce((sum, opt) => sum + (counts[opt.key] || 0), 0);
          const maxCount = Math.max(0, ...options.map((opt) => counts[opt.key] || 0));

          return (
            <div
              key={task.id}
              className="rounded-3xl border border-border/70 bg-white/80 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-text">
                  {task.title || t('livePrediction.taskFallback', { index: index + 1 })}
                </div>
                <div className="text-xs font-semibold text-muted">
                  {totalLabel}: {total.toLocaleString(locale)}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {options.map((opt) => {
                  const count = counts[opt.key] || 0;
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                  const isTop = maxCount > 0 && count === maxCount;
                  return (
                    <div
                      key={opt.key}
                      className="rounded-2xl border border-border bg-white/90 px-3 py-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-text">{opt.label}</span>
                        <span className="text-muted">
                          {count.toLocaleString(locale)} · {percent}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border/80">
                        <div
                          className={`h-full rounded-full ${
                            isTop
                              ? 'bg-gradient-to-r from-success to-primary'
                              : 'bg-muted/70'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
