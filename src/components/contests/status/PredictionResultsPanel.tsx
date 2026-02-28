'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type PredictionOption = {
  id?: string | number | null;
  label?: string | null;
  is_correct?: boolean | null;
};

type PredictionTask = {
  id: string;
  title?: string | null;
  kind?: string | null;
  metadata?: any;
  options?: PredictionOption[] | null;
};

type PredictionResultsPanelProps = {
  contestId: string;
  tasks: PredictionTask[];
  onRefresh?: () => Promise<void> | void;
};

type DraftState = {
  optionId: string;
  scoreA: string;
  scoreB: string;
};

type Notice = { kind: 'error' | 'success'; text: string };

type NormalizedOption = {
  id: string;
  label: string;
  is_correct: boolean;
};

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

const normalizeOptions = (
  options: PredictionOption[],
  fallbackLabel?: (index: number) => string,
): NormalizedOption[] =>
  options
    .filter((option) => option && option.id != null)
    .map((option, index) => ({
      id: String(option.id),
      label:
        typeof option.label === 'string' && option.label.trim()
          ? option.label.trim()
          : fallbackLabel
          ? fallbackLabel(index + 1)
          : `Option ${index + 1}`,
      is_correct: Boolean(option.is_correct),
    }));

const isMatchPredictionTask = (task: PredictionTask) => {
  const meta = parseMetadata(task.metadata);
  const kind = String(task.kind || '').toUpperCase();
  return kind === 'PREDICTION' || meta.match_prediction === true;
};

const inferWinnerKey = (options: NormalizedOption[], optionId: string) => {
  const index = options.findIndex((option) => option.id === optionId);
  if (index === -1) return null;
  if (options.length === 2) return index === 0 ? 'TEAM_A' : 'TEAM_B';
  if (options.length >= 3) {
    if (index === 0) return 'TEAM_A';
    if (index === options.length - 1) return 'TEAM_B';
    return 'DRAW';
  }
  const label = options[index]?.label?.trim().toLowerCase();
  if (label === 'draw' || label === 'tie') return 'DRAW';
  return null;
};

const inferWinnerFromScores = (scoreA: number, scoreB: number) => {
  if (scoreA === scoreB) return 'DRAW';
  return scoreA > scoreB ? 'TEAM_A' : 'TEAM_B';
};

const getDefaultDraft = (
  task: PredictionTask,
  fallbackLabel?: (index: number) => string,
): DraftState => {
  const meta = parseMetadata(task.metadata);
  const options = normalizeOptions(Array.isArray(task.options) ? task.options : [], fallbackLabel);
  const correctOption = options.find((option) => option.is_correct);
  return {
    optionId: correctOption?.id || '',
    scoreA: meta.result_team_a_score != null ? String(meta.result_team_a_score) : '',
    scoreB: meta.result_team_b_score != null ? String(meta.result_team_b_score) : '',
  };
};

export default function PredictionResultsPanel({
  contestId,
  tasks,
  onRefresh,
}: PredictionResultsPanelProps) {
  const t = useTranslations('OfferStatus');
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const optionLabel = (index: number) => t('prediction.optionLabel', { index });

  const matchTasks = useMemo(() => tasks.filter(isMatchPredictionTask), [tasks]);

  const updateDraft = (task: PredictionTask, patch: Partial<DraftState>) => {
    setDrafts((prev) => {
      const fallback = getDefaultDraft(task, optionLabel);
      const current = prev[task.id] ?? fallback;
      return { ...prev, [task.id]: { ...current, ...patch } };
    });
    setNotice(null);
  };

  const handleSave = async (task: PredictionTask) => {
    const options = normalizeOptions(Array.isArray(task.options) ? task.options : [], optionLabel);
    const draft = drafts[task.id] ?? getDefaultDraft(task, optionLabel);

    if (options.length === 0) {
      setNotice({ kind: 'error', text: t('prediction.notice.noOptions') });
      return;
    }
    if (!draft.optionId) {
      setNotice({ kind: 'error', text: t('prediction.notice.selectOption') });
      return;
    }

    const scoreAValue = draft.scoreA.trim();
    const scoreBValue = draft.scoreB.trim();
    let scoreA: number | null = null;
    let scoreB: number | null = null;

    if (!scoreAValue || !scoreBValue) {
      setNotice({ kind: 'error', text: t('prediction.notice.enterScores') });
      return;
    }
    const parsedA = Number(scoreAValue);
    const parsedB = Number(scoreBValue);
    const invalid =
      !Number.isInteger(parsedA) ||
      parsedA < 0 ||
      !Number.isInteger(parsedB) ||
      parsedB < 0;
    if (invalid) {
      setNotice({ kind: 'error', text: t('prediction.notice.invalidScores') });
      return;
    }
    scoreA = parsedA;
    scoreB = parsedB;

    const winnerKey = inferWinnerKey(options, draft.optionId);
    if (!winnerKey) {
      setNotice({ kind: 'error', text: t('prediction.notice.inferWinner') });
      return;
    }
    if (inferWinnerFromScores(scoreA, scoreB) !== winnerKey) {
      setNotice({ kind: 'error', text: t('prediction.notice.scoreMismatch') });
      return;
    }

    setSavingId(task.id);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/owner/contests/${contestId}/tasks/${task.id}/prediction-result`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            correctOptionId: draft.optionId,
            resultWinner: winnerKey,
            resultTeamAScore: scoreA,
            resultTeamBScore: scoreB,
            resultRecorded: true,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || t('prediction.notice.saveError'));
      }
      setNotice({ kind: 'success', text: t('prediction.notice.saved') });
      await Promise.resolve(onRefresh?.());
    } catch (error: any) {
      setNotice({ kind: 'error', text: error?.message || t('prediction.notice.saveError') });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="space-y-5 rounded-[28px] border border-border bg-surface/90 p-6 shadow-card">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/80">
          {t('prediction.eyebrow')}
        </p>
        <h2 className="text-2xl font-semibold text-secondary">{t('prediction.title')}</h2>
        <p className="text-sm text-muted">{t('prediction.subtitle')}</p>
      </header>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            notice.kind === 'success'
              ? 'border-success bg-success-weak text-[#4D8A1F]'
              : 'border-danger bg-[rgba(214,76,76,0.08)] text-danger'
          }`}
        >
          {notice.text}
        </div>
      )}

      {matchTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-elevated p-4 text-sm text-muted">
          {t('prediction.empty')}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {matchTasks.map((task) => {
            const meta = parseMetadata(task.metadata);
            const options = normalizeOptions(Array.isArray(task.options) ? task.options : [], optionLabel);
            const draft = drafts[task.id] ?? getDefaultDraft(task, optionLabel);
            const teamA =
              meta.team_a || meta.teamA || options[0]?.label || t('prediction.teamA');
            const teamB =
              meta.team_b || meta.teamB || options[options.length - 1]?.label || t('prediction.teamB');
            const kickoffAt = meta.kickoff_at ? new Date(meta.kickoff_at) : null;
            const kickoffLabel =
              kickoffAt && !Number.isNaN(kickoffAt.getTime()) ? kickoffAt.toLocaleString() : null;
            const resultRecorded =
              meta.result_recorded === true || options.some((option) => option.is_correct);

            return (
              <article
                key={task.id}
                className="rounded-3xl border border-border bg-surface-elevated/80 p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">
                      {t('prediction.matchLabel')}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-secondary">
                      {teamA} vs {teamB}
                    </h3>
                    {kickoffLabel && <p className="text-xs text-muted">{kickoffLabel}</p>}
                  </div>
                  <span
                    className={`badge ${
                      resultRecorded
                        ? 'badge-success'
                        : 'border-warning/30 bg-warning/10 text-warning'
                    }`}
                  >
                    {resultRecorded ? t('prediction.recorded') : t('prediction.awaiting')}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('prediction.winnerLabel')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                      const checked = draft.optionId === option.id;
                      return (
                        <label
                          key={option.id}
                          className={`chip h-8 px-3 text-[11px] font-semibold uppercase tracking-wide ${
                            checked
                              ? 'border-primary bg-primary text-white'
                              : 'text-secondary hover:border-primary/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`winner-${task.id}`}
                            className="sr-only"
                            checked={checked}
                            onChange={() => updateDraft(task, { optionId: option.id })}
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold text-muted">
                      {t('prediction.scoreLabel', { team: teamA })}
                    </span>
                    <input
                      type="number"
                      min={0}
                      className="input rounded-xl"
                      value={draft.scoreA}
                      onChange={(event) => updateDraft(task, { scoreA: event.target.value })}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold text-muted">
                      {t('prediction.scoreLabel', { team: teamB })}
                    </span>
                    <input
                      type="number"
                      min={0}
                      className="input rounded-xl"
                      value={draft.scoreB}
                      onChange={(event) => updateDraft(task, { scoreB: event.target.value })}
                    />
                  </label>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    className="btn btn-primary h-9 px-4 text-xs uppercase tracking-wide"
                    onClick={() => handleSave(task)}
                    disabled={savingId === task.id || options.length === 0}
                  >
                    {savingId === task.id ? t('prediction.saving') : t('prediction.save')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
