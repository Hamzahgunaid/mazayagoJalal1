import { NextResponse } from 'next/server';

import { pool } from '@/lib/db';
import { isAllowedChip } from '@/lib/externalContestPosts';
import { requireExternalContestStaff } from '@/lib/auth/externalContestStaff';
import { getExternalContestPostById } from '@/lib/server/externalContestPostsRepo';

export const dynamic = 'force-dynamic';

type PatchBody = {
  source_account_name?: string | null;
  source_account_url?: string | null;
  source_text?: string | null;
  source_media_urls?: string[];
  source_media_cover_url?: string | null;
  card_title?: string;
  card_prize?: string;
  card_how_to_enter?: { chips?: string[]; extra_text?: string };
  card_deadline_at?: string | null;
  review_badge?: 'UNREVIEWED' | 'REVIEWED';
  winners_status?: 'WINNERS_UNKNOWN' | 'WINNERS_PUBLISHED';
  winners_evidence_url?: string | null;
};

export async function GET(_: Request, context: { params: { id: string } }) {
  const auth = await requireExternalContestStaff();
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? 'unauthorized' : 'forbidden' }, { status: auth.status });

  const row = await getExternalContestPostById(context.params.id);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ item: row });
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const auth = await requireExternalContestStaff();
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? 'unauthorized' : 'forbidden' }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as PatchBody;
  const chips = Array.isArray(body.card_how_to_enter?.chips)
    ? body.card_how_to_enter!.chips.filter((chip) => isAllowedChip(String(chip)))
    : [];

  const reviewBadge = body.review_badge === 'REVIEWED' ? 'REVIEWED' : 'UNREVIEWED';
  const winnersStatus = body.winners_status === 'WINNERS_PUBLISHED' ? 'WINNERS_PUBLISHED' : 'WINNERS_UNKNOWN';

  const { rows } = await pool.query(
    `UPDATE public.external_contest_posts
        SET source_account_name = COALESCE($2, source_account_name),
            source_account_url = COALESCE($3, source_account_url),
            source_text = COALESCE($4, source_text),
            source_media_urls = COALESCE($5::jsonb, source_media_urls),
            source_media_cover_url = COALESCE($6, source_media_cover_url),
            card_title = COALESCE($7, card_title),
            card_prize = COALESCE($8, card_prize),
            card_how_to_enter = COALESCE($9::jsonb, card_how_to_enter),
            card_deadline_at = $10,
            review_badge = $11::public.external_post_review_badge,
            reviewed_by_user_id = CASE WHEN $11 = 'REVIEWED' THEN $12 ELSE NULL END,
            winners_status = $13::public.external_post_winners_status,
            winners_evidence_url = $14
      WHERE id = $1
      RETURNING id`,
    [
      context.params.id,
      body.source_account_name || null,
      body.source_account_url || null,
      body.source_text || null,
      Array.isArray(body.source_media_urls) ? JSON.stringify(body.source_media_urls.filter(Boolean)) : null,
      body.source_media_cover_url || null,
      body.card_title?.trim() || null,
      body.card_prize?.trim() || null,
      body.card_how_to_enter
        ? JSON.stringify({
            chips,
            extra_text: String(body.card_how_to_enter.extra_text || '').trim(),
          })
        : null,
      body.card_deadline_at || null,
      reviewBadge,
      auth.user.id,
      winnersStatus,
      body.winners_evidence_url || null,
    ],
  );

  if (!rows[0]) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
