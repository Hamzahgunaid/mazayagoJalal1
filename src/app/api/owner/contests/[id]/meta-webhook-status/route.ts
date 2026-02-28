export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { decryptString } from '@/lib/messengerCrypto';

async function requireContestOwner(contestId: string) {
  const user = await currentUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }

  const q = await pool.query(
    `select id from public.contests where id=$1 and created_by_user_id=$2 limit 1`,
    [contestId, user.id],
  );
  if (q.rowCount === 0) {
    return { response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }

  return { response: null as NextResponse | null };
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const contestId = ctx.params?.id;
  if (!contestId) {
    return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });
  }

  const { response } = await requireContestOwner(contestId);
  if (response) return response;

  const pageRes = await pool.query(
    `
    select fb_page_id, page_access_token_enc
      from public.messenger_pages
     where contest_id=$1 and is_active=true
     limit 1
    `,
    [contestId],
  );

  const sourceRes = await pool.query(
    `
    select fb_post_id, is_active, updated_at
      from public.facebook_comment_sources
     where contest_id=$1
     limit 1
    `,
    [contestId],
  );

  const activePageId = pageRes.rowCount > 0 ? String(pageRes.rows[0].fb_page_id || '').trim() : '';

  const eventsRes = activePageId
    ? await pool.query(
        `
        select id, received_at, object, page_id, event_type, payload
          from public.meta_webhook_events
         where page_id=$1
         order by received_at desc
         limit 20
        `,
        [activePageId],
      )
    : { rows: [] as any[] };

  let subscribedApps: any = null;
  let subscribedAppsError: string | null = null;

  if (pageRes.rowCount > 0) {
    const fbPageId = activePageId;
    const enc = String(pageRes.rows[0].page_access_token_enc || '').trim();

    if (fbPageId && enc) {
      try {
        const token = decryptString(enc);
        const params = new URLSearchParams({
          fields: 'id,subscribed_fields',
          access_token: token,
        });
        const graphRes = await fetch(
          `https://graph.facebook.com/v24.0/${encodeURIComponent(fbPageId)}/subscribed_apps?${params.toString()}`,
        );
        const graphJson = await graphRes.json().catch(() => null);
        if (!graphRes.ok) {
          subscribedAppsError = String(graphJson?.error?.message || graphJson?.message || `Graph error ${graphRes.status}`);
        } else {
          subscribedApps = graphJson;
        }
      } catch (error: any) {
        subscribedAppsError = String(error?.message || error);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    active_page: pageRes.rowCount > 0
      ? {
          fb_page_id: activePageId || null,
        }
      : null,
    comment_source: sourceRes.rowCount > 0
      ? {
          exists: true,
          fb_post_id: sourceRes.rows[0].fb_post_id || null,
          is_active: sourceRes.rows[0].is_active ?? null,
          updated_at: sourceRes.rows[0].updated_at || null,
        }
      : {
          exists: false,
          fb_post_id: null,
        },
    last_events: eventsRes.rows,
    subscribed_apps: subscribedApps,
    subscribed_apps_error: subscribedAppsError,
  });
}
