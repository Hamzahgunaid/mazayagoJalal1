'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type ShareableOffer = {
  slug: string;
  title: string;
  prizeSummary?: string | null;
  endsAt?: string | null;
  coverImage?: string | null;
  baseUrl: string;
};

type OfferShareSheetProps = {
  open: boolean;
  onClose: () => void;
  offer: ShareableOffer;
  onNotify?: (text: string, kind?: 'success' | 'error') => void;
};

type ShareCaptionCopy = {
  titleShort: (title: string) => string;
  titleLong: (title: string) => string;
  prize: (prize: string) => string;
  deadline: (deadline: string) => string;
  ctaShort: string;
  ctaLong: string;
};

const MAX_X_CHARS = 240;
const DEFAULT_SHARE_IMAGE = '/assets/defaults/MazayaGo_header_320w_palette.png';
const DEFAULT_SHARE_COPY: ShareCaptionCopy = {
  titleShort: (title) => `شارك في التحدي واربح: ${title} 🔥`,
  titleLong: (title) => `شارك في التحدي واربح: ${title}`,
  prize: (prize) => `الجائزة: ${prize}`,
  deadline: (deadline) => `يغلق باب المشاركة: ${deadline}`,
  ctaShort: 'انضم عبر منصة مزايا جو (MazayaGo) الآن.',
  ctaLong: 'ادخل الآن عبر منصة مزايا جو (MazayaGo) وشارك أصدقاءك الحماس!',
};

const normalizeBase = (base: string) => base.replace(/\/$/, '');

const ensureAbsoluteUrl = (url: string | null | undefined, base: string) => {
  const cleaned = (url || '').trim();
  if (!cleaned) return null;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const formatDeadlineLocal = (endsAt?: string | null, locale: string = 'ar') => {
  if (!endsAt) return null;
  const date = new Date(endsAt);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Aden',
    }).format(date);
  } catch {
    return date.toLocaleString(locale);
  }
};

export function buildOfferShareCaptionX(
  offer: ShareableOffer,
  offerUrl?: string,
  copy: ShareCaptionCopy = DEFAULT_SHARE_COPY,
  locale: string = 'ar',
) {
  const deadline = formatDeadlineLocal(offer.endsAt, locale);
  const lines = [
    copy.titleShort(offer.title),
    offer.prizeSummary ? copy.prize(offer.prizeSummary) : null,
    deadline ? copy.deadline(deadline) : null,
    copy.ctaShort,
  ].filter(Boolean);
  let caption = lines.join('\n');
  if (caption.length > MAX_X_CHARS) {
    caption = `${caption.slice(0, MAX_X_CHARS - 1).trim()}…`;
  }
  if (offerUrl) {
    caption = `${caption}\n${offerUrl}`;
  }
  return caption;
}

export function buildOfferShareCaptionLong(
  offer: ShareableOffer,
  offerUrl?: string,
  copy: ShareCaptionCopy = DEFAULT_SHARE_COPY,
  locale: string = 'ar',
) {
  const deadline = formatDeadlineLocal(offer.endsAt, locale);
  const lines = [
    copy.titleLong(offer.title),
    offer.prizeSummary ? copy.prize(offer.prizeSummary) : null,
    deadline ? copy.deadline(deadline) : null,
    copy.ctaLong,
  ].filter(Boolean);
  const body = lines.join('\n');
  return offerUrl ? `${body}\n${offerUrl}` : body;
}

export default function OfferShareSheet({ open, onClose, offer, onNotify }: OfferShareSheetProps) {
  const t = useTranslations('OfferDetail.shareSheet');
  const locale = useLocale();
  const captionCopy = useMemo<ShareCaptionCopy>(
    () => ({
      titleShort: (title: string) => t('shareCaption.titleShort', { title }),
      titleLong: (title: string) => t('shareCaption.titleLong', { title }),
      prize: (prize: string) => t('shareCaption.prize', { prize }),
      deadline: (deadline: string) => t('shareCaption.deadline', { deadline }),
      ctaShort: t('shareCaption.ctaShort'),
      ctaLong: t('shareCaption.ctaLong'),
    }),
    [t],
  );
  const baseUrl = normalizeBase(offer.baseUrl || 'https://www.mazayago.com');
  const offerUrl = `${baseUrl}/offers/${offer.slug}`;
  const captionShort = useMemo(
    () => buildOfferShareCaptionX(offer, offerUrl, captionCopy, locale),
    [offer, offerUrl, captionCopy, locale],
  );
  const captionLong = useMemo(
    () => buildOfferShareCaptionLong(offer, offerUrl, captionCopy, locale),
    [offer, offerUrl, captionCopy, locale],
  );

  if (!open) return null;

  const notify = (message: string, kind: 'success' | 'error' = 'success') => {
    onNotify?.(message, kind);
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined') {
      notify(t('systemUnavailable'), 'error');
      return;
    }
    if (!navigator.share) {
      notify(t('systemUnavailable'), 'error');
      return;
    }
    try {
      await navigator.share({ title: offer.title, text: captionShort, url: offerUrl });
      notify(t('shareReady'));
      onClose();
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      notify(t('shareError'), 'error');
    }
  };

  const openWindow = (url: string) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async (text: string, successMessage: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        notify(successMessage);
        return;
      } catch {
        // fallback below
      }
    }
    if (typeof window !== 'undefined') {
      window.prompt(successMessage, text);
    }
  };

  const shareButtons = [
    { key: 'systemShare', action: handleNativeShare },
    {
      key: 'facebook',
      action: () => openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(offerUrl)}`),
    },
    {
      key: 'x',
      action: () =>
        openWindow(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(captionShort)}&url=${encodeURIComponent(offerUrl)}`,
        ),
    },
    {
      key: 'telegram',
      action: () =>
        openWindow(`https://t.me/share/url?url=${encodeURIComponent(offerUrl)}&text=${encodeURIComponent(captionLong)}`),
    },
    {
      key: 'whatsapp',
      action: () =>
        openWindow(`https://wa.me/?text=${encodeURIComponent(captionLong)}`),
    },
  ];

  const coverPreview = ensureAbsoluteUrl(offer.coverImage || DEFAULT_SHARE_IMAGE, baseUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center sm:bg-black/60">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-t-3xl bg-surface p-6 shadow-card sm:rounded-3xl border border-border">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted">{t('title')}</p>
            <h3 className="text-lg font-semibold text-text">{offer.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-3 py-1 text-sm text-muted transition hover:bg-primary-weak hover:text-secondary"
          >
            {t('close')}
          </button>
        </div>

        {coverPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPreview}
            alt=""
            className="mb-4 h-40 w-full rounded-2xl object-cover"
          />
        )}

        <div className="space-y-2 rounded-2xl border border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text">{t('captionLabel')}</span>
            <button
              type="button"
              onClick={() => handleCopy(captionLong, t('captionCopied'))}
              className="text-xs font-semibold text-secondary hover:text-primary"
            >
              {t('copyCaption')}
            </button>
          </div>
          <p className="text-sm text-text whitespace-pre-line">{captionLong}</p>
          <p className="text-xs text-muted">{t('previewHelper')}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {shareButtons.map((action, index) => (
            <button
              key={action.key}
              type="button"
              onClick={action.action}
              className="rounded-2xl border border-border bg-surface px-4 py-2 text-left text-sm font-semibold text-text shadow-sm transition hover:border-primary hover:text-secondary"
              style={{ transitionDelay: `${index * 40}ms` }}
            >
              {t(action.key as any)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleCopy(offerUrl, t('linkCopied'))}
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-left text-sm font-semibold text-text shadow-sm transition hover:border-primary hover:text-secondary"
          >
            {t('copyLink')}
          </button>
        </div>
      </div>
    </div>
  );
}
