import type { PublishingChecklistItem } from './PublishingChecklist';
import type { StatusTimelineProps } from './StatusTimeline';

export type ContestEntriesStats = {
  total?: number;
  correct?: number;
  pending?: number;
  needs_review?: number;
};

export type ContestRecord = {
  id: string;
  slug: string;
  title: string;
  created_by_user_id?: string | null;
  type?: string | null;
  selection?: string | null;
  status?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  prizes?: any[] | null;
  referees?: {
    user_id: string;
    role?: string | null;
    full_name?: string | null;
    display_name?: string | null;
    user?: {
      name?: string | null;
      full_name?: string | null;
      display_name?: string | null;
    } | null;
  }[] | null;
  entries_stats?: ContestEntriesStats | null;
  rules_json?: {
    gallery_urls?: string[] | null;
    cover_url?: string | null;
    avatar_url?: string | null;
    rules_markdown?: string | null;
    prediction_mode?: string | null;
  } | string | null;
  max_winners?: number | null;
  seed_commit?: string | null;
  public_proof?: Record<string, any> | null;
  has_published_winners?: boolean | null;
  winners_published?: boolean | null;
};

export type ContestTaskRecord = {
  id: string;
  title?: string | null;
  description?: string | null;
  kind?: string | null;
  round_id?: string | null;
  points?: number | null;
  metadata?: any;
  options?: {
    id?: string | null;
    label?: string | null;
    is_correct?: boolean | null;
  }[];
};

export type WinnerRecord = {
  id: string;
  entry_id?: string | null;
  prize_id?: string | null;
  user_display_name?: string | null;
  prize_name?: string | null;
  published_at?: string | null;
  user_avatar_url?: string | null;
};

export type EntryApiItem = {
  id: string;
  user_id?: string;
  identity_id?: string;
  identity_name?: string | null;
  user?: {
    name?: string | null;
    display_name?: string | null;
    full_name?: string | null;
  } | null;
  answer_text?: string | null;
  mcq_option_id?: string | null;
  mcq_option_label?: string | null;
  code_submitted?: string | null;
  code_hash?: string | null;
  task_id?: string | null;
  round_id?: string | null;
  entry_type?: string | null;
  asset_url?: string | null;
  evidence_image_url?: string | null;
  prediction_team_a_score?: number | null;
  prediction_team_b_score?: number | null;
  prediction_winner?: string | null;
  score?: number | null;
  status?: string | null;
  created_at?: string | null;
};

export type ContestAuditLog = {
  id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  payload?: any;
  message?: string | null;
  created_at?: string | null;
};

export type WinnerCard = {
  id: string;
  name: string;
  prize?: string | null;
  prizeId?: string | null;
  publishedAt?: string | null;
  avatarUrl?: string | null;
  entryId?: string | null;
};

export type CandidateCard = {
  id: string;
  title: string;
  owner: string;
  status: string;
  score?: number | null;
  submittedAt: string;
  createdAt: number;
  roundLabel?: string | null;
  isWinner: boolean;
};

export type CodeBatchRecord = {
  id: string;
  name: string;
  pattern?: string | null;
  created_at?: string | null;
  total_codes?: number;
  redeemed_codes?: number;
  remaining_codes?: number;
};

export type CodePreviewRecord = {
  id: string;
  code: string;
  tag?: string | null;
  sku?: string | null;
  expires_at?: string | null;
};

export type StatusLabelOverrides = Record<string, string>;

export type StageHintLabels = {
  scheduleTbd: string;
  range: (start: string, end: string) => string;
  opens: (date: string) => string;
  closes: (date: string) => string;
};

export type EntryOwnerLabels = {
  participant?: string;
  userLabel?: (suffix: string) => string;
};

export type EntryTimestampLabels = {
  justNow?: string;
};

export type TaskProgressLabels = {
  untitledTask?: string;
  noDescription?: string;
  roundLabel?: (suffix: string) => string;
};

export type JudgesInfoLabels = {
  judgeLabel?: (index: number) => string;
};

export type WinnerCandidateLabels = {
  roundLabel?: (suffix: string) => string;
  entryTitleFallback?: string;
  participantFallback?: string;
  userLabel?: (suffix: string) => string;
  justNow?: string;
  statusFallback?: string;
};

const entryTimestampFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const scheduleRangeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const DAY_MS = 86_400_000;

export function formatStatusLabel(
  value?: string | null,
  options?: { fallback?: string; overrides?: StatusLabelOverrides },
) {
  const fallback = options?.fallback ?? 'Draft';
  if (!value) return fallback;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return fallback;
  if (options?.overrides && options.overrides[normalized]) {
    return options.overrides[normalized];
  }
  return normalized
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

export function buildStageHint(contest: ContestRecord | null, labels?: Partial<StageHintLabels>) {
  const scheduleTbd = labels?.scheduleTbd ?? 'Schedule TBD';
  if (!contest) return scheduleTbd;
  const start = safeDate(contest.starts_at);
  const end = safeDate(contest.ends_at);
  if (start && end) {
    const startLabel = scheduleRangeFormatter.format(start);
    const endLabel = scheduleRangeFormatter.format(end);
    return labels?.range ? labels.range(startLabel, endLabel) : `${startLabel} - ${endLabel}`;
  }
  if (start) {
    const startLabel = scheduleRangeFormatter.format(start);
    return labels?.opens ? labels.opens(startLabel) : `Opens ${startLabel}`;
  }
  if (end) {
    const endLabel = scheduleRangeFormatter.format(end);
    return labels?.closes ? labels.closes(endLabel) : `Closes ${endLabel}`;
  }
  return scheduleTbd;
}

export function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatEntryTitle(entry: EntryApiItem, fallback?: string) {
  const raw =
    entry.answer_text?.trim() ||
    entry.mcq_option_label?.trim() ||
    entry.code_submitted?.trim() ||
    entry.entry_type?.replace(/_/g, ' ') ||
    entry.asset_url ||
    entry.evidence_image_url;
  return raw ? raw : fallback || 'Entry submitted';
}

export function formatEntryOwner(entry: EntryApiItem, labels?: EntryOwnerLabels) {
  const participantLabel = labels?.participant || 'Participant';
  const userLabel = labels?.userLabel || ((suffix: string) => `User ${suffix}`);
  return (
    entry.identity_name ||
    entry.user?.name ||
    entry.user?.display_name ||
    entry.user?.full_name ||
    (entry.identity_id ? userLabel(entry.identity_id.slice(-6)) : null) ||
    (entry.user_id ? userLabel(entry.user_id.slice(-6)) : participantLabel)
  );
}

export function formatEntryTimestamp(value?: string | null, labels?: EntryTimestampLabels) {
  if (!value) return labels?.justNow || 'Just now';
  const date = safeDate(value);
  if (!date) return value;
  return entryTimestampFormatter.format(date);
}

export function formatDateTime(date: Date | null) {
  if (!date) return 'Date TBD';
  return fullDateFormatter.format(date);
}

export function formatRelative(date: Date | null) {
  if (!date) return undefined;
  const diffMs = date.getTime() - Date.now();
  const future = diffMs > 0;
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);

  if (minutes < 1) {
    return future ? 'in under a minute' : 'just now';
  }
  if (minutes < 60) {
    const label = `${minutes} min${minutes > 1 ? 's' : ''}`;
    return future ? `in ${label}` : `${label} ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    const label = `${hours} hr${hours > 1 ? 's' : ''}`;
    return future ? `in ${label}` : `${label} ago`;
  }
  const days = Math.round(hours / 24);
  const label = `${days} day${days > 1 ? 's' : ''}`;
  return future ? `in ${label}` : `${label} ago`;
}

export function buildScheduleTimeline(contest: ContestRecord, winnersCount: number): StatusTimelineProps['schedule'] {
  const createdAt = safeDate(contest.created_at);
  const startsAt = safeDate(contest.starts_at);
  const endsAt = safeDate(contest.ends_at);
  const now = Date.now();
  const isLive = startsAt && now >= startsAt.getTime() && (!endsAt || now <= endsAt.getTime());
  const closed = endsAt && now > endsAt.getTime();

  return [
    {
      id: 'drafted',
      title: 'Drafted & approved',
      date: formatDateTime(createdAt),
      description: 'Offer created inside the owner workspace.',
      status: createdAt ? 'complete' : 'upcoming',
      meta: createdAt ? formatRelative(createdAt) : undefined,
    },
    {
      id: 'open',
      title: 'Submissions open',
      date: formatDateTime(startsAt),
      description: 'Public form available for participants.',
      status: isLive || closed ? 'complete' : startsAt ? 'upcoming' : 'upcoming',
      meta: startsAt ? formatRelative(startsAt) : undefined,
    },
    {
      id: 'close',
      title: 'Submissions close',
      date: formatDateTime(endsAt),
      description: 'Final deadline before judging begins.',
      status: closed ? 'complete' : isLive ? 'current' : 'upcoming',
      meta: endsAt ? formatRelative(endsAt) : undefined,
    },
    {
      id: 'announce',
      title: 'Publish winners',
      date: winnersCount ? 'Live now' : 'Pending announcement',
      description: 'Results shared with participants and the public.',
      status: winnersCount ? 'complete' : closed ? 'current' : 'upcoming',
      meta: winnersCount ? `${winnersCount} published` : undefined,
    },
  ];
}

export function buildReviewTimeline(
  contest: ContestRecord,
  entries: EntryApiItem[],
): StatusTimelineProps['review'] {
  const stats = contest.entries_stats || {};
  const total = stats.total ?? entries.length;
  const pending = stats.pending ?? 0;
  const needsReview = stats.needs_review ?? 0;
  const validated = stats.correct ?? 0;
  const latestEntryDate = entries[0]?.created_at ? safeDate(entries[0].created_at) : null;

  return [
    {
      id: 'auto-validation',
      title: 'Auto validation sweep',
      date: formatDateTime(latestEntryDate),
      description: total
        ? 'Metadata, files, and integrity checks run nightly.'
        : 'Waiting for first submission to trigger validation.',
      status: total > 0 ? 'complete' : 'upcoming',
      meta: total > 0 ? `${total} processed` : undefined,
    },
    {
      id: 'pending-review',
      title: 'Pending jury review',
      date: formatRelative(latestEntryDate) || 'Awaiting entries',
      description: 'Entries assigned to judges for scoring.',
      status: pending > 0 ? 'current' : total > 0 ? 'complete' : 'upcoming',
      meta: `${pending} in queue`,
    },
    {
      id: 'qa-loop',
      title: 'QA & fixes',
      date: formatRelative(latestEntryDate) || 'Awaiting entries',
      description: 'Ops team resolving flagged submissions.',
      status: needsReview > 0 ? 'current' : total > 0 ? 'complete' : 'upcoming',
      meta: `${needsReview} flagged`,
    },
    {
      id: 'shortlist-ready',
      title: 'Validated & shortlist ready',
      date: validated ? formatRelative(latestEntryDate) || 'Live now' : 'Pending review',
      description: 'Entries cleared for shortlist or winners draws.',
      status: validated > 0 ? 'complete' : pending + needsReview > 0 ? 'current' : 'upcoming',
      meta: `${validated} cleared`,
    },
  ];
}

export function buildEntrySummary(
  contest: ContestRecord,
  entries: EntryApiItem[],
): StatusTimelineProps['entrySummary'] {
  const stats = contest.entries_stats || {};
  const total = stats.total ?? entries.length;
  const pending = stats.pending ?? 0;
  const needsReview = stats.needs_review ?? 0;
  const validated = stats.correct ?? 0;
  const other = Math.max(total - (pending + needsReview + validated), 0);
  const latestEntryDate = entries[0]?.created_at ? safeDate(entries[0].created_at) : null;
  const lastUpdated = latestEntryDate ? `Updated ${formatRelative(latestEntryDate)}` : 'Awaiting submissions';

  const percent = (value: number) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  return {
    total,
    lastUpdated,
    breakdown: [
      {
        id: 'VALIDATED',
        label: 'Validated',
        value: validated,
        change: percent(validated),
        accent: 'from-emerald-400 to-emerald-200',
      },
      {
        id: 'PENDING',
        label: 'In review',
        value: pending,
        change: percent(pending),
        accent: 'from-sky-400 to-sky-200',
      },
      {
        id: 'NEEDS_REVIEW',
        label: 'Needs fixes',
        value: needsReview,
        change: percent(needsReview),
        accent: 'from-amber-400 to-amber-200',
      },
      { id: 'OTHER', label: 'Other', value: other, change: percent(other), accent: 'from-slate-200 to-slate-50' },
    ],
    trend: {
      '7d': buildTrendSeries(entries, 7),
      '30d': buildTrendSeries(entries, 30),
    },
  };
}

export function buildTrendSeries(entries: EntryApiItem[], days: number) {
  const buckets = Array.from({ length: days }, () => 0);
  const windowStart = Date.now() - (days - 1) * DAY_MS;

  entries.forEach((entry) => {
    const ts = entry.created_at ? safeDate(entry.created_at)?.getTime() : null;
    if (!ts || ts < windowStart) return;
    const bucketIndex = Math.min(days - 1, Math.floor((ts - windowStart) / DAY_MS));
    if (bucketIndex >= 0) {
      buckets[bucketIndex] += 1;
    }
  });

  return buckets;
}

export function countGalleryItems(contest: ContestRecord | null) {
  if (!contest?.rules_json) return 0;
  const urls = new Set<string>();
  const rules = contest.rules_json;
  [rules.cover_url, rules.avatar_url].forEach((url) => {
    if (url && typeof url === 'string' && url.trim()) urls.add(url.trim());
  });
  if (Array.isArray(rules.gallery_urls)) {
    rules.gallery_urls.forEach((url) => {
      if (typeof url === 'string' && url.trim()) urls.add(url.trim());
    });
  }
  return urls.size;
}

export function toDisplayNumber(value: number) {
  return value.toLocaleString();
}

export function buildTaskProgress(tasks: ContestTaskRecord[], labels?: TaskProgressLabels) {
  const untitledTask = labels?.untitledTask || 'Untitled task';
  const noDescription = labels?.noDescription || 'No description provided.';
  return tasks.map((task) => ({
    id: task.id,
    title: task.title || untitledTask,
    description: task.description || noDescription,
    kind: task.kind,
    roundLabel: task.round_id
      ? labels?.roundLabel
        ? labels.roundLabel(task.round_id.slice(-4))
        : `Round ${task.round_id.slice(-4)}`
      : null,
    points: task.points ?? null,
    options: Array.isArray(task.options) ? task.options : [],
  }));
}

export function buildJudgesInfo(
  refs?: {
    user_id: string;
    role?: string | null;
    full_name?: string | null;
    display_name?: string | null;
    user?: {
      name?: string | null;
      full_name?: string | null;
      display_name?: string | null;
    } | null;
  }[] | null,
  labels?: JudgesInfoLabels,
) {
  if (!Array.isArray(refs)) return [];
  return refs.map((judge, index) => ({
    id: judge.user_id || `judge-${index}`,
    role: judge.role,
    label:
      judge.display_name ||
      judge.full_name ||
      judge.user?.display_name ||
      judge.user?.full_name ||
      judge.user?.name ||
      (labels?.judgeLabel ? labels.judgeLabel(index + 1) : `Judge ${index + 1}`),
    fullName: judge.full_name || judge.user?.full_name || judge.user?.name || null,
    displayName: judge.display_name || judge.user?.display_name || null,
  }));
}

export function buildWinnerCandidates(
  entries: EntryApiItem[],
  winners: WinnerCard[],
  labels?: WinnerCandidateLabels,
): CandidateCard[] {
  const winnerIds = new Set(
    winners
      .map((winner) => winner.entryId)
      .filter((entryId): entryId is string => typeof entryId === 'string' && entryId.length > 0),
  );

  const sortedEntries = [...entries].sort((a, b) => {
    const scoreA = typeof a.score === 'number' ? a.score : Number.NEGATIVE_INFINITY;
    const scoreB = typeof b.score === 'number' ? b.score : Number.NEGATIVE_INFINITY;
    if (scoreA !== scoreB) return scoreB - scoreA;
    const dateA = safeDate(a.created_at)?.getTime() ?? 0;
    const dateB = safeDate(b.created_at)?.getTime() ?? 0;
    return dateB - dateA;
  });

  return sortedEntries.slice(0, 12).map((entry) => {
    const createdAt = safeDate(entry.created_at)?.getTime() ?? 0;
    return {
      id: entry.id,
      title: formatEntryTitle(entry, labels?.entryTitleFallback),
      owner: formatEntryOwner(entry, {
        participant: labels?.participantFallback,
        userLabel: labels?.userLabel,
      }),
      status: (entry.status || labels?.statusFallback || 'SUBMITTED').toUpperCase(),
      score: entry.score ?? null,
      submittedAt: formatEntryTimestamp(entry.created_at, { justNow: labels?.justNow }),
      createdAt,
      roundLabel: entry.round_id
        ? labels?.roundLabel
          ? labels.roundLabel(entry.round_id.slice(-4))
          : `Round ${entry.round_id.slice(-4)}`
        : null,
      isWinner: winnerIds.has(entry.id),
    };
  });
}

export function formatWinnerSummary(winner: WinnerRecord, fallbackName = 'Winner'): WinnerCard {
  return {
    id: winner.id,
    name: winner.user_display_name || fallbackName,
    prize: winner.prize_name || null,
    prizeId: winner.prize_id || null,
    publishedAt: winner.published_at ? formatEntryTimestamp(winner.published_at) : null,
    avatarUrl: winner.user_avatar_url || null,
    entryId: winner.entry_id || null,
  };
}

export function buildPublishingChecklist(
  contest: ContestRecord,
  entries: EntryApiItem[],
  winnersCount: number,
): PublishingChecklistItem[] {
  const galleryCount = countGalleryItems(contest);
  const stats = contest.entries_stats || {};
  const judgesCount = Array.isArray(contest.referees) ? contest.referees.length : 0;
  const prizesCount = Array.isArray(contest.prizes) ? contest.prizes.length : 0;
  const totalEntries = stats.total ?? entries.length;
  const needsReview = stats.needs_review ?? 0;
  const pending = stats.pending ?? 0;
  const rulesReady = Boolean(contest.rules_json?.rules_markdown);
  const coverReady = Boolean(contest.rules_json?.cover_url);

  return [
    {
      id: 'branding',
      title: 'Branding & cover art',
      description: 'Upload cover + avatar assets to keep the offer on-brand.',
      status: coverReady ? 'done' : 'pending',
      meta: coverReady ? 'Cover ready' : 'No cover uploaded',
      action: { label: 'Edit cover', href: `/offers/${contest.slug}/manage?tab=media` },
    },
    {
      id: 'gallery',
      title: 'Gallery curation',
      description: 'Add photos or videos that showcase the experience.',
      status: galleryCount >= 3 ? 'done' : galleryCount > 0 ? 'in-progress' : 'pending',
      meta: `${galleryCount}/3 media items`,
      action: { label: 'Manage gallery', href: `/offers/${contest.slug}/manage?tab=media` },
    },
    {
      id: 'rules',
      title: 'Rules & eligibility',
      description: 'Publish the official rules markdown and eligibility notes.',
      status: rulesReady ? 'done' : 'pending',
      action: { label: 'Edit rules', href: `/offers/${contest.slug}/manage?tab=rules` },
    },
    {
      id: 'judges',
      title: 'Judges & moderators',
      description: 'Invite referees so entries can be reviewed on time.',
      status: judgesCount >= 3 ? 'done' : judgesCount > 0 ? 'in-progress' : 'pending',
      meta: `${judgesCount} judge${judgesCount === 1 ? '' : 's'}`,
      action: { label: 'Manage judges', href: `/offers/${contest.slug}/manage?tab=judges` },
    },
    {
      id: 'prizes',
      title: 'Prizes configured',
      description: 'Define awards and amounts so winners can be issued.',
      status: prizesCount > 0 ? 'done' : 'pending',
      meta: prizesCount ? `${prizesCount} prize tiers` : 'No prizes yet',
      action: { label: 'Set prizes', href: `/offers/${contest.slug}/manage?tab=prizes` },
    },
    {
      id: 'entries',
      title: 'Entries QA pipeline',
      description: 'Resolve flagged entries and keep reviews moving.',
      status: totalEntries === 0 ? 'pending' : needsReview + pending > 0 ? 'in-progress' : 'done',
      meta: totalEntries
        ? `${totalEntries} entries | ${needsReview} flagged | ${pending} waiting`
        : 'No submissions yet',
      action: { label: 'Manage tasks', href: `/offers/${contest.slug}/manage?tab=rounds` },
    },
    {
      id: 'announcement',
      title: 'Announcement prep',
      description: 'Schedule communications, prizes, and publishing plan.',
      status: winnersCount > 0 ? 'done' : 'in-progress',
      meta: winnersCount ? `${winnersCount} published winners` : 'Awaiting final selection',
      action: { label: 'View winners', href: `/offers/${contest.slug}/winner` },
    },
  ];
}
