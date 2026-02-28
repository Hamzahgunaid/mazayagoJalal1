export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { slug: string }}) {
  const { slug } = params || {};
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const { rows } = await pool.query(
    `
    SELECT m.*
    FROM public.contests c
    JOIN public.contest_media m ON m.contest_id = c.id
    WHERE c.slug = $1
    ORDER BY m.created_at ASC
    `,
    [slug]
  );
  return NextResponse.json({ items: rows });
}
