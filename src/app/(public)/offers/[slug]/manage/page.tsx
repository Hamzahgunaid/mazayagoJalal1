
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getContest, updateContest, listContestMedia, addMedia as addMediaApi } from '@/lib/api_contests';
import Restrictions from '@/components/contests/admin/Restrictions';
import PrizesAwards from '@/components/contests/admin/PrizesAwards';
import Transparency from '@/components/contests/admin/Transparency';
import RoundsTasks from '@/components/contests/admin/RoundsTasks';
import RiddleChallenges from '@/components/contests/admin/RiddleChallenges';
import PredictionChallenges from '@/components/contests/admin/PredictionChallenges';
import PredictionMatches from '@/components/contests/admin/PredictionMatches';
import CodesManager from '@/components/contests/admin/CodesManager';
import { parseFacebookPostUrl } from '@/lib/meta/parsePostUrl';
import { connectAndGetManagedPages, ensureFacebookSdk } from '@/lib/meta/facebookSdkClient';

/* ================== Types ================== */
type Contest = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  type: '' | 'RAFFLE' | 'QR_CODE' | 'LEADERBOARD' | 'TREASURE_HUNT' | 'UGC' | 'REFERRAL' | 'PREDICTION' | 'SURVEY' | string;
  selection: string;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  max_winners?: number | null;
  per_user_limit?: number | null;
  prize_summary?: string | null;
  visibility?: 'public' | 'private' | string;
  require_receipt?: boolean;
  branding_theme?: any;
  rules_json?: any;
  seed_commit?: string | null;
  has_published_winners?: boolean;
  winners_published?: boolean;
  public_proof?: any;
  created_by_user_id?: string | null;
  primary_organizer_link_id?: string | null;
};

type MediaItem = { id?: string; url: string; kind?: string; created_at?: string };
type JudgeRow = {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string;
  created_at?: string;
};

type MessengerPage = {
  contest_id: string;
  fb_page_id: string;
  page_access_token_last4?: string | null;
  is_active?: boolean | null;
  updated_at?: string | null;
};

type CommentSourceConfig = {
  contest_id: string;
  fb_page_id: string;
  fb_post_id: string;
  is_active: boolean;
  comment_input_mode: 'MCQ' | 'TEXT' | 'MEDIA_ONLY' | 'TEXT_OR_MEDIA';
  task_id?: string | null;
  allowed_options?: string[] | null;
  allow_multiple_answers?: boolean;
  max_answers_per_user?: number;
  allow_replies?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type McqTaskOption = {
  task_id: string;
  title: string;
  options: { id: string; label: string; position?: number | null }[];
};

type FacebookManagedPage = {
  id: string;
  name: string;
  access_token: string;
};

type FacebookPostItem = {
  id: string;
  permalink_url?: string | null;
  message_preview?: string | null;
  created_time?: string | null;
};

type OrganizerInfo = {
  link_id?: string | null;
  kind?: 'USER' | 'BUSINESS' | string;
  id?: string | null;
  name?: string | null;
  avatar?: string | null;
  logo?: string | null;
  website?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  href?: string | null;
  snapshot?: {
    display_name?: string | null;
    display_avatar_url?: string | null;
    display_logo_url?: string | null;
  } | null;
};

type OrganizerOption = {
  key: string;
  kind: 'USER' | 'BUSINESS';
  id: string;
  name: string;
  avatar?: string | null;
};

type BusinessOption = {
  id: string;
  name?: string | null;
  avatar_url?: string | null;
};

type Notice = { kind: 'success' | 'error'; text: string };

type WebhookStatusData = {
  active_page?: { fb_page_id?: string | null } | null;
  comment_source?: { exists: boolean; fb_post_id?: string | null; is_active?: boolean | null; updated_at?: string | null } | null;
  last_events?: { id: string; received_at: string; object: string; page_id: string | null; event_type: string; payload: any }[];
  subscribed_apps?: any;
  subscribed_apps_error?: string | null;
};

const STATUS_OPTIONS = [
  { value: 'ACTIVE', labelKey: 'statusOptions.active' },
  { value: 'PAUSED', labelKey: 'statusOptions.paused' },
  { value: 'ENDED', labelKey: 'statusOptions.ended' },
  { value: 'DRAFT', labelKey: 'statusOptions.draft' },
];

const SELECTION_LIBRARY = [
  { value: 'RANDOM_FROM_CORRECT', labelKey: 'selectionOptions.randomFromCorrect' },
  { value: 'EVERY_CODE', labelKey: 'selectionOptions.everyCode' },
  { value: 'TOP_SCORE', labelKey: 'selectionOptions.topScore' },
  { value: 'FASTEST_TIME', labelKey: 'selectionOptions.fastestTime' },
  { value: 'MOST_CODES', labelKey: 'selectionOptions.mostCodes' },
];

const SELECTION_OPTIONS_BY_TYPE: Record<string, string[]> = {
  RIDDLE: ['RANDOM_FROM_CORRECT', 'FASTEST_TIME'],
  QR_CODE: ['EVERY_CODE', 'FASTEST_TIME', 'MOST_CODES'],
  RAFFLE: ['EVERY_CODE', 'RANDOM_FROM_CORRECT', 'MOST_CODES'],
  LEADERBOARD: ['TOP_SCORE', 'FASTEST_TIME'],
  TREASURE_HUNT: ['FASTEST_TIME', 'RANDOM_FROM_CORRECT'],
  UGC: ['RANDOM_FROM_CORRECT', 'TOP_SCORE'],
  REFERRAL: ['MOST_CODES', 'RANDOM_FROM_CORRECT'],
  PREDICTION: ['RANDOM_FROM_CORRECT', 'TOP_SCORE'],
  SURVEY: ['RANDOM_FROM_CORRECT'],
  DEFAULT: ['RANDOM_FROM_CORRECT'],
};

const getSelectionOptionsForType = (type?: string | null) => {
  const key = (type || 'DEFAULT').toUpperCase();
  const allowed = SELECTION_OPTIONS_BY_TYPE[key] || SELECTION_OPTIONS_BY_TYPE.DEFAULT;
  const items = SELECTION_LIBRARY.filter((item) => allowed.includes(item.value));
  return items.length > 0 ? items : SELECTION_LIBRARY;
};

/* ================== Helpers ================== */
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

function formatLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}


async function smartUploadToR2(file: File): Promise<{ url: string }> {
  try {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    const j = await r.json().catch(() => null);
    if (r.ok && j) {
      if (j.ok && j.url) return { url: j.url };
      if (j.signedUrl && j.publicUrl) {
        const put = await fetch(j.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (!put.ok) throw new Error('PUT failed');
        return { url: j.publicUrl };
      }
    }
  } catch (err) {
    console.error('Upload via /api/upload failed', err);
  }

  try {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload/multi', { method: 'POST', body: fd });
    const j = await r.json().catch(() => null);
    if (r.ok && j) {
      if (j.ok && j.url) return { url: j.url };
      if (j.ok && Array.isArray(j.urls) && j.urls[0]) return { url: j.urls[0] };
    }
  } catch (err) {
    console.error('Upload via /api/upload/multi failed', err);
  }

  throw new Error('Upload API not available');
}
/* ================== Page ================== */
export default function ManageOfferPage({ params }: any) {
  const { slug } = params as { slug: string };
  const searchParams = useSearchParams();
  const t = useTranslations('OfferManage');

  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizerInfo, setOrganizerInfo] = useState<OrganizerInfo | null>(null);
  const [organizerLoading, setOrganizerLoading] = useState(false);
  const [organizerSaving, setOrganizerSaving] = useState(false);
  const [organizerTouched, setOrganizerTouched] = useState(false);
  const [selectedOrganizerKey, setSelectedOrganizerKey] = useState('');
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    id: string;
    display_name?: string | null;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null>(null);
  const [businessOptions, setBusinessOptions] = useState<BusinessOption[]>([]);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [proofCopying, setProofCopying] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [maxWinners, setMaxWinners] = useState<number | ''>('');
  const [perUserLimit, setPerUserLimit] = useState<number | ''>(1);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [statusValue, setStatusValue] = useState<string>('ACTIVE');
  const [seedCommit, setSeedCommit] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [showRulesPreview, setShowRulesPreview] = useState(false);
  const [predictionMode, setPredictionMode] = useState<'SIMPLE' | 'TOURNAMENT'>('SIMPLE');
  const showBrandingSection = false;
  const showRestrictionsTab = false;
  const showTransparencyTab = true;

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'cover' | 'avatar' | 'gallery' | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [pendingMediaDelete, setPendingMediaDelete] = useState<MediaItem | null>(null);

  const [messengerConfig, setMessengerConfig] = useState<MessengerPage | null>(null);
  const [messengerLoading, setMessengerLoading] = useState(false);
  const [messengerBusy, setMessengerBusy] = useState(false);
  const [messengerPageId, setMessengerPageId] = useState('');
  const [messengerToken, setMessengerToken] = useState('');
  const [graphSubscribeError, setGraphSubscribeError] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsBusy, setCommentsBusy] = useState(false);
  const [webhookStatusBusy, setWebhookStatusBusy] = useState(false);
  const [commentsSyncBusy, setCommentsSyncBusy] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatusData | null>(null);
  const [commentSource, setCommentSource] = useState<CommentSourceConfig | null>(null);
  const [commentMcqTasks, setCommentMcqTasks] = useState<McqTaskOption[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookManagedPage[]>([]);
  const [facebookPagesLoading, setFacebookPagesLoading] = useState(false);
  const [facebookSdkError, setFacebookSdkError] = useState('');
  const [selectedFacebookPageId, setSelectedFacebookPageId] = useState('');
  const [channelMessengerEnabled, setChannelMessengerEnabled] = useState(true);
  const [channelCommentsEnabled, setChannelCommentsEnabled] = useState(false);
  const [commentPostId, setCommentPostId] = useState('');
  const [commentPostUrl, setCommentPostUrl] = useState('');
  const [facebookPostsLoading, setFacebookPostsLoading] = useState(false);
  const [facebookPosts, setFacebookPosts] = useState<FacebookPostItem[]>([]);
  const [commentInputMode, setCommentInputMode] = useState<'MCQ' | 'TEXT' | 'MEDIA_ONLY' | 'TEXT_OR_MEDIA'>('TEXT_OR_MEDIA');
  const [commentTaskId, setCommentTaskId] = useState('');
  const [commentAllowedOptionsText, setCommentAllowedOptionsText] = useState('');
  const [allowMultipleCommentAnswers, setAllowMultipleCommentAnswers] = useState(false);
  const [maxCommentAnswersPerUser, setMaxCommentAnswersPerUser] = useState<number | ''>(1);
  const [proofCopied, setProofCopied] = useState(false);
  const [manualDisconnectedAt, setManualDisconnectedAt] = useState<string | null>(null);

  const [judges, setJudges] = useState<JudgeRow[]>([]);
  const [judgesLoading, setJudgesLoading] = useState(false);
  const [newJudgeId, setNewJudgeId] = useState('');
  const [addingJudge, setAddingJudge] = useState(false);

  const isRiddle = useMemo(() => contest?.type === 'RIDDLE', [contest]);
  const isPrediction = useMemo(() => contest?.type === 'PREDICTION', [contest]);
  const isCodeBased = useMemo(() => contest?.type === 'QR_CODE' || contest?.type === 'RAFFLE', [contest?.type]);
  const isMultiStage = useMemo(() => {
    const type = contest?.type;
    return type === 'LEADERBOARD' || type === 'TREASURE_HUNT' || type === 'UGC' || type === 'REFERRAL';
  }, [contest?.type]);
  const isLocked = Boolean(contest?.has_published_winners ?? contest?.winners_published);
  const judgeIdValue = newJudgeId.trim();
  const isJudgeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(judgeIdValue);
  const isDuplicateJudge = judges.some((j) => j.user_id === judgeIdValue);
  const selectionRequiresSeed = useMemo(() => {
    const mode = String(contest?.selection || '').toUpperCase();
    return mode !== 'EVERY_CODE';
  }, [contest?.selection]);
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

  const [activeTab, setActiveTab] = useState<string>('basics');

  const messengerActive = !!messengerConfig?.is_active;
  const commentModeUsesTaskMapping = commentInputMode === 'MCQ' && commentMcqTasks.length > 0;
  const commentAllowedOptions = useMemo(
    () => commentAllowedOptionsText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    [commentAllowedOptionsText],
  );
  const commentPerUserLimit = allowMultipleCommentAnswers
    ? Number(maxCommentAnswersPerUser || 1)
    : 1;
  const currentLinkedPageId = (messengerConfig?.fb_page_id || commentSource?.fb_page_id || '').trim();
  const effectivePageId = (messengerPageId || currentLinkedPageId).trim();
  const currentLinkedPostId = (commentSource?.fb_post_id || '').trim();
  const currentCommentsMode = (commentSource?.comment_input_mode || '').trim();
  const selectedFacebookPage = facebookPages.find((page) => page.id === selectedFacebookPageId) || null;
  const currentLinkedPageName =
    facebookPages.find((page) => page.id === currentLinkedPageId)?.name ||
    selectedFacebookPage?.name ||
    t('messenger.readonly.notAvailable');
  const currentLinkedPostLabel =
    facebookPosts.find((post) => post.id === currentLinkedPostId)?.message_preview ||
    facebookPosts.find((post) => post.id === currentLinkedPostId)?.permalink_url ||
    t('messenger.readonly.notAvailable');
  const currentCommentsUpdatedAt = commentSource?.updated_at
    ? new Date(commentSource.updated_at).toLocaleString()
    : t('messenger.details.never');
  const currentCommentsCreatedAt = commentSource?.created_at
    ? new Date(commentSource.created_at).toLocaleString()
    : t('messenger.details.never');
  const disconnectAtLabel = manualDisconnectedAt
    ? new Date(manualDisconnectedAt).toLocaleString()
    : endsAt
    ? new Date(endsAt).toLocaleString()
    : null;
  const messengerShareLink = useMemo(() => {
    const pageId = (messengerPageId || messengerConfig?.fb_page_id || '').trim();
    if (!pageId || !contest?.slug) return '';
    return `https://m.me/${pageId}?ref=${contest.slug}`;
  }, [contest?.slug, messengerConfig?.fb_page_id, messengerPageId]);

  const hasPublishedWinners = Boolean(contest?.has_published_winners);
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
      return formatLabel(value);
    }
    if (key === 'published_at') {
      const dt = new Date(value);
      return Number.isNaN(dt.getTime()) ? String(value) : dt.toLocaleString();
    }
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  const organizerOptions = useMemo<OrganizerOption[]>(() => {
    const options: OrganizerOption[] = [];
    if (currentUserInfo?.id) {
      const name =
        currentUserInfo.display_name ||
        currentUserInfo.full_name ||
        currentUserInfo.email ||
        t('organizer.userFallback');
      options.push({
        key: `USER:${currentUserInfo.id}`,
        kind: 'USER',
        id: currentUserInfo.id,
        name,
        avatar: currentUserInfo.avatar_url || null,
      });
    }
    businessOptions.forEach((business) => {
      options.push({
        key: `BUSINESS:${business.id}`,
        kind: 'BUSINESS',
        id: business.id,
        name: business.name || t('organizer.businessFallback'),
        avatar: business.avatar_url || null,
      });
    });
    return options;
  }, [businessOptions, currentUserInfo, t]);

  const pushNotice = (kind: Notice['kind'], text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const handleCopyProof = async () => {
    if (!proofJson) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(proofJson);
        setProofCopied(true);
        window.setTimeout(() => setProofCopied(false), 2500);
      } catch {
        setProofCopied(false);
      }
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getContest(slug);
        const c: Contest = data?.contest ?? data;
        if (!c?.id) throw new Error(t('state.notFound'));
        setContest(c);

        setTitle(c.title || '');
        setDescription(c.description || '');
        if (c.starts_at) setStartsAt(new Date(c.starts_at).toISOString().slice(0, 16));
        if (c.ends_at) setEndsAt(new Date(c.ends_at).toISOString().slice(0, 16));
        setMaxWinners(typeof c.max_winners === 'number' ? c.max_winners : '');
        setPerUserLimit(typeof c.per_user_limit === 'number' ? c.per_user_limit : 1);
        setVisibility((c.visibility as any) || 'public');
        setStatusValue((c.status || 'ACTIVE').toUpperCase());
        setSeedCommit(c.seed_commit || '');

        const rj = c.rules_json || {};
        setRulesText(rj.rules_markdown || '');
      } catch (err: any) {
        setContest(null);
        pushNotice('error', err?.message || t('messages.loadContest'));
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, t]);

  useEffect(() => {
    if (!contest?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const uid: string | null = data?.user?.id ?? null;
        if (!cancelled) {
          setCurrentUserId(uid);
          const allowed = !!uid && !!contest.created_by_user_id && uid === contest.created_by_user_id;
          setIsOwner(allowed);
          setCurrentUserInfo(
            uid
              ? {
                  id: uid,
                  display_name: data?.user?.display_name ?? null,
                  full_name: data?.user?.full_name ?? null,
                  email: data?.user?.email ?? null,
                  avatar_url: data?.user?.avatar_url ?? null,
                }
              : null
          );
        }
      } catch {
        if (!cancelled) {
          setIsOwner(false);
          setCurrentUserInfo(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contest?.id, contest?.created_by_user_id]);

  useEffect(() => {
    if (!currentUserId) {
      setBusinessOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/businesses', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const data = await res.json().catch(() => ({}));
        const items: BusinessOption[] = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) {
          setBusinessOptions(items);
        }
      } catch {
        if (!cancelled) setBusinessOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!contest?.id) return;
    loadOrganizerInfo();
  }, [contest?.id]);

  useEffect(() => {
    if (organizerTouched) return;
    if (organizerInfo?.kind && organizerInfo?.id) {
      setSelectedOrganizerKey(`${organizerInfo.kind}:${organizerInfo.id}`);
      return;
    }
    if (!selectedOrganizerKey && currentUserInfo?.id) {
      setSelectedOrganizerKey(`USER:${currentUserInfo.id}`);
    }
  }, [organizerInfo?.kind, organizerInfo?.id, currentUserInfo?.id, organizerTouched, selectedOrganizerKey]);

  useEffect(() => {
    if (selectedOrganizerKey || organizerOptions.length === 0) return;
    setSelectedOrganizerKey(organizerOptions[0].key);
  }, [organizerOptions, selectedOrganizerKey]);

  useEffect(() => {
    if (!contest?.id) return;
    (async () => {
      const r = await listContestMedia(contest.id).catch(() => ({ items: [] }));
      setMediaItems(Array.isArray(r?.items) ? r.items : []);
    })();
  }, [contest?.id]);

  useEffect(() => {
    if (!contest || !isPrediction) return;
    const raw = String(contest.rules_json?.prediction_mode || '').toUpperCase();
    setPredictionMode(raw === 'TOURNAMENT' ? 'TOURNAMENT' : 'SIMPLE');
  }, [contest, isPrediction]);

  useEffect(() => {
    if (!contest?.id) return;
    setMessengerToken('');
    loadMessengerConfig();
  }, [contest?.id]);

  useEffect(() => {
    if (!contest?.id) return;
    loadCommentSource();
    loadFacebookPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contest?.id, messengerConfig?.fb_page_id, messengerPageId]);


  useEffect(() => {
    const raw = commentPostUrl.trim();
    if (!raw) return;
    const parsed = parseFacebookPostUrl(raw, effectivePageId || null);
    if (parsed.fb_post_id) {
      setCommentPostId(parsed.fb_post_id);
    }
  }, [commentPostUrl, effectivePageId]);

  useEffect(() => {
    ensureFacebookSdk().catch(() => null);
  }, []);

  async function loadOrganizerInfo() {
    if (!contest?.id) return;
    setOrganizerLoading(true);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/organizer`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 401 || res.status === 403
            ? t('organizer.messages.notAuthorized')
            : data?.error || data?.message || t('organizer.messages.loadFailed');
        throw new Error(message);
      }
      const organizer = data?.organizer || null;
      setOrganizerInfo(organizer);
      if (!organizerTouched && organizer?.kind && organizer?.id) {
        setSelectedOrganizerKey(`${organizer.kind}:${organizer.id}`);
      }
    } catch (err: any) {
      setOrganizerInfo(null);
      if (err?.message) {
        pushNotice('error', err.message);
      }
    } finally {
      setOrganizerLoading(false);
    }
  }

  async function saveOrganizerInfo() {
    if (!contest?.id || !isOwner) return;
    const selected = organizerOptions.find((option) => option.key === selectedOrganizerKey);
    if (!selected) {
      pushNotice('error', t('organizer.messages.selectRequired'));
      return;
    }
    setOrganizerSaving(true);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/organizer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          organizer_kind: selected.kind,
          organizer_id: selected.id,
          role: 'HOST',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 401 || res.status === 403
            ? t('organizer.messages.notAuthorized')
            : data?.error || data?.message || t('organizer.messages.saveFailed');
        throw new Error(message);
      }
      pushNotice('success', t('organizer.messages.saved'));
      await loadOrganizerInfo();
    } catch (err: any) {
      pushNotice('error', err?.message || t('organizer.messages.saveFailed'));
    } finally {
      setOrganizerSaving(false);
    }
  }

  const tabs = useMemo(() => {
    const items: { key: string; label: string }[] = [{ key: 'basics', label: t('tabs.basics') }];
    if (isCodeBased) items.push({ key: 'codes', label: t('tabs.codes') });
    if (isRiddle) items.push({ key: 'riddle-challenges', label: t('tabs.riddle') });
    if (isPrediction && predictionMode === 'SIMPLE') items.push({ key: 'prediction-challenges', label: t('tabs.predictionSingle') });
    if (isPrediction && predictionMode === 'TOURNAMENT') items.push({ key: 'prediction-matches', label: t('tabs.predictionMatches') });
    if (isMultiStage) items.push({ key: 'rounds', label: t('tabs.rounds') });
    items.push({ key: 'prizes', label: t('tabs.prizes') });
    items.push({ key: 'rules', label: t('tabs.rules') });
    items.push({ key: 'media', label: t('tabs.media') });
    items.push({ key: 'messenger', label: t('tabs.messenger') });
    items.push({ key: 'judges', label: t('tabs.judges') });
    if (showRestrictionsTab) items.push({ key: 'restrictions', label: t('tabs.restrictions') });
    if (showTransparencyTab) items.push({ key: 'transparency', label: t('tabs.transparency') });
    return items;
  }, [isRiddle, isCodeBased, isMultiStage, isPrediction, predictionMode, showRestrictionsTab, showTransparencyTab, t]);

  const requestedTab = (searchParams.get('tab') || '').toLowerCase();

  useEffect(() => {
    if (!requestedTab) return;
    const targetTab = tabs.find((tab) => tab.key === requestedTab);
    if (!targetTab || activeTab === requestedTab) return;
    setActiveTab(requestedTab);
  }, [requestedTab, tabs, activeTab]);

  async function loadMessengerConfig() {
    if (!contest?.id) return;
    setMessengerLoading(true);
    setMessengerConfig(null);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/messenger-page`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 401 || res.status === 403
            ? t('messenger.messages.notAuthorized')
            : data?.error || data?.message || t('messenger.messages.loadFailed');
        throw new Error(message);
      }
      setMessengerConfig(data?.data ?? null);
      setMessengerPageId(data?.data?.fb_page_id || '');
    } catch (err: any) {
      setMessengerConfig(null);
      setMessengerPageId('');
      pushNotice('error', err?.message || t('messenger.messages.loadFailed'));
    } finally {
      setMessengerLoading(false);
    }
  }

  async function loadCommentSource() {
    if (!contest?.id) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/facebook-comment-source`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 401 || res.status === 403
            ? t('messenger.messages.notAuthorized')
            : data?.error || data?.detail || t('messenger.comments.messages.loadFailed');
        throw new Error(message);
      }

      const config = (data?.data ?? null) as CommentSourceConfig | null;
      setCommentSource(config);
      setCommentMcqTasks(Array.isArray(data?.mcq_tasks) ? data.mcq_tasks : []);
      setChannelMessengerEnabled(messengerConfig?.is_active !== false);
      setChannelCommentsEnabled(Boolean(config?.is_active));
      setCommentPostId(config?.fb_post_id || '');
      setCommentPostUrl('');
      setCommentInputMode((config?.comment_input_mode || 'TEXT_OR_MEDIA') as any);
      setCommentTaskId(config?.task_id || '');
      const allowed = Array.isArray(config?.allowed_options) ? config?.allowed_options : [];
      setCommentAllowedOptionsText(allowed.join('\n'));
      const allowMany = Boolean(config?.allow_multiple_answers);
      setAllowMultipleCommentAnswers(allowMany);
      setMaxCommentAnswersPerUser(allowMany ? Number(config?.max_answers_per_user || 1) : 1);
    } catch (err: any) {
      pushNotice('error', err?.message || t('messenger.comments.messages.loadFailed'));
    } finally {
      setCommentsLoading(false);
    }
  }

  async function loadFacebookPages() {
    setFacebookPagesLoading(true);
    setFacebookSdkError('');
    try {
      const pages = await connectAndGetManagedPages();
      setFacebookPages(pages);
      if (pages.length > 0) {
        const first = pages[0];
        setSelectedFacebookPageId(first.id);
        setMessengerPageId(first.id);
        setMessengerToken(first.access_token);
      }
      if (pages.length === 0) {
        setFacebookSdkError(t('messenger.pagePicker.messages.emptyPages'));
      }
    } catch (error: any) {
      setFacebookSdkError(String(error?.message || t('messenger.pagePicker.messages.loadFailed')));
    } finally {
      setFacebookPagesLoading(false);
    }
  }

  async function saveMessengerConfig() {
    if (!contest?.id || !isOwner) return;
    const pageId = messengerPageId.trim();
    const token = messengerToken.trim();
    if (!pageId || !token) {
      pushNotice('error', t('messenger.messages.required'));
      return;
    }
    setMessengerBusy(true);
    setGraphSubscribeError('');
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/messenger-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fb_page_id: pageId, page_access_token: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 401 || res.status === 403
            ? t('messenger.messages.notAuthorized')
            : data?.detail || data?.error || data?.message || t('messenger.messages.saveFailed');
        if (data?.detail) {
          setGraphSubscribeError(String(data.detail));
        }
        throw new Error(message);
      }
      setMessengerToken('');
      setManualDisconnectedAt(null);
      pushNotice('success', t('messenger.messages.saved'));
      await loadMessengerConfig();
    } catch (err: any) {
      pushNotice('error', err?.message || t('messenger.messages.saveFailed'));
    } finally {
      setMessengerBusy(false);
    }
  }


  async function loadFacebookPosts() {
    if (!contest?.id) return;
    const pageId = effectivePageId;
    if (!pageId) {
      setFacebookPosts([]);
      return;
    }
    setFacebookPostsLoading(true);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/facebook-posts?limit=25`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load Facebook posts');
      setFacebookPosts(Array.isArray(data?.posts) ? data.posts : []);
    } catch (err: any) {
      setFacebookPosts([]);
      pushNotice('error', err?.message || 'Failed to load Facebook posts');
    } finally {
      setFacebookPostsLoading(false);
    }
  }

  async function saveCommentSourceConfig() {
    if (!contest?.id || !isOwner) return;
    if (channelMessengerEnabled && !messengerActive) {
      pushNotice('error', t('messenger.comments.messages.messengerRequired'));
      return;
    }

    if (!messengerPageId.trim() && !messengerConfig?.fb_page_id) {
      pushNotice('error', t('messenger.comments.messages.pageRequired'));
      return;
    }
    const hasExistingPostId = Boolean(commentPostId.trim());
    const hasPostUrl = Boolean(commentPostUrl.trim());
    if (channelCommentsEnabled && !hasExistingPostId && !hasPostUrl) {
      pushNotice('error', t('messenger.comments.messages.postRequired'));
      return;
    }
    if (channelCommentsEnabled && commentInputMode === 'MCQ' && !commentTaskId && commentAllowedOptions.length === 0) {
      pushNotice('error', t('messenger.comments.messages.optionRequired'));
      return;
    }

    setCommentsBusy(true);
    try {
      if (!channelMessengerEnabled && messengerActive) {
        const disableRes = await fetch(`/api/owner/contests/${contest.id}/messenger-page`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const disableData = await disableRes.json().catch(() => ({}));
        if (!disableRes.ok) {
          throw new Error(disableData?.error || t('messenger.messages.disconnectFailed'));
        }
        await loadMessengerConfig();
      }

      const pageId = (messengerPageId || messengerConfig?.fb_page_id || '').trim();
      const payload = {
        fb_page_id: pageId,
        fb_post_id: commentPostUrl.trim() ? null : commentPostId.trim(),
        post_url: commentPostUrl.trim() || null,
        is_active: channelCommentsEnabled,
        comment_input_mode: commentInputMode,
        task_id: commentInputMode === 'MCQ' && commentTaskId ? commentTaskId : null,
        allowed_options: commentInputMode === 'MCQ' && !commentTaskId ? commentAllowedOptions : [],
        allow_multiple_answers: allowMultipleCommentAnswers,
        max_answers_per_user: allowMultipleCommentAnswers ? Number(maxCommentAnswersPerUser || 1) : 1,
      };

      const res = await fetch(`/api/owner/contests/${contest.id}/facebook-comment-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 401 || res.status === 403
            ? t('messenger.messages.notAuthorized')
            : data?.error || data?.detail || t('messenger.comments.messages.saveFailed');
        throw new Error(message);
      }
      setCommentSource(data?.data ?? null);
      pushNotice('success', t('messenger.comments.messages.saved'));
      await loadCommentSource();
    } catch (err: any) {
      pushNotice('error', err?.message || t('messenger.comments.messages.saveFailed'));
    } finally {
      setCommentsBusy(false);
    }
  }



  async function pullFacebookCommentsNow() {
    if (!contest?.id || !isOwner) return;
    setCommentsSyncBusy(true);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/facebook-comments-sync`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to sync comments');
      }
      pushNotice('success', `Comments synced: ${Number(data?.inserted || 0)}`);
      await checkWebhookStatus();
    } catch (err: any) {
      pushNotice('error', err?.message || 'Failed to sync comments');
    } finally {
      setCommentsSyncBusy(false);
    }
  }

  async function checkWebhookStatus() {
    if (!contest?.id || !isOwner) return;
    setWebhookStatusBusy(true);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/meta-webhook-status`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to load webhook status');
      }
      setWebhookStatus(data);
      pushNotice('success', 'Webhook status loaded');
    } catch (err: any) {
      setWebhookStatus(null);
      pushNotice('error', err?.message || 'Failed to load webhook status');
    } finally {
      setWebhookStatusBusy(false);
    }
  }

  async function disconnectMessengerConfig() {
    if (!contest?.id || !isOwner) return;
    setMessengerBusy(true);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/messenger-page`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 401 || res.status === 403
            ? t('messenger.messages.notAuthorized')
            : data?.error || data?.message || t('messenger.messages.disconnectFailed');
        throw new Error(message);
      }
      setMessengerToken('');
      setManualDisconnectedAt(new Date().toISOString());
      pushNotice('success', t('messenger.messages.disconnected'));
      await loadMessengerConfig();
    } catch (err: any) {
      pushNotice('error', err?.message || t('messenger.messages.disconnectFailed'));
    } finally {
      setMessengerBusy(false);
    }
  }

  async function copyMessengerLink() {
    if (!messengerShareLink) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(messengerShareLink);
        pushNotice('success', t('messenger.messages.linkCopied'));
        return;
      }
      throw new Error('copy_unavailable');
    } catch {
      pushNotice('error', t('messenger.messages.copyFailed'));
    }
  }

  async function loadJudges() {
    if (!contest?.id) return;
    setJudgesLoading(true);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/referees`, { credentials: 'include' });
      if (!res.ok) throw new Error(t('messages.loadJudges'));
      const json = await res.json();
      setJudges(Array.isArray(json?.items) ? json.items : []);
    } catch (err: any) {
      pushNotice('error', err?.message || t('messages.loadJudges'));
      setJudges([]);
    } finally {
      setJudgesLoading(false);
    }
  }

  function openUpload(target: 'cover' | 'avatar' | 'gallery') {
    if (!isOwner) return;
    setUploadTarget(target);
    setSelectedFiles([]);
    setShowModal(true);
  }

  async function doUpload() {
    if (!contest || !uploadTarget || !isOwner || selectedFiles.length === 0) return;
    setUploadBusy(true);
    try {
      if (uploadTarget === 'cover' || uploadTarget === 'avatar') {
        const { url } = await smartUploadToR2(selectedFiles[0]);
        if (uploadTarget === 'cover') {
          const rj = { ...(contest.rules_json || {}), cover_url: url };
          const updated = await updateContest(contest.id, { rules_json: rj });
          setContest(updated?.contest || { ...contest, rules_json: rj });
          pushNotice('success', t('messages.coverUpdated'));
        } else {
          const rj = { ...(contest.rules_json || {}), avatar_url: url };
          const updated = await updateContest(contest.id, { rules_json: rj });
          setContest(updated?.contest || { ...contest, rules_json: rj });
          pushNotice('success', t('messages.avatarUpdated'));
        }
      } else {
        const uploadedItems: { url: string; kind: string }[] = [];
        for (const file of selectedFiles) {
          const { url } = await smartUploadToR2(file);
          uploadedItems.push({ url, kind: 'image' });
        }
        await addMediaApi(contest.id, uploadedItems);
        const r = await listContestMedia(contest.id).catch(() => ({ items: [] }));
        setMediaItems(Array.isArray(r?.items) ? r.items : []);
        pushNotice('success', t('messages.imagesUploaded', { count: uploadedItems.length }));
      }
    } catch (err: any) {
      const uploadMessage =
        err?.message === 'Upload API not available'
          ? t('messages.uploadUnavailable')
          : err?.message || t('messages.uploadFailed');
      pushNotice('error', uploadMessage);
    } finally {
      setUploadBusy(false);
      setSelectedFiles([]);
      setShowModal(false);
      setUploadTarget(null);
    }
  }


  async function saveBasics() {
    if (!contest?.id || !isOwner) return;
    const nextRules = { ...(contest.rules_json || {}) };
    if (isPrediction) {
      nextRules.prediction_mode = predictionMode;
    }
      const payload: any = {
        title,
        description,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        max_winners: maxWinners === '' ? null : Number(maxWinners),
        per_user_limit: perUserLimit === '' ? null : Number(perUserLimit),
        visibility,
        status: statusValue,
        selection: contest.selection,
        rules_json: nextRules,
        seed_commit: seedCommit.trim() || null,
      };
      const r = await updateContest(contest.id, payload);
    if (r?.error) {
      pushNotice('error', r.error);
      return;
    }
      const updatedContest = r.contest || { ...contest, ...payload };
      setContest(updatedContest);
      setStatusValue((updatedContest.status || statusValue).toUpperCase());
      setSeedCommit(updatedContest.seed_commit || seedCommit);
      pushNotice('success', t('messages.basicsSaved'));
    }

  async function addJudge() {
    if (!contest?.id || !isOwner) return;
    if (!judgeIdValue) {
      pushNotice('error', t('messages.enterJudgeId'));
      return;
    }
    if (!isJudgeUuid) {
      pushNotice('error', t('messages.invalidJudgeId'));
      return;
    }
    if (isDuplicateJudge) {
      pushNotice('error', t('messages.judgeAlreadyAdded'));
      return;
    }
    setAddingJudge(true);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/referees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: judgeIdValue, role: 'JUDGE' }),
      });
      if (!res.ok) throw new Error(t('messages.addJudgeFailed'));
      setNewJudgeId('');
      await loadJudges();
      pushNotice('success', t('messages.addJudgeSuccess'));
    } catch (err: any) {
      pushNotice('error', err?.message || t('messages.addJudgeFailed'));
    } finally {
      setAddingJudge(false);
    }
  }

  async function removeJudge(uid: string) {
    if (!contest?.id || !isOwner) return;
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/referees/${uid}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('messages.removeJudgeFailed'));
      await loadJudges();
      pushNotice('success', t('messages.removeJudgeSuccess'));
    } catch (err: any) {
      pushNotice('error', err?.message || t('messages.removeJudgeFailed'));
    }
  }

  async function removeMedia(mediaId: string) {
    if (!contest?.id || !isOwner) return;
    setDeletingMediaId(mediaId);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ media_id: mediaId }),
      });
      if (!res.ok) throw new Error(t('messages.removeMediaFailed'));
      setMediaItems((prev) => prev.filter((item) => item.id !== mediaId));
      pushNotice('success', t('messages.removeMediaSuccess'));
    } catch (err: any) {
      pushNotice('error', err?.message || t('messages.removeMediaFailed'));
    } finally {
      setDeletingMediaId(null);
    }
  }

  async function saveRules() {
    if (!contest?.id || !isOwner) return;
    const rj = { ...(contest.rules_json || {}), rules_markdown: rulesText || null };
    const resp = await updateContest(contest.id, { rules_json: rj });
    if (resp?.error) {
      pushNotice('error', resp.error);
      return;
    }
    setContest(resp.contest || { ...contest, rules_json: rj });
    pushNotice('success', t('messages.rulesUpdated'));
  }

  const coverUrl = contest?.rules_json?.cover_url || '';
  const avatarUrl = contest?.rules_json?.avatar_url || contest?.rules_json?.icon_url || '/img/placeholder-avatar.png';

  if (loading) return <main className="p-6">{t('state.loading')}</main>;
  if (!contest) return <main className="p-6">{t('state.notFound')}</main>;
  if (isOwner === null) return <main className="p-6">{t('state.checking')}</main>;
  if (!isOwner) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">{t('state.restricted')}</h1>
        <p className="text-muted">{t('state.restrictedMessage')}</p>
      </main>
    );
  }

  return (
      <main className="space-y-8">
        <header className="space-y-4">
          {showBrandingSection && (
            <div
              className="relative h-40 md:h-56 w-full rounded-2xl overflow-hidden border bg-primary-weak cursor-pointer"
              onClick={() => openUpload('cover')}
            >
              {coverUrl ? (
                <img src={coverUrl} alt={t('hero.coverAlt')} className="h-full w-full object-cover" />
              ) : (
                <div className="grid place-items-center h-full text-muted text-sm">{t('hero.clickToAddCover')}</div>
              )}
              <div className="absolute right-3 top-3 bg-black/60 text-white text-xs px-2 py-1 rounded">{t('modal.changeCover')}</div>
            </div>
          )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => openUpload('avatar')}
              className="h-16 w-16 rounded-full overflow-hidden border bg-white"
              aria-label={t('modal.changeAvatar')}
            >
              <img src={avatarUrl} alt={t('hero.avatarAlt')} className="h-full w-full object-cover" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{contest.title}</h1>
              <p className="text-muted">{t('hero.description')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rv-btn" onClick={() => setActiveTab('basics')}>{t('hero.goToBasics')}</button>
            <a className="rv-btn" href={`/offers/${contest.slug}`}>{t('hero.viewPublic')}</a>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full border transition ${
                activeTab === tab.key
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-border text-muted hover:border-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {notice && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            notice.kind === 'error'
              ? 'border-danger bg-[rgba(214,76,76,0.08)] text-danger'
              : 'border-success bg-success-weak text-[#4D8A1F]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {activeTab === 'basics' && (
        <section id="basics" className="rv-section space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('basics.heading')}</h2>
              <p className="text-sm text-muted">{t('basics.description')}</p>
            </div>
            <span className="text-xs uppercase tracking-[0.3em] text-muted">{t('basics.tag')}</span>
          </div>
          {isLocked && (
            <div className="rounded-2xl border border-accent bg-accent-weak px-4 py-3 text-sm text-accent-hover">
              {t('basics.lockedNotice')}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <div className="text-sm text-muted mb-1">{t('basics.labels.title')}</div>
                <input
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <input type="hidden" value={contest.slug} readOnly />

              <label className="block">
                <div className="text-sm text-muted mb-1">{t('basics.labels.description')}</div>
                <textarea
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  rows={4}
                  placeholder={t('basics.placeholders.description')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="text-sm text-muted mb-1">{t('basics.labels.startsAt')}</div>
                  <input
                    type="datetime-local"
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </label>
                <label className="block">
                  <div className="text-sm text-muted mb-1">{t('basics.labels.endsAt')}</div>
                  <input
                    type="datetime-local"
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="text-sm text-muted mb-1">{t('basics.labels.maxWinners')}</div>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={maxWinners}
                    onChange={(e) => setMaxWinners(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={!isOwner || isLocked}
                  />
                </label>
                <label className="block">
                  <div className="text-sm text-muted mb-1">{t('basics.labels.perUserLimit')}</div>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={perUserLimit}
                    onChange={(e) => setPerUserLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm text-muted mb-1">{t('basics.labels.visibility')}</div>
                <select
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                >
                  <option value="public">{t('basics.visibility.public')}</option>
                  <option value="private">{t('basics.visibility.private')}</option>
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <div className="text-sm text-muted mb-1">{t('basics.labels.status')}</div>
                  <select
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value.toUpperCase())}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted">{t('basics.helpers.status')}</p>
                </label>

                <label className="block">
                  <div className="text-sm text-muted mb-1">{t('basics.labels.winnerSelection')}</div>
                  <select
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={contest?.selection || 'RANDOM_FROM_CORRECT'}
                    onChange={(e) => {
                      if (!contest?.id || !isOwner || isLocked) return;
                      setContest((prev) => (prev ? { ...prev, selection: e.target.value.toUpperCase() } : prev));
                    }}
                    disabled={!isOwner || isLocked}
                  >
                    {(contest ? getSelectionOptionsForType(contest.type) : SELECTION_LIBRARY).map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted">{t('basics.helpers.selection')}</p>
                </label>
                <label className="block">
                  <div className="text-sm text-muted mb-1">{t('basics.labels.seedCommit')}</div>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                    value={seedCommit}
                    onChange={(e) => setSeedCommit(e.target.value)}
                    placeholder="sha256(...)"
                    disabled={!isOwner || isLocked}
                  />
                  <p className="mt-1 text-xs text-muted">{t('basics.helpers.seedCommit')}</p>
                </label>
                {isPrediction && (
                  <label className="block">
                    <div className="text-sm text-muted mb-1">{t('basics.labels.predictionFormat')}</div>
                    <select
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                      value={predictionMode}
                      onChange={(e) =>
                        setPredictionMode(e.target.value === 'TOURNAMENT' ? 'TOURNAMENT' : 'SIMPLE')
                      }
                    >
                      <option value="SIMPLE">{t('basics.predictionOptions.simple')}</option>
                      <option value="TOURNAMENT">{t('basics.predictionOptions.tournament')}</option>
                    </select>
                    <p className="mt-1 text-xs text-muted">
                      {t('basics.helpers.prediction')}
                    </p>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-text">{t('proof.heading')}</h3>
                <p className="text-sm text-muted">{t('proof.description')}</p>
              </div>
              <button
                type="button"
                className="rv-btn text-xs"
                onClick={handleCopyProof}
                disabled={!proofJson}
              >
                {proofCopied ? t('proof.actions.copied') : t('proof.actions.copy')}
              </button>
            </div>
            {contest?.public_proof ? (
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
                <pre className="max-h-80 overflow-auto rounded-2xl bg-bg p-4 text-xs text-muted">
                  {proofJson}
                </pre>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">{t('proof.empty')}</p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-text">{t('organizer.heading')}</h3>
                <p className="text-sm text-muted">{t('organizer.description')}</p>
              </div>
            </div>

            {organizerLoading ? (
              <div className="mt-3 text-sm text-muted">{t('organizer.status.loading')}</div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {organizerOptions.map((option) => {
                    const selected = option.key === selectedOrganizerKey;
                    return (
                      <label
                        key={option.key}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                          selected ? 'border-primary bg-primary-weak/50' : 'border-border bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="organizer-choice"
                          className="h-4 w-4 text-primary-hover"
                          checked={selected}
                          value={option.key}
                          onChange={(e) => {
                            setSelectedOrganizerKey(e.target.value);
                            setOrganizerTouched(true);
                          }}
                          disabled={!isOwner || organizerSaving}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-text">{option.name}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {organizerOptions.length === 0 && (
                  <div className="mt-3 text-sm text-muted">{t('organizer.status.none')}</div>
                )}
                <p className="mt-2 text-xs text-muted">{t('organizer.helpers.choose')}</p>
              </>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={saveOrganizerInfo}
                className="rv-btn"
                disabled={!isOwner || organizerSaving || organizerOptions.length === 0}
              >
                {organizerSaving ? t('organizer.actions.saving') : t('organizer.actions.save')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={saveBasics} className="rv-btn-primary px-5 py-2.5 shadow shadow-[0_10px_30px_rgba(26,35,50,0.06)] disabled:opacity-60">
              {t('basics.actions.save')}
            </button>
          </div>
        </section>
      )}

      {activeTab === 'media' && (
        <section className="rv-section space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{t('media.heading')}</h2>
              <p className="text-xs text-muted mt-1">{formatCount(mediaItems.length)} {t('media.kindFallback')}</p>
            </div>
            <button onClick={() => openUpload('gallery')} className="rv-btn-primary px-4 py-2">{t('media.addPhoto')}</button>
          </div>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2">
            <button onClick={() => openUpload('gallery')} className="min-w-[160px] grid place-items-center rounded-xl border border-dashed bg-white/40 text-muted">
              {t('media.addTile')}
            </button>
            {mediaItems.map((it) => {
              const kindLabel = it.kind || t('media.kindFallback');
              const metaLabel = it.created_at
                ? t('media.itemMeta', { kind: kindLabel, timestamp: new Date(it.created_at).toLocaleString() })
                : kindLabel;
              return (
                <article key={it.id || it.url} className="min-w-[240px] snap-start rounded-xl overflow-hidden border bg-white/50 text-left">
                  <img src={it.url} alt={t('media.imageAlt')} loading="lazy" decoding="async" className="h-40 w-full object-cover" />
                  <div className="p-2 text-xs text-muted space-y-2">
                    <div>{metaLabel}</div>
                    {it.id && (
                      <button
                        className="rv-link text-red-600 disabled:opacity-50"
                        onClick={() => setPendingMediaDelete(it)}
                        disabled={deletingMediaId === it.id}
                        aria-label={t('media.actions.remove')}
                      >
                        {deletingMediaId === it.id ? t('media.actions.removing') : t('media.actions.remove')}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {mediaItems.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-white/60 p-4 text-sm text-muted">
              {t('media.empty')}
            </div>
          )}
        </section>
      )}

      {activeTab === 'messenger' && (
        <section className="rv-section space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('messenger.heading')}</h2>
              <p className="text-sm text-muted">{t('messenger.description')}</p>
            </div>
            <span
              className={`text-xs uppercase tracking-[0.3em] ${
                messengerActive ? 'text-[#4D8A1F]' : 'text-muted'
              }`}
            >
              {messengerActive ? t('messenger.status.connected') : t('messenger.status.notConnected')}
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-white/70 p-4 md:p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text">{t('messenger.pageConnection.heading')}</h3>
              <p className="text-sm text-muted">{t('messenger.pageConnection.description')}</p>
            </div>

            {messengerLoading ? (
              <div className="text-sm text-muted">{t('messenger.loading')}</div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-white/70 p-4 space-y-3">
                    <div className="text-sm font-medium text-text">{t('messenger.pagePicker.heading')}</div>
                    <button
                      type="button"
                      className="rv-btn"
                      onClick={loadFacebookPages}
                      disabled={facebookPagesLoading}
                    >
                      {t('messenger.pagePicker.actions.loadPages')}
                    </button>
                    {facebookSdkError && <p className="text-xs text-danger">{facebookSdkError}</p>}
                    {facebookPages.length > 0 && (
                      <label className="block">
                        <div className="text-sm text-muted mb-1">{t('messenger.pagePicker.fields.page')}</div>
                        <select
                          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                          value={selectedFacebookPageId}
                          onChange={(e) => {
                            const pageId = e.target.value;
                            setSelectedFacebookPageId(pageId);
                            const selected = facebookPages.find((item) => item.id === pageId);
                            if (!selected) return;
                            setMessengerPageId(selected.id);
                            setMessengerToken(selected.access_token);
                          }}
                        >
                          <option value="">{t('messenger.pagePicker.placeholders.page')}</option>
                          {facebookPages.map((page) => (
                            <option key={page.id} value={page.id}>{page.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  <label className="hidden">
                    <div className="text-sm text-muted mb-1">{t('messenger.fields.pageId')}</div>
                    <input
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                      value={messengerPageId}
                      onChange={(e) => setMessengerPageId(e.target.value)}
                      placeholder={t('messenger.placeholders.pageId')}
                    />
                  </label>

                  <label className="hidden">
                    <div className="text-sm text-muted mb-1">{t('messenger.fields.token')}</div>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                      value={messengerToken}
                      onChange={(e) => setMessengerToken(e.target.value)}
                      placeholder={t('messenger.placeholders.token')}
                    />
                    <p className="mt-1 text-xs text-muted">{t('messenger.helpers.token')}</p>
                  </label>

                  {graphSubscribeError && <p className="text-sm text-danger">{graphSubscribeError}</p>}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-white/70 p-4 text-sm">
                    <div className="text-xs uppercase tracking-[0.3em] text-muted mb-2">{t('messenger.details.heading')}</div>
                    {messengerConfig ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted">{t('messenger.readonly.connectedPage')}</span>
                          <span className="font-medium text-text">{currentLinkedPageName}</span>
                        </div>
                        <div className="hidden items-center justify-between gap-3">
                          <span className="text-muted">{t('messenger.details.tokenLast4')}</span>
                          <span className="font-medium text-text">
                            {messengerConfig.page_access_token_last4
                              ? `**** ${messengerConfig.page_access_token_last4}`
                              : t('messenger.details.none')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted">{t('messenger.details.updatedAt')}</span>
                          <span className="font-medium text-text">
                            {messengerConfig.updated_at
                              ? new Date(messengerConfig.updated_at).toLocaleString()
                              : t('messenger.details.never')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted">{t('messenger.empty')}</div>
                    )}
                  </div>

                  <label className="block">
                    <div className="text-sm text-muted mb-1">{t('messenger.fields.shareLink')}</div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                        value={messengerShareLink}
                        readOnly
                      />
                      <button className="rv-btn" onClick={copyMessengerLink} disabled={!messengerShareLink}>
                        {t('messenger.actions.copy')}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted">{t('messenger.helpers.shareLink')}</p>
                  </label>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={saveMessengerConfig}
                className="rv-btn-primary px-5 py-2.5 shadow shadow-[0_10px_30px_rgba(26,35,50,0.06)] disabled:opacity-60"
                disabled={messengerBusy || messengerLoading}
              >
                {messengerActive ? t('messenger.actions.update') : t('messenger.actions.save')}
              </button>
              {messengerActive && (
                <button
                  className="rv-btn px-5 py-2.5"
                  onClick={disconnectMessengerConfig}
                  disabled={messengerBusy || messengerLoading}
                >
                  {t('messenger.actions.disconnect')}
                </button>
              )}
            </div>

            {disconnectAtLabel && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {t('messenger.readonly.disconnectNotice', { date: disconnectAtLabel })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-white/70 p-4 md:p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-text">{t('messenger.readonly.heading')}</h3>
              <p className="text-sm text-muted">{t('messenger.readonly.description')}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
              <div className="rounded-xl border border-border bg-white p-4 text-sm space-y-2">
                <div className="text-xs uppercase tracking-[0.2em] text-muted">{t('messenger.readonly.pageCard')}</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">{t('messenger.readonly.connectedPage')}</span>
                  <span className="font-medium text-text">{currentLinkedPageName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">{t('messenger.readonly.pageStatus')}</span>
                  <span className="font-medium text-text">
                    {messengerActive ? t('messenger.status.connected') : t('messenger.status.notConnected')}
                  </span>
                </div>
                {/* Hidden to avoid repeating the same timestamp already shown in Current connection card */}
              </div>

              <div className="rounded-xl border border-border bg-white p-4 text-sm space-y-2">
                <div className="text-xs uppercase tracking-[0.2em] text-muted">{t('messenger.readonly.commentsCard')}</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">{t('messenger.readonly.connectedPost')}</span>
                  <span className="font-medium text-text">{currentLinkedPostLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">{t('messenger.readonly.commentsStatus')}</span>
                  <span className="font-medium text-text">
                    {commentSource?.is_active ? t('messenger.status.connected') : t('messenger.status.notConnected')}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">{t('messenger.readonly.commentsMode')}</span>
                  <span className="font-medium text-text">{currentCommentsMode || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">{t('messenger.readonly.commentsLinkedAt')}</span>
                  <span className="font-medium text-text">{currentCommentsCreatedAt}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">{t('messenger.readonly.commentsUpdatedAt')}</span>
                  <span className="font-medium text-text">{currentCommentsUpdatedAt}</span>
                </div>
                <div className="text-muted">{t('messenger.comments.summary.limit', { limit: commentPerUserLimit })}</div>
                <div className="text-muted">{t('messenger.comments.summary.testHint')}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white/70 p-4 md:p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-text">{t('messenger.channels.heading')}</h3>
              <p className="text-sm text-muted">{t('messenger.channels.description')}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-xl border border-border bg-white px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text">{t('messenger.channels.messengerToggle')}</span>
                <input
                  type="checkbox"
                  checked={channelMessengerEnabled}
                  onChange={(e) => setChannelMessengerEnabled(e.target.checked)}
                />
              </label>

              <label className="rounded-xl border border-border bg-white px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text">{t('messenger.channels.commentsToggle')}</span>
                <input
                  type="checkbox"
                  checked={channelCommentsEnabled}
                  onChange={(e) => setChannelCommentsEnabled(e.target.checked)}
                />
              </label>
            </div>

            {commentsLoading ? (
              <div className="text-sm text-muted">{t('messenger.comments.loading')}</div>
            ) : (
              <>
                <div className="space-y-4 rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-medium text-text">{t('messenger.comments.heading')}</h4>
                    {!channelCommentsEnabled && (
                      <span className="text-xs rounded-full bg-muted/30 px-2 py-1 text-muted">
                        {t('messenger.status.notConnected')}
                      </span>
                    )}
                  </div>

                  <label className="block">
                    <div className="text-sm text-muted mb-1">Choose a post</div>
                    <select
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition disabled:opacity-60"
                      disabled={!effectivePageId || facebookPostsLoading}
                      value={facebookPosts.some((post) => post.id === commentPostId) ? commentPostId : ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) return;
                        setCommentPostId(selectedId);
                        setCommentPostUrl('');
                      }}
                    >
                      <option value="">{facebookPostsLoading ? 'Loading posts...' : 'Select recent post'}</option>
                      {facebookPosts.map((post) => (
                        <option key={post.id} value={post.id}>
                          {post.created_time ? `${new Date(post.created_time).toLocaleString()} - ` : ''}
                          {post.message_preview || post.id}
                        </option>
                      ))}
                    </select>
                    {!effectivePageId && <p className="mt-1 text-xs text-muted">{t('messenger.comments.messages.connectPageFirst')}</p>}
                  </label>

                  <label className="hidden">
                    <div className="text-sm text-muted mb-1">{t('messenger.comments.fields.postUrl')}</div>
                    <input
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition disabled:opacity-60"
                      value={commentPostUrl}
                      onChange={(e) => {
                        setCommentPostUrl(e.target.value);
                      }}
                      placeholder={t('messenger.comments.placeholders.postUrl')}
                      disabled={!effectivePageId}
                    />
                    {!effectivePageId && <p className="mt-1 text-xs text-muted">{t('messenger.comments.messages.connectPageFirst')}</p>}
                  </label>

                  <label className="hidden">
                    <div className="text-sm text-muted mb-1">{t('messenger.comments.fields.extractedPostId')}</div>
                    <input
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner"
                      value={commentPostId}
                      readOnly
                    />
                    {commentPostUrl.trim() && (
                      <a href={commentPostUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline">
                        {t('messenger.comments.actions.openLink')}
                      </a>
                    )}
                  </label>

                  <label className="block">
                    <div className="text-sm text-muted mb-1">{t('messenger.comments.fields.inputMode')}</div>
                    <select
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                      value={commentInputMode}
                      onChange={(e) => setCommentInputMode(e.target.value as any)}
                    >
                      <option value="MCQ">{t('messenger.comments.modes.optionList')}</option>
                      <option value="TEXT" hidden>{t('messenger.comments.modes.text')}</option>
                      <option value="MEDIA_ONLY" hidden>{t('messenger.comments.modes.imageOnly')}</option>
                      <option value="TEXT_OR_MEDIA">{t('messenger.comments.modes.textOrImage')}</option>
                    </select>
                  </label>

                  {commentInputMode === 'MCQ' && (
                    <div className="space-y-4 rounded-xl border border-border bg-white/70 p-4">
                      {commentModeUsesTaskMapping ? (
                        <label className="block">
                          <div className="text-sm text-muted mb-1">{t('messenger.comments.fields.taskId')}</div>
                          <select
                            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                            value={commentTaskId}
                            onChange={(e) => setCommentTaskId(e.target.value)}
                          >
                            <option value="">{t('messenger.comments.placeholders.taskId')}</option>
                            {commentMcqTasks.map((task) => (
                              <option key={task.task_id} value={task.task_id}>
                                {task.title}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}

                      {!commentTaskId && (
                        <label className="block">
                          <div className="text-sm text-muted mb-1">{t('messenger.comments.fields.allowedOptions')}</div>
                          <textarea
                            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                            rows={4}
                            value={commentAllowedOptionsText}
                            onChange={(e) => setCommentAllowedOptionsText(e.target.value)}
                            placeholder={t('messenger.comments.placeholders.allowedOptions')}
                          />
                          <p className="mt-1 text-xs text-muted">{t('messenger.comments.helpers.allowedOptions')}</p>
                        </label>
                      )}
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="rounded-xl border border-border bg-white px-4 py-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-text">{t('messenger.comments.fields.allowMultiple')}</span>
                      <input
                        type="checkbox"
                        checked={allowMultipleCommentAnswers}
                        onChange={(e) => setAllowMultipleCommentAnswers(e.target.checked)}
                      />
                    </label>

                    {allowMultipleCommentAnswers && (
                      <label className="block">
                        <div className="text-sm text-muted mb-1">{t('messenger.comments.fields.maxAnswers')}</div>
                        <input
                          type="number"
                          min={1}
                          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                          value={maxCommentAnswersPerUser}
                          onChange={(e) => setMaxCommentAnswersPerUser(Number(e.target.value || 1))}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={saveCommentSourceConfig}
                    className="rv-btn-primary px-5 py-2.5 shadow shadow-[0_10px_30px_rgba(26,35,50,0.06)] disabled:opacity-60"
                    disabled={commentsBusy || commentsLoading}
                  >
                    {t('messenger.comments.actions.saveChannels')}
                  </button>
                  <button
                    type="button"
                    onClick={checkWebhookStatus}
                    className="rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-text hover:bg-surface disabled:opacity-60"
                    disabled={webhookStatusBusy}
                  >
                    {webhookStatusBusy ? 'Checking...' : 'Check webhook status'}
                  </button>
                  <button
                    type="button"
                    onClick={pullFacebookCommentsNow}
                    className="rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-text hover:bg-surface disabled:opacity-60"
                    disabled={commentsSyncBusy}
                  >
                    {commentsSyncBusy ? 'Syncing comments...' : 'Fetch comments now'}
                  </button>
                </div>

                {webhookStatus && (
                  <div className="rounded-xl border border-border bg-white/70 p-4 text-sm space-y-1">
                    <div className="font-medium text-text">Webhook status</div>
                    <div className="text-muted">Page: {webhookStatus.active_page?.fb_page_id || '-'}</div>
                    <div className="text-muted">Source: {webhookStatus.comment_source?.exists ? 'OK' : 'Missing'} ({webhookStatus.comment_source?.fb_post_id || '-'})</div>
                    <div className="text-muted">
                      Subscription: {webhookStatus.subscribed_apps_error ? `Error - ${webhookStatus.subscribed_apps_error}` : 'OK'}
                    </div>
                    <div className="text-muted">
                      Last webhook time: {webhookStatus.last_events?.[0]?.received_at ? new Date(webhookStatus.last_events[0].received_at).toLocaleString() : 'No events'}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {isRiddle && activeTab === 'riddle-challenges' && contest?.id && (
        <section className="rv-section space-y-6">
          <RiddleChallenges contestId={contest.id} />
        </section>
      )}

      {isCodeBased && activeTab === 'codes' && contest?.id && (
        <CodesManager contestId={contest.id} contestTitle={contest.title} contestSlug={contest.slug} />
      )}
      {isPrediction && predictionMode === 'SIMPLE' && activeTab === 'prediction-challenges' && contest?.id && (
        <section className="rv-section space-y-6">
          <PredictionChallenges contestId={contest.id} mode="SIMPLE" />
        </section>
      )}
      {isPrediction && predictionMode === 'TOURNAMENT' && activeTab === 'prediction-matches' && contest?.id && (
        <section className="rv-section space-y-6">
          <PredictionMatches contestId={contest.id} />
        </section>
      )}
      {isMultiStage && activeTab === 'rounds' && contest?.id && (
        <RoundsTasks contestId={contest.id} />
      )}
      {activeTab === 'judges' && (
        <section className="rv-section space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t('judges.heading')}</h2>
              <p className="text-xs text-muted mt-1">{formatCount(judges.length)} {t('tabs.judges')}</p>
            </div>
            <div className="flex gap-2 items-center">
              <input
                className="w-60 border rounded px-3 py-2"
                placeholder={t('judges.placeholder')}
                value={newJudgeId}
                onChange={(e) => setNewJudgeId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addJudge();
                }}
              />
              <button className="rv-btn-primary px-4 py-2 disabled:opacity-60" onClick={addJudge} disabled={addingJudge || !judgeIdValue || !isJudgeUuid || isDuplicateJudge}>
                {addingJudge ? t('judges.adding') : t('judges.add')}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted">{t('judges.helper')}</p>
          {!!judgeIdValue && !isJudgeUuid && <p className="text-xs text-red-600">{t('judges.invalid')}</p>}
          {!!judgeIdValue && isDuplicateJudge && <p className="text-xs text-amber-700">{t('judges.duplicate')}</p>}
          {judgesLoading ? (
            <div className="text-sm text-muted">{t('judges.loading')}</div>
          ) : judges.length === 0 ? (
            <div className="rounded-2xl border bg-white p-4 text-sm text-muted">{t('judges.empty')}</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {judges.map((j) => (
                <li key={j.user_id} className="flex items-center justify-between rounded-xl border bg-white p-3">
                  <div>
                    <div className="font-semibold">{j.full_name || j.email || j.user_id}</div>
                    <div className="text-xs text-muted">{j.email || j.user_id}</div>
                  </div>
                  <button className="rv-link" onClick={() => removeJudge(j.user_id)}>{t('judges.remove')}</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {showRestrictionsTab && activeTab === 'restrictions' && <Restrictions contestId={contest.id} />}

      {activeTab === 'prizes' && (
        <PrizesAwards contestId={contest.id} />
      )}

      {showTransparencyTab && activeTab === 'transparency' && (
        <section className="rv-section space-y-4">
          <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-text">{t('fairness.heading')}</h3>
                <p className="text-sm text-muted">{t('fairness.description')}</p>
              </div>
              <button
                type="button"
                className="rv-btn"
                onClick={handleCopyProof}
                disabled={!publicProofJson || proofCopying}
              >
                {proofCopying ? t('fairness.actions.copying') : t('fairness.actions.copy')}
              </button>
            </div>
            {publicProof ? (
              <>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {proofRows.map((row) => (
                    <div key={row.key} className="rounded-2xl border border-border bg-bg px-4 py-3">
                      <dt className="text-xs uppercase tracking-[0.2em] text-muted">{row.label}</dt>
                      <dd className="mt-2 text-sm font-medium text-text">{renderProofValue(row.value, row.key)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-muted">{t('fairness.rawJson')}</div>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-2xl border border-border bg-bg p-4 text-xs text-muted">{publicProofJson}</pre>
                </div>
              </>
            ) : (
              <div className="mt-3 text-sm text-muted">{t('fairness.empty')}</div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <button type="button" className="rounded-2xl border border-border bg-white p-4 text-left" onClick={() => setActiveTab('rules')}>
              <div className="text-xs uppercase tracking-[0.25em] text-muted">{t('tabs.rules')}</div>
              <div className="mt-2 text-sm text-text">{rulesText?.trim() ? t('rules.heading') : t('rules.preview.empty')}</div>
            </button>
            <button type="button" className="rounded-2xl border border-border bg-white p-4 text-left" onClick={() => setActiveTab('prizes')}>
              <div className="text-xs uppercase tracking-[0.25em] text-muted">{t('tabs.prizes')}</div>
              <div className="mt-2 text-sm text-text">{t('prizes.heading')}</div>
            </button>
            <button type="button" className="rounded-2xl border border-border bg-white p-4 text-left" onClick={() => setActiveTab('judges')}>
              <div className="text-xs uppercase tracking-[0.25em] text-muted">{t('tabs.judges')}</div>
              <div className="mt-2 text-sm text-text">{formatCount(judges.length)} {t('tabs.judges')}</div>
            </button>
          </div>

          {selectionRequiresSeed && !contest?.seed_commit && (
            <div className="rounded-2xl border border-accent bg-accent-weak px-4 py-3 text-sm text-accent-hover">
              {t('fairness.empty')}
            </div>
          )}
          <Transparency contestId={contest.id} />
        </section>
      )}

      {activeTab === 'rules' && (
        <section className="rv-section space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('rules.heading')}</h2>
              <p className="text-sm text-muted">
                {t('rules.description')}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="rv-btn" onClick={() => setShowRulesPreview((prev) => !prev)}>
                {showRulesPreview ? t('rules.togglePreview.hide') : t('rules.togglePreview.show')}
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-muted">{t('rules.label')}</span>
                <textarea
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition min-h-[240px]"
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  placeholder={t('rules.placeholder')}
                />
              </label>
              <div className="rounded-2xl border border-border bg-bg px-4 py-3 text-xs text-muted shadow-inner">
                <div className="font-semibold uppercase tracking-[0.3em] text-muted mb-2">{t('rules.tipsTitle')}</div>
                <ul className="space-y-1">
                  <li><span className="font-mono">{t('rules.tips.heading.code')}</span> {t('rules.tips.heading.description')}</li>
                  <li><span className="font-mono">{t('rules.tips.bullet.code')}</span> {t('rules.tips.bullet.description')}</li>
                  <li><span className="font-mono">{t('rules.tips.bold.code')}</span> {t('rules.tips.bold.description')}</li>
                  <li><span className="font-mono">{t('rules.tips.link.code')}</span> {t('rules.tips.link.description')}</li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm min-h-[260px] flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-muted">{t('rules.preview.title')}</div>
                  <div className="text-sm text-muted">{t('rules.preview.description')}</div>
                </div>
                {!showRulesPreview && (
                  <button className="rv-link text-xs" onClick={() => setShowRulesPreview(true)}>
                    {t('rules.togglePreview.show')}
                  </button>
                )}
              </div>
              <div className="mt-4 flex-1 overflow-auto rounded-2xl border border-border bg-bg px-4 py-3">
                {showRulesPreview ? (
                  rulesText.trim() ? (
                    <div
                      className="prose prose max-w-none text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(rulesText) }}
                    />
                  ) : (
                    <div className="grid h-full place-content-center text-center text-sm text-muted">
                      {t('rules.preview.empty')}
                    </div>
                  )
                ) : (
                  <div className="grid h-full place-content-center text-center text-sm text-muted">
                    {t('rules.preview.disabled')}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="rv-btn-primary px-5 py-2.5 shadow shadow-[0_10px_30px_rgba(26,35,50,0.06)] disabled:opacity-60" onClick={saveRules}>
              {t('rules.actions.save')}
            </button>
            <button className="rv-btn px-5 py-2.5" onClick={() => setRulesText(contest?.rules_json?.rules_markdown || '')}>
              {t('rules.actions.reset')}
            </button>
          </div>
        </section>
      )}

      {pendingMediaDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 space-y-3">
            <div className="text-lg font-semibold">{t('media.confirmDelete.title')}</div>
            <p className="text-sm text-muted">{t('media.confirmDelete.description')}</p>
            <img
              src={pendingMediaDelete.url}
              alt={t('media.imageAlt')}
              className="h-40 w-full rounded-xl border border-border object-cover"
            />
            <div className="flex gap-2 justify-end">
              <button className="rv-btn" onClick={() => setPendingMediaDelete(null)} disabled={deletingMediaId === pendingMediaDelete.id}>
                {t('media.confirmDelete.cancel')}
              </button>
              <button
                className="rv-btn-primary bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700"
                onClick={async () => {
                  const id = pendingMediaDelete.id;
                  if (id) await removeMedia(id);
                  setPendingMediaDelete(null);
                }}
                disabled={!pendingMediaDelete.id || deletingMediaId === pendingMediaDelete.id}
              >
                {deletingMediaId === pendingMediaDelete.id ? t('media.actions.removing') : t('media.confirmDelete.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 space-y-3">
            <div className="text-lg font-semibold">
              {uploadTarget === 'cover'
                ? t('modal.changeCover')
                : uploadTarget === 'avatar'
                  ? t('modal.changeAvatar')
                  : t('media.addPhoto')}
            </div>
            <input
              type="file"
              accept="image/*"
              multiple={uploadTarget === 'gallery'}
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            />
            {selectedFiles.length > 0 && (
              <p className="text-xs text-muted">{t('media.selectedCount', { count: selectedFiles.length })}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button className="rv-btn" onClick={() => { setShowModal(false); setSelectedFiles([]); setUploadTarget(null); }} disabled={uploadBusy}>{t('modal.cancel')}</button>
              <button className="rv-btn-primary" onClick={doUpload} disabled={selectedFiles.length === 0 || uploadBusy}>{uploadBusy ? t('modal.uploading') : t('modal.upload')}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
