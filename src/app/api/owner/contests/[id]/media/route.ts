export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { cookies, headers } from 'next/headers';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveUserIdStrict(): Promise<string|null> {
  const h = headers();
  const hdrUid = h.get('x-user-id');
  if (hdrUid && UUID_RE.test(hdrUid)) {
    const ok = await pool.query('SELECT 1 FROM public.users WHERE id=$1 LIMIT 1',[hdrUid]);
    if (ok.rowCount) return hdrUid;
  }
  const c = cookies();
  for (const k of ['rv_session','session','sid','token']) {
    const v = c.get(k)?.value;
    if (v && UUID_RE.test(v)) {
      const q = await pool.query(
        `SELECT user_id FROM public.user_sessions
          WHERE token=$1 AND (expires_at IS NULL OR expires_at>now())
          ORDER BY expires_at DESC NULLS LAST LIMIT 1`, [v]);
      if (q.rowCount) return q.rows[0].user_id as string;
    }
  }
  return null;
}

export async function GET(_req: Request, ctx: { params: { id: string }}) {
  const { id } = ctx.params || {};
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  try {
    const q = await pool.query(
      `SELECT id, url, kind, created_at
         FROM public.contest_media
        WHERE contest_id=$1
        ORDER BY created_at DESC`, [id]
    );
    return NextResponse.json({ items: q.rows });
  } catch (e:any) {
    return NextResponse.json({ error: 'Server error', detail: String(e?.message || e)}, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: { id: string }}) {
  const { id } = ctx.params || {};
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const uid = await resolveUserIdStrict();
  if (!uid) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });

  let body:any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error:'Invalid JSON'},{status:400}); }
  const items: Array<{url:string; kind?:string}> = Array.isArray(body) ? body : (body.items || []);
  const safe = items
    .map(x => ({ url: String(x?.url||'').trim(), kind: (x?.kind||'image').toString() }))
    .filter(x => x.url);

  if (safe.length === 0) return NextResponse.json({ error: 'no items' }, { status: 400 });

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const values: any[] = [];
      const rows: any[] = [];
      let i = 1;
      for (const it of safe) {
        values.push(id, it.url, it.kind);
        rows.push(`($${i++},$${i++},$${i++})`);
      }
      const ins = await client.query(
        `INSERT INTO public.contest_media (contest_id, url, kind)
             VALUES ${rows.join(',')}
             RETURNING id, url, kind, created_at`
      , values);
      await client.query('COMMIT');
      return NextResponse.json({ inserted: ins.rowCount, items: ins.rows });
    } catch (e:any) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error:'Server error', detail:String(e?.message||e)}, { status:500 });
    } finally { client.release(); }
  } catch (e:any) {
    return NextResponse.json({ error:'Server error', detail:String(e?.message||e)}, { status:500 });
  }
}
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const mediaId = body?.media_id as string | undefined;
  if (!mediaId) return NextResponse.json({ error: 'media_id required' }, { status: 400 });

  const client = await pool.connect();
  try {
    // احذف فقط لو كان السجل يخص هذا الـ contest
    const del = await client.query(
      `delete from public.contest_media where id = $1 and contest_id = $2`,
      [mediaId, id]
    );
    return NextResponse.json({ ok: true, deleted: del.rowCount || 0 });
  } catch (e: any) {
    console.error('owner media DELETE error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    client.release();
  }
}