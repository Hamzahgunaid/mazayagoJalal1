export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

  const client = await pool.connect();
  try {
    // تأكد أن المسابقة موجودة
    const exists = await client.query(`select 1 from public.contests where id = $1`, [id]);
    if (exists.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const q = await client.query(
      `
      select
        e.id,
        e.user_id,
        e.answer_text,
        e.status,
        e.created_at,
        e.asset_url,
        e.prediction_team_a_score,
        e.prediction_team_b_score,
        e.prediction_winner,
        u.display_name as user_display_name,
        u.full_name as user_full_name,
        u.avatar_url as user_avatar_url
      from public.contest_entries e
      left join public.users u on u.id = e.user_id
      where e.contest_id = $1
      order by e.created_at desc
      limit $2 offset $3
      `,
      [id, limit, offset]
    );

    const items = q.rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user: {
        name: r.user_display_name || r.user_full_name || 'Participant',
        avatar_url: r.user_avatar_url || null,
      },
      answer_text: r.answer_text,
      prediction_team_a_score: r.prediction_team_a_score,
      prediction_team_b_score: r.prediction_team_b_score,
      prediction_winner: r.prediction_winner,
      status: r.status,
      created_at: r.created_at,
      asset_url: r.asset_url,
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error('entries by-id GET error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
