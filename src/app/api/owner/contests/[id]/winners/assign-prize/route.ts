import { NextResponse } from 'next/server';

import { requireUser } from '@/app/api/owner/_helpers';
import { getContestAccessById } from '@/lib/auth/contestAccess';
import { pool } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (response) return response;

  const contestId = params.id;
  const access = await getContestAccessById({ contestId, user });
  if (!access.ok || !access.canReviewEntries) {
    return NextResponse.json({ error: 'FORBIDDEN', code: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const prizeId = typeof body?.prizeId === 'string' ? body.prizeId : '';
  if (!prizeId) {
    return NextResponse.json({ error: 'PRIZE_REQUIRED', code: 'PRIZE_REQUIRED' }, { status: 400 });
  }
  const onlyUnassigned = body?.onlyUnassigned !== false;

  const { rows } = await pool.query(
    `
      UPDATE public.contest_winners
      SET prize_id = $1
      WHERE contest_id = $2
        AND published_at IS NOT NULL
        AND ($3::boolean = FALSE OR prize_id IS NULL)
      RETURNING id
    `,
    [prizeId, contestId, onlyUnassigned],
  );

  return NextResponse.json({ ok: true, updatedCount: rows.length });
}
