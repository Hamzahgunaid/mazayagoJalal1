'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type Round = {
  id: string;
  contest_id: string;
  name: string;
  starts_at?: string | null;
  ends_at?: string | null;
  position?: number | null;
};

type Task = {
  id: string;
  contest_id: string;
  round_id?: string | null;
  kind: string;
  title?: string | null;
  description?: string | null;
  metadata?: any;
  options?: { id?: string; label?: string | null }[];
  position?: number | null;
};

const defaultRoundForm = {
  name: '',
  starts_at: '',
  ends_at: '',
};

const defaultMatchForm = {
  round_id: '',
  teamA: '',
  teamB: '',
  kickoff: '',
  requireScores: true,
  notes: '',
};

export default function PredictionMatches({ contestId }: { contestId: string }) {
  const t = useTranslations('OfferManage.predictionMatches');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Task[]>([]);
  const [roundLoading, setRoundLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [roundForm, setRoundForm] = useState(defaultRoundForm);
  const [matchForm, setMatchForm] = useState(defaultMatchForm);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [activeRoundFilter, setActiveRoundFilter] = useState<string>('all');
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [savingRound, setSavingRound] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void loadRounds();
    void loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  async function loadRounds() {
    setRoundLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/rounds`, { credentials: 'include' });
      if (!res.ok) throw new Error(t('messages.loadRounds'));
      const json = await res.json();
      setRounds(Array.isArray(json?.items) ? json.items : []);
    } catch (err: any) {
      setError(err?.message || t('messages.loadRounds'));
      setRounds([]);
    } finally {
      setRoundLoading(false);
    }
  }

  async function loadMatches() {
    setMatchLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/tasks`, { credentials: 'include' });
      if (!res.ok) throw new Error(t('messages.loadMatches'));
      const json = await res.json();
      const items: Task[] = Array.isArray(json?.items) ? json.items : [];
      setMatches(items.filter((task) => task.metadata?.match_prediction));
    } catch (err: any) {
      setError(err?.message || t('messages.loadMatches'));
      setMatches([]);
    } finally {
      setMatchLoading(false);
    }
  }

  function startCreateRound() {
    setEditingRoundId(null);
    setRoundForm(defaultRoundForm);
    setShowRoundForm(true);
  }

  function startEditRound(round: Round) {
    setEditingRoundId(round.id);
    setRoundForm({
      name: round.name,
      starts_at: round.starts_at ? round.starts_at.slice(0, 16) : '',
      ends_at: round.ends_at ? round.ends_at.slice(0, 16) : '',
    });
    setShowRoundForm(true);
  }

  function resetRoundForm() {
    setRoundForm(defaultRoundForm);
    setEditingRoundId(null);
    setShowRoundForm(false);
  }

  async function submitRound() {
    if (!roundForm.name.trim()) {
      setError(t('messages.roundNameRequired'));
      return;
    }
    setSavingRound(true);
    setError(null);
    try {
      const payload = {
        name: roundForm.name.trim(),
        starts_at: roundForm.starts_at ? new Date(roundForm.starts_at).toISOString() : null,
        ends_at: roundForm.ends_at ? new Date(roundForm.ends_at).toISOString() : null,
      };
      const url = editingRoundId
        ? `/api/owner/contests/${contestId}/rounds/${editingRoundId}`
        : `/api/owner/contests/${contestId}/rounds`;
      const method = editingRoundId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || t('messages.saveRound'));
      }
      await loadRounds();
      resetRoundForm();
    } catch (err: any) {
      setError(err?.message || t('messages.saveRound'));
    } finally {
      setSavingRound(false);
    }
  }

  function startCreateMatch() {
    setEditingMatchId(null);
    setMatchForm({
      ...defaultMatchForm,
      round_id: activeRoundFilter !== 'all' ? activeRoundFilter : '',
    });
    setShowMatchForm(true);
  }

  function startEditMatch(task: Task) {
    setEditingMatchId(task.id);
    const meta = task.metadata || {};
    setMatchForm({
      round_id: task.round_id || '',
      teamA: meta.team_a || '',
      teamB: meta.team_b || '',
      kickoff: meta.kickoff_at ? String(meta.kickoff_at).slice(0, 16) : '',
      requireScores: meta.require_scores !== false,
      notes: task.description || '',
    });
    setShowMatchForm(true);
  }

  function resetMatchForm() {
    setMatchForm(defaultMatchForm);
    setEditingMatchId(null);
    setShowMatchForm(false);
  }

  async function submitMatch() {
    if (!matchForm.teamA.trim() || !matchForm.teamB.trim()) {
      setError(t('messages.teamsRequired'));
      return;
    }
    setSavingMatch(true);
    setError(null);
    try {
      const payload: any = {
        title: `${matchForm.teamA.trim()} vs ${matchForm.teamB.trim()}`,
        description: matchForm.notes.trim() ? matchForm.notes.trim() : null,
        kind: 'MCQ',
        round_id: matchForm.round_id || null,
        metadata: {
          match_prediction: true,
          team_a: matchForm.teamA.trim(),
          team_b: matchForm.teamB.trim(),
          kickoff_at: matchForm.kickoff ? new Date(matchForm.kickoff).toISOString() : null,
          require_scores: matchForm.requireScores,
        },
        points: 0,
        options: [
          { label: matchForm.teamA.trim(), is_correct: false },
          { label: t('matches.defaults.draw'), is_correct: false },
          { label: matchForm.teamB.trim(), is_correct: false },
        ],
      };

      const url = editingMatchId
        ? `/api/owner/contests/${contestId}/tasks/${editingMatchId}`
        : `/api/owner/contests/${contestId}/tasks`;
      const method = editingMatchId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || t('messages.saveMatch'));
      }

      await loadMatches();
      resetMatchForm();
    } catch (err: any) {
      setError(err?.message || t('messages.saveMatch'));
    } finally {
      setSavingMatch(false);
    }
  }

  async function deleteMatch(id: string) {
    if (typeof window !== 'undefined' && !window.confirm(t('messages.confirmMatchDelete'))) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('messages.deleteMatch'));
      await loadMatches();
      if (editingMatchId === id) resetMatchForm();
    } catch (err: any) {
      setError(err?.message || t('messages.deleteMatch'));
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteRound(id: string) {
    if (typeof window !== 'undefined' && !window.confirm(t('messages.confirmRoundDelete'))) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/rounds/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('messages.deleteRound'));
      await Promise.all([loadRounds(), loadMatches()]);
      if (editingRoundId === id) resetRoundForm();
    } catch (err: any) {
      setError(err?.message || t('messages.deleteRound'));
    } finally {
      setDeletingId(null);
    }
  }

  const filteredMatches = useMemo(() => {
    if (activeRoundFilter === 'all') return matches;
    return matches.filter((match) => (match.round_id || '') === activeRoundFilter);
  }, [matches, activeRoundFilter]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-danger bg-[rgba(214,76,76,0.08)] px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-border bg-white/80 p-6 shadow-sm space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">{t('rounds.title')}</h2>
            <p className="text-sm text-muted">{t('rounds.description')}</p>
          </div>
          <button className="rv-btn-primary px-4 py-2.5 shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)]" onClick={startCreateRound}>
            {showRoundForm && !editingRoundId ? t('rounds.buttons.new') : t('rounds.buttons.add')}
          </button>
        </div>

        {showRoundForm && (
          <div className="rounded-3xl border border-border bg-white/90 p-5 shadow-sm space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('rounds.form.name.label')}</span>
                <input
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  placeholder={t('rounds.form.name.placeholder')}
                  value={roundForm.name}
                  onChange={(e) => setRoundForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm text-muted">{t('rounds.form.start')}</span>
                  <input
                    type="datetime-local"
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={roundForm.starts_at}
                    onChange={(e) => setRoundForm((prev) => ({ ...prev, starts_at: e.target.value }))}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm text-muted">{t('rounds.form.end')}</span>
                  <input
                    type="datetime-local"
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={roundForm.ends_at}
                    onChange={(e) => setRoundForm((prev) => ({ ...prev, ends_at: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="rv-btn-primary px-5 py-2.5" onClick={submitRound} disabled={savingRound}>
                {savingRound ? t('rounds.actions.saving') : editingRoundId ? t('rounds.actions.update') : t('rounds.actions.create')}
              </button>
              <button className="rv-btn px-5 py-2.5" onClick={resetRoundForm}>
                {t('rounds.actions.cancel')}
              </button>
            </div>
          </div>
        )}

        {roundLoading ? (
          <div className="text-sm text-muted">{t('rounds.states.loading')}</div>
        ) : rounds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg/60 p-5 text-sm text-muted">
            {t('rounds.states.empty')}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rounds.map((round) => (
              <div key={round.id} className="rounded-3xl border border-border bg-white/90 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-muted">{t('rounds.card.label')}</div>
                    <div className="text-lg font-semibold text-text">{round.name}</div>
                    <div className="text-xs text-muted">
                      {round.starts_at ? new Date(round.starts_at).toLocaleString() : t('rounds.card.noStart')} •{' '}
                      {round.ends_at ? new Date(round.ends_at).toLocaleString() : t('rounds.card.noEnd')}
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button className="rv-link" onClick={() => startEditRound(round)}>
                      {t('rounds.card.edit')}
                    </button>
                    <button className="rv-link text-danger" onClick={() => deleteRound(round.id)}>
                      {t('rounds.card.delete')}
                    </button>
                  </div>
                </div>
                <button
                  className={`mt-4 w-full rounded-2xl border px-4 py-2 text-sm ${
                    activeRoundFilter === round.id ? 'border-primary text-primary-hover' : 'border-border text-muted'
                  }`}
                  onClick={() => setActiveRoundFilter((prev) => (prev === round.id ? 'all' : round.id))}
                >
                  {activeRoundFilter === round.id ? t('rounds.card.showing') : t('rounds.card.view')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-white/80 p-6 shadow-sm space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">{t('matches.title')}</h2>
            <p className="text-sm text-muted">{t('matches.description')}</p>
          </div>
          <button className="rv-btn-primary px-4 py-2.5 shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)]" onClick={startCreateMatch}>
            {showMatchForm && !editingMatchId ? t('matches.buttons.new') : t('matches.buttons.add')}
          </button>
        </div>

        {showMatchForm && (
          <div className="rounded-3xl border border-border bg-white/90 p-5 shadow-sm space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('matches.form.teamA.label')}</span>
                <input
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  placeholder={t('matches.form.teamA.placeholder')}
                  value={matchForm.teamA}
                  onChange={(e) => setMatchForm((prev) => ({ ...prev, teamA: e.target.value }))}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('matches.form.teamB.label')}</span>
                <input
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  placeholder={t('matches.form.teamB.placeholder')}
                  value={matchForm.teamB}
                  onChange={(e) => setMatchForm((prev) => ({ ...prev, teamB: e.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('matches.form.kickoff')}</span>
                <input
                  type="datetime-local"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  value={matchForm.kickoff}
                  onChange={(e) => setMatchForm((prev) => ({ ...prev, kickoff: e.target.value }))}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('matches.form.round')}</span>
                <select
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  value={matchForm.round_id}
                  onChange={(e) => setMatchForm((prev) => ({ ...prev, round_id: e.target.value }))}
                >
                  <option value="">{t('matches.form.roundNone')}</option>
                  {rounds.map((round) => (
                    <option key={round.id} value={round.id}>
                      {round.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={matchForm.requireScores}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, requireScores: e.target.checked }))}
              />
              {t('matches.form.requireScores')}
            </label>
            {/* Notes and preview intentionally hidden for now */}

            <div className="flex gap-3">
              <button className="rv-btn-primary px-5 py-2.5" onClick={submitMatch} disabled={savingMatch}>
                {savingMatch ? t('matches.actions.saving') : editingMatchId ? t('matches.actions.update') : t('matches.actions.create')}
              </button>
              <button className="rv-btn px-5 py-2.5" onClick={resetMatchForm}>
                {t('matches.actions.cancel')}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3 text-sm text-muted">
          <div className="rounded-2xl border border-dashed border-primary bg-primary-weak/50 p-4">
            <div className="font-semibold text-text">{t('matches.workflow.title')}</div>
            <p className="mt-1">{t('matches.workflow.steps')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                activeRoundFilter === 'all'
                  ? 'bg-primary-hover text-white shadow'
                  : 'bg-primary-weak text-muted hover:bg-border'
              }`}
              onClick={() => setActiveRoundFilter('all')}
            >
              {t('matches.filters.all')}
            </button>
            {rounds.map((round) => (
              <button
                key={round.id}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  activeRoundFilter === round.id
                    ? 'bg-primary-hover text-white shadow'
                    : 'bg-primary-weak text-muted hover:bg-border'
                }`}
                onClick={() => setActiveRoundFilter(round.id)}
              >
                {round.name}
              </button>
            ))}
          </div>
        </div>

        {matchLoading ? (
          <div className="text-sm text-muted">{t('matches.states.loading')}</div>
        ) : filteredMatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg/60 p-5 text-sm text-muted">
            {t('matches.states.empty')}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredMatches.map((match) => {
              const meta = match.metadata || {};
              const kickoffDate = meta.kickoff_at ? new Date(meta.kickoff_at) : null;
              let statusKey: 'scheduled' | 'awaiting' | 'soon' | 'final' = 'scheduled';
              let statusClass = 'bg-primary-weak text-muted';
              if (kickoffDate) {
                if (kickoffDate.getTime() < now) {
                  statusKey = 'awaiting';
                  statusClass = 'bg-accent-weak text-accent-hover';
                } else if (kickoffDate.getTime() - now < 60 * 60 * 1000) {
                  statusKey = 'soon';
                  statusClass = 'bg-primary-weak text-primary-hover';
                }
              }
              if (meta.result_recorded) {
                statusKey = 'final';
                statusClass = 'bg-success-weak text-[#4D8A1F]';
              }
              const statusLabel = t(`matches.status.${statusKey}`);
              return (
                <div key={match.id} className="rounded-3xl border border-border bg-white/90 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] text-muted">{t('matches.card.label')}</div>
                      <h3 className="mt-1 text-lg font-semibold text-text">
                        {meta.team_a || t('matches.card.fallbackTeamA')} vs {meta.team_b || t('matches.card.fallbackTeamB')}
                      </h3>
                      {meta.kickoff_at && (
                        <p className="text-xs text-muted">{new Date(meta.kickoff_at).toLocaleString()}</p>
                      )}
                      {match.description && <p className="mt-2 text-sm text-muted">{match.description}</p>}
                      <p className="mt-2 text-xs text-muted">
                        {meta.require_scores ? t('matches.card.requireScores') : t('matches.card.winnerOnly')}
                      </p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button className="rv-link" onClick={() => startEditMatch(match)}>
                        {t('matches.card.edit')}
                      </button>
                      <button
                        className="rv-link text-danger"
                        onClick={() => deleteMatch(match.id)}
                        disabled={deletingId === match.id}
                      >
                        {deletingId === match.id ? t('matches.card.removing') : t('matches.card.delete')}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-2 text-xs">
                    <span className={`rounded-full px-3 py-0.5 font-semibold ${statusClass}`}>{statusLabel}</span>
                    {match.round_id && (
                      <span className="rounded-full bg-primary-weak px-3 py-0.5 text-muted">
                        {rounds.find((round) => round.id === match.round_id)?.name || t('matches.roundBadge')}
                      </span>
                    )}
                  </div>
                  {match.options && match.options.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-border bg-bg p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                        {t('matches.card.optionsTitle')}
                      </p>
                      <ul className="space-y-1 text-xs text-muted">
                        {match.options.map((option) => (
                          <li key={option.id || option.label}>{option.label}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
