export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

type MediaItem = { id?: string; url: string; kind?: string };

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { rows } = await pool.query(
    `SELECT id, contest_id, url, kind, created_at
       FROM public.contest_media
      WHERE contest_id = $1
      ORDER BY created_at DESC`,
    [id]
  );
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const body = await req.json().catch(() => ({}));

  // يدعم { url, kind } أو { items: [{url, kind}, ...] }
  const items: MediaItem[] = Array.isArray(body?.items)
    ? body.items
    : body?.url
    ? [{ url: body.url, kind: body.kind || 'image' }]
    : [];

  if (!items.length) {
    return NextResponse.json({ error: 'No media items' }, { status: 400 });
  }

  const values: any[] = [];
  const placeholders: string[] = [];
  items.forEach((m, i) => {
    values.push(id, m.url, m.kind || 'image');
    placeholders.push(`($${values.length - 2}, $${values.length - 1}, $${values.length})`);
  });

  const q = await pool.query(
    `INSERT INTO public.contest_media (contest_id, url, kind)
     VALUES ${placeholders.join(', ')}
     RETURNING id, contest_id, url, kind, created_at`,
    values
  );
  return NextResponse.json({ inserted: q.rowCount, items: q.rows });
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  // حذف عنصر وسائط واحد: body = { media_id: "..." }
  const _contestId = ctx.params.id;
  const body = await req.json().catch(() => ({}));
  const mediaId = body?.media_id;
  if (!mediaId) return NextResponse.json({ error: 'media_id required' }, { status: 400 });

  const q = await pool.query(
    `DELETE FROM public.contest_media WHERE id = $1 RETURNING id`,
    [mediaId]
  );
  if (q.rowCount === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, media_id: mediaId });
}
