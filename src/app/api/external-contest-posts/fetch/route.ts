import { NextResponse } from 'next/server';

import { normalizeExternalContestUrl } from '@/lib/externalContestPosts';

export const dynamic = 'force-dynamic';

type FetchBody = { url?: string };
type Platform = 'facebook' | 'instagram';

type FetchPayload = {
  platform: Platform;
  source_url: string;
  account_name: string | null;
  account_url: string | null;
  text: string | null;
  media_urls: string[];
  suggested_cover_url: string | null;
  embed_html: string | null;
  warnings?: string[];
};

type CacheEntry = {
  expiresAt: number;
  payload: FetchPayload;
};

const FETCH_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const GRAPH_VERSION = String(process.env.META_GRAPH_VERSION || 'v24.0').trim();
let tokenLogDone = false;

function detectPlatform(urlString: string): Platform | null {
  try {
    const host = new URL(urlString).hostname.toLowerCase();
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
    return null;
  } catch {
    return null;
  }
}

function resolveOembedAccessToken() {
  const direct =
    process.env.META_OEMBED_ACCESS_TOKEN ||
    process.env.FACEBOOK_OEMBED_ACCESS_TOKEN ||
    process.env.META_APP_ACCESS_TOKEN ||
    process.env.FACEBOOK_APP_ACCESS_TOKEN ||
    '';

  const directTrimmed = String(direct).trim();
  if (directTrimmed) return directTrimmed;

  const preferredAppId = String(process.env.META_APP_ID || '').trim();
  const preferredSecret = String(process.env.META_APP_SECRET || '').trim();
  if (preferredAppId && preferredSecret) {
    return `${preferredAppId}|${preferredSecret}`;
  }

  const fallbackAppId = String(process.env.FACEBOOK_APP_ID || '').trim();
  const fallbackSecret = String(process.env.FACEBOOK_APP_SECRET || '').trim();
  if (fallbackAppId && fallbackSecret) {
    return `${fallbackAppId}|${fallbackSecret}`;
  }

  return '';
}

function logTokenAvailability(hasToken: boolean) {
  if (tokenLogDone) return;
  tokenLogDone = true;
  console.info(`[external-contest-posts/fetch] oEmbed token configured: ${hasToken ? 'yes' : 'no'}`);
}

function decodeEscapedUrl(input: string) {
  return input
    .replace(/\\u0025/g, '%')
    .replace(/\\u002F/g, '/')
    .replace(/\\u003A/g, ':')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .trim();
}

function decodeHtmlEntities(input: string | null): string | null {
  if (!input) return null;

  const namedEntities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };

  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(String(hex), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(String(dec), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&([a-z]+);/gi, (entity, key) => namedEntities[String(key).toLowerCase()] || entity);
}

function extractMeta(html: string, key: string) {
  const rgx = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i');
  return html.match(rgx)?.[1]?.trim() || null;
}

function extractTitle(html: string) {
  const og = extractMeta(html, 'og:title');
  if (og) return decodeHtmlEntities(og);
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  return decodeHtmlEntities(title || null);
}

function extractDescription(html: string) {
  const description = extractMeta(html, 'og:description') || extractMeta(html, 'description');
  return decodeHtmlEntities(description);
}

function extractCanonical(html: string) {
  const canonicalLink = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
  if (canonicalLink) return canonicalLink;
  return extractMeta(html, 'og:url');
}

function extractMedia(html: string) {
  const media = new Set<string>();

  const metaRgx = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRgx.exec(html)) !== null) {
    if (match[1]) media.add(match[1].trim());
  }

  const jsonLdRgx = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = jsonLdRgx.exec(html)) !== null) {
    const payload = String(match[1] || '').trim();
    if (!payload) continue;
    try {
      const parsed = JSON.parse(payload);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        const image = (entry as any)?.image;
        if (typeof image === 'string') media.add(image);
        if (Array.isArray(image)) {
          for (const img of image) {
            if (typeof img === 'string') media.add(img);
            if (img && typeof img === 'object' && typeof img.url === 'string') media.add(img.url);
          }
        }
      }
    } catch {
      // ignore invalid json-ld
    }
  }

  const displayUrlRgx = /"(?:display_url|image_url|thumbnail_src)"\s*:\s*"([^"]+)"/g;
  while ((match = displayUrlRgx.exec(html)) !== null) {
    if (match[1]) media.add(decodeEscapedUrl(match[1]));
  }

  return Array.from(media)
    .map((url) => decodeEscapedUrl(url))
    .filter((url) => /^https?:\/\//i.test(url))
    .filter(
      (url) =>
        !/\/rsrc\.php/i.test(url) &&
        !/\/images\/instagram/i.test(url) &&
        !/facebook\.com\/images\//i.test(url) &&
        !/logo/i.test(url),
    );
}

function isRestrictedOrLoginPage(title: string | null, description: string | null, html: string) {
  const blob = `${title || ''}\n${description || ''}\n${html.slice(0, 6000)}`.toLowerCase();
  return (
    blob.includes('log into facebook') ||
    blob.includes('log in to facebook') ||
    blob.includes('facebook helps you connect and share') ||
    (blob.includes('instagram') && blob.includes('log in')) ||
    blob.includes('you must log in') ||
    blob.includes("content isn't available right now")
  );
}

function guessAccountNameFromUrl(url: string, platform: Platform) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (!parts.length) return null;
    if (platform === 'instagram') {
      if (parts[0] === 'p' || parts[0] === 'reel' || parts[0] === 'tv') return null;
      return parts[0].replace(/^@/, '');
    }
    return parts[0] === 'permalink.php' || parts[0] === 'story.php' ? null : parts[0];
  } catch {
    return null;
  }
}

function setCache(sourceUrl: string, payload: FetchPayload) {
  FETCH_CACHE.set(sourceUrl, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    payload,
  });
}

function getCached(sourceUrl: string): FetchPayload | null {
  const entry = FETCH_CACHE.get(sourceUrl);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    FETCH_CACHE.delete(sourceUrl);
    return null;
  }
  return entry.payload;
}

function isPermissionError(errorObj: any) {
  const message = String(errorObj?.message || '').toLowerCase();
  return Number(errorObj?.code) === 10 || message.includes('oembed read');
}

function isUnavailableError(errorObj: any) {
  const message = String(errorObj?.message || '').toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('does not exist') ||
    message.includes('cannot access') ||
    message.includes('not available') ||
    message.includes('private')
  );
}

async function fetchViaOembed(sourceUrl: string, platform: Platform, accessToken: string): Promise<FetchPayload | null> {
  if (!accessToken) return null;

  const endpoint =
    platform === 'instagram'
      ? `https://graph.facebook.com/${GRAPH_VERSION}/instagram_oembed`
      : `https://graph.facebook.com/${GRAPH_VERSION}/oembed_post`;

  const params = new URLSearchParams({
    url: sourceUrl,
    access_token: accessToken,
    omitscript: 'true',
  });

  const response = await fetch(`${endpoint}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const data = (await response.json().catch(() => null)) as any;
  if (!response.ok) {
    const errorObj = data?.error || data || {};
    if (isPermissionError(errorObj)) {
      throw new Response('ميزة oEmbed غير مفعّلة/غير معتمدة على التطبيق.', { status: 403 });
    }
    if (isUnavailableError(errorObj)) {
      throw new Response('المنشور غير متاح أو مقيّد الخصوصية.', { status: 404 });
    }
    return null;
  }

  const thumbnail = typeof data?.thumbnail_url === 'string' ? String(data.thumbnail_url) : null;
  const authorName = decodeHtmlEntities(typeof data?.author_name === 'string' ? data.author_name : null);
  const title = decodeHtmlEntities(typeof data?.title === 'string' ? data.title : null);
  return {
    platform,
    source_url: sourceUrl,
    account_name: authorName,
    account_url: typeof data?.author_url === 'string' ? data.author_url : null,
    text: title && title.trim().length > 0 ? title : null,
    media_urls: thumbnail ? [thumbnail] : [],
    suggested_cover_url: thumbnail,
    embed_html: typeof data?.html === 'string' ? data.html : null,
    warnings: thumbnail ? undefined : ['تعذر جلب بيانات المنشور. أكمل يدويًا.'],
  };
}

function partialPayload(platform: Platform, sourceUrl: string, warnings: string[]): FetchPayload {
  return {
    platform,
    source_url: sourceUrl,
    account_name: guessAccountNameFromUrl(sourceUrl, platform),
    account_url: null,
    text: null,
    media_urls: [],
    suggested_cover_url: null,
    embed_html: null,
    warnings,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as FetchBody;
  const original = String(body.url || '').trim();
  if (!original) {
    return NextResponse.json({ error: 'الرابط غير صالح.' }, { status: 400 });
  }

  const platform = detectPlatform(original);
  if (!platform) {
    return NextResponse.json({ error: 'الرابط غير صالح.' }, { status: 400 });
  }

  const normalized = normalizeExternalContestUrl(original);
  const canonicalUrl = normalized.canonicalUrl || original;

  const cached = getCached(canonicalUrl);
  if (cached) return NextResponse.json(cached);

  const accessToken = resolveOembedAccessToken();
  logTokenAvailability(Boolean(accessToken));

  try {
    const oembedPayload = await fetchViaOembed(canonicalUrl, platform, accessToken);
    if (oembedPayload) {
      setCache(canonicalUrl, oembedPayload);
      return NextResponse.json(oembedPayload);
    }

    const response = await fetch(canonicalUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MazayaGoBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.8,ar;q=0.7',
      },
    });

    const html = await response.text().catch(() => '');
    const canonicalFromHtml = extractCanonical(html);
    const canonical = normalizeExternalContestUrl(canonicalFromHtml || response.url || canonicalUrl).canonicalUrl || canonicalUrl;
    const mediaUrls = extractMedia(html);
    const title = extractTitle(html);
    const description = extractDescription(html);
    const restricted = isRestrictedOrLoginPage(title, description, html);

    const payload: FetchPayload = {
      platform,
      source_url: canonical,
      account_name: restricted ? guessAccountNameFromUrl(canonical, platform) : title || guessAccountNameFromUrl(canonical, platform),
      account_url: null,
      text: restricted ? null : description,
      media_urls: restricted ? [] : mediaUrls,
      suggested_cover_url: restricted ? null : mediaUrls[0] || null,
      embed_html: null,
      warnings: restricted || !mediaUrls.length ? ['تعذر جلب بيانات المنشور. أكمل يدويًا.'] : undefined,
    };

    setCache(canonicalUrl, payload);
    return NextResponse.json(payload);
  } catch (error: any) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }

    const payload = partialPayload(platform, canonicalUrl, ['تعذر جلب بيانات المنشور. أكمل يدويًا.']);
    setCache(canonicalUrl, payload);
    return NextResponse.json(payload);
  }
}
