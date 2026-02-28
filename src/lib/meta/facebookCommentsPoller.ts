import { pool } from '@/lib/db';
import { decryptString } from '@/lib/messengerCrypto';
import { processFacebookCommentsWebhookPayload } from '@/lib/meta/facebookCommentsHandler';

type ActiveSource = {
  contest_id: string;
  fb_page_id: string;
  fb_post_id: string;
  page_access_token_enc: string;
};

async function fetchRecentComments(source: ActiveSource) {
  const token = decryptString(String(source.page_access_token_enc || ''));
  const params = new URLSearchParams({
    fields: 'id,message,created_time,from{id,name},parent{id}',
    limit: '100',
    access_token: token,
  });
  const res = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(source.fb_post_id)}/comments?${params.toString()}`);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(String(json?.error?.message || json?.message || `Graph error ${res.status}`));
  }
  return Array.isArray(json?.data) ? json.data : [];
}

async function ingestSourceComments(source: ActiveSource) {
  const before = await pool.query(
    `select count(*)::int as c from public.facebook_comment_entries where contest_id=$1 and fb_post_id=$2`,
    [source.contest_id, source.fb_post_id],
  );
  const beforeCount = Number(before.rows[0]?.c || 0);

  const comments = await fetchRecentComments(source);
  for (const comment of comments) {
    const payload = {
      object: 'page',
      entry: [
        {
          id: source.fb_page_id,
          changes: [
            {
              field: 'feed',
              value: {
                item: 'comment',
                verb: 'add',
                post_id: source.fb_post_id,
                comment_id: String(comment?.id || ''),
                id: String(comment?.id || ''),
                from: { id: String(comment?.from?.id || '') },
                message: comment?.message ? String(comment.message) : '',
                parent_id: String(comment?.parent?.id || source.fb_post_id),
              },
            },
          ],
        },
      ],
    };
    await processFacebookCommentsWebhookPayload(payload);
  }

  const after = await pool.query(
    `select count(*)::int as c from public.facebook_comment_entries where contest_id=$1 and fb_post_id=$2`,
    [source.contest_id, source.fb_post_id],
  );
  const afterCount = Number(after.rows[0]?.c || 0);

  return {
    post_id: source.fb_post_id,
    fetched: comments.length,
    inserted: Math.max(0, afterCount - beforeCount),
  };
}

export async function pollContestFacebookComments(contestId: string) {
  const sourcesRes = await pool.query(
    `
    select s.contest_id, s.fb_page_id, s.fb_post_id, m.page_access_token_enc
      from public.facebook_comment_sources s
      join public.messenger_pages m
        on m.contest_id=s.contest_id
       and m.fb_page_id=s.fb_page_id
       and m.is_active=true
     where s.contest_id=$1
       and s.is_active=true
       and coalesce(s.fb_page_id,'')<>''
       and coalesce(s.fb_post_id,'')<>''
    `,
    [contestId],
  );

  const items = [] as any[];
  let inserted = 0;
  for (const source of sourcesRes.rows as ActiveSource[]) {
    const result = await ingestSourceComments(source);
    items.push(result);
    inserted += Number(result.inserted || 0);
  }

  return { sources: items.length, inserted, items };
}

export async function pollAllActiveFacebookComments() {
  const contestRes = await pool.query(
    `
    select distinct s.contest_id
      from public.facebook_comment_sources s
      join public.messenger_pages m
        on m.contest_id=s.contest_id
       and m.fb_page_id=s.fb_page_id
       and m.is_active=true
     where s.is_active=true
       and coalesce(s.fb_page_id,'')<>''
       and coalesce(s.fb_post_id,'')<>''
    `,
  );

  const details = [] as any[];
  let inserted = 0;
  for (const row of contestRes.rows as { contest_id: string }[]) {
    const result = await pollContestFacebookComments(row.contest_id);
    details.push({ contest_id: row.contest_id, ...result });
    inserted += Number(result.inserted || 0);
  }

  return { contests: details.length, inserted, details };
}
