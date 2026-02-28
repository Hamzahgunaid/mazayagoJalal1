
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type Round = {
  id: string;
  contest_id: string;
  name: string;
  starts_at?: string | null;
  ends_at?: string | null;
  position?: number | null;
  rules_json?: any;
};

type Task = {
  id: string;
  contest_id: string;
  round_id?: string | null;
  kind: string;
  title: string;
  description?: string | null;
  points: number;
  time_limit_sec?: number | null;
  geo?: any;
  metadata?: any;
  position?: number | null;
  options?: McqOption[];
};

type McqOption = {
  id?: string;
  contest_id?: string;
  task_id?: string;
  label: string;
  is_correct: boolean;
  position?: number | null;
};

const taskKinds: { value: string; labelKey: string }[] = [
  { value: 'ANSWER_TEXT', labelKey: 'taskKinds.ANSWER_TEXT' },
  { value: 'MCQ', labelKey: 'taskKinds.MCQ' },
  { value: 'SCAN_QR', labelKey: 'taskKinds.SCAN_QR' },
  { value: 'UPLOAD_PHOTO', labelKey: 'taskKinds.UPLOAD_PHOTO' },
  { value: 'UPLOAD_VIDEO', labelKey: 'taskKinds.UPLOAD_VIDEO' },
  { value: 'CHECKIN', labelKey: 'taskKinds.CHECKIN' },
  { value: 'REFERRAL', labelKey: 'taskKinds.REFERRAL' },
];

const defaultRoundForm = {
  name: '',
  starts_at: '',
  ends_at: '',
};

type McqOptionForm = {
  tempId: string;
  label: string;
  is_correct: boolean;
  id?: string;
};

const createEmptyOption = (isCorrect = false): McqOptionForm => ({
  tempId:
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `opt-${Math.random().toString(36).slice(2, 8)}`,
  label: '',
  is_correct: isCorrect,
});

const MIN_MCQ_OPTIONS = 2;
const MAX_MCQ_OPTIONS = 6;

const ensureMcqOptions = (options?: McqOptionForm[]): McqOptionForm[] => {
  let next = Array.isArray(options) && options.length ? options.map((opt) => ({ ...opt })) : [];
  next = next.filter((opt) => opt.label !== undefined || opt.tempId);
  while (next.length < MIN_MCQ_OPTIONS) {
    next.push(createEmptyOption(next.length === 0));
  }
  if (next.length > MAX_MCQ_OPTIONS) {
    next = next.slice(0, MAX_MCQ_OPTIONS);
  }
  if (!next.some((opt) => opt.is_correct)) {
    next = next.map((opt, idx) => ({ ...opt, is_correct: idx === 0 }));
  }
  return next;
};

const createDefaultTaskForm = () => ({
  title: '',
  kind: taskKinds[0]?.value ?? 'ANSWER_TEXT',
  round_id: '',
  description: '',
  points: 0,
  time_limit_sec: '',
  options: [createEmptyOption(true), createEmptyOption(false), createEmptyOption(false)],
});
const defaultTaskForm = createDefaultTaskForm();

export default function RoundsTasks({ contestId }: { contestId: string }) {
  const t = useTranslations('OfferManage.roundsManager');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roundLoading, setRoundLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roundForm, setRoundForm] = useState(defaultRoundForm);
  const [taskForm, setTaskForm] = useState(() => createDefaultTaskForm());
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [activeRoundFilter, setActiveRoundFilter] = useState<string>('all');
  const [savingRound, setSavingRound] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getTaskKindLabel = (value: string) => {
    const match = taskKinds.find((item) => item.value === value);
    return match ? t(match.labelKey) : value;
  };

  useEffect(() => {
    void loadRounds();
    void loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, t]);

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

  async function loadTasks() {
    setTaskLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/tasks`, { credentials: 'include' });
      if (!res.ok) throw new Error(t('messages.loadTasks'));
      const json = await res.json();
      setTasks(Array.isArray(json?.items) ? json.items : []);
    } catch (err: any) {
      setError(err?.message || t('messages.loadTasks'));
      setTasks([]);
    } finally {
      setTaskLoading(false);
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
      name: round.name || '',
      starts_at: round.starts_at ? round.starts_at.slice(0, 16) : '',
      ends_at: round.ends_at ? round.ends_at.slice(0, 16) : '',
    });
    setShowRoundForm(true);
  }
  function resetRoundForm() {
    setRoundForm(defaultRoundForm);
    setShowRoundForm(false);
    setEditingRoundId(null);
  }

  function startCreateTask() {
    setEditingTaskId(null);
    const base = createDefaultTaskForm();
    setTaskForm({
      ...base,
      round_id: activeRoundFilter !== 'all' ? activeRoundFilter : '',
      options: ensureMcqOptions(base.options),
    });
    setShowTaskForm(true);
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task.id);
    const options =
      task.kind === 'MCQ'
        ? ensureMcqOptions(
            (task.options || []).map((option) => ({
              tempId:
                option.id ||
                (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                  ? crypto.randomUUID()
                  : `opt-${Math.random().toString(36).slice(2, 8)}`),
              label: option.label || '',
              is_correct: !!option.is_correct,
              id: option.id,
            })),
          )
        : ensureMcqOptions(createDefaultTaskForm().options);
    setTaskForm({
      title: task.title || '',
      kind: task.kind || defaultTaskForm.kind,
      round_id: task.round_id || '',
      description: task.description || '',
      points: task.points || 0,
      time_limit_sec: task.time_limit_sec != null ? String(task.time_limit_sec) : '',
      options,
    });
    setShowTaskForm(true);
  }
  function resetTaskForm() {
    setTaskForm(createDefaultTaskForm());
    setShowTaskForm(false);
    setEditingTaskId(null);
  }

  function handleKindChange(nextKind: string) {
    setTaskForm((prev) => ({
      ...prev,
      kind: nextKind,
      options: nextKind === 'MCQ' ? ensureMcqOptions(prev.options) : prev.options,
    }));
  }

  function handleOptionLabelChange(tempId: string, label: string) {
    setTaskForm((prev) => ({
      ...prev,
      options: prev.options.map((option) => (option.tempId === tempId ? { ...option, label } : option)),
    }));
  }

  function handleOptionCorrect(tempId: string) {
    setTaskForm((prev) => ({
      ...prev,
      options: prev.options.map((option) => ({ ...option, is_correct: option.tempId === tempId })),
    }));
  }

  function handleRemoveOption(tempId: string) {
    setTaskForm((prev) => {
      if (prev.options.length <= MIN_MCQ_OPTIONS) return prev;
      let next = prev.options.filter((option) => option.tempId !== tempId);
      if (!next.some((option) => option.is_correct)) {
        next = next.map((option, idx) => ({ ...option, is_correct: idx === 0 }));
      }
      return {
        ...prev,
        options: next,
      };
    });
  }

  function handleAddOption() {
    setTaskForm((prev) => {
      if (prev.options.length >= MAX_MCQ_OPTIONS) return prev;
      return {
        ...prev,
        options: [...prev.options, createEmptyOption(false)],
      };
    });
  }

  async function submitRound() {
    if (!roundForm.name.trim()) {
      setError(t('messages.roundNameRequired'));
      return;
    }
    setSavingRound(true);
    setError(null);
    try {
      const payload: any = {
        name: roundForm.name.trim(),
        starts_at: roundForm.starts_at ? new Date(roundForm.starts_at).toISOString() : null,
        ends_at: roundForm.ends_at ? new Date(roundForm.ends_at).toISOString() : null,
      };
      let res: Response;
      if (editingRoundId) {
        res = await fetch(`/api/owner/contests/${contestId}/rounds/${editingRoundId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/owner/contests/${contestId}/rounds`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
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

  async function submitTask() {
    if (!taskForm.title.trim()) {
      setError(t('messages.taskTitleRequired'));
      return;
    }
    let normalizedOptions: { id?: string; label: string; is_correct: boolean }[] = [];
    if (taskForm.kind === 'MCQ') {
      normalizedOptions = taskForm.options
        .map((option) => ({
          id: option.id,
          label: option.label.trim(),
          is_correct: option.is_correct,
        }))
        .filter((option) => option.label.length > 0);
      if (normalizedOptions.length < MIN_MCQ_OPTIONS) {
        setError(t('messages.optionsRequired'));
        return;
      }
      if (!normalizedOptions.some((option) => option.is_correct)) {
        setError(t('messages.optionsCorrect'));
        return;
      }
    }
    setSavingTask(true);
    setError(null);
    try {
      const payload: any = {
        title: taskForm.title.trim(),
        kind: taskForm.kind,
        round_id: taskForm.round_id || null,
        description: taskForm.description?.trim() || null,
        points: Number(taskForm.points) || 0,
        time_limit_sec: taskForm.time_limit_sec ? Number(taskForm.time_limit_sec) : null,
      };
      if (taskForm.kind === 'MCQ') {
        payload.options = normalizedOptions;
      }
      let res: Response;
      if (editingTaskId) {
        res = await fetch(`/api/owner/contests/${contestId}/tasks/${editingTaskId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/owner/contests/${contestId}/tasks`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || t('messages.saveTask'));
      }
      await loadTasks();
      resetTaskForm();
    } catch (err: any) {
      setError(err?.message || t('messages.saveTask'));
    } finally {
      setSavingTask(false);
    }
  }

  async function deleteRound(id: string) {
    if (typeof window !== 'undefined' && !window.confirm(t('messages.confirmRoundDelete'))) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/rounds/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('messages.deleteRound'));
      await Promise.all([loadRounds(), loadTasks()]);
      if (editingRoundId === id) {
        resetRoundForm();
      }
    } catch (err: any) {
      setError(err?.message || t('messages.deleteRound'));
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteTask(id: string) {
    if (typeof window !== 'undefined' && !window.confirm(t('messages.confirmTaskDelete'))) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('messages.deleteTask'));
      await loadTasks();
      if (editingTaskId === id) {
        resetTaskForm();
      }
    } catch (err: any) {
      setError(err?.message || t('messages.deleteTask'));
    } finally {
      setDeletingId(null);
    }
  }

  const filteredTasks = useMemo(() => {
    if (activeRoundFilter === 'all') return tasks;
    return tasks.filter((task) => task.round_id === activeRoundFilter);
  }, [tasks, activeRoundFilter]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-danger bg-[rgba(214,76,76,0.08)] px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <section className="rv-section space-y-4">
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
          <div className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm space-y-4">
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
                    className="w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={roundForm.starts_at}
                    onChange={(e) => setRoundForm((prev) => ({ ...prev, starts_at: e.target.value }))}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm text-muted">{t('rounds.form.end')}</span>
                  <input
                    type="datetime-local"
                    className="w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={roundForm.ends_at}
                    onChange={(e) => setRoundForm((prev) => ({ ...prev, ends_at: e.target.value }))}
                  />
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rv-btn-primary px-5 py-2.5 shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)] disabled:opacity-60"
                onClick={submitRound}
                disabled={savingRound}
              >
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
          <div className="rounded-2xl border border-dashed bg-white/60 p-5 text-sm text-muted">
            {t('rounds.states.empty')}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rounds.map((round) => (
              <div key={round.id} className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-muted">
                      {round.position != null ? t('rounds.card.position', { index: round.position }) : t('rounds.card.label')}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-text">{round.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="rv-link text-xs" onClick={() => startEditRound(round)}>
                      {t('rounds.card.edit')}
                    </button>
                    <button
                      className="rv-link text-xs text-danger"
                      onClick={() => deleteRound(round.id)}
                      disabled={deletingId === round.id}
                    >
                      {deletingId === round.id ? t('rounds.card.removing') : t('rounds.card.delete')}
                    </button>
                  </div>
                </div>
                <dl className="mt-3 space-y-2 text-xs text-muted">
                  {round.starts_at && (
                    <div className="flex justify-between">
                      <dt>{t('rounds.card.starts')}</dt>
                      <dd>{new Date(round.starts_at).toLocaleString()}</dd>
                    </div>
                  )}
                  {round.ends_at && (
                    <div className="flex justify-between">
                      <dt>{t('rounds.card.ends')}</dt>
                      <dd>{new Date(round.ends_at).toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rv-section space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">{t('tasks.title')}</h2>
            <p className="text-sm text-muted">{t('tasks.description')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rv-btn px-4 py-2"
              value={activeRoundFilter}
              onChange={(e) => setActiveRoundFilter(e.target.value)}
            >
              <option value="all">{t('tasks.filters.all')}</option>
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.name}
                </option>
              ))}
            </select>
            <button className="rv-btn-primary px-4 py-2.5 shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)]" onClick={startCreateTask}>
              {showTaskForm && !editingTaskId ? t('tasks.buttons.new') : t('tasks.buttons.add')}
            </button>
          </div>
        </div>

        {showTaskForm && (
          <div className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('tasks.form.title.label')}</span>
                <input
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  placeholder={t('tasks.form.title.placeholder')}
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('tasks.form.type')}</span>
                <select
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  value={taskForm.kind}
                  onChange={(e) => handleKindChange(e.target.value)}
                >
                  {taskKinds.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm text-muted">{t('tasks.form.description.label')}</span>
              <textarea
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition min-h-[120px]"
                placeholder={t('tasks.form.description.placeholder')}
                value={taskForm.description}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('tasks.form.round')}</span>
                <select
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  value={taskForm.round_id}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, round_id: e.target.value }))}
                >
                  <option value="">{t('tasks.form.roundNone')}</option>
                  {rounds.map((round) => (
                    <option key={round.id} value={round.id}>
                      {round.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('tasks.form.points')}</span>
                <input
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  type="number"
                  value={taskForm.points}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, points: Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value) }))
                  }
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('tasks.form.timeLimit')}</span>
                <input
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  type="number"
                  value={taskForm.time_limit_sec}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, time_limit_sec: e.target.value }))}
                />
              </label>
            </div>

            {taskForm.kind === 'MCQ' && (
              <div className="space-y-4 rounded-3xl border border-border bg-white p-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-text">{t('tasks.options.title')}</p>
                  <p className="text-xs text-muted">
                    {t('tasks.options.description', { min: MIN_MCQ_OPTIONS, max: MAX_MCQ_OPTIONS })}
                  </p>
                </div>
                <div className="space-y-3">
                  {taskForm.options.map((option, idx) => (
                    <div
                      key={option.tempId}
                      className="rounded-2xl border border-border bg-bg p-3 shadow-inner space-y-2"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                        <input
                          className="w-full flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                          placeholder={t('tasks.options.placeholder', { index: idx + 1 })}
                          value={option.label}
                          onChange={(e) => handleOptionLabelChange(option.tempId, e.target.value)}
                        />
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
                          <input
                            type="radio"
                            checked={option.is_correct}
                            onChange={() => handleOptionCorrect(option.tempId)}
                          />
                          {t('tasks.options.correct')}
                        </label>
                        <button
                          type="button"
                          className="rv-link text-xs text-danger"
                          onClick={() => handleRemoveOption(option.tempId)}
                          disabled={taskForm.options.length <= MIN_MCQ_OPTIONS}
                        >
                          {t('tasks.options.remove')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <button
                    type="button"
                    className="rv-btn px-4 py-1.5"
                    onClick={handleAddOption}
                    disabled={taskForm.options.length >= MAX_MCQ_OPTIONS}
                  >
                    {t('tasks.options.add')}
                  </button>
                  <span>{t('tasks.options.count', { current: taskForm.options.length, max: MAX_MCQ_OPTIONS })}</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rv-btn-primary px-5 py-2.5 shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)] disabled:opacity-60"
                onClick={submitTask}
                disabled={savingTask}
              >
                {savingTask ? t('tasks.actions.saving') : editingTaskId ? t('tasks.actions.update') : t('tasks.actions.create')}
              </button>
              <button className="rv-btn px-5 py-2.5" onClick={resetTaskForm}>
                {t('tasks.actions.cancel')}
              </button>
            </div>
          </div>
        )}

        {taskLoading ? (
          <div className="text-sm text-muted">{t('tasks.states.loading')}</div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white/60 p-5 text-sm text-muted">
            {t('tasks.states.empty')}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-muted">{getTaskKindLabel(task.kind)}</div>
                    <h3 className="mt-1 text-lg font-semibold text-text">{task.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="rv-link text-xs" onClick={() => startEditTask(task)}>
                      {t('tasks.card.edit')}
                    </button>
                    <button
                      className="rv-link text-xs text-danger"
                      onClick={() => deleteTask(task.id)}
                      disabled={deletingId === task.id}
                    >
                      {deletingId === task.id ? t('tasks.card.removing') : t('tasks.card.delete')}
                    </button>
                  </div>
                </div>
                <dl className="mt-3 space-y-2 text-xs text-muted">
                  {task.description && (
                    <div>
                      <dt className="font-semibold text-muted">{t('tasks.card.description')}</dt>
                      <dd className="mt-1 text-muted">{task.description}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt>{t('tasks.card.points')}</dt>
                    <dd className="font-semibold text-text">{task.points ?? 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t('tasks.card.round')}</dt>
                    <dd className="text-muted">
                      {task.round_id
                        ? rounds.find((round) => round.id === task.round_id)?.name || t('tasks.card.linkedRound')
                        : t('tasks.card.none')}
                    </dd>
                  </div>
                  {task.time_limit_sec != null && (
                    <div className="flex justify-between">
                      <dt>{t('tasks.card.timeLimit')}</dt>
                      <dd>{task.time_limit_sec} sec</dd>
                    </div>
                  )}
                </dl>
                {task.kind === 'MCQ' && task.options && task.options.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-border bg-bg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{t('tasks.card.optionsTitle')}</p>
                    <ul className="space-y-1">
                      {task.options.map((option) => (
                        <li key={option.id || option.position || option.label} className="flex items-center justify-between text-xs text-muted">
                          <span>{option.label}</span>
                          {option.is_correct && (
                            <span className="rounded-full bg-success-weak px-2 py-0.5 font-semibold text-[#4D8A1F]">
                              {t('tasks.card.correctBadge')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
