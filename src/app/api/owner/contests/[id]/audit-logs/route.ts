import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUser } from '../../../_helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const contestId = params.id;
  if (!contestId) {
    return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT
          l.id,
          l.contest_id,
          l.actor_user_id AS actor_id,
          COALESCE(NULLIF(u.display_name, ''), NULLIF(u.full_name, '')) AS actor_name,
          l.action,
          l.payload,
          NULLIF(l.payload->>'message', '') AS message,
          l.created_at
        FROM public.contest_audit_logs l
        LEFT JOIN public.users u ON u.id = l.actor_user_id
        WHERE l.contest_id = $1
        ORDER BY l.created_at DESC
        LIMIT 100
      `,
      [contestId],
    );

    return NextResponse.json({ items: rows });
  } catch (error: any) {
    console.error('contest audit logs error', error);
    return NextResponse.json(
      { error: 'Unable to load audit logs', detail: String(error?.message || error) },
      { status: 500 },
    );
  }
}
