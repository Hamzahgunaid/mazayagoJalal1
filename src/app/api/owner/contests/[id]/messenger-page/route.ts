export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { encryptString } from '@/lib/messengerCrypto';

const MAX_PAGE_ID_LEN = 200;
const MAX_TOKEN_LEN = 2000;

async function subscribePageWebhook(fbPageId: string, pageAccessToken: string) {
  const params = new URLSearchParams({
    subscribed_fields: 'messages,messaging_postbacks,messaging_referrals,feed',
    access_token: pageAccessToken,
  });

  const res = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(fbPageId)}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const graphMessage =
      json?.error?.message ||
      json?.message ||
      'Failed to subscribe page webhook fields.';
    throw new Error(graphMessage);
  }

  const checkParams = new URLSearchParams({
    fields: 'id,subscribed_fields',
    access_token: pageAccessToken,
  });
  const checkRes = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(fbPageId)}/subscribed_apps?${checkParams.toString()}`);
  const checkJson = await checkRes.json().catch(() => null);
  if (!checkRes.ok) {
    const graphMessage =
      checkJson?.error?.message ||
      checkJson?.message ||
      'Failed to verify page webhook subscription.';
    throw new Error(graphMessage);
  }

  const apps = Array.isArray(checkJson?.data) ? checkJson.data : [];
  const feedIncluded = apps.some((app: any) => {
    const fields = Array.isArray(app?.subscribed_fields) ? app.subscribed_fields.map((f: any) => String(f).toLowerCase()) : [];
    return fields.includes('feed');
  });

  if (!feedIncluded) {
    throw new Error('Page subscribed_apps verification did not include feed field.');
  }
}

async function requireContestOwner(contestId: string) {
  const user = await currentUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }

  const q = await pool.query(
    `select id from public.contests where id=$1 and created_by_user_id=$2 limit 1`,
    [contestId, user.id]
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

  const q = await pool.query(
    `select contest_id, fb_page_id, page_access_token_last4, is_active, updated_at
       from public.messenger_pages
      where contest_id=$1
      limit 1`,
    [contestId]
  );

  if (q.rowCount === 0) {
    return NextResponse.json({ ok: true, data: null });
  }

  return NextResponse.json({ ok: true, data: q.rows[0] });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const contestId = ctx.params?.id;
  if (!contestId) {
    return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });
  }

  const { response } = await requireContestOwner(contestId);
  if (response) return response;

  const body = await req.json().catch(() => null);
  const fbPageId = String(body?.fb_page_id || '').trim();
  const pageAccessToken = String(body?.page_access_token || '').trim();

  if (!fbPageId || !pageAccessToken) {
    return NextResponse.json({ error: 'fb_page_id and page_access_token required' }, { status: 400 });
  }

  if (fbPageId.length > MAX_PAGE_ID_LEN || pageAccessToken.length > MAX_TOKEN_LEN) {
    return NextResponse.json({ error: 'Invalid input length' }, { status: 400 });
  }

  const enc = encryptString(pageAccessToken);
  const last4 = pageAccessToken.slice(-4);

  const updateByContest = await pool.query(
    `
    update public.messenger_pages
       set fb_page_id=$2,
           page_access_token_enc=$3,
           page_access_token_last4=$4,
           is_active=true,
           updated_at=now()
     where contest_id=$1
    `,
    [contestId, fbPageId, enc, last4],
  );

  if (updateByContest.rowCount === 0) {
    const updateByPage = await pool.query(
      `
      update public.messenger_pages
         set contest_id=$1,
             page_access_token_enc=$3,
             page_access_token_last4=$4,
             is_active=true,
             updated_at=now()
       where fb_page_id=$2
      `,
      [contestId, fbPageId, enc, last4],
    );

    if (updateByPage.rowCount === 0) {
      await pool.query(
        `
        insert into public.messenger_pages
          (contest_id, fb_page_id, page_access_token_enc, page_access_token_last4, is_active, updated_at)
        values
          ($1, $2, $3, $4, true, now())
        `,
        [contestId, fbPageId, enc, last4],
      );
    }
  }

  try {
    await subscribePageWebhook(fbPageId, pageAccessToken);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Saved page token but failed to subscribe webhook fields',
        detail: String(error?.message || error),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const contestId = ctx.params?.id;
  if (!contestId) {
    return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });
  }

  const { response } = await requireContestOwner(contestId);
  if (response) return response;

  await pool.query(
    `update public.messenger_pages
        set is_active=false,
            updated_at=now()
      where contest_id=$1`,
    [contestId]
  );

  return NextResponse.json({ ok: true });
}
