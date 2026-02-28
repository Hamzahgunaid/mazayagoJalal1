'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

type DrawProof = {
  seed_reveal?: string;
  external_entropy?: string;
  winners?: any;
  created_at?: string;
  [key: string]: any;
};

export default function Transparency({ contestId }: { contestId: string }) {
  const t = useTranslations('OfferManage.transparency');
  const [proof, setProof] = useState<DrawProof | null>(null);
  const [seedReveal, setSeedReveal] = useState('');
  const [extEntropy, setExtEntropy] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/contests/${contestId}/proof`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProof(data || null);
        if (data?.seed_reveal) setSeedReveal(data.seed_reveal);
        if (data?.external_entropy) setExtEntropy(data.external_entropy);
      } else {
        setProof(null);
      }
    } catch (err: any) {
      setMessage(err?.message || t('messages.loadFailed'));
      setProof(null);
    } finally {
      setLoading(false);
    }
  }

  async function publish(overrides?: { seed_reveal?: string | null; external_entropy?: string | null }) {
    setPublishing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          seed_reveal: overrides?.seed_reveal ?? (seedReveal || null),
          external_entropy: overrides?.external_entropy ?? (extEntropy || null),
          take: 10,
        }),
      });
      if (!res.ok) throw new Error(t('messages.publishFailed'));
      setMessage(t('messages.publishSuccess'));
      await load();
      setShowForm(false);
    } catch (err: any) {
      setMessage(err?.message || t('messages.publishFailed'));
    } finally {
      setPublishing(false);
    }
  }

  async function clearProof() {
    if (!proof) return;
    if (typeof window !== 'undefined' && !window.confirm(t('messages.confirmRemove'))) return;
    setPublishing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ seed_reveal: null, external_entropy: null, take: 0 }),
      });
      if (!res.ok) throw new Error(t('messages.clearFailed'));
      setMessage(t('messages.clearSuccess'));
      setSeedReveal('');
      setExtEntropy('');
      setProof(null);
    } catch (err: any) {
      setMessage(err?.message || t('messages.clearFailed'));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-muted shadow-sm">
          {message}
        </div>
      )}

      {!showForm ? (
        <section className="rounded-3xl border border-dashed border-border bg-white/70 p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-text">{t('hero.title')}</h2>
          <p className="mt-1 text-sm text-muted">
            {t('hero.description')}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button className="rv-btn-primary px-5 py-2.5 shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)]" onClick={() => setShowForm(true)}>
              {proof ? t('hero.buttons.update') : t('hero.buttons.create')}
            </button>
            {proof && (
              <button className="rv-btn text-xs text-danger" onClick={clearProof} disabled={publishing}>
                {publishing ? t('hero.buttons.clearing') : t('hero.buttons.remove')}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="rv-section space-y-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{proof ? t('form.titleUpdate') : t('form.titleCreate')}</h2>
              <p className="text-sm text-muted">
                {t('form.description')}
              </p>
            </div>
            <button className="rv-link text-sm" onClick={() => setShowForm(false)}>
              {t('form.actions.cancel')}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm text-muted">{t('form.seed.label')}</span>
              <input
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                placeholder={t('form.seed.placeholder')}
                value={seedReveal}
                onChange={(e) => setSeedReveal(e.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted">{t('form.entropy.label')}</span>
              <input
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                placeholder={t('form.entropy.placeholder')}
                value={extEntropy}
                onChange={(e) => setExtEntropy(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rv-btn-primary px-5 py-2.5 shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)] disabled:opacity-60"
              onClick={() => publish()}
              disabled={publishing}
            >
              {publishing ? t('form.actions.publishing') : proof ? t('form.actions.update') : t('form.actions.publish')}
            </button>
            <button
              className="rv-btn px-5 py-2.5"
              onClick={() => {
                setSeedReveal('');
                setExtEntropy('');
              }}
              disabled={publishing}
            >
              {t('form.actions.reset')}
            </button>
          </div>
        </section>
      )}

      <section className="rv-section space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('latest.title')}</h2>
            <p className="text-sm text-muted">
              {t('latest.description')}
            </p>
          </div>
          {proof && (
            <span className="text-xs uppercase tracking-[0.3em] text-muted">
              {proof.created_at ? new Date(proof.created_at).toLocaleString() : t('latest.timestamp.label')}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-muted">{t('latest.loading')}</div>
        ) : proof ? (
          <pre className="max-h-[320px] overflow-auto rounded-2xl border bg-bg p-4 text-xs leading-relaxed text-muted">
{JSON.stringify(proof, null, 2)}
          </pre>
        ) : (
          <div className="rounded-2xl border border-dashed bg-white/60 p-5 text-sm text-muted">
            {t('latest.empty')}
          </div>
        )}
      </section>
    </div>
  );
}
