'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

type Prize = {
  id?: string;
  name?: string;
  type?: string;
  quantity?: number;
  amount?: number | null;
  currency?: string | null;
  prize_summary?: string | null;
};

const defaultForm = {
  name: '',
  type: 'VOUCHER',
  summary: '',
  quantity: 1,
  amount: '',
  currency: 'USD',
};

export default function PrizesAwards({ contestId }: { contestId: string }) {
  const t = useTranslations('OfferManage.prizes');
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(defaultForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const prizeRes = await fetch(`/api/owner/contests/${contestId}/prizes`, { credentials: 'include' });
      if (prizeRes.ok) {
        const json = await prizeRes.json().catch(() => null);
        setPrizes(Array.isArray(json?.items) ? json.items : []);
      } else {
        setPrizes([]);
      }

    } catch (err: any) {
      setError(err?.message || t('messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  function resetForm(close = true) {
    setForm(defaultForm);
    setEditingId(null);
    if (close) setShowForm(false);
  }

  function startCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(true);
  }

  function startEdit(prize: Prize) {
    setEditingId(prize.id || null);
    setForm({
      name: prize.name || '',
      type: prize.type || 'VOUCHER',
      summary: prize.prize_summary || '',
      quantity: prize.quantity ?? 1,
      amount: prize.amount != null ? String(prize.amount) : '',
      currency: prize.currency || 'USD',
    });
    setShowForm(true);
  }

  async function submitPrize() {
    if (!form.name.trim()) {
      setError(t('messages.nameRequired'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        quantity: Number.isFinite(form.quantity) ? form.quantity : 1,
        amount: form.amount ? Number(form.amount) : null,
        currency: form.currency || null,
        prize_summary: form.summary.trim() || null,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/owner/contests/${contestId}/prizes/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/owner/contests/${contestId}/prizes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || t('messages.saveFailed'));
      }

      resetForm();
      await load();
    } catch (err: any) {
      setError(err?.message || t('messages.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function deletePrize(id?: string) {
    if (!id) return;
    if (typeof window !== 'undefined' && !window.confirm(t('messages.confirmDelete'))) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/prizes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('messages.deleteFailed'));
      if (editingId === id) resetForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message || t('messages.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-danger bg-[rgba(214,76,76,0.08)] px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!showForm ? (
        <section className="rounded-3xl border border-dashed border-border bg-white/60 p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-text">{t('hero.title')}</h2>
          <p className="mt-1 text-sm text-muted">
            {t('hero.description')}
          </p>
          <div className="mt-4 flex justify-center">
            <button className="rv-btn-primary px-5 py-2.5 shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)]" onClick={startCreate}>
              {t('buttons.create')}
            </button>
          </div>
        </section>
      ) : (
        <section className="rv-section space-y-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{editingId ? t('buttons.editing') : t('buttons.create')}</h2>
              <p className="text-sm text-muted">
                {t('hero.description')}
              </p>
            </div>
            <button className="rv-link text-sm" onClick={() => resetForm()}>
              {t('buttons.cancel')}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('form.title.label')}</span>
                <input
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  placeholder={t('form.title.placeholder')}
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('form.summary.label')}</span>
                <textarea
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  rows={3}
                  placeholder={t('form.summary.placeholder')}
                  value={form.summary}
                  onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                />
              </label>
            </div>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('form.type')}</span>
                <select
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  <option value="VOUCHER">{t('types.VOUCHER')}</option>
                  <option value="WALLET_CREDIT">{t('types.WALLET_CREDIT')}</option>
                  <option value="PHYSICAL">{t('types.PHYSICAL')}</option>
                  <option value="ACCESS">{t('types.ACCESS')}</option>
                  <option value="BADGE">{t('types.BADGE')}</option>
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm text-muted">{t('form.quantity')}</span>
                  <input
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, quantity: Math.max(1, Number(e.target.value || 1)) }))
                    }
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm text-muted">{t('form.amount')}</span>
                  <input
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('form.currency')}</span>
                <input
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  placeholder="USD"
                  value={form.currency}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase().slice(0, 8) }))
                  }
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rv-btn-primary px-5 py-2.5 shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)] disabled:opacity-60"
              onClick={submitPrize}
              disabled={saving}
            >
              {saving ? t('buttons.saving') : editingId ? t('buttons.editing') : t('buttons.add')}
            </button>
            {!saving && !editingId && (
              <button className="rv-btn px-5 py-2.5" onClick={() => resetForm(false)}>
                {t('buttons.reset')}
              </button>
            )}
          </div>
        </section>
      )}
      <section className="rv-section space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('list.title')}</h2>
            <p className="text-sm text-muted">{t('list.description')}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted">{t('list.loading')}</div>
        ) : prizes.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white/60 p-5 text-sm text-muted">
            {t('list.empty')}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {prizes.map((prize) => (
              <div key={prize.id} className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.35em] text-muted">
                      {prize.type ? t(`types.${prize.type}`) : t('list.typeFallback')}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-text">
                      {prize.name || t('list.nameFallback')}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="rv-link text-xs" onClick={() => startEdit(prize)}>
                      {t('list.actions.edit')}
                    </button>
                    <button
                      className="rv-link text-xs text-danger"
                      onClick={() => deletePrize(prize.id)}
                      disabled={deletingId === prize.id}
                    >
                      {deletingId === prize.id ? t('list.actions.removing') : t('list.actions.delete')}
                    </button>
                  </div>
                </div>

                {prize.prize_summary && (
                  <p className="mt-3 text-sm leading-relaxed text-muted">{prize.prize_summary}</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted">
                  <div className="rounded-xl border border-border bg-bg px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-muted">{t('list.quantity')}</div>
                    <div className="mt-1 font-semibold text-text">
                      {prize.quantity ?? t('list.quantityEmpty')}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-bg px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-muted">{t('list.amount')}</div>
                    <div className="mt-1 font-semibold text-text">
                      {prize.amount != null ? `${prize.amount} ${prize.currency || ''}` : t('list.amountEmpty')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
