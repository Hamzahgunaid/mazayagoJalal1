'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getContest, listWinners } from '@/lib/api_contests';
import WinnersCard from '@/components/offers/WinnersCard';
import EnterNow from '@/components/offers/EnterNow';
import OfferGallery from '@/components/offers/OfferGallery';
import ParticipantEntriesPanel from '@/components/offers/ParticipantEntriesPanel';
import LivePredictionPanel from '@/components/offers/LivePredictionPanel';
import JudgesPanel from '@/components/offers/JudgesPanel';
import { useLocale, useTranslations } from 'next-intl';
import OfferShareSheet from '@/components/offers/OfferShareSheet';
import type { Contest, ContestMedia } from '@/types/offers';

const DEFAULT_COVER_IMAGE = '/assets/defaults/MazayaGo_header_320w_palette.png';

type ContestTask = {
  id: string;
  contest_id: string;
  round_id?: string | null;
  kind: string;
  title?: string | null;
  description?: string | null;
  points?: number | null;
  time_limit_sec?: number | null;
  metadata?: any;
  options?: { id?: string; label?: string | null; is_correct?: boolean; position?: number | null }[] | null;
};

type Winner = {
  id?: string;
  user_id?: string;
  entry_id?: string | null;
  published_at?: string | null;
  prize_id?: string | null;
  prize_name?: string | null;
  prize_description?: string | null;
  user_display_name?: string | null;
  user_avatar_url?: string | null;
  user?: { name?: string | null; display_name?: string | null; full_name?: string | null; email?: string | null; avatar_url?: string | null } | null;
};

type TimelineStage = 'upcoming' | 'active' | 'ended';

function formatLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function formatInline(html: string) {
  return html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function markdownToHtml(md: string) {
  const lines = md.split(/\r?\n/);
  const parts: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      parts.push('</ul>');
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }

    if (line.startsWith('### ')) {
      closeList();
      parts.push(`<h3>${formatInline(escapeHtml(line.slice(4).trim()))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      parts.push(`<h2>${formatInline(escapeHtml(line.slice(3).trim()))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      closeList();
      parts.push(`<h1>${formatInline(escapeHtml(line.slice(2).trim()))}</h1>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const item = formatInline(escapeHtml(line.replace(/^[-*]\s+/, '')));
      if (!inList) {
        parts.push('<ul>');
        inList = true;
      }
      parts.push(`<li>${item}</li>`);
      continue;
    }

    closeList();
    parts.push(`<p>${formatInline(escapeHtml(line))}</p>`);
  }

  closeList();
  return parts.join('\n');
}

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, '');

const ensureAbsoluteUrl = (url?: string | null, baseUrl?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const safeBase = baseUrl ? normalizeBaseUrl(baseUrl) : '';
  if (!safeBase) return url;
  return `${safeBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

type SocialLink = {
  label: string;
  url: string;
  display?: string;
};

const pickValue = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

const normalizeExternalUrl = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const normalizePhoneLink = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^\d+]/g, '');
  return `tel:${cleaned || trimmed}`;
};

const normalizeWhatsappLink = (value: string | null) => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^wa\.me\//i.test(raw)) return `https://${raw}`;
  if (/^whatsapp\.com\//i.test(raw)) return `https://${raw}`;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  return `https://wa.me/${digits}`;
};

const IconBase = ({
  children,
  className,
}: {
  children: JSX.Element;
  className?: string;
}) => (
  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white shadow ${className || ''}`}>
    {children}
  </span>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="12" cy="12" r="7" />
    <path d="M5 12h14" />
    <path d="M12 5c2.5 2.8 2.5 10.2 0 14" />
    <path d="M12 5c-2.5 2.8-2.5 10.2 0 14" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M7.5 4.5h2.7c.5 0 .9.4.9.9l.3 2.4c.1.5-.2 1-.7 1.2l-1.1.5a11 11 0 0 0 5.1 5.1l.5-1.1c.2-.5.7-.8 1.2-.7l2.4.3c.5.1.9.5.9.9v2.7c0 .5-.4.9-.9.9-7 0-12.7-5.7-12.7-12.7 0-.5.4-.9.9-.9z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14.2 8.2h2.5V5.6h-2.7c-2.1 0-3.6 1.7-3.6 3.7v1.8H8v2.6h2.4V19h2.7v-5.3h2.6l.4-2.6h-3V9.4c0-.7.3-1.2 1.1-1.2z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="5" y="5" width="14" height="14" rx="4" />
    <circle cx="12" cy="12" r="3.2" />
    <circle cx="16.3" cy="7.7" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 4h3.5l4.2 5.7L17 4h2.6l-6 8.1L19.4 20h-3.5l-4.5-6-4.6 6H4.2l6.4-8.4L5 4z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 4c.6 1.6 1.8 2.8 3.4 3.4V10c-1.4 0-2.8-.5-3.9-1.4v5.6a5 5 0 1 1-4.4-5v2.6a2.4 2.4 0 1 0 1.8 2.3V4h3.1z" />
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3.5" y="6.2" width="17" height="11.6" rx="3" />
    <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.4 9.3h2.6V18H6.4V9.3zm1.3-4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.1 9.3h2.5v1.2h.1c.4-.7 1.3-1.4 2.7-1.4 2 0 3.1 1.2 3.1 3.6V18h-2.6v-4.5c0-1.1-.4-1.8-1.4-1.8-.8 0-1.3.5-1.5 1-.1.2-.1.5-.1.8V18h-2.8V9.3z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.8 5.2L3.6 11.4c-.7.3-.7 1.3.1 1.5l4.1 1.2 1.6 5.3c.2.7 1.1.9 1.5.3l2.6-3.5 4.3 3.1c.6.4 1.4 0 1.5-.7l2.4-12.6c.1-.7-.6-1.3-1.3-1.1z" />
  </svg>
);

const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 5.5c-1.9 0-3.4 1.5-3.4 3.4v2.7c0 .7-.5 1.2-1.2 1.3l-1.4.2c-.5.1-.7.7-.3 1.1.6.6 1.6 1.1 2.7 1.3l.7 2.2c.1.4.5.6.9.5 1-.2 1.9-.2 2.9 0 .4.1.8-.1.9-.5l.7-2.2c1.1-.2 2.1-.7 2.7-1.3.4-.4.2-1-.3-1.1l-1.4-.2c-.7-.1-1.2-.6-1.2-1.3V8.9c0-1.9-1.5-3.4-3.4-3.4z" />
  </svg>
);

const WhatsappIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M7 18l-1.5 3 3-1.5A8 8 0 1 0 7 18z" />
    <path d="M9.3 9.7c1.6 2.4 3.6 4.1 5.1 4.8l1.2-.9c.4-.3.9-.3 1.3 0l1.2 1.2c.3.3.3.8 0 1.1l-.8.8c-.7.7-1.7.9-2.6.6-2.4-.8-5.1-3.4-6-5.9-.3-.9-.1-1.9.6-2.6l.8-.8c.3-.3.8-.3 1.1 0l1.1 1.1c.3.3.3.9 0 1.3l-.9 1.3z" />
  </svg>
);

const EmailIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="4" y="6.5" width="16" height="11" rx="2.5" />
    <path d="M4.5 8l7.5 5 7.5-5" />
  </svg>
);

const getSocialStyle = (label: string) => {
  switch (label) {
    case 'WhatsApp':
      return { chip: 'bg-success-weak text-[#4D8A1F] ring-success hover:bg-success-weak', icon: 'bg-success-weak', Icon: WhatsappIcon };
    case 'YouTube':
      return { chip: 'bg-[rgba(214,76,76,0.08)] text-danger ring-danger hover:bg-[rgba(214,76,76,0.12)]', icon: 'bg-[rgba(214,76,76,0.08)]', Icon: YouTubeIcon };
    case 'Instagram':
      return { chip: 'bg-[rgba(214,76,76,0.08)] text-danger ring-danger hover:bg-[rgba(214,76,76,0.12)]', icon: 'bg-[rgba(214,76,76,0.08)]', Icon: InstagramIcon };
    case 'Facebook':
      return { chip: 'bg-primary-weak text-primary-hover ring-primary hover:bg-primary-weak', icon: 'bg-primary-hover', Icon: FacebookIcon };
    case 'X':
      return { chip: 'bg-primary-weak text-muted ring-border hover:bg-primary-weak', icon: 'bg-secondary', Icon: XIcon };
    case 'TikTok':
      return { chip: 'bg-accent-weak text-accent-hover ring-accent hover:bg-accent-weak', icon: 'bg-accent-weak', Icon: TikTokIcon };
    case 'LinkedIn':
      return { chip: 'bg-primary-weak text-primary-hover ring-primary hover:bg-primary-weak', icon: 'bg-primary-hover', Icon: LinkedInIcon };
    case 'Telegram':
      return { chip: 'bg-primary-weak text-primary-hover ring-primary hover:bg-primary-weak', icon: 'bg-primary-weak', Icon: TelegramIcon };
    case 'Snapchat':
      return { chip: 'bg-accent-weak text-accent-hover ring-accent hover:bg-accent-weak', icon: 'bg-accent', Icon: SnapchatIcon };
    case 'Email':
      return { chip: 'bg-primary-weak text-muted ring-border hover:bg-primary-weak', icon: 'bg-secondary', Icon: EmailIcon };
    default:
      return { chip: 'bg-primary-weak text-muted ring-border hover:bg-primary-weak', icon: 'bg-bg', Icon: GlobeIcon };
  }
};

const buildOrganizerSocialLinks = (snapshot: any) => {
  const social = (snapshot?.display_social_json || {}) as Record<string, any>;
  const meta = (snapshot?.display_meta_json || {}) as Record<string, any>;
  const contacts = (meta.contacts || {}) as Record<string, any>;
  const links: SocialLink[] = [];

  const push = (label: string, url?: string | null, display?: string | null) => {
    if (!url) return;
    if (links.some((link) => link.label === label)) return;
    links.push({ label, url, display: display || undefined });
  };

  push('Facebook', pickValue(social.facebook, contacts.facebook));
  push('Instagram', pickValue(social.instagram, contacts.instagram));
  push('X', pickValue(social.x, social.twitter));
  push('TikTok', pickValue(social.tiktok));
  push('YouTube', pickValue(social.youtube));
  push('LinkedIn', pickValue(social.linkedin));
  push('Telegram', pickValue(social.telegram));
  push('Snapchat', pickValue(social.snapchat));

  const whatsapp = normalizeWhatsappLink(
    pickValue(
      social.whatsapp_link,
      social.whatsapp_url,
      social.whatsapp,
      contacts.whatsapp_link,
      contacts.whatsapp
    )
  );
  if (whatsapp) push('WhatsApp', whatsapp);

  const email = pickValue(social.email, contacts.email, meta.email);
  if (email) push('Email', email.startsWith('mailto:') ? email : `mailto:${email}`, email);

  return links;
};


type OfferDetailClientProps = {
  slug: string;
  searchParams?: Record<string, string | string[] | undefined>;
  shareBaseUrl: string;
  initialOffer?: Contest | null;
};

export default function OfferDetailClient({
  slug,
  searchParams,
  shareBaseUrl,
  initialOffer,
}: OfferDetailClientProps) {
  const debug = (searchParams?.debug ?? '').toString() === '1';
  const hasInitialContest = Boolean(initialOffer);

  const [contest, setContest] = useState<Contest | null>(initialOffer ?? null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(!initialOffer);
  const [trace, setTrace] = useState<any>({});
  const [now, setNow] = useState<number>(() => Date.now());
  const [mediaItems, setMediaItems] = useState<ContestMedia[]>(
    () => (Array.isArray(initialOffer?.media) ? initialOffer.media : []),
  );
  const [tasks, setTasks] = useState<ContestTask[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [userCompletedEntries, setUserCompletedEntries] = useState(false);
  const [userEntryCount, setUserEntryCount] = useState(0);
  const [entriesRefreshToken, setEntriesRefreshToken] = useState(0);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareToast, setShareToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [organizerModalOpen, setOrganizerModalOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations('OfferDetail');
  const typeT = useTranslations('Offers.types');
  const selectionT = useTranslations('OfferManage.selectionOptions');
  const proofJson = useMemo(() => {
    if (!contest?.public_proof) return '';
    try {
      return JSON.stringify(contest.public_proof, null, 2);
    } catch {
      return String(contest.public_proof);
    }
  }, [contest?.public_proof]);
  const proofEntries = useMemo(() => {
    const proof = contest?.public_proof;
    if (!proof || typeof proof !== 'object') return [];
    const safeProof = proof as Record<string, any>;
    const keys = ['seed_commit', 'seed_reveal', 'external_entropy', 'take', 'method_used'];
    return keys
      .filter((key) => key in safeProof)
      .map((key) => ({
        key,
        value:
          safeProof[key] == null
            ? null
            : typeof safeProof[key] === 'string'
            ? safeProof[key]
            : JSON.stringify(safeProof[key]),
      }));
  }, [contest?.public_proof]);
  const showShareNotification = useCallback(
    (text: string, kind: 'success' | 'error' = 'success') => {
      setShareToast({ kind, text });
      window.setTimeout(() => setShareToast(null), 2500);
    },
    [],
  );

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );

  const relativeTimeFormatter = useMemo(
    () =>
      new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
      }),
    [locale],
  );

  const formatDateLabel = useCallback(
    (date?: Date | null) => {
      if (!date) return t('dates.notSet');
      const time = date.getTime();
      if (Number.isNaN(time)) return t('dates.notSet');
      return dateTimeFormatter.format(date);
    },
    [dateTimeFormatter, t],
  );

  const formatRelativeToNow = useCallback(
    (date: Date, referenceMs: number) => {
      const diffSeconds = (date.getTime() - referenceMs) / 1000;
      const absSeconds = Math.abs(diffSeconds);
      if (absSeconds < 60) {
        return relativeTimeFormatter.format(Math.round(diffSeconds), 'seconds');
      }
      const diffMinutes = diffSeconds / 60;
      if (Math.abs(diffMinutes) < 60) {
        return relativeTimeFormatter.format(Math.round(diffMinutes), 'minutes');
      }
      const diffHours = diffMinutes / 60;
      if (Math.abs(diffHours) < 48) {
        return relativeTimeFormatter.format(Math.round(diffHours), 'hours');
      }
      const diffDays = diffHours / 24;
      if (Math.abs(diffDays) < 14) {
        return relativeTimeFormatter.format(Math.round(diffDays), 'days');
      }
      const diffWeeks = diffDays / 7;
      return relativeTimeFormatter.format(Math.round(diffWeeks), 'weeks');
    },
    [relativeTimeFormatter],
  );

  const startedAt = contest?.starts_at ? new Date(contest.starts_at) : null;
  const endsAt = contest?.ends_at ? new Date(contest.ends_at) : null;
  const timelineState = useMemo(() => {
    if (!contest) {
      return {
        stage: 'upcoming' as TimelineStage,
        chip: '',
        helper: '',
      };
    }
    if (endsAt && now > endsAt.getTime()) {
      return {
        stage: 'ended' as TimelineStage,
        chip: t('timeline.chips.closed'),
        helper: t('timeline.helpers.closed', { time: formatRelativeToNow(endsAt, now) }),
      };
    }
    if (startedAt && now < startedAt.getTime()) {
      return {
        stage: 'upcoming' as TimelineStage,
        chip: t('timeline.chips.upcoming'),
        helper: t('timeline.helpers.opens', { time: formatRelativeToNow(startedAt, now) }),
      };
    }
    if (endsAt) {
      return {
        stage: 'active' as TimelineStage,
        chip: t('timeline.chips.active'),
        helper: t('timeline.helpers.closes', { time: formatRelativeToNow(endsAt, now) }),
      };
    }
    return {
      stage: 'active' as TimelineStage,
      chip: t('timeline.chips.active'),
      helper: t('timeline.helpers.accepting'),
    };
  }, [contest, endsAt, formatRelativeToNow, now, startedAt, t]);
  const mcqOptions = Array.isArray(contest?.mcq_options) ? contest?.mcq_options ?? [] : [];
  const entryLimit = useMemo(() => {
    if (tasks.length > 0) return tasks.length;
    const perUserLimit =
      typeof contest?.per_user_limit === 'number' && contest.per_user_limit > 0
        ? contest.per_user_limit
        : null;
    if (perUserLimit) return perUserLimit;
    if (mcqOptions.length > 0) return 1;
    return 1;
  }, [tasks.length, contest?.per_user_limit, mcqOptions.length]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        if (!response.ok) throw new Error('failed');
        const data = await response.json().catch(() => ({}));
        if (!cancelled) {
          setCurrentUserId(data?.user?.id ?? null);
          setCurrentUserRoles(Array.isArray(data?.user?.roles) ? data.user.roles : []);
        }
      } catch {
        if (!cancelled) {
          setCurrentUserId(null);
          setCurrentUserRoles([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!organizerModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOrganizerModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [organizerModalOpen]);

  useEffect(() => {
    setOrganizerModalOpen(false);
  }, [slug]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasInitialContest) {
        setLoading(true);
        setMediaItems([]);
        setTasks([]);
      }
      setTrace({});
      try {
        const data = await getContest(slug);
        if (cancelled) return;
        const fetched: Contest | null = data?.contest ?? (data?.id ? data : null);
        if (!fetched?.id) {
          if (!cancelled) {
            if (!hasInitialContest) {
              setContest(null);
              setWinners([]);
              setMediaItems([]);
              setTasks([]);
            }
            setTrace({ contestFetch: [{ ok: false, where: 'by-slug', data }] });
          }
          return;
        }

        if (!cancelled) {
          setContest(fetched);
        }

        const rulesMedia: ContestMedia[] = Array.isArray(fetched.rules_json?.gallery_urls)
          ? fetched.rules_json.gallery_urls
              .filter((url: any) => typeof url === 'string' && url.trim())
              .map((url: string) => ({ url, kind: 'image' as const }))
          : [];

        let winnersOk = false;
        try {
          const response = await fetch(
            `/api/public/contests/by-slug/${encodeURIComponent(slug)}/winners`,
            { cache: 'no-store' },
          );
          if (!cancelled && response.ok) {
            const json = await response.json().catch(() => ({}));
            const items: Winner[] = Array.isArray(json?.winners) ? json.winners : [];
            setWinners(items.map(normalizeWinner));
            winnersOk = true;
          }
        } catch {
          // ignore and fallback
        }

        if (!winnersOk && fetched.id) {
          try {
            const winnerResponse = await listWinners(fetched.id).catch(() => ({ items: [] }));
            if (!cancelled) {
              const items: Winner[] = Array.isArray((winnerResponse as any)?.items)
                ? (winnerResponse as any).items
                : Array.isArray(winnerResponse)
                ? (winnerResponse as Winner[])
                : [];
              setWinners(items.map(normalizeWinner));
              winnersOk = items.length > 0;
            }
          } catch {
            if (!cancelled) setWinners([]);
          }
        }

        let mediaOk = false;
        let combinedMedia: ContestMedia[] = [];
        try {
          const response = await fetch(
            `/api/public/contests/by-slug/${encodeURIComponent(slug)}/media`,
            { cache: 'no-store' },
          );
          if (response.ok) {
            const json = await response.json().catch(() => ({}));
            const items: ContestMedia[] = Array.isArray(json?.items) ? json.items : [];
            combinedMedia = items;
            mediaOk = true;
          }
        } catch {
          // ignore media fetch errors
        }

        combinedMedia = [...combinedMedia, ...rulesMedia];
        const seenMedia = new Set<string>();
        const normalizedMedia = combinedMedia.filter((item) => {
          const url = (item?.url || '').trim();
          if (!url || seenMedia.has(url)) return false;
          seenMedia.add(url);
          return true;
        });
        if (!cancelled) {
          setMediaItems(normalizedMedia);
        }

        let tasksOk = false;
        let parsedTasks: ContestTask[] = [];
        try {
          const response = await fetch(
            `/api/public/contests/by-slug/${encodeURIComponent(slug)}/tasks`,
            { cache: 'no-store' },
          );
          if (response.ok) {
            const json = await response.json().catch(() => ({}));
            const rawTasks = Array.isArray(json?.items) ? json.items : [];
            parsedTasks = rawTasks
              .filter((task: any) => task && task.id && task.kind)
              .map((task: any) => ({
                id: String(task.id),
                contest_id: String(task.contest_id ?? fetched.id),
                round_id: task.round_id ?? null,
                kind: String(task.kind || '').toUpperCase(),
                title: task.title ?? null,
                description: task.description ?? null,
                points:
                  typeof task.points === 'number'
                    ? task.points
                    : Number.isFinite(Number(task.points))
                    ? Number(task.points)
                    : null,
                time_limit_sec: task.time_limit_sec ?? null,
                metadata: task.metadata ?? null,
                options: Array.isArray(task.options) ? task.options : [],
              }));
            tasksOk = true;
          }
        } catch {
          parsedTasks = [];
        }
        if (!cancelled) {
          setTasks(parsedTasks);
        }

        if (!cancelled) {
          setTrace({
            contestFetch: [{ ok: true, where: 'by-slug' }],
            winnersFetch: [{ ok: winnersOk, where: 'by-id' }],
            mediaFetch: [{ ok: mediaOk }],
            tasksFetch: [{ ok: tasksOk }],
          });
        }
      } catch (error: any) {
        if (!cancelled) {
          if (!hasInitialContest) {
            setContest(null);
            setWinners([]);
            setMediaItems([]);
            setTasks([]);
          }
          setTrace({ error: error?.message || String(error) });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, hasInitialContest]);

  const organizer = contest?.organizer ?? null;

  useEffect(() => {
    if (!currentUserId) {
      setUserCompletedEntries(false);
      setUserEntryCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/contests/by-slug/${encodeURIComponent(slug)}/entries?mine=1&limit=200`,
          { cache: 'no-store', credentials: 'include' },
        );
        if (!response.ok) throw new Error('entries');
        const json = await response.json().catch(() => ({}));
        const items = Array.isArray(json?.items) ? json.items : [];
        if (!cancelled) {
          const entryCount = items.length;
          setUserEntryCount(entryCount);
          const completed =
            entryLimit > 0 ? entryCount >= entryLimit : entryCount > 0;
          setUserCompletedEntries(completed);
        }
      } catch {
        if (!cancelled) {
          setUserCompletedEntries(false);
          setUserEntryCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, currentUserId, entryLimit]);

  const rulesMarkdown = contest?.rules_json?.rules_markdown ?? '';
  const participationChannels = contest?.participation_channels ?? null;
  const messengerParticipationLink = participationChannels?.messenger?.enabled
    ? participationChannels?.messenger?.link || null
    : null;
  const commentsParticipationLink = participationChannels?.comments?.enabled
    ? participationChannels?.comments?.link || null
    : null;
  const hasParticipationSection = Boolean(messengerParticipationLink || commentsParticipationLink);
  const rulesHtml = useMemo(
    () => {
      const trimmed = rulesMarkdown.trim();
      return trimmed ? markdownToHtml(trimmed) : '';
    },
    [rulesMarkdown],
  );

  const commentsPostLabel = useMemo(() => {
    const postId = participationChannels?.comments?.post_id || null;
    if (!postId) return t('participationChannels.commentPostFallback');
    const parts = postId.split('_');
    if (parts.length > 1 && parts[1]) return `${t('participationChannels.commentPost')} #${parts[1]}`;
    return `${t('participationChannels.commentPost')} #${postId}`;
  }, [participationChannels?.comments?.post_id, t]);

  const galleryImageCandidates = useMemo(() => {
    const urls: string[] = [];
    const push = (value?: string | null) => {
      if (!value) return;
      const trimmed = value.trim();
      if (trimmed) urls.push(trimmed);
    };
    push((contest as any)?.cover_url || null);
    if (contest?.branding_theme && typeof contest.branding_theme === 'object') {
      push((contest.branding_theme as any)?.cover_url || null);
    }
    mediaItems.forEach((item) => push(item?.url || null));
    if (Array.isArray(contest?.media)) {
      contest.media.forEach((item: any) => push(typeof item?.url === 'string' ? item.url : null));
    }
    if (Array.isArray(contest?.rules_json?.gallery_urls)) {
      contest.rules_json.gallery_urls.forEach((value: any) =>
        push(typeof value === 'string' ? value : String(value ?? '').trim()),
      );
    }
    return urls;
  }, [contest, mediaItems]);

  if (loading) {
    return (
      <main className="min-h-screen bg-bg px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-white p-6 text-center text-muted shadow-sm">
          {t('loading')}
        </div>
      </main>
    );
  }

  if (!contest) {
    return (
      <main className="min-h-screen bg-bg px-6 py-10">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-text">{t('notFound.title')}</div>
            <p className="mt-2 text-sm text-muted">{t('notFound.description')}</p>
            <a
              href="/offers"
              className="mt-4 inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-primary-hover hover:border-primary hover:text-primary-hover"
            >
              {t('notFound.cta')}
            </a>
          </div>
          {debug && (
            <pre className="overflow-auto rounded-3xl border border-border bg-white p-6 text-xs text-muted shadow-sm">
              {JSON.stringify(trace, null, 2)}
            </pre>
          )}
        </div>
      </main>
    );
  }

  const isActiveStatus = contest.status === 'ACTIVE';
  const startedOK = !startedAt || startedAt.getTime() <= now;
  const notEnded = !endsAt || now <= endsAt.getTime();
  const canEnter = isActiveStatus && startedOK && notEnded;

  let disabledReason: string | null = null;
  if (!isActiveStatus) disabledReason = t('entry.disabled.inactive');
  else if (!startedOK) disabledReason = t('entry.disabled.notStarted');
  else if (!notEnded) disabledReason = t('entry.disabled.ended');

  const selectionKeyMap: Record<string, string> = {
    RANDOM_FROM_CORRECT: 'randomFromCorrect',
    EVERY_CODE: 'everyCode',
    TOP_SCORE: 'topScore',
    FASTEST_TIME: 'fastestTime',
    MOST_CODES: 'mostCodes',
  };

  const typeKey = contest.type ? contest.type.toUpperCase() : '';
  const typeLabel = contest.type
    ? typeT.has(typeKey as any)
      ? typeT(typeKey as any)
      : formatLabel(contest.type)
    : t('labels.typeFallback');

  const selectionKey = contest.selection
    ? selectionKeyMap[contest.selection.toUpperCase()]
    : null;
  const selectionLabel = contest.selection
    ? selectionKey && selectionT.has(selectionKey as any)
      ? selectionT(selectionKey as any)
      : formatLabel(contest.selection)
    : t('labels.selectionFallback');
  const statusLabel = contest.status ? formatLabel(contest.status) : t('labels.statusFallback');
  const heroBackgroundUrl = galleryImageCandidates[0] || DEFAULT_COVER_IMAGE;
  const organizerSnapshot = organizer?.snapshot || null;
  const organizerDisplayName =
    pickValue(organizerSnapshot?.display_name, organizer?.name) || t('hero.organizerFallback');
  const snapshotWebsite = pickValue(organizerSnapshot?.display_website_url);
  const snapshotPhone = pickValue(organizerSnapshot?.display_phone);
  const snapshotSocialLinks = buildOrganizerSocialLinks(organizerSnapshot);
  const websiteLink = normalizeExternalUrl(snapshotWebsite);
  const phoneLink = normalizePhoneLink(snapshotPhone);
  const hasOrganizer =
    Boolean(organizerSnapshot) || Boolean(organizer?.name) || Boolean(organizer?.avatar);
  const organizerAvatar =
    organizer?.avatar ||
    organizer?.snapshot?.display_avatar_url ||
    organizer?.snapshot?.display_logo_url ||
    null;
  const avatarUrl =
    organizerAvatar || '/img/placeholder-avatar.png';
  const safeShareBaseUrl = (shareBaseUrl && shareBaseUrl.trim()) || 'https://www.mazayago.com';
  const normalizedShareBaseUrl = useMemo(() => normalizeBaseUrl(safeShareBaseUrl), [safeShareBaseUrl]);
  const shareCoverImage = useMemo(() => {
    const candidates = [heroBackgroundUrl, DEFAULT_COVER_IMAGE];
    for (const candidate of candidates) {
      const trimmed = (candidate || '').trim();
      const absolute = ensureAbsoluteUrl(trimmed, normalizedShareBaseUrl);
      if (absolute) return absolute;
    }
    return DEFAULT_COVER_IMAGE;
  }, [heroBackgroundUrl, normalizedShareBaseUrl]);
  const shareOffer = contest
    ? {
        slug,
        title: contest.title,
        prizeSummary: contest.prize_summary || null,
        endsAt: contest.ends_at || null,
        coverImage: shareCoverImage,
        baseUrl: normalizedShareBaseUrl || shareBaseUrl,
      }
    : null;

  const publicProof = contest?.public_proof ?? null;
  const publicProofJson = useMemo(
    () => (publicProof ? JSON.stringify(publicProof, null, 2) : ''),
    [publicProof],
  );
  const proofRows = useMemo(
    () => [
      {
        key: 'seed_commit',
        label: t('fairness.labels.seedCommit'),
        value: publicProof?.seed_commit ?? contest?.seed_commit ?? null,
      },
      {
        key: 'seed_reveal',
        label: t('fairness.labels.seedReveal'),
        value: publicProof?.seed_reveal ?? null,
      },
      {
        key: 'external_entropy',
        label: t('fairness.labels.externalEntropy'),
        value: publicProof?.external_entropy ?? null,
      },
      {
        key: 'selection',
        label: t('fairness.labels.selection'),
        value: publicProof?.selection ?? contest?.selection ?? null,
      },
      {
        key: 'max_winners',
        label: t('fairness.labels.maxWinners'),
        value: publicProof?.max_winners ?? contest?.max_winners ?? null,
      },
      {
        key: 'published_at',
        label: t('fairness.labels.publishedAt'),
        value: publicProof?.published_at ?? publicProof?.decided_at ?? null,
      },
    ],
    [contest?.max_winners, contest?.seed_commit, contest?.selection, publicProof, t],
  );

  const renderProofValue = (value: any, key: string) => {
    if (value == null || value === '') return t('fairness.emptyValue');
    if (key === 'selection' && typeof value === 'string') {
      const proofSelectionKey = selectionKeyMap[value.toUpperCase()];
      return proofSelectionKey && selectionT.has(proofSelectionKey as any)
        ? selectionT(proofSelectionKey as any)
        : formatLabel(value);
    }
    if (key === 'published_at') {
      const dt = new Date(value);
      return Number.isNaN(dt.getTime()) ? String(value) : dateTimeFormatter.format(dt);
    }
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  const handleCopyProof = useCallback(async () => {
    if (!publicProofJson) return;
    try {
      await navigator.clipboard.writeText(publicProofJson);
      showShareNotification(t('fairness.copied'));
    } catch {
      showShareNotification(t('fairness.copyFailed'), 'error');
    }
  }, [publicProofJson, showShareNotification, t]);

  const entriesStats = contest.entries_stats || {};
  const prizes = Array.isArray(contest.prizes) ? contest.prizes : [];
  const referees = Array.isArray(contest.referees) ? contest.referees : [];
  const isOwner = !!(currentUserId && contest.created_by_user_id === currentUserId);
  const isReferee = !!(currentUserId && referees.some((ref) => ref.user_id === currentUserId));
  const isPlatformStaff = currentUserRoles.length > 0;
  const canViewManager = isOwner || isPlatformStaff;
  const canViewStatus = isOwner || isPlatformStaff || isReferee;
  const hasCompletedAllEntries = Boolean(currentUserId && userCompletedEntries);

  const timelineBadgeClass =
    timelineState.stage === 'active'
      ? 'bg-success/90 text-white shadow-sm'
      : timelineState.stage === 'upcoming'
      ? 'bg-primary-weak text-secondary border border-border/80'
      : 'border border-border/70 bg-primary-weak text-white';

  const entrySectionId = 'enter-offer';
  const socialLabelMap = useMemo(
    () => ({
      Website: t('social.website'),
      Facebook: t('social.facebook'),
      Instagram: t('social.instagram'),
      X: t('social.twitter'),
      YouTube: t('social.youtube'),
      TikTok: t('social.tiktok'),
      WhatsApp: t('social.whatsapp'),
      Phone: t('social.phone'),
      Email: t('social.email'),
    }),
    [t],
  );

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-[#f6f8fb] via-white to-white px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="relative overflow-hidden rounded-3xl bg-[#102F4D] text-white shadow-card">
          {heroBackgroundUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroBackgroundUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-[#102F4D]/80" />
            </>
          )}
          <div className="relative z-10 flex flex-col gap-8 px-6 py-10 md:px-12 md:py-14">
            <div className="flex flex-wrap items-center gap-3 text-xs text-primary-weak">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${timelineBadgeClass}`}>
                {timelineState.chip}
              </span>
              <span className="text-primary-weak">
                {t('hero.typeLabel')}: {typeLabel}
              </span>
              <span className="text-primary-weak">
                {t('hero.methodLabel')}: {selectionLabel}
              </span>
            </div>
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-4 md:max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{contest.title}</h1>
                {contest.description && (
                  <p className="text-base text-white/90 md:text-lg">{contest.description}</p>
                )}
                <div className="grid gap-4 text-sm sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                    <div className="text-xs uppercase text-primary-weak">{t('hero.opensLabel')}</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {formatDateLabel(startedAt)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                    <div className="text-xs uppercase text-primary-weak">{t('hero.closesLabel')}</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {formatDateLabel(endsAt)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                    <div className="text-xs uppercase text-primary-weak">{t('hero.timelineLabel')}</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {timelineState.helper}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <a href={`#${entrySectionId}`} className="btn btn-primary">
                    {t('hero.enterCta')}
                  </a>
                  {canViewManager && (
                    <a
                      href={`/offers/${contest.slug}/manage`}
                      className="btn btn-secondary"
                    >
                      {t('hero.manageCta')}
                    </a>
                  )}
                  {canViewStatus && (
                    <a
                      href={`/offers/${contest.slug}/status`}
                      className="btn btn-ghost text-white hover:text-secondary"
                    >
                      {t('hero.statusCta')}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShareSheetOpen(true)}
                    disabled={!contest}
                    className="btn btn-ghost text-white hover:text-secondary"
                  >
                    {t('share.default')}
                  </button>
                </div>
                <div className="inline-flex items-center gap-3 text-sm text-primary-weak">
                  <span className={`h-2 w-2 rounded-full ${canEnter ? 'bg-success' : 'bg-border'}`} />
                  {canEnter ? t('hero.openForSubmissions') : disabledReason || t('entry.statusClosed')}
                </div>
              </div>
              <div className="flex flex-col items-start gap-4 rounded-2xl bg-white/5 px-4 py-4 ring-1 ring-white/10">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl || '/img/placeholder-avatar.png'}
                    alt="Organizer avatar"
                    className="h-14 w-14 rounded-full border border-white/40 object-cover"
                  />
                  <div>
                    <div className="text-xs uppercase text-muted/70">{t('hero.hostedBy')}</div>
                    {hasOrganizer ? (
                      <button
                        type="button"
                        onClick={() => setOrganizerModalOpen(true)}
                        aria-haspopup="dialog"
                        className="text-sm font-medium text-white underline-offset-4 hover:underline"
                      >
                        {organizerDisplayName}
                      </button>
                    ) : (
                      <div className="text-sm font-medium text-white">
                        {t('hero.organizerFallback')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted/80">
                  {t('hero.shareHint')}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-8">
            {hasParticipationSection && (
              <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text">{t('participationChannels.title')}</h2>
                    <p className="mt-1 text-sm text-muted">{t('participationChannels.subtitle')}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {messengerParticipationLink && (
                    <a
                      href={messengerParticipationLink}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-2xl border border-border bg-bg px-4 py-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm"
                    >
                      <div className="text-xs uppercase tracking-[0.2em] text-muted">{t('participationChannels.channel')}</div>
                      <div className="mt-1 text-base font-semibold text-text">{t('participationChannels.messengerTitle')}</div>
                      <p className="mt-1 text-sm text-muted">{t('participationChannels.messengerHint')}</p>
                      <div className="mt-3 inline-flex items-center text-sm font-medium text-primary group-hover:underline">
                        {t('participationChannels.openLink')}
                      </div>
                    </a>
                  )}

                  {commentsParticipationLink && (
                    <a
                      href={commentsParticipationLink}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-2xl border border-border bg-bg px-4 py-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm"
                    >
                      <div className="text-xs uppercase tracking-[0.2em] text-muted">{t('participationChannels.channel')}</div>
                      <div className="mt-1 text-base font-semibold text-text">{t('participationChannels.commentsTitle')}</div>
                      <p className="mt-1 text-sm text-muted">{t('participationChannels.commentsHint', { post: commentsPostLabel })}</p>
                      <div className="mt-3 inline-flex items-center text-sm font-medium text-primary group-hover:underline">
                        {t('participationChannels.openPost')}
                      </div>
                    </a>
                  )}
                </div>
              </section>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text">{t('gallery.title')}</h2>
                </div>
              </div>
              <OfferGallery
                media={mediaItems}
                emptyTitle={t('gallery.emptyTitle')}
                emptySubtitle={t('gallery.emptySubtitle')}
              />
            </div>

            {prizes.length > 0 && (
              <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text">{t('prizes.title')}</h2>
                <ul className="mt-5 grid gap-4 md:grid-cols-2">
                  {prizes.map((prize, index) => (
                    <li
                      key={prize.id || `${prize.name || 'prize'}-${index}`}
                      className="rounded-2xl border border-border bg-bg p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-strong"
                    >
                      <div className="text-base font-semibold text-text">
                        {prize.name || t('prizes.defaultName')}
                      </div>
                      {prize.type && (
                        <div className="mt-1 text-sm text-muted">
                          {t('prizes.type', { value: formatLabel(prize.type) })}
                        </div>
                      )}
                      {typeof prize.quantity === 'number' && (
                        <div className="text-sm text-muted">
                          {t('prizes.quantity', { value: prize.quantity.toLocaleString() })}
                        </div>
                      )}
                      {typeof prize.amount === 'number' && prize.currency && (
                        <div className="text-sm text-muted">
                          {t('prizes.value', {
                            amount: prize.amount.toLocaleString(),
                            currency: prize.currency,
                          })}
                        </div>
                      )}
                      {prize.description && (
                        <p className="mt-2 text-sm text-muted">{prize.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!hasCompletedAllEntries && (
              <section
                id={entrySectionId}
                className="rounded-3xl border border-border bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-text">{t('entry.title')}</h2>
                <p className="mt-2 text-sm text-muted">{t('entry.description')}</p>
                <div className="mt-5">
                  {canEnter ? (
                    <EnterNow
                      contestId={contest.id}
                      contestType={contest.type}
                      mcqOptions={mcqOptions}
                      tasks={tasks}
                      disabled={false}
                      onSubmitted={() => {
                        setUserEntryCount((prev) => {
                          const next = prev + 1;
                          const completed =
                            entryLimit > 0 ? next >= entryLimit : next > 0;
                          setUserCompletedEntries(completed);
                          return next;
                        });
                        setEntriesRefreshToken((prev) => prev + 1);
                      }}
                    />
                  ) : (
                    <EnterNow
                      contestId={contest.id}
                      contestType={contest.type}
                      mcqOptions={mcqOptions}
                      tasks={tasks}
                      disabled={true}
                      disabledReason={disabledReason || undefined}
                    />
                  )}
                </div>
              </section>
            )}

            <div className="mt-4 space-y-4">
              {hasCompletedAllEntries && currentUserId && (
                <p className="text-xs text-muted">
                  {t('entry.alreadySubmitted')}
                </p>
              )}
              {currentUserId ? (
                <ParticipantEntriesPanel
                  slug={contest.slug}
                  heading={t('entry.panel.heading')}
                  description={t('entry.panel.description')}
                  refreshToken={entriesRefreshToken}
                />
              ) : (
                <div className="rounded-3xl border border-border bg-white p-4 text-sm text-muted">
                  <p className="mb-3">
                    {t('entry.signInPrompt')}
                  </p>
                  <a
                    href="/sign-in"
                    className="inline-flex items-center rounded-full border border-border px-3 py-1 font-semibold text-primary-hover hover:border-primary hover:text-primary-hover"
                  >
                    {t('entry.signInCta')}
                  </a>
                </div>
              )}
            </div>

          </div>

          <aside className="space-y-6">
            <LivePredictionPanel
              slug={slug}
              contestType={contest.type}
              tasks={tasks}
              rulesJson={contest.rules_json}
            />
            <WinnersCard winners={winners} slug={slug} />
            {contest?.public_proof && (
              <details className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <summary className="cursor-pointer text-base font-semibold text-text">
                  {t('proof.title')}
                </summary>
                <p className="mt-2 text-sm text-muted">{t('proof.description')}</p>
                <div className="mt-4 space-y-3">
                  {proofEntries.length > 0 && (
                    <dl className="grid gap-3 md:grid-cols-2">
                      {proofEntries.map((entry) => (
                        <div key={entry.key} className="rounded-2xl bg-bg px-4 py-3 text-sm">
                          <dt className="text-muted">{t(`proof.fields.${entry.key}`)}</dt>
                          <dd className="mt-1 break-all font-medium text-text">{entry.value ?? '-'}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <pre className="max-h-72 overflow-auto rounded-2xl bg-bg p-4 text-xs text-muted">
                    {proofJson}
                  </pre>
                </div>
              </details>
            )}
            {rulesHtml ? (
              <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text">{t('rules.title')}</h2>
                <div
                  className="prose prose mt-4 max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: rulesHtml }}
                />
              </section>
            ) : (
              <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text">{t('rules.title')}</h2>
                <p className="mt-3 text-sm text-muted">{t('rules.fallback')}</p>
              </section>
            )}

            <JudgesPanel referees={referees} />

            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-text">{t('stats.title')}</h3>
              <p className="mt-2 text-sm text-muted">{t('stats.description')}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3">
                  <dt className="text-muted">{t('stats.labels.status')}</dt>
                  <dd className="font-medium text-text">{statusLabel}</dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3">
                  <dt className="text-muted">{t('stats.labels.selection')}</dt>
                  <dd className="font-medium text-text">{selectionLabel}</dd>
                </div>
                {typeof contest.max_winners === 'number' && (
                  <div className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3">
                    <dt className="text-muted">{t('stats.labels.maxWinners')}</dt>
                    <dd className="font-medium text-text">
                      {contest.max_winners.toLocaleString()}
                    </dd>
                  </div>
                )}
                {contest.prize_summary && (
                  <div className="rounded-2xl bg-bg px-4 py-3">
                    <dt className="text-muted">{t('stats.labels.prizeSummary')}</dt>
                    <dd className="mt-1 font-medium text-text">{contest.prize_summary}</dd>
                  </div>
                )}
                {typeof entriesStats.total === 'number' && (
                  <div className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3">
                    <dt className="text-muted">{t('stats.labels.submissions')}</dt>
                    <dd className="font-medium text-text">
                      {entriesStats.total.toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div
              className={`rounded-3xl border px-6 py-4 text-sm shadow-sm ${
                canEnter
                  ? 'border-success bg-success-weak text-[#4D8A1F]'
                  : 'border-border bg-bg text-muted'
              }`}
            >
              {canEnter
                ? t('entry.statusOpen')
                : disabledReason || t('entry.statusClosed')}
            </div>

            {debug && (
              <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-text">Debug</h3>
                <pre className="mt-3 max-h-80 overflow-auto rounded-2xl bg-bg p-4 text-xs text-muted">
                  {JSON.stringify(trace, null, 2)}
                </pre>
              </div>
            )}
          </aside>
        </div>
      </div>
      </main>
      {organizerModalOpen && hasOrganizer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close organizer"
            onClick={() => setOrganizerModalOpen(false)}
            className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-white shadow-strong"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-2xl border border-border object-cover"
                />
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-muted">{t('hero.hostedBy')}</div>
                  <div className="text-lg font-semibold text-text">{organizerDisplayName}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrganizerModalOpen(false)}
                className="rounded-full border border-border px-3 py-1 text-sm font-semibold text-muted hover:border-border hover:text-text"
              >
                {t('shareSheet.close')}
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {(snapshotWebsite || snapshotPhone) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {snapshotWebsite && websiteLink && (
                    <a
                      href={websiteLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-muted transition hover:border-primary hover:bg-white"
                    >
                      <IconBase className="bg-primary-weak">
                        <GlobeIcon className="h-4 w-4" />
                      </IconBase>
                      <div className="min-w-0">
                        <div className="text-xs text-muted">{socialLabelMap.Website}</div>
                        <div className="truncate text-sm font-semibold text-text">{snapshotWebsite}</div>
                      </div>
                    </a>
                  )}
                  {snapshotPhone && phoneLink && (
                    <a
                      href={phoneLink}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-muted transition hover:border-success hover:bg-white"
                    >
                      <IconBase className="bg-success-weak">
                        <PhoneIcon className="h-4 w-4" />
                      </IconBase>
                      <div className="min-w-0">
                        <div className="text-xs text-muted">{socialLabelMap.Phone}</div>
                        <div className="truncate text-sm font-semibold text-text">{snapshotPhone}</div>
                      </div>
                    </a>
                  )}
                </div>
              )}

              {snapshotSocialLinks.length > 0 && (
                <div className={`${snapshotWebsite || snapshotPhone ? 'mt-5' : ''}`}>
                  <div className="flex flex-wrap gap-2">
                    {snapshotSocialLinks.map((link) => {
                      const style = getSocialStyle(link.label);
                      const Icon = style.Icon;
                      return (
                        <a
                          key={`${link.label}-${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-sm ring-1 ring-inset transition ${style.chip}`}
                        >
                          <IconBase className={style.icon}>
                            <Icon className="h-4 w-4" />
                          </IconBase>
                          <span>{link.display ?? (socialLabelMap as Record<string, string>)[link.label] ?? link.label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {shareOffer && (
        <OfferShareSheet
          open={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          offer={shareOffer}
          onNotify={showShareNotification}
        />
      )}
      {shareToast && (
        <div
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow ${
            shareToast.kind === 'success' ? 'bg-success' : 'bg-danger'
          }`}
          role="status"
          aria-live="polite"
        >
          {shareToast.text}
        </div>
      )}
    </>
  );
}

function normalizeWinner(raw: any): Winner {
  if (!raw || typeof raw !== 'object') return raw;
  const fromUser = raw.user || {};
  const userDisplay =
    raw.user_display_name ||
    fromUser.display_name ||
    fromUser.full_name ||
    fromUser.name ||
    fromUser.email ||
    null;
  const avatar = raw.user_avatar_url || fromUser.avatar_url || null;
  return {
    ...raw,
    user_display_name: userDisplay,
    user_avatar_url: avatar,
  };
}
