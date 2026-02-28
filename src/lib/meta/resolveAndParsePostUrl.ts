export type CanonicalParsedPostUrl = {
  pageId: string;
  storyId: string;
  fb_post_id: string;
};

function cleanDigits(value: string | null | undefined): string | null {
  const v = String(value || '').trim();
  return /^\d+$/.test(v) ? v : null;
}

function looksCanonicalPostId(value: string): CanonicalParsedPostUrl | null {
  const match = String(value || '').trim().match(/(\d+)_(\d+)/);
  if (!match) return null;
  const pageId = cleanDigits(match[1]);
  const storyId = cleanDigits(match[2]);
  if (!pageId || !storyId) return null;
  return { pageId, storyId, fb_post_id: `${pageId}_${storyId}` };
}

function extractHtmlRedirectCandidates(html: string): string[] {
  const source = String(html || '');
  if (!source) return [];

  const candidates = new Set<string>();

  const patterns = [
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/gi,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/gi,
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(source)) !== null) {
      if (m[1]) candidates.add(m[1].trim());
    }
  }

  return Array.from(candidates).filter(Boolean);
}

export function parseCanonicalFacebookPostUrl(finalUrl: string, connectedPageId?: string | null): CanonicalParsedPostUrl | null {
  const raw = String(finalUrl || '').trim();
  if (!raw) return null;

  const fromRaw = looksCanonicalPostId(raw);
  if (fromRaw) return fromRaw;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.includes('facebook.com') && !host.includes('fb.watch')) {
    return null;
  }

  const pathname = decodeURIComponent(parsed.pathname || '/');

  const storyFbid = cleanDigits(parsed.searchParams.get('story_fbid'));
  const idParam = cleanDigits(parsed.searchParams.get('id'));
  if ((pathname.includes('/permalink.php') || pathname.includes('/story.php')) && storyFbid && idParam) {
    return { pageId: idParam, storyId: storyFbid, fb_post_id: `${idParam}_${storyFbid}` };
  }

  const fbid = cleanDigits(parsed.searchParams.get('fbid'));
  if (pathname.includes('/photo/') && fbid) {
    const pageId = cleanDigits(connectedPageId || '');
    if (!pageId) return null;
    return { pageId, storyId: fbid, fb_post_id: `${pageId}_${fbid}` };
  }

  const postMatch = pathname.match(/\/posts\/(\d+)/i);
  if (postMatch?.[1]) {
    const storyId = cleanDigits(postMatch[1]);
    if (!storyId) return null;

    const prefix = pathname.slice(1).split('/')[0] || '';
    const pageFromPath = cleanDigits(prefix);
    if (pageFromPath) {
      return { pageId: pageFromPath, storyId, fb_post_id: `${pageFromPath}_${storyId}` };
    }

    const fallbackPageId = cleanDigits(connectedPageId || '');
    if (!fallbackPageId) return null;
    return { pageId: fallbackPageId, storyId, fb_post_id: `${fallbackPageId}_${storyId}` };
  }

  const canonicalInUrl = looksCanonicalPostId(`${pathname}?${parsed.search}`);
  if (canonicalInUrl) return canonicalInUrl;

  return null;
}

export async function resolveFacebookUrl(inputUrl: string): Promise<{ finalUrl: string; html?: string | null }> {
  const raw = String(inputUrl || '').trim();
  if (!raw) return { finalUrl: raw, html: null };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { finalUrl: raw, html: null };
  }

  const host = parsed.hostname.toLowerCase();
  const isFacebookLike =
    host.includes('facebook.com') || host.includes('fb.watch') || host === 'l.facebook.com' || host === 'lm.facebook.com';

  if (!isFacebookLike) {
    return { finalUrl: raw, html: null };
  }

  try {
    const response = await fetch(raw, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'text/html',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const html = contentType.includes('text/html') ? await response.text() : null;

    return { finalUrl: response.url || raw, html };
  } catch {
    return { finalUrl: raw, html: null };
  }
}

async function resolveFromGraphByUrl(inputUrl: string, connectedPageId: string, pageToken: string): Promise<CanonicalParsedPostUrl | null> {
  try {
    const lookupParams = new URLSearchParams({
      id: inputUrl,
      fields: 'og_object{id}',
      access_token: pageToken,
    });
    const lookupRes = await fetch(`https://graph.facebook.com/v24.0/?${lookupParams.toString()}`);
    const lookupJson = await lookupRes.json().catch(() => null);
    const ogId = String(lookupJson?.og_object?.id || '').trim();
    if (!lookupRes.ok || !ogId) return null;

    const verifyParams = new URLSearchParams({
      fields: 'id,from{id},permalink_url',
      access_token: pageToken,
    });
    const postRes = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(ogId)}?${verifyParams.toString()}`);
    const postJson = await postRes.json().catch(() => null);
    if (!postRes.ok) return null;

    const fromId = String(postJson?.from?.id || '').trim();
    if (!fromId || fromId !== connectedPageId) return null;

    const canonical = looksCanonicalPostId(String(postJson?.id || ''));
    if (canonical) return canonical;

    const permalink = String(postJson?.permalink_url || '').trim();
    if (!permalink) return null;
    return parseCanonicalFacebookPostUrl(permalink, connectedPageId);
  } catch {
    return null;
  }
}

export async function resolveAndParseFacebookPostUrl(
  inputUrl: string,
  connectedPageId?: string | null,
  pageToken?: string | null,
) {
  const directParsed = parseCanonicalFacebookPostUrl(inputUrl, connectedPageId);
  if (directParsed) {
    return { finalUrl: inputUrl, parsed: directParsed };
  }

  const { finalUrl, html } = await resolveFacebookUrl(inputUrl);
  const parsedFromFinal = parseCanonicalFacebookPostUrl(finalUrl, connectedPageId);
  if (parsedFromFinal) {
    return { finalUrl, parsed: parsedFromFinal };
  }

  for (const candidate of extractHtmlRedirectCandidates(html || '')) {
    const parsedFromHtmlCandidate = parseCanonicalFacebookPostUrl(candidate, connectedPageId);
    if (parsedFromHtmlCandidate) {
      return { finalUrl: candidate, parsed: parsedFromHtmlCandidate };
    }
  }

  const pageId = cleanDigits(connectedPageId || '');
  const token = String(pageToken || '').trim();
  if (pageId && token) {
    const graphResolved = await resolveFromGraphByUrl(inputUrl, pageId, token);
    if (graphResolved) {
      return { finalUrl, parsed: graphResolved };
    }
  }

  return { finalUrl, parsed: null };
}
