'use client';

import { useEffect, useMemo, useState } from 'react';

type PeekItem = {
  id?: string;
  user_id?: string | null;
  answer_text?: string | null;
  created_at?: string | null;
  prediction_team_a_score?: number | null;
  prediction_team_b_score?: number | null;
};

function safeMaskName(name?: string | null, fallback?: string) {
  const raw = (name || '').trim();
  if (raw) {
    if (raw.length <= 2) return raw[0] + '•';
    const head = raw.slice(0, 2);
    return head + '•••';
  }
  return fallback || 'User ••••';
}
function maskAnswer(a?: string | null) {
  const s = (a || '').trim();
  if (!s) return '—';
  if (s.length <= 4) return s[0] + '••' + s.slice(-1);
  return s.slice(0, 2) + '•••' + s.slice(-1);
}
function fmt(v?: string | null) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(+d) ? '' : d.toLocaleString();
}

export default function AnswersPeek({
  slug,
  contestId,
  limit = 6,
}: { slug: string; contestId?: string; limit?: number }) {
  const base = useMemo(() => (process.env.NEXT_PUBLIC_BASE_URL || ''), []);
  const [items, setItems] = useState<PeekItem[]>([]);
  const [ready, setReady] = useState(false);

  async function safeJson(r: Response) {
    try { return await r.json(); } catch { return null; }
  }

  useEffect(() => {
    (async () => {
      setReady(false);
      let rows: PeekItem[] = [];

      // 1) by-slug entries (لو متوفر)
      try {
        const r = await fetch(`${base}/api/public/contests/by-slug/${encodeURIComponent(slug)}/entries?limit=${limit}`, { cache:'no-store' });
        if (r.ok) {
          const j = await safeJson(r);
          const arr = Array.isArray(j?.items) ? j.items : (Array.isArray(j) ? j : []);
          if (arr?.length) rows = arr;
        }
      } catch {}

      // 2) by-id entries (fallback)
      if (!rows.length && contestId) {
        try {
          const r = await fetch(`${base}/api/public/contests/${encodeURIComponent(contestId)}/entries?limit=${limit}`, { cache:'no-store' });
          if (r.ok) {
            const j = await safeJson(r);
            const arr = Array.isArray(j?.items) ? j.items : (Array.isArray(j) ? j : []);
            if (arr?.length) rows = arr;
          }
        } catch {}
      }

      setItems(rows.slice(0, limit));
      setReady(true);
    })();
  }, [slug, contestId, limit, base]);

  if (!ready || items.length === 0) return null;

  return (
    <div className="rounded-2xl border p-5 shadow-sm bg-white">
      <h3 className="text-base font-semibold mb-3">Recent participants</h3>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((it, i) => (
          <li key={it.id || i} className="rounded-xl border p-3 bg-white/50 hover:shadow-sm transition">
            <div className="text-sm font-medium">{safeMaskName(null, 'User ••••')}</div>
            <div className="text-xs text-gray-600 mt-1">Answer: {maskAnswer(it.answer_text)}</div>
            {it.prediction_team_a_score != null && it.prediction_team_b_score != null && (
              <div className="text-xs text-indigo-800">
                Score: {it.prediction_team_a_score} - {it.prediction_team_b_score}
              </div>
            )}
            <div className="text-xs text-gray-500">{fmt(it.created_at)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
