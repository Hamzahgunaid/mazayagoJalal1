import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

type Task = {
  id: string;
  contest_id: string;
  kind: string;
  title: string;
  description?: string | null;
  points?: number | null;
  metadata?: any;
  options?: McqOption[];
  round_id?: string | null;
};

type McqOption = {
  id?: string;
  label: string;
  is_correct: boolean;
  position?: number | null;
};

type McqOptionForm = {
  tempId: string;
  label: string;
  is_correct: boolean;
  id?: string;
};

const PREDICTION_TASK_KINDS = [
  { value: 'MCQ', labelKey: 'kinds.MCQ' },
  { value: 'ANSWER_TEXT', labelKey: 'kinds.ANSWER_TEXT' },
];

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

const createEmptyOption = (): McqOptionForm => ({
  tempId:
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `opt-${Math.random().toString(36).slice(2, 8)}`,
  label: '',
  is_correct: false,
});

const ensureOptions = (options?: McqOptionForm[]): McqOptionForm[] => {
  let next = Array.isArray(options) && options.length ? options.map((opt) => ({ ...opt })) : [];
  next = next.filter((opt) => opt.label !== undefined || opt.tempId);
  while (next.length < MIN_OPTIONS) {
    next.push(createEmptyOption(next.length === 0));
  }
  if (next.length > MAX_OPTIONS) {
    next = next.slice(0, MAX_OPTIONS);
  }
  return next;
};

const createDefaultTaskForm = () => ({
  title: '',
  description: '',
  kind: PREDICTION_TASK_KINDS[0]?.value ?? 'MCQ',
  options: ensureOptions([createEmptyOption(), createEmptyOption(), createEmptyOption()]),
});

export default function PredictionChallenges({
  contestId,
  mode = 'SIMPLE',
}: {
  contestId: string;
  mode?: 'SIMPLE' | 'TOURNAMENT';
}) {
  const t = useTranslations('OfferManage.prediction');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState(() => createDefaultTaskForm());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const getKindLabel = (value: string) => {
    const item = PREDICTION_TASK_KINDS.find((kind) => kind.value === value);
    return item ? t(item.labelKey) : value;
  };

  useEffect(() => {
    void loadTasks();
  }, [contestId, t]);

  async function loadTasks() {
    setTaskLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/tasks`, { credentials: 'include' });
      if (!res.ok) throw new Error(t('messages.loadFailed'));
      const json = await res.json();
      const items: Task[] = Array.isArray(json?.items) ? json.items : [];
      const filtered = items.filter((task) => !task.round_id);
      setTasks(filtered);
      if (filtered.length === 0) {
        setShowEditor(true);
      }
    } catch (err: any) {
      setError(err?.message || t('messages.loadFailed'));
      setTasks([]);
      setShowEditor(true);
    } finally {
      setTaskLoading(false);
    }
  }

  function resetTaskForm(show = false) {
    setTaskForm(createDefaultTaskForm());
    setEditingTaskId(null);
    setShowEditor(show);
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task.id);
    setShowEditor(true);
    const options =
      task.kind === 'MCQ'
        ? ensureOptions(
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
        : ensureOptions(createDefaultTaskForm().options);
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      kind: PREDICTION_TASK_KINDS.some((opt) => opt.value === task.kind) ? task.kind : 'MCQ',
      options,
    });
  }

  function handleKindChange(nextKind: string) {
    setTaskForm((prev) => ({
      ...prev,
      kind: nextKind,
      options:
        nextKind === 'MCQ'
          ? ensureOptions(prev.options)
          : ensureOptions(createDefaultTaskForm().options),
    }));
  }

  async function submitTask() {
    if (!taskForm.title.trim()) {
      setError(t('messages.titleRequired'));
      return;
    }

    let normalizedOptions: { label: string; is_correct: boolean }[] = [];
    if (taskForm.kind === 'MCQ') {
      normalizedOptions = taskForm.options
        .map((option) => ({ label: option.label.trim(), is_correct: false }))
        .filter((option) => option.label.length > 0);
      if (normalizedOptions.length < MIN_OPTIONS) {
        setError(t('messages.optionsRequired'));
        return;
      }
    }

    setSavingTask(true);
    setError(null);
    try {
      const payload: any = {
        title: taskForm.title.trim(),
        kind: taskForm.kind,
        description: taskForm.description?.trim() || null,
        points: 0,
        time_limit_sec: null,
        round_id: null,
      };
      if (taskForm.kind === 'MCQ') {
        payload.options = normalizedOptions;
      }

      const url = editingTaskId
        ? `/api/owner/contests/${contestId}/tasks/${editingTaskId}`
        : `/api/owner/contests/${contestId}/tasks`;
      const method = editingTaskId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || t('messages.saveFailed'));
      }

      await loadTasks();
      setShowEditor(false);
      resetTaskForm(false);
    } catch (err: any) {
      setError(err?.message || t('messages.saveFailed'));
    } finally {
      setSavingTask(false);
    }
  }

  async function deleteTask(id: string) {
    if (typeof window !== 'undefined' && !window.confirm(t('messages.confirmDelete'))) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('messages.deleteFailed'));
      await loadTasks();
      if (editingTaskId === id) {
        resetTaskForm(tasks.length <= 1);
      }
      if (tasks.length <= 1) {
        setShowEditor(true);
      }
    } catch (err: any) {
      setError(err?.message || t('messages.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  }

  const hasTasks = tasks.length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-white/80 p-6 shadow-sm space-y-5">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">{t('builder.title')}</h2>
            <p className="text-sm text-muted">{t('builder.description')}</p>
          </div>
          {hasTasks && !showEditor && (
            <button className="rv-btn" onClick={() => startEditTask(tasks[0])}>
              {t('builder.actions.editExisting')}
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-danger bg-[rgba(214,76,76,0.08)] px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {(!hasTasks || showEditor) && (
          <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-muted">{t('builder.fields.title.label')}</span>
            <input
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
              placeholder={t('builder.fields.title.placeholder')}
              value={taskForm.title}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted">{t('builder.fields.description.label')}</span>
            <textarea
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
              rows={4}
              placeholder={t('builder.fields.description.placeholder')}
              value={taskForm.description}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-muted">{t('builder.fields.answerType.label')}</span>
            <select
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
              value={taskForm.kind}
              onChange={(e) => handleKindChange(e.target.value)}
            >
              {PREDICTION_TASK_KINDS.map((item) => (
                <option key={item.value} value={item.value}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted">{t('builder.fields.answerType.helper')}</p>
          </label>

          {taskForm.kind === 'MCQ' && (
            <div className="rounded-3xl border border-border bg-bg/70 p-4 space-y-3">
              <div className="text-sm font-semibold text-text">{t('builder.options.title')}</div>
              <p className="text-xs text-muted">{t('builder.options.description')}</p>
              <div className="space-y-3">
                {taskForm.options.map((option, idx) => (
                  <div key={option.tempId} className="rounded-2xl border border-border bg-white p-3 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {t('builder.options.optionLabel', { index: idx + 1 })}
                    </div>
                    <input
                      className="w-full rounded-2xl border border-border px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                      placeholder={t('builder.options.placeholder')}
                      value={option.label}
                      onChange={(e) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          options: prev.options.map((opt) =>
                            opt.tempId === option.tempId ? { ...opt, label: e.target.value } : opt,
                          ),
                        }))
                      }
                    />
                    <div className="flex justify-end text-xs text-muted">
                      <button
                        type="button"
                        className="rv-link text-danger"
                        onClick={() =>
                          setTaskForm((prev) => ({
                            ...prev,
                            options: prev.options.filter((opt) => opt.tempId !== option.tempId),
                          }))
                        }
                        disabled={taskForm.options.length <= MIN_OPTIONS}
                      >
                        {t('builder.options.remove')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                <button
                  type="button"
                  className="rv-btn px-4 py-1.5"
                  onClick={() =>
                    setTaskForm((prev) => ({
                      ...prev,
                      options:
                        prev.options.length >= MAX_OPTIONS
                          ? prev.options
                          : [...prev.options, createEmptyOption()],
                    }))
                  }
                  disabled={taskForm.options.length >= MAX_OPTIONS}
                >
                  {t('builder.options.add')}
                </button>
                <span>{t('builder.options.count', { current: taskForm.options.length, max: MAX_OPTIONS })}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rv-btn-primary px-5 py-2.5 shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)] disabled:opacity-60"
              onClick={submitTask}
              disabled={savingTask}
            >
              {savingTask ? t('builder.actions.saving') : editingTaskId ? t('builder.actions.update') : t('builder.actions.create')}
            </button>
            {editingTaskId && (
              <button className="rv-btn px-5 py-2.5" onClick={() => resetTaskForm(false)}>
                {t('builder.actions.cancel')}
              </button>
            )}
          </div>
        </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text">{t('list.title')}</h3>
            <p className="text-xs text-muted">{t('list.description')}</p>
          </div>
        </div>

        {taskLoading ? (
          <div className="mt-4 text-sm text-muted">{t('list.loading')}</div>
        ) : !hasTasks ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-bg/60 p-6 text-sm text-muted">
            {t('list.empty')}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {tasks.slice(0, 1).map((task) => (
              <div key={task.id} className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-muted">{getKindLabel(task.kind)}</div>
                    <h4 className="mt-1 text-lg font-semibold text-text">{task.title}</h4>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button className="rv-link" onClick={() => startEditTask(task)}>
                      {t('list.edit')}
                    </button>
                    <button
                      className="rv-link text-danger"
                      onClick={() => deleteTask(task.id)}
                      disabled={deletingId === task.id}
                    >
                      {deletingId === task.id ? t('list.removing') : t('list.delete')}
                    </button>
                  </div>
                </div>
                {task.description && <p className="mt-3 text-sm text-muted">{task.description}</p>}

                {task.kind === 'MCQ' && task.options && task.options.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-border bg-bg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{t('list.optionsTitle')}</p>
                    <ul className="space-y-1 text-xs text-muted">
                      {task.options.map((option) => (
                        <li
                          key={option.id || option.position || option.label}
                          className="flex items-center justify-between"
                        >
                          <span>{option.label}</span>
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
