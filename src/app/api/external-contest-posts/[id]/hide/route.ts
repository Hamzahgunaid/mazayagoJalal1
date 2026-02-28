import { NextResponse } from 'next/server';

import { pool } from '@/lib/db';
import { requireExternalContestStaff } from '@/lib/auth/externalContestStaff';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, context: { params: { id: string } }) {
  const auth = await requireExternalContestStaff();
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? 'unauthorized' : 'forbidden' }, { status: auth.status });

  const { rows } = await pool.query(
    `UPDATE public.external_contest_posts
        SET status = 'HIDDEN'
      WHERE id = $1
      RETURNING id`,
    [context.params.id],
  );

  if (!rows[0]) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, status: 'HIDDEN' });
}
