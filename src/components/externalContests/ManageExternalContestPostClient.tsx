'use client';

import { useEffect, useState } from 'react';

type Item = any;

export default function ManageExternalContestPostClient({ id }: { id: string }) {
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/external-contest-posts/${id}`);
      if (res.status === 403) {
        setError('403');
        return;
      }
      const data = await res.json();
      setItem(data.item || null);
    })();
  }, [id]);

  if (error === '403') return <div className="rounded-xl border border-danger p-6 text-danger">403</div>;
  if (!item) return <div className="rounded-2xl border border-border bg-white p-6 text-muted">Loading...</div>;

  async function saveChanges() {
    setSaving(true);
    await fetch(`/api/external-contest-posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    setSaving(false);
  }

  async function publish() {
    await fetch(`/api/external-contest-posts/${id}/publish`, { method: 'POST' });
    setItem((prev: Item) => ({ ...prev, status: 'PUBLISHED' }));
  }

  async function hide() {
    await fetch(`/api/external-contest-posts/${id}/hide`, { method: 'POST' });
    setItem((prev: Item) => ({ ...prev, status: 'HIDDEN' }));
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-gradient-to-br from-white to-secondary/40 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-text">إدارة مسابقة خارجية</h1>
        <p className="mt-2 text-sm text-muted">تحديث البيانات، المراجعة، النشر وإخفاء المنشور.</p>
      </header>

      <section className="space-y-3 rounded-3xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-text">Source Preview</h2>
        <a className="inline-flex rounded-lg border border-border px-3 py-1 text-primary underline" href={item.source_url} target="_blank" rel="noreferrer">
          فتح المنشور
        </a>
        <textarea className="w-full rounded-xl border border-border p-3" rows={4} value={item.source_text || ''} onChange={(e) => setItem({ ...item, source_text: e.target.value })} />
      </section>

      <section className="space-y-3 rounded-3xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-text">Card Fields</h2>
        <input className="w-full rounded-xl border border-border px-4 py-2" value={item.card_title || ''} onChange={(e) => setItem({ ...item, card_title: e.target.value })} />
        <input className="w-full rounded-xl border border-border px-4 py-2" value={item.card_prize || ''} onChange={(e) => setItem({ ...item, card_prize: e.target.value })} />
      </section>

      <section className="space-y-3 rounded-3xl border border-border bg-white p-6 shadow-sm">
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={item.review_badge === 'REVIEWED'}
            onChange={(e) => setItem({ ...item, review_badge: e.target.checked ? 'REVIEWED' : 'UNREVIEWED' })}
          />
          مراجع
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={publish} className="rounded-xl bg-primary px-4 py-2 text-white">Publish</button>
          <button type="button" onClick={hide} className="rounded-xl border border-border px-4 py-2">Hide</button>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-border bg-white p-6 shadow-sm">
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={item.winners_status === 'WINNERS_PUBLISHED'}
            onChange={(e) => setItem({ ...item, winners_status: e.target.checked ? 'WINNERS_PUBLISHED' : 'WINNERS_UNKNOWN' })}
          />
          🏁 تم إعلان الفائزين
        </label>
        <input
          className="w-full rounded-xl border border-border px-4 py-2"
          placeholder="winners evidence URL"
          value={item.winners_evidence_url || ''}
          onChange={(e) => setItem({ ...item, winners_evidence_url: e.target.value })}
        />
      </section>

      <button type="button" onClick={saveChanges} disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-white disabled:opacity-60">
        {saving ? '...' : 'Update'}
      </button>
    </div>
  );
}
