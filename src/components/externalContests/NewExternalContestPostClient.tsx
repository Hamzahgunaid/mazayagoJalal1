'use client';

import { FormEvent, useMemo, useState } from 'react';

import { EXTERNAL_POST_ALLOWED_CHIPS } from '@/lib/externalContestPosts';

type FetchedData = {
  platform: 'facebook' | 'instagram' | null;
  source_url: string;
  account_name: string | null;
  account_url: string | null;
  text: string | null;
  media_urls: string[];
  suggested_cover_url: string | null;
  embed_html: string | null;
  warnings?: string[];
};

const CHIP_LABEL: Record<string, string> = {
  like: 'like',
  comment: 'comment',
  tag: 'tag',
  follow: 'follow',
  share: 'share',
  visit_link: 'visit_link',
};

const PLATFORM_ICON: Record<'facebook' | 'instagram', string> = {
  facebook: '📘',
  instagram: '📸',
};

export default function NewExternalContestPostClient() {
  const [url, setUrl] = useState('');
  const [fetched, setFetched] = useState<FetchedData | null>(null);
  const [expandedText, setExpandedText] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const [title, setTitle] = useState('');
  const [prize, setPrize] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [extraText, setExtraText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deadlineUnknown, setDeadlineUnknown] = useState(true);
  const [coverUrl, setCoverUrl] = useState('');

  const [loadingFetch, setLoadingFetch] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const checklist = useMemo(
    () => [
      { label: 'المصدر', ok: Boolean(fetched?.source_url) },
      { label: 'العنوان', ok: Boolean(title.trim()) },
      { label: 'الجائزة', ok: Boolean(prize.trim()) },
      { label: 'صورة الغلاف', ok: Boolean(coverUrl) },
    ],
    [coverUrl, fetched?.source_url, prize, title],
  );

  const canSubmit = checklist.every((item) => item.ok);

  async function onFetch() {
    setLoadingFetch(true);
    setMessage(null);
    setSubmittedId(null);
    try {
      const res = await fetch('/api/external-contest-posts/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetched(null);
        setMessage(data.error || 'تعذر جلب بيانات المنشور.');
        return;
      }

      setFetched(data);
      setCoverUrl(data.suggested_cover_url || '');
      const warnings = Array.isArray(data.warnings) ? data.warnings.filter(Boolean) : [];
      setMessage(warnings.length ? warnings.join(' ') : null);
    } catch {
      setMessage('تعذر جلب بيانات المنشور.');
    } finally {
      setLoadingFetch(false);
    }
  }

  async function onAiSuggest() {
    if (!fetched?.text) {
      setMessage('تعذر جلب بيانات المنشور.');
      return;
    }
    setLoadingSuggest(true);
    try {
      const res = await fetch('/api/external-contest-posts/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_text: fetched.text }),
      });
      const data = await res.json();
      if (!res.ok || !data.suggestion) {
        setMessage('تعذر جلب بيانات المنشور.');
        return;
      }
      setTitle(data.suggestion.title || title);
      setPrize(data.suggestion.prize || prize);
      setChips(data.suggestion.chips || []);
      setExtraText(data.suggestion.extra_text || '');
      if (data.suggestion.deadline) {
        setDeadline(new Date(data.suggestion.deadline).toISOString().slice(0, 10));
        setDeadlineUnknown(false);
      }
    } finally {
      setLoadingSuggest(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!fetched) return;
    setLoadingSubmit(true);
    setMessage(null);
    setSubmittedId(null);
    try {
      const res = await fetch('/api/external-contest-posts/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_platform: fetched.platform,
          source_url: fetched.source_url,
          source_account_name: fetched.account_name,
          source_account_url: fetched.account_url,
          source_text: fetched.text,
          source_media_urls: fetched.media_urls,
          source_media_cover_url: coverUrl,
          card_title: title,
          card_prize: prize,
          card_how_to_enter: { chips, extra_text: extraText },
          card_deadline_at: deadlineUnknown || !deadline ? null : `${deadline}T23:59:59Z`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'submit_failed');
        return;
      }
      setMessage('تم الإرسال بنجاح.');
      setSubmittedId(typeof data?.id === 'string' ? data.id : null);
    } catch {
      setMessage('submit_failed');
    } finally {
      setLoadingSubmit(false);
    }
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_320px]" onSubmit={onSubmit}>
      <div className="space-y-6">
        <header className="rounded-3xl border border-border bg-gradient-to-br from-white to-secondary/40 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-text">إضافة مسابقة من منشور</h1>
          <p className="mt-2 text-sm text-muted">أدخل رابط منشور فيسبوك أو انستغرام لتحويله إلى بطاقة مسابقة.</p>
        </header>

        <section className="space-y-3 rounded-3xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Source</h2>
          <div className="flex gap-3">
            <input className="flex-1 rounded-xl border border-border px-4 py-2" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            <button type="button" onClick={onFetch} disabled={loadingFetch} className="rounded-xl bg-primary px-4 py-2 text-white">
              {loadingFetch ? '...' : 'جلب البيانات'}
            </button>
          </div>
        </section>

        {fetched && (
          <section className="space-y-3 rounded-3xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Source Preview</h2>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>{PLATFORM_ICON[(fetched.platform || 'facebook') as 'facebook' | 'instagram']}</span>
              <span>{fetched.platform === 'instagram' ? 'Instagram' : 'Facebook'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {fetched.account_url ? (
                <a className="text-primary underline" href={fetched.account_url} target="_blank" rel="noreferrer">
                  {fetched.account_name || 'account'}
                </a>
              ) : (
                <span>{fetched.account_name || '-'}</span>
              )}
              <a className="rounded-lg border border-border px-3 py-1" href={fetched.source_url} target="_blank" rel="noreferrer">
                فتح المنشور الأصلي
              </a>
            </div>
            <div>
              {fetched.text ? (
                <>
                  <p className={`whitespace-pre-wrap text-sm ${expandedText ? '' : 'line-clamp-3'}`}>{fetched.text}</p>
                  <button type="button" className="text-sm text-primary" onClick={() => setExpandedText((v) => !v)}>
                    {expandedText ? 'Collapse' : 'Expand'}
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted">لم يتمكن النظام من جلب نص المنشور. يمكنك إدخال البيانات يدويًا.</p>
              )}
            </div>

            {fetched.media_urls.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {fetched.media_urls.map((media) => (
                  <div key={media} className="rounded-xl border border-border p-2">
                    <img src={media} alt="media" className="h-24 w-full rounded-lg object-cover" />
                    <button type="button" className="mt-2 w-full rounded-lg bg-secondary px-2 py-1 text-xs" onClick={() => setCoverUrl(media)}>
                      Set cover
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                لا توجد صور متاحة من الرابط. يمكنك إدخال رابط غلاف يدويًا بالأسفل.
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showEmbed} onChange={(e) => setShowEmbed(e.target.checked)} />
              Embed preview
            </label>
            {showEmbed ? (
              fetched.embed_html ? (
                <iframe
                  title="embed preview"
                  sandbox="allow-scripts allow-same-origin"
                  className="h-64 w-full rounded-xl border border-border"
                  srcDoc={`<!doctype html><html><body>${fetched.embed_html}</body></html>`}
                />
              ) : (
                <p className="text-sm text-muted">المعاينة غير متاحة</p>
              )
            ) : null}

            {Array.isArray(fetched.warnings) && fetched.warnings.length > 0 && (
              <div className="rounded-xl border border-border bg-secondary p-3 text-sm text-text">
                {fetched.warnings.map((warn) => (
                  <p key={warn}>{warn}</p>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="space-y-3 rounded-3xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">AI Assist</h2>
          <button type="button" onClick={onAiSuggest} disabled={loadingSuggest} className="w-full rounded-xl bg-primary px-4 py-3 text-white">
            اقتراح الحقول من النص (AI)
          </button>
          <button type="button" className="rounded-xl border border-border px-4 py-2" onClick={onAiSuggest}>
            اعتماد الاقتراحات
          </button>
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Card Fields</h2>
          <input className="w-full rounded-xl border border-border px-4 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
          <input className="w-full rounded-xl border border-border px-4 py-2" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Prize" required />
          <div className="flex flex-wrap gap-2">
            {EXTERNAL_POST_ALLOWED_CHIPS.map((chip) => {
              const selected = chips.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]))}
                  className={`rounded-full px-3 py-1 text-sm ${selected ? 'bg-primary text-white' : 'bg-secondary'}`}
                >
                  {CHIP_LABEL[chip]}
                </button>
              );
            })}
          </div>
          <textarea className="w-full rounded-xl border border-border px-4 py-2" rows={3} value={extraText} onChange={(e) => setExtraText(e.target.value)} placeholder="extra text" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={deadlineUnknown} onChange={(e) => setDeadlineUnknown(e.target.checked)} /> غير مذكور
          </label>
          <input type="date" className="rounded-xl border border-border px-4 py-2" disabled={deadlineUnknown} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <div className="space-y-2">
            <div className="text-sm font-medium">Cover image</div>
            {coverUrl ? <img src={coverUrl} alt="cover" className="h-40 w-full rounded-xl object-cover" /> : <p className="text-sm text-danger">Cover is required.</p>}
            <input className="w-full rounded-xl border border-border px-4 py-2" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="Optional upload URL" />
          </div>
        </section>

        {message && <p className="rounded-xl border border-border bg-secondary/70 p-3 text-sm">{message}</p>}

        {submittedId && (
          <div className="rounded-xl border border-border bg-white p-4 text-sm">
            <p className="mb-2 font-medium">يمكنك فتح صفحة المراجعة من هنا:</p>
            <a
              className="inline-flex rounded-lg border border-border px-3 py-2 text-primary underline"
              href={`/Contest_external-posts/${submittedId}`}
            >
              فتح صفحة المراجعة
            </a>
          </div>
        )}

        <button type="submit" disabled={!canSubmit || loadingSubmit} className="w-full rounded-xl bg-primary px-4 py-3 text-white disabled:opacity-50">
          {loadingSubmit ? '...' : 'إرسال للمراجعة'}
        </button>
      </div>

      <aside className="h-fit rounded-3xl border border-border bg-gradient-to-br from-white to-secondary/30 p-6 shadow-sm">
        <h3 className="text-base font-semibold">Checklist</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {checklist.map((item) => (
            <li key={item.label} className={item.ok ? 'text-success' : 'text-muted'}>
              {item.ok ? '✓' : '•'} {item.label}
            </li>
          ))}
        </ul>
      </aside>
    </form>
  );
}
