import { NextResponse } from "next/server";

import { getContestAccessById } from "@/lib/auth/contestAccess";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const contestId = params.id;
  const user = await currentUser();

  let canViewUnpublished = false;
  if (user) {
    const access = await getContestAccessById({ contestId, user });
    canViewUnpublished = Boolean(access.ok && access.canReviewEntries);
  }

  const publishedFilter = canViewUnpublished
    ? ''
    : 'AND (w.published = TRUE OR w.published_at IS NOT NULL)';

  const { rows } = await pool.query(
    `
      SELECT
        w.id,
        w.contest_id,
        w.user_id,
        e.identity_id,
        w.entry_id,
        w.prize_id,
        w.decided_at,
        w.published_at,
        w.method_used,
        w.published,
        COALESCE(NULLIF(pi.display_name, ''), NULLIF(u.display_name, ''), NULLIF(u.full_name, '')) AS user_display_name,
        u.avatar_url AS user_avatar_url
      FROM public.contest_winners w
      LEFT JOIN public.contest_entries e
        ON e.id = w.entry_id
      LEFT JOIN public.users u
        ON u.id = COALESCE(w.user_id, e.user_id)
      LEFT JOIN public.participant_identities pi
        ON pi.id = e.identity_id
      WHERE w.contest_id = $1
      ${publishedFilter}
      ORDER BY w.published_at DESC NULLS LAST, w.decided_at DESC NULLS LAST, w.entry_id ASC
    `,
    [contestId],
  );

  return NextResponse.json(rows);
}
