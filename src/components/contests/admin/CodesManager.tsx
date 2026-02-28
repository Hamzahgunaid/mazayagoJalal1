'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import QRCode from 'qrcode';

type GeneratedCode = {
  id?: string;
  code: string;
  tag?: string | null;
  sku?: string | null;
  max_redemptions?: number;
  expires_at?: string | null;
};

type GeneratedSummary = {
  batchId?: string;
  codes: GeneratedCode[];
};

type CodesManagerProps = {
  contestId: string;
  contestTitle?: string | null;
  contestSlug?: string | null;
};

type OrganizerInfo = {
  name?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
};

function defaultBatchName(title: string | null | undefined, fallbackContest: string, suffix: string) {
  const base = (title || fallbackContest).trim().replace(/\s+/g, ' ');
  return `${base} ${suffix}`.trim();
}

function download(filename: string, content: string, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

const CARD_COLUMNS = 2;
const CARD_ROWS = 4;
const CARDS_PER_PAGE = CARD_COLUMNS * CARD_ROWS;
const CARD_MARGIN_X = 36;
const CARD_MARGIN_Y = 24;
const CARD_GAP_X = 18;
const CARD_GAP_Y = 12;
const CARD_HEIGHT = 188;
const TEXT_FONT_SIZE = 8;
const TEXT_LINE_HEIGHT = 10;
const TEXT_LINE_GAP = 2;
const TEXT_START_OFFSET = 104;
const INFO_COLUMN_GAP = 12;
const FOOTER_FONT_SIZE = 6;
const FOOTER_LINE_HEIGHT = 8;
const FOOTER_LINE_GAP = 0;
const QR_SIZE = 90;
const QR_MARGIN = 16;
const QR_TOP = 8;
const TITLE_GAP = 12;
const ORGANIZER_OFFSET = 4;
const LOGO_BADGE_PATH = '/assets/defaults/mazayago-full-badge-64.svg';
const CARD_BORDER_COLOR = { r: 229, g: 231, b: 235 };
const DIVIDER_COLOR = { r: 229, g: 231, b: 235 };
const TITLE_BG_COLOR = { r: 248, g: 250, b: 252 };
const HIGHLIGHT_NEUTRAL = { r: 241, g: 245, b: 249 };
const HIGHLIGHT_CODE = { r: 239, g: 246, b: 255 };

const formatDate = (value?: string | null, fallback = 'No expiry', locale?: string) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return locale ? date.toLocaleDateString(locale) : date.toLocaleDateString();
};

const safeFileName = (value?: string | null) => {
  const base = (value || 'contest').toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
  return base.replace(/-+/g, '-');
};

const createQrValue = (code: string, slugOrId: string) => {
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
  if (origin) {
    return `${origin}/offers/${slugOrId}?code=${encodeURIComponent(code)}`;
  }
  return `${slugOrId}:${code}`;
};

const DEFAULT_FONT = 'helvetica';
const fallbackContestName = (title?: string | null, fallback = 'Contest') => title?.trim() || fallback;
const removeAccents = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const sanitizeAscii = (value: string, fallbackValue = 'Contest') => {
  const safe = value
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return safe || fallbackValue;
};
const createTitleImage = async (
  text: string,
  width: number,
  options?: { isRtl?: boolean; maxLines?: number; fontSize?: number; lineHeight?: number },
) => {
  if (typeof document === 'undefined' || width <= 0) return null;
  const canvas = document.createElement('canvas');
  const ratio = window.devicePixelRatio || 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const fontSize = options?.fontSize ?? 14;
  const lineHeight = options?.lineHeight ?? 16;
  const paddingX = 4;
  const paddingY = 2;
  ctx.font = `bold ${fontSize}px "Segoe UI", "Tahoma", "Arial", "Noto Sans Arabic", sans-serif`;
  const maxWidth = Math.max(width - paddingX * 2, 60);
  const rawLines = wrapCanvasText(ctx, text, maxWidth);
  const maxLines = Math.max(options?.maxLines ?? 2, 1);
  const lines = rawLines.length > maxLines ? rawLines.slice(0, maxLines) : rawLines;
  if (rawLines.length > maxLines) {
    const lastIndex = lines.length - 1;
    let lastLine = lines[lastIndex];
    const ellipsis = '...';
    while (lastLine.length > 0 && ctx.measureText(`${lastLine}${ellipsis}`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[lastIndex] = `${lastLine}${ellipsis}`;
  }
  const height = Math.max(lineHeight * lines.length + paddingY * 2, lineHeight + paddingY * 2);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#111111';
  ctx.font = `bold ${fontSize}px "Segoe UI", "Tahoma", "Arial", "Noto Sans Arabic", sans-serif`;
  if (options?.isRtl) {
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
  } else {
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
  }
  const x = options?.isRtl ? width - paddingX : paddingX;
  let y = paddingY + lineHeight - 2;
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return { dataUrl: canvas.toDataURL('image/png'), height };
};

const createLogoBadgeImage = async (src: string, size: number) => {
  if (typeof document === 'undefined' || size <= 0) return null;
  const ratio = window.devicePixelRatio || 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(size * ratio);
  canvas.height = Math.floor(size * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const load = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('logo load failed'));
  });
  img.src = src;
  try {
    await load;
  } catch {
    return null;
  }
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  return canvas.toDataURL('image/png');
};

const wrapCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  const pushLine = (value: string) => {
    if (value) lines.push(value);
  };

  const splitLongToken = (token: string) => {
    const parts = token.split('-');
    const tokens = parts.length > 1 ? parts.flatMap((part, index) => (index < parts.length - 1 ? [`${part}-`] : [part])) : [token];
    for (const piece of tokens) {
      let current = '';
      for (const ch of piece) {
        const test = current + ch;
        if (ctx.measureText(test).width <= maxWidth || current.length === 0) {
          current = test;
        } else {
          pushLine(current);
          current = ch;
        }
      }
      if (current) {
        pushLine(current);
      }
    }
  };

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      line = testLine;
      continue;
    }
    if (!line) {
      splitLongToken(word);
      line = '';
      continue;
    }
    pushLine(line);
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
    } else {
      splitLongToken(word);
      line = '';
    }
  }
  if (line) pushLine(line);
  return lines.length ? lines : [text];
};

const createLineImage = async (
  text: string,
  width: number,
  options?: {
    fontSize?: number;
    lineHeight?: number;
    isRtl?: boolean;
    fontWeight?: 'normal' | 'bold';
    textColor?: string;
  },
) => {
  if (typeof document === 'undefined' || width <= 0) return null;
  const ratio = window.devicePixelRatio || 2;
  const fontSize = options?.fontSize ?? 10;
  const lineHeight = options?.lineHeight ?? 12;
  const fontWeight = options?.fontWeight ?? 'normal';
  const textColor = options?.textColor ?? '#111111';
  const paddingX = 2;
  const paddingY = 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = `${fontWeight} ${fontSize}px "Segoe UI", "Tahoma", "Arial", "Noto Sans Arabic", sans-serif`;
  const maxWidth = Math.max(width - paddingX * 2, 40);
  const lines = wrapCanvasText(ctx, text, maxWidth);
  const height = Math.max(lineHeight * lines.length + paddingY * 2, lineHeight + paddingY * 2);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = textColor;
  ctx.font = `${fontWeight} ${fontSize}px "Segoe UI", "Tahoma", "Arial", "Noto Sans Arabic", sans-serif`;
  if (options?.isRtl) {
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
  } else {
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
  }
  const x = options?.isRtl ? width - paddingX : paddingX;
  let y = paddingY + lineHeight - 2;
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return { dataUrl: canvas.toDataURL('image/png'), height };
};

const createSingleLineImage = async (
  text: string,
  width: number,
  options?: {
    fontSize?: number;
    minFontSize?: number;
    lineHeight?: number;
    isRtl?: boolean;
    fontWeight?: 'normal' | 'bold';
  },
) => {
  if (typeof document === 'undefined' || width <= 0) return null;
  const ratio = window.devicePixelRatio || 2;
  const paddingX = 2;
  const paddingY = 2;
  const fontWeight = options?.fontWeight ?? 'normal';
  const maxWidth = Math.max(width - paddingX * 2, 40);
  const minFontSize = options?.minFontSize ?? 5;
  let fontSize = options?.fontSize ?? FOOTER_FONT_SIZE;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const measure = (value: string, size: number) => {
    ctx.font = `${fontWeight} ${size}px "Segoe UI", "Tahoma", "Arial", "Noto Sans Arabic", sans-serif`;
    return ctx.measureText(value).width;
  };

  let measured = measure(text, fontSize);
  while (measured > maxWidth && fontSize > minFontSize) {
    fontSize = Math.max(minFontSize, fontSize - 0.5);
    measured = measure(text, fontSize);
  }

  let displayText = text;
  if (measured > maxWidth) {
    const ellipsis = '...';
    let truncated = text;
    while (truncated.length > 0 && measure(`${truncated}${ellipsis}`, fontSize) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    displayText = `${truncated}${ellipsis}`;
  }

  const lineHeight = options?.lineHeight ?? Math.max(Math.round(fontSize + 2), FOOTER_LINE_HEIGHT);
  const height = Math.max(lineHeight + paddingY * 2, lineHeight + paddingY * 2);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#111111';
  ctx.font = `${fontWeight} ${fontSize}px "Segoe UI", "Tahoma", "Arial", "Noto Sans Arabic", sans-serif`;
  if (options?.isRtl) {
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
  } else {
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
  }
  const x = options?.isRtl ? width - paddingX : paddingX;
  const y = paddingY + lineHeight - 2;
  ctx.fillText(displayText, x, y);
  return { dataUrl: canvas.toDataURL('image/png'), height };
};
export default function CodesManager({ contestId, contestTitle, contestSlug }: CodesManagerProps) {
  const t = useTranslations('OfferManage.codes');
  const locale = useLocale();
  const defaultName = useMemo(
    () => defaultBatchName(contestTitle, t('defaults.contestTitle'), t('defaults.batchSuffix')),
    [contestTitle, t],
  );

  const [batchName, setBatchName] = useState(defaultName);
  const [qty, setQty] = useState(50);
  const [len, setLen] = useState(10);
  const [tag, setTag] = useState<'NORMAL' | 'GOLD'>('NORMAL');
  const [sku, setSku] = useState('');
  const [maxRed, setMaxRed] = useState(1);
  const [expires, setExpires] = useState<string>('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [cardPreviews, setCardPreviews] = useState<Record<string, string>>({});
  const [pdfBusy, setPdfBusy] = useState(false);
  const [organizerInfo, setOrganizerInfo] = useState<OrganizerInfo | null>(null);

  const lastDefaultRef = useRef(defaultName);
  const contestTitleFallback = t('defaults.contestTitle');
  const tagLabels = useMemo(
    () => ({
      normal: t('tags.normal'),
      gold: t('tags.gold'),
    }),
    [t],
  );
  const getTagLabel = (value?: string | null) => {
    if (!value) return tagLabels.normal;
    const key = value.toLowerCase() as keyof typeof tagLabels;
    return tagLabels[key] || value;
  };
  const formatExpires = (value?: string | null) => formatDate(value, t('preview.table.never'), locale);

  useEffect(() => {
    if (batchName === lastDefaultRef.current) {
      setBatchName(defaultName);
    }
    lastDefaultRef.current = defaultName;
  }, [defaultName, batchName]);

  useEffect(() => {
    if (!contestId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/owner/contests/${contestId}/organizer`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Organizer fetch failed');
        if (cancelled) return;
        const organizer = data?.organizer || {};
        setOrganizerInfo({
          name: organizer?.name || null,
          whatsapp: organizer?.whatsapp || organizer?.phone || null,
          phone: organizer?.phone || null,
        });
      } catch {
        if (!cancelled) setOrganizerInfo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contestId]);

  useEffect(() => {
    let cancelled = false;
    async function buildPreviews() {
      if (!generated?.codes?.length) {
        setCardPreviews({});
        return;
      }
      const subset = generated.codes.slice(0, Math.min(6, generated.codes.length));
      const entries: Record<string, string> = {};
      for (const code of subset) {
        try {
          const qrValue = createQrValue(code.code, contestSlug || contestId);
          const dataUrl = await QRCode.toDataURL(qrValue, { width: 256, margin: 2 });
          if (!cancelled) {
            entries[code.code] = dataUrl;
          }
        } catch {
          // ignore preview errors
        }
      }
      if (!cancelled) {
        setCardPreviews(entries);
      }
    }
    void buildPreviews();
    return () => {
      cancelled = true;
    };
  }, [generated, contestSlug, contestId]);

  const resetName = () => setBatchName(defaultName);

  function handleQty(value: string) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) setQty(parsed);
  }

  function handleLength(value: string) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed >= 4) setLen(parsed);
  }

  function handleMaxRed(value: string) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed >= 1) setMaxRed(parsed);
  }

  async function generate() {
    if (!batchName.trim()) {
      setError(t('messages.batchNameRequired'));
      return;
    }
    if (qty <= 0) {
      setError(t('messages.quantityMin'));
      return;
    }

    setError(null);
    setBusy(true);
    setProgress(t('actions.generating'));
    setGenerated(null);

    try {
      const res = await fetch(`/api/owner/contests/${contestId}/codes/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: batchName.trim(),
          quantity: qty,
          length: len,
          tag,
          sku: sku.trim() || null,
          max_redemptions: maxRed,
          expires_at: expires || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || t('messages.generateFailed'));
      }

      const codes = Array.isArray(data?.codes) ? data.codes : [];
      setProgress(t('status.generated', { count: codes.length }));
      setGenerated({ batchId: data?.batch_id || data?.batch?.id, codes });

      if (codes.length > 0) {
        const csv = ['code,tag,sku,max_redemptions,expires_at']
          .concat(
            codes.map((c: any) => [c.code, c.tag, c.sku || '', c.max_redemptions || 1, c.expires_at || ''].join(','))
          )
          .join('\n');
        const safeBatch = batchName.trim().replace(/[^a-z0-9-_]+/gi, '-');
        download(`${safeBatch || t('defaults.filePrefix')}-${Date.now()}.csv`, csv);
      }
    } catch (err: any) {
      setError(err?.message || t('messages.unexpected'));
      setProgress('');
      setGenerated(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadCards() {
    if (!generated?.codes?.length || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadCardsPdf(
        generated.codes,
        {
          contestId,
          contestSlug: contestSlug || null,
          contestTitle: contestTitle || null,
        },
        {
          locale,
          fallbackContest: contestTitleFallback,
          labels: {
            code: t('preview.table.headers.code'),
            tag: t('preview.table.headers.tag'),
            contestUrl: t('cards.pdf.contestUrl'),
            organizer: t('cards.pdf.organizer'),
            inquiry: t('cards.pdf.inquiry'),
            expires: t('preview.table.headers.expires'),
          },
          noExpiry: t('preview.table.never'),
          formatTag: getTagLabel,
          notAvailable: t('cards.pdf.notAvailable'),
          usageLine: t('cards.pdf.usageLine'),
        },
        {
          organizerName: organizerInfo?.name || null,
          organizerWhatsapp: organizerInfo?.whatsapp || organizerInfo?.phone || null,
        },
      );
    } catch (err: any) {
      setError(err?.message || t('messages.pdfError'));
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted">{t('description')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted">{t('fields.batchName.label')}</span>
            <input
              className="border rounded px-3 py-2"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder={t('fields.batchName.placeholder')}
            />
            <span className="text-xs text-muted">{t('fields.batchName.suggested', { name: defaultName })}</span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted">{t('fields.quantity')}</span>
            <input
              className="border rounded px-3 py-2"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => handleQty(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted">{t('fields.codeLength.label')}</span>
            <input
              className="border rounded px-3 py-2"
              type="number"
              min={4}
              value={len}
              onChange={(e) => handleLength(e.target.value)}
            />
            <span className="text-xs text-muted">{t('fields.codeLength.helper')}</span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted">{t('fields.tag')}</span>
            <select className="border rounded px-3 py-2" value={tag} onChange={(e) => setTag(e.target.value as 'NORMAL' | 'GOLD')}>
              <option value="NORMAL">{t('tags.normal')}</option>
              <option value="GOLD">{t('tags.gold')}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted">{t('fields.sku.label')}</span>
            <input
              className="border rounded px-3 py-2"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder={t('fields.sku.placeholder')}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted">{t('fields.maxRedemptions')}</span>
            <input
              className="border rounded px-3 py-2"
              type="number"
              min={1}
              value={maxRed}
              onChange={(e) => handleMaxRed(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted">{t('fields.expiry')}</span>
            <input
              type="datetime-local"
              className="border rounded px-3 py-2"
              onChange={(e) => setExpires(e.target.value ? new Date(e.target.value).toISOString() : '')}
            />
          </label>
        </div>

        <div className="rounded-2xl border bg-white/80 p-4 text-sm text-muted space-y-2">
          <div className="font-medium">{t('tips.title')}</div>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>{t('tips.quantity')}</li>
            <li>{t('tips.length')}</li>
            <li>{t('tips.sku')}</li>
          </ul>
        </div>
      </section>

      {error && <div className="text-sm text-danger">{error}</div>}
      {progress && <div className="text-sm text-muted">{progress}</div>}

      <div className="flex gap-3">
        <button className="rv-btn-primary" onClick={generate} disabled={busy}>
          {busy ? t('actions.generating') : t('actions.generate')}
        </button>
        <button className="rv-btn" type="button" onClick={resetName} disabled={busy}>
          {t('actions.reset')}
        </button>
      </div>

      {generated && generated.codes.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-muted">{t('preview.title')}</h3>
          <p className="text-xs text-muted">
            {t('preview.description', {
              shown: Math.min(5, generated.codes.length),
              total: generated.codes.length,
            })}
          </p>
          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-bg">
                <tr>
                  <th className="p-2 text-left">{t('preview.table.headers.code')}</th>
                  <th className="p-2 text-left">{t('preview.table.headers.tag')}</th>
                  <th className="p-2 text-left">{t('preview.table.headers.sku')}</th>
                  <th className="p-2 text-left">{t('preview.table.headers.max')}</th>
                  <th className="p-2 text-left">{t('preview.table.headers.expires')}</th>
                </tr>
              </thead>
              <tbody>
                {generated.codes.slice(0, 5).map((c) => (
                  <tr key={c.id || c.code} className="border-t">
                    <td className="p-2 font-mono text-xs">{c.code}</td>
                    <td className="p-2 uppercase text-xs">{getTagLabel(c.tag)}</td>
                    <td className="p-2 text-xs">{c.sku || '-'}</td>
                    <td className="p-2 text-xs">{c.max_redemptions || 1}</td>
                    <td className="p-2 text-xs">
                      {c.expires_at ? new Date(c.expires_at).toLocaleString(locale) : t('preview.table.never')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {generated.batchId && (
            <div className="text-xs text-muted">{t('preview.batchId', { id: generated.batchId })}</div>
          )}
          <div className="border-t pt-4 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="font-semibold text-muted">{t('cards.title')}</h4>
                <p className="text-xs text-muted">{t('cards.description')}</p>
              </div>
              <button className="rv-btn-primary" type="button" onClick={handleDownloadCards} disabled={pdfBusy}>
                {pdfBusy ? t('actions.downloadCardsBusy') : t('actions.downloadCards')}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {generated.codes.slice(0, 6).map((c) => (
                <div
                  key={c.id || c.code}
                  className="rounded-2xl border border-border bg-white p-4 shadow-sm space-y-3 text-xs text-muted"
                >
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>{contestTitle || contestTitleFallback}</span>
                    <span>#{c.code.slice(-4)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {cardPreviews[c.code] ? (
                      <img
                        src={cardPreviews[c.code]}
                        alt={t('cards.alt', { code: c.code })}
                        className="h-20 w-20 rounded border border-border object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded border border-dashed border-border grid place-items-center text-[10px] text-muted">
                        {t('cards.placeholder')}
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="font-mono text-sm text-text">{c.code}</div>
                      <div>{t('cards.tag', { value: getTagLabel(c.tag) })}</div>
                      <div>{t('cards.expires', { value: formatExpires(c.expires_at) })}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

async function downloadCardsPdf(
  codes: GeneratedCode[],
  context: { contestId: string; contestSlug?: string | null; contestTitle?: string | null },
  options: {
    locale?: string;
    fallbackContest: string;
    labels: { code: string; tag: string; contestUrl: string; organizer: string; inquiry: string; expires: string };
    noExpiry: string;
    formatTag: (value?: string | null) => string;
    notAvailable: string;
    usageLine: string;
  },
  organizer?: { organizerName?: string | null; organizerWhatsapp?: string | null },
) {
  if (!codes.length) return;
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardWidth =
    (pageWidth - CARD_MARGIN_X * 2 - CARD_GAP_X * (CARD_COLUMNS - 1)) / CARD_COLUMNS;
  const contestTitleDisplay = fallbackContestName(context.contestTitle, options.fallbackContest);
  const contestLabelAscii = sanitizeAscii(removeAccents(contestTitleDisplay), options.fallbackContest);
  const slugOrId = context.contestSlug || context.contestId;
  const contestUrlShort = context.contestSlug ? `offers/${context.contestSlug}` : context.contestId;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const contestUrlFull = context.contestSlug && origin ? `${origin}/offers/${context.contestSlug}` : contestUrlShort;
  const isRtl = (options.locale || '').toLowerCase().startsWith('ar');
  let titleImage: { dataUrl: string; height: number } | null = null;
  let logoBadge: string | null = null;
  const organizerName = organizer?.organizerName || options.notAvailable;
  const organizerWhatsapp = organizer?.organizerWhatsapp || options.notAvailable;

  try {
    logoBadge = await createLogoBadgeImage(LOGO_BADGE_PATH, 16);
  } catch {
    logoBadge = null;
  }

  for (let index = 0; index < codes.length; index += 1) {
    if (index > 0 && index % CARDS_PER_PAGE === 0) {
      doc.addPage();
    }
    const position = index % CARDS_PER_PAGE;
    const column = position % CARD_COLUMNS;
    const row = Math.floor(position / CARD_COLUMNS);
    const x = CARD_MARGIN_X + column * (cardWidth + CARD_GAP_X);
    const y = CARD_MARGIN_Y + row * (CARD_HEIGHT + CARD_GAP_Y);
    doc.setDrawColor(CARD_BORDER_COLOR.r, CARD_BORDER_COLOR.g, CARD_BORDER_COLOR.b);
    doc.roundedRect(x, y, cardWidth, CARD_HEIGHT, 8, 8);

    const qrValue = createQrValue(codes[index].code, slugOrId);
    const qrDataUrl = await QRCode.toDataURL(qrValue, { width: 256, margin: 2 });
    const qrX = x + QR_MARGIN;
    const qrY = y + QR_TOP;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE);

    const badgeSize = 16;
    const badgeX = x + cardWidth - badgeSize - 12;
    const badgeY = y + QR_TOP;
    if (logoBadge) {
      doc.addImage(logoBadge, 'PNG', badgeX, badgeY, badgeSize, badgeSize);
    } else {
      doc.setFillColor(17, 24, 39);
      doc.roundedRect(badgeX, badgeY, badgeSize, badgeSize, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(DEFAULT_FONT, 'bold');
      doc.setFontSize(8);
      doc.text('M', badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 3, { align: 'center' });
    }

    doc.setTextColor(17, 17, 17);
    doc.setFont(DEFAULT_FONT, 'normal');
    doc.setFontSize(12);
    const titleX = qrX + QR_SIZE + TITLE_GAP;
    const titleRight = badgeX - 6;
    const titleWidth = Math.max(titleRight - titleX, 80);
    if (!titleImage) {
      titleImage = await createTitleImage(contestTitleDisplay, titleWidth, {
        isRtl,
        maxLines: 4,
        fontSize: 12,
        lineHeight: 14,
      });
    }
    if (titleImage) {
      doc.setFillColor(TITLE_BG_COLOR.r, TITLE_BG_COLOR.g, TITLE_BG_COLOR.b);
      const titleBgX = titleX - 4;
      const titleBgY = y + 14;
      const titleBgW = titleWidth + 8;
      const titleBgH = titleImage.height + 8;
      doc.roundedRect(titleBgX, titleBgY, titleBgW, titleBgH, 6, 6, 'F');
      doc.addImage(titleImage.dataUrl, 'PNG', titleX, y + 18, titleWidth, titleImage.height);
    } else {
      doc.setFont(DEFAULT_FONT, 'bold');
      doc.text(contestLabelAscii, x + 120, y + 32, { maxWidth: cardWidth - 132 });
      doc.setFont(DEFAULT_FONT, 'normal');
    }
    doc.setFontSize(10);
    const lineWidth = cardWidth - 24;
    const columnWidth = Math.max((lineWidth - INFO_COLUMN_GAP) / 2, 60);
    const leftColumnX = x + 12;
    const rightColumnX = leftColumnX + columnWidth + INFO_COLUMN_GAP;
    const renderLine = async (
      lineText: string,
      columnX: number,
      columnY: number,
      columnW: number,
      opts?: {
        highlight?: boolean;
        fontSize?: number;
        fontWeight?: 'normal' | 'bold';
        gap?: number;
        highlightColor?: { r: number; g: number; b: number };
        textColor?: string;
      },
    ) => {
      const lineGap = opts?.gap ?? TEXT_LINE_GAP;
      const imageLine = await createLineImage(lineText, columnW, {
        fontSize: opts?.fontSize ?? TEXT_FONT_SIZE,
        lineHeight: TEXT_LINE_HEIGHT,
        isRtl,
        fontWeight: opts?.fontWeight || 'normal',
        textColor: opts?.textColor,
      });
      if (imageLine) {
        if (opts?.highlight) {
          const highlightColor = opts?.highlightColor ?? HIGHLIGHT_NEUTRAL;
          doc.setFillColor(highlightColor.r, highlightColor.g, highlightColor.b);
          doc.roundedRect(columnX - 2, columnY - 1, columnW + 4, imageLine.height + 2, 3, 3, 'F');
        }
        doc.addImage(imageLine.dataUrl, 'PNG', columnX, columnY, columnW, imageLine.height);
        return columnY + imageLine.height + lineGap;
      }
      doc.text(lineText, columnX, columnY + TEXT_LINE_HEIGHT, { maxWidth: columnW });
      return columnY + TEXT_LINE_HEIGHT + lineGap;
    };

    let leftY = y + TEXT_START_OFFSET + ORGANIZER_OFFSET;
    let rightY = y + TEXT_START_OFFSET;
    leftY = await renderLine(`${options.labels.organizer}: ${organizerName}`, leftColumnX, leftY, columnWidth, {
      highlight: true,
      fontSize: 8.5,
      fontWeight: 'bold',
      highlightColor: HIGHLIGHT_NEUTRAL,
      textColor: '#475569',
    });
    rightY = await renderLine(`${options.labels.code}: ${codes[index].code}`, rightColumnX, rightY, columnWidth, {
      highlight: true,
      fontSize: 9,
      fontWeight: 'bold',
      gap: 0,
      highlightColor: HIGHLIGHT_CODE,
      textColor: '#1E3A8A',
    });
    rightY = await renderLine(
      `${options.labels.tag}: ${options.formatTag(codes[index].tag)}`,
      rightColumnX,
      rightY,
      columnWidth,
      { gap: 0 },
    );
    rightY = await renderLine(
      `${options.labels.expires}: ${formatDate(codes[index].expires_at, options.noExpiry, options.locale)}`,
      rightColumnX,
      rightY,
      columnWidth,
      { gap: 0 },
    );

    const footerLines = [
      `${options.labels.inquiry}: ${organizerWhatsapp} • ${options.labels.contestUrl}: ${contestUrlFull}`,
      options.usageLine,
    ];
    const footerImages: Array<{ dataUrl: string; height: number } | null> = [];
    let footerHeight = 0;
    for (const entry of footerLines) {
      const footerImage = await createSingleLineImage(entry, lineWidth, {
        fontSize: FOOTER_FONT_SIZE,
        minFontSize: 5,
        lineHeight: FOOTER_LINE_HEIGHT,
        isRtl,
      });
      footerImages.push(footerImage);
      footerHeight += (footerImage?.height ?? FOOTER_LINE_HEIGHT) + FOOTER_LINE_GAP;
    }
    if (footerHeight > 0) footerHeight -= FOOTER_LINE_GAP;
    let footerY = y + CARD_HEIGHT - footerHeight - 6;
    const dividerY = footerY - 4;
    doc.setDrawColor(DIVIDER_COLOR.r, DIVIDER_COLOR.g, DIVIDER_COLOR.b);
    doc.setLineWidth(0.5);
    doc.line(leftColumnX, dividerY, leftColumnX + lineWidth, dividerY);
    for (let i = 0; i < footerLines.length; i += 1) {
      const footerImage = footerImages[i];
      if (footerImage) {
        doc.addImage(footerImage.dataUrl, 'PNG', leftColumnX, footerY, lineWidth, footerImage.height);
        footerY += footerImage.height + FOOTER_LINE_GAP;
      } else {
        doc.text(footerLines[i], leftColumnX, footerY + FOOTER_LINE_HEIGHT, { maxWidth: lineWidth });
        footerY += FOOTER_LINE_HEIGHT + FOOTER_LINE_GAP;
      }
    }
  }

  doc.save(`${safeFileName(context.contestTitle)}-qr-cards.pdf`);
}
