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
  const q = await pool.query(`select id from public.contests where id=$1 and created_by_user_id=$2 limit 1`, [contestId, user.id]);
  if (q.rowCount === 0) {
    return { response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { response: null as NextResponse | null };
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const contestId = ctx.params?.id;
  if (!contestId) return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });

  const { response } = await requireContestOwner(contestId);
  if (response) return response;

  const limitRaw = Number(new URL(req.url).searchParams.get('limit') || 25);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 25;

  const pageRes = await pool.query(
    `select fb_page_id, page_access_token_enc from public.messenger_pages where contest_id=$1 and is_active=true limit 1`,
    [contestId],
  );
  if (pageRes.rowCount === 0) {
    return NextResponse.json({ ok: false, error: 'Connect a Facebook page first.' }, { status: 400 });
  }

  const fbPageId = String(pageRes.rows[0].fb_page_id || '');
  const tokenEnc = String(pageRes.rows[0].page_access_token_enc || '');
  if (!fbPageId || !tokenEnc) {
    return NextResponse.json({ ok: false, error: 'Missing active page token.' }, { status: 400 });
  }

  const token = decryptString(tokenEnc);
  const params = new URLSearchParams({
    fields: 'id,message,created_time,permalink_url',
    limit: String(limit),
    access_token: token,
  });

  const graphRes = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(fbPageId)}/feed?${params.toString()}`);
  const graphJson = await graphRes.json().catch(() => null);
  if (!graphRes.ok) {
    return NextResponse.json(
      { ok: false, error: String(graphJson?.error?.message || graphJson?.message || 'Failed to load posts from Graph') },
      { status: 502 },
    );
  }

  const posts = (Array.isArray(graphJson?.data) ? graphJson.data : [])
    .map((item: any) => ({
      id: String(item?.id || ''),
      message_preview: String(item?.message || '').slice(0, 160),
      created_time: item?.created_time ? String(item.created_time) : null,
      permalink_url: item?.permalink_url ? String(item.permalink_url) : null,
    }))
    .filter((item: any) => !!item.id);

  return NextResponse.json({ ok: true, fb_page_id: fbPageId, posts });
}
