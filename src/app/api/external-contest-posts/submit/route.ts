import { NextResponse } from 'next/server';

import { pool } from '@/lib/db';
import {
  EXTERNAL_POST_ALLOWED_CHIPS,
  inferPlatformFromUrl,
  isAllowedChip,
  normalizeExternalContestUrl,
} from '@/lib/externalContestPosts';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

type SubmitBody = {
  source_platform?: string;
  source_url?: string;
  source_account_name?: string | null;
  source_account_url?: string | null;
  source_text?: string | null;
  source_media_urls?: string[];
  source_media_cover_url?: string | null;
  card_title?: string;
  card_prize?: string;
  card_how_to_enter?: { chips?: string[]; extra_text?: string };
  card_deadline_at?: string | null;
};

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SubmitBody;

  if (!isNonEmpty(body.source_url) || !isNonEmpty(body.card_title) || !isNonEmpty(body.card_prize)) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const normalized = normalizeExternalContestUrl(body.source_url);
  if (!normalized.canonicalUrl) {
    return NextResponse.json({ error: 'الرابط غير صالح.' }, { status: 400 });
  }

  const sourcePlatform = body.source_platform === 'facebook' || body.source_platform === 'instagram'
    ? body.source_platform
    : inferPlatformFromUrl(normalized.canonicalUrl);

  if (!sourcePlatform) {
    return NextResponse.json({ error: 'الرابط غير صالح.' }, { status: 400 });
  }

  const chips = Array.isArray(body.card_how_to_enter?.chips)
    ? body.card_how_to_enter!.chips.filter((chip) => isAllowedChip(String(chip)))
    : [];

  const user = await currentUser();

  try {
    const { rows } = await pool.query(
      `INSERT INTO public.external_contest_posts (
          source_platform,
          source_url,
          source_account_name,
          source_account_url,
          source_text,
          source_media_urls,
          source_media_cover_url,
          card_title,
          card_prize,
          card_how_to_enter,
          card_deadline_at,
          status,
          review_badge,
          winners_status,
          created_by_user_id
        ) VALUES (
          $1::public.external_post_platform,
          $2,
          $3,
          $4,
          $5,
          $6::jsonb,
          $7,
          $8,
          $9,
          $10::jsonb,
          $11,
          'SUBMITTED',
          'UNREVIEWED',
          'WINNERS_UNKNOWN',
          $12
        )
        RETURNING id`,
      [
        sourcePlatform,
        normalized.canonicalUrl,
        body.source_account_name || null,
        body.source_account_url || null,
        body.source_text || null,
        JSON.stringify(Array.isArray(body.source_media_urls) ? body.source_media_urls.filter(Boolean) : []),
        body.source_media_cover_url || null,
        body.card_title.trim(),
        body.card_prize.trim(),
        JSON.stringify({
          chips,
          extra_text: String(body.card_how_to_enter?.extra_text || '').trim(),
        }),
        body.card_deadline_at || null,
        user?.id || null,
      ],
    );

    return NextResponse.json({
      id: rows[0]?.id,
      status: 'SUBMITTED',
      review_badge: 'UNREVIEWED',
      winners_status: 'WINNERS_UNKNOWN',
      allowed_chips: EXTERNAL_POST_ALLOWED_CHIPS,
    });
  } catch (error: any) {
    if (String(error?.message || '').includes('uq_external_contest_posts_source_url')) {
      return NextResponse.json({ error: 'duplicate_source_url' }, { status: 409 });
    }
    return NextResponse.json({ error: 'submit_failed' }, { status: 500 });
  }
}
