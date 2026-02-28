const ALLOWED_CHIPS = ['like', 'comment', 'tag', 'follow', 'share', 'visit_link'] as const;

export type ExternalPostPlatform = 'facebook' | 'instagram';
export type ExternalPostStatus = 'SUBMITTED' | 'PUBLISHED' | 'HIDDEN';
export type ExternalPostReviewBadge = 'UNREVIEWED' | 'REVIEWED';
export type ExternalPostWinnersStatus = 'WINNERS_UNKNOWN' | 'WINNERS_PUBLISHED';

export type ExternalPostSuggestion = {
  title: string;
  prize: string;
  chips: string[];
  extra_text: string;
  deadline: string | null;
};

export function isAllowedChip(value: string): value is (typeof ALLOWED_CHIPS)[number] {
  return ALLOWED_CHIPS.includes(value as (typeof ALLOWED_CHIPS)[number]);
}

export function normalizeExternalContestUrl(input: string): { platform: ExternalPostPlatform | null; canonicalUrl: string | null } {
  const raw = String(input || '').trim();
  if (!raw) return { platform: null, canonicalUrl: null };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { platform: null, canonicalUrl: null };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const isFacebook = host.includes('facebook.com') || host === 'fb.watch';
  const isInstagram = host.includes('instagram.com');
  if (!isFacebook && !isInstagram) return { platform: null, canonicalUrl: null };

  parsed.hash = '';
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'igshid']) {
    parsed.searchParams.delete(key);
  }
  if (isFacebook) {
    parsed.searchParams.delete('mibextid');
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';

  return {
    platform: isInstagram ? 'instagram' : 'facebook',
    canonicalUrl: parsed.toString(),
  };
}

export function inferPlatformFromUrl(input: string): ExternalPostPlatform | null {
  return normalizeExternalContestUrl(input).platform;
}

function pickTitleFromText(text: string): string {
  const line = text
    .split(/\n+/)
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.length >= 8);
  return line ? line.slice(0, 120) : '';
}

function pickPrizeFromText(text: string): string {
  const lines = text.split(/\n+/).map((line) => line.trim());
  const prizeLine = lines.find((line) => /(جائزة|اربح|ربح|prize|win|gift|voucher|خصم|coupon)/i.test(line));
  return prizeLine ? prizeLine.slice(0, 120) : '';
}

function extractDeadlineFromText(text: string): string | null {
  const normalized = text.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const directDate = normalized.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/);
  if (directDate?.[1]) {
    const date = new Date(`${directDate[1]}T23:59:59Z`);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const dayMonthYear = normalized.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (dayMonthYear) {
    const year = dayMonthYear[3].length === 2 ? `20${dayMonthYear[3]}` : dayMonthYear[3];
    const date = new Date(`${year}-${dayMonthYear[2].padStart(2, '0')}-${dayMonthYear[1].padStart(2, '0')}T23:59:59Z`);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  return null;
}

export function suggestCardFieldsFromSourceText(sourceText: string): ExternalPostSuggestion {
  const text = String(sourceText || '').trim();
  if (!text) {
    return {
      title: '',
      prize: '',
      chips: [],
      extra_text: '',
      deadline: null,
    };
  }

  const lower = text.toLowerCase();
  const chips = new Set<string>();
  if (/(لايك|like)/i.test(lower)) chips.add('like');
  if (/(كومنت|comment|علق|تعليق)/i.test(lower)) chips.add('comment');
  if (/(tag|منشن|mention)/i.test(lower)) chips.add('tag');
  if (/(follow|تابع|متابعة)/i.test(lower)) chips.add('follow');
  if (/(share|مشاركة)/i.test(lower)) chips.add('share');
  if (/(link|الرابط|زيارة)/i.test(lower)) chips.add('visit_link');

  return {
    title: pickTitleFromText(text),
    prize: pickPrizeFromText(text),
    chips: Array.from(chips).filter(isAllowedChip),
    extra_text: text.slice(0, 300),
    deadline: extractDeadlineFromText(text),
  };
}

export const EXTERNAL_POST_ALLOWED_CHIPS = ALLOWED_CHIPS;
