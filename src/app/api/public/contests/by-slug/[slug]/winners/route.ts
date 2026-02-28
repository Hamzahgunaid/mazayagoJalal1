import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 15;

export async function GET(
  _req: Request,
  ctx: { params: { slug: string } },
) {
  const slug = ctx.params?.slug;
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `
      SELECT
        w.id,
        w.contest_id,
        w.user_id,
        w.entry_id,
        w.prize_id,
        w.decided_at,
        w.published_at,
        w.method_used,
        w.public_proof,
        COALESCE(NULLIF(u.display_name, ''), NULLIF(u.full_name, '')) AS user_display_name,
        u.avatar_url AS user_avatar_url,
        p.name        AS prize_name,
        p.prize_summary AS prize_description
      FROM public.contest_winners_public_v w
      LEFT JOIN public.contest_entries e
        ON e.id = w.entry_id
      LEFT JOIN public.users u
        ON u.id = COALESCE(w.user_id, e.user_id)
      LEFT JOIN public.contest_prizes p
        ON p.id = w.prize_id
      WHERE w.slug = $1
      ORDER BY w.published_at DESC NULLS LAST,
               w.decided_at DESC NULLS LAST
    `,
    [slug],
  );

  return NextResponse.json({ winners: rows });
}
