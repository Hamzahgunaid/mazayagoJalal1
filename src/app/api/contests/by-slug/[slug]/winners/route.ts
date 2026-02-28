import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 15;

export async function GET(_req: Request, ctx: { params: { slug: string } }) {
  const slug = ctx.params?.slug;
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const { rows } = await pool.query(
    `SELECT * FROM public.contest_full_v WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

