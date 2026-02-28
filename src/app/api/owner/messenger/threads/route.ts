export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool, requireUser } from '@/app/api/owner/_helpers';
import { isPlatformAdmin } from '@/lib/session';

export async function GET(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const url = new URL(req.url);
  const contestId = url.searchParams.get('contest_id') || '';
  const fbPageId = url.searchParams.get('fb_page_id') || '';
  const psid = url.searchParams.get('psid') || '';

  if (!contestId || !fbPageId || !psid) {
    return NextResponse.json({ error: 'Missing contest_id, fb_page_id, or psid.' }, { status: 400 });
  }

  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) {
    const ownerCheck = await pool.query(
      `select id from public.contests where id=$1 and created_by_user_id=$2 limit 1`,
      [contestId, user.id],
    );
    if (ownerCheck.rowCount === 0) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const { rows } = await pool.query(
    `
    select id, contest_id, fb_page_id, right(psid,6) as psid_last6,
           cursor_index, current_task_id, status, created_at, updated_at
      from public.messenger_threads
     where contest_id=$1 and fb_page_id=$2 and psid=$3
     limit 1
    `,
    [contestId, fbPageId, psid],
  );

  return NextResponse.json({ ok: true, data: rows[0] ?? null });
}
