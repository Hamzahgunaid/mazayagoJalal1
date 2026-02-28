import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUser } from '@/app/api/owner/_helpers';
import { getContestAccessById } from '@/lib/auth/contestAccess';

export async function PATCH(req: Request, { params }: { params: { id: string; winnerId: string } }) {
  const { user, response } = await requireUser();
  if (response) return response;

  const contestId = params.id;
  const access = await getContestAccessById({ contestId, user });
  if (!access.ok || !access.canReviewEntries) {
    return NextResponse.json({ error: 'FORBIDDEN', code: 'FORBIDDEN' }, { status: 403 });
  }
  const winnerId = params.winnerId;

  if (!contestId || !winnerId) {
    return NextResponse.json({ error: 'Missing contest or winner id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const prizeId = body?.prizeId ?? null;
  if (prizeId !== null && typeof prizeId !== 'string') {
    return NextResponse.json({ error: 'Invalid prize id' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
    const { rows } = await client.query(
      `
        UPDATE public.contest_winners
        SET prize_id = $3
        WHERE contest_id = $1 AND id = $2
        RETURNING *
      `,
      [contestId, winnerId, prizeId],
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Winner not found' }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ winner: rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('link prize error', error);
    return NextResponse.json(
      { error: 'Unable to link prize', detail: String(error?.message || error) },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
