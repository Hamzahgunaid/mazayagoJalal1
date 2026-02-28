export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { decryptString } from '@/lib/messengerCrypto';

async function requireContestOwner(contestId: string) {
  const user = await currentUser();
  if (!user) {
    return { response: NextResponse.json({ ok: false, error: { message: 'unauthorized' } }, { status: 401 }) };
  }

  const q = await pool.query(
    `select id from public.contests where id=$1 and created_by_user_id=$2 limit 1`,
    [contestId, user.id],
  );
  if (q.rowCount === 0) {
    return { response: NextResponse.json({ ok: false, error: { message: 'forbidden' } }, { status: 403 }) };
  }

  return { response: null as NextResponse | null };
}

function graphErrorPayload(payload: any) {
  return {
    message: String(payload?.error?.message || payload?.message || 'Graph request failed'),
    code: payload?.error?.code ?? null,
    type: payload?.error?.type ?? null,
  };
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const contestId = ctx.params?.id;
  if (!contestId) return NextResponse.json({ ok: false, error: { message: 'Missing contest id' } }, { status: 400 });

  const { response } = await requireContestOwner(contestId);
  if (response) return response;

  const postId = String(new URL(req.url).searchParams.get('post_id') || '').trim();
  if (!postId) return NextResponse.json({ ok: false, error: { message: 'post_id required' } }, { status: 400 });

  const pageRes = await pool.query(
    `select fb_page_id, page_access_token_enc from public.messenger_pages where contest_id=$1 and is_active=true limit 1`,
    [contestId],
  );
  if (pageRes.rowCount === 0) {
    return NextResponse.json({ ok: false, error: { message: 'Missing active page token' } }, { status: 400 });
  }

  const fbPageId = String(pageRes.rows[0].fb_page_id || '').trim();
  const tokenEnc = String(pageRes.rows[0].page_access_token_enc || '').trim();
  if (!fbPageId || !tokenEnc) {
    return NextResponse.json({ ok: false, error: { message: 'Missing active page token' } }, { status: 400 });
  }

  try {
    const token = decryptString(tokenEnc);

    const postParams = new URLSearchParams({
      fields: 'id,from{id,name},permalink_url,created_time',
      access_token: token,
    });
    const postRes = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(postId)}?${postParams.toString()}`);
    const postJson = await postRes.json().catch(() => null);
    if (!postRes.ok) {
      return NextResponse.json({ ok: false, error: graphErrorPayload(postJson) }, { status: 502 });
    }

    const commentsParams = new URLSearchParams({
      fields: 'id,message,created_time,from{id,name}',
      limit: '5',
      access_token: token,
    });
    const commentsRes = await fetch(
      `https://graph.facebook.com/v24.0/${encodeURIComponent(postId)}/comments?${commentsParams.toString()}`,
    );
    const commentsJson = await commentsRes.json().catch(() => null);
    if (!commentsRes.ok) {
      return NextResponse.json({ ok: false, error: graphErrorPayload(commentsJson) }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      post: postJson,
      comments_sample: Array.isArray(commentsJson?.data) ? commentsJson.data : [],
      used_page_id: fbPageId,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: String(error?.message || error),
          code: null,
          type: null,
        },
      },
      { status: 500 },
    );
  }
}
