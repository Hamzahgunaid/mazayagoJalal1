export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { pollContestFacebookComments } from '@/lib/meta/facebookCommentsPoller';

async function requireContestOwner(contestId: string) {
  const user = await currentUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }

  const q = await pool.query(
    `select id from public.contests where id=$1 and created_by_user_id=$2 limit 1`,
    [contestId, user.id],
  );
  if (q.rowCount === 0) {
    return { response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }

  return { response: null as NextResponse | null };
}

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const contestId = ctx.params?.id;
  if (!contestId) {
    return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });
  }

  const { response } = await requireContestOwner(contestId);
  if (response) return response;

  try {
    const result = await pollContestFacebookComments(contestId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
  }
}
