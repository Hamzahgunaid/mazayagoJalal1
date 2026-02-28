export type ParsedPostUrl = {
  fb_post_id: string | null;
  page_id_from_url?: string | null;
  post_part?: string | null;
  error?: string;
};

function cleanDigits(input: string | null | undefined) {
  const v = String(input || '').trim();
  return /^\d+$/.test(v) ? v : null;
}

function getHost(input: URL) {
  return String(input.hostname || '').toLowerCase();
}

export function parseFacebookPostUrl(postUrl: string, connectedPageId?: string | null): ParsedPostUrl {
  const urlRaw = String(postUrl || '').trim();
  if (!urlRaw) return { fb_post_id: null, error: 'empty_url' };

  const asCanonical = urlRaw.match(/^(\d+)_(\d+)$/);
  if (asCanonical) {
    return {
      fb_post_id: `${asCanonical[1]}_${asCanonical[2]}`,
      page_id_from_url: asCanonical[1],
      post_part: asCanonical[2],
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    return { fb_post_id: null, error: 'invalid_url' };
  }

  const host = getHost(parsed);
  if (!host.includes('facebook.com') && !host.includes('fb.watch')) {
    return { fb_post_id: null, error: 'not_facebook_url' };
  }

  const path = decodeURIComponent(parsed.pathname || '/');
  const connected = cleanDigits(connectedPageId || '');

  const storyFbid = cleanDigits(parsed.searchParams.get('story_fbid'));
  const idParam = cleanDigits(parsed.searchParams.get('id'));
  if ((path.includes('/permalink.php') || path.includes('/story.php')) && storyFbid && idParam) {
    return {
      fb_post_id: `${idParam}_${storyFbid}`,
      page_id_from_url: idParam,
      post_part: storyFbid,
    };
  }

  const postsMatch = path.match(/\/posts\/(\d+)/i);
  if (postsMatch?.[1]) {
    const postPart = postsMatch[1];
    const pathPage = cleanDigits(path.slice(1).split('/')[0] || '');
    const page = pathPage || connected;
    if (!page) return { fb_post_id: null, post_part: postPart, error: 'requires_connected_page' };
    return { fb_post_id: `${page}_${postPart}`, page_id_from_url: page, post_part: postPart };
  }

  const fbid = cleanDigits(parsed.searchParams.get('fbid'));
  if (path.includes('/photo/') && fbid) {
    if (!connected) return { fb_post_id: null, post_part: fbid, error: 'requires_connected_page' };
    return { fb_post_id: `${connected}_${fbid}`, page_id_from_url: connected, post_part: fbid };
  }

  const sharePath = /\/share\/p\//i.test(path);
  if (sharePath) {
    return { fb_post_id: null, error: 'share_link_requires_resolution' };
  }

  if (host.includes('fb.watch')) {
    return { fb_post_id: null, error: 'fb_watch_requires_resolution' };
  }

  return { fb_post_id: null, error: 'unsupported_format' };
}
