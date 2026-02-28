'use server';

import 'server-only';

import { cache } from 'react';
import { pool } from '@/lib/db';
import type { PublicOffer } from '@/types/offers';

const PUBLIC_STATUSES = ['ACTIVE', 'PAUSED', 'ENDED'] as const;
const PUBLIC_VISIBILITY = 'public';
const PUBLIC_STATUS_SET = new Set(PUBLIC_STATUSES);

const PUBLIC_OFFER_QUERY = `
  SELECT
    c.*,
    (
      SELECT COALESCE(json_agg(o ORDER BY o.position), '[]'::json)
      FROM public.contest_mcq_options o
      WHERE o.contest_id = c.id
    ) AS mcq_options,
    (
      SELECT COALESCE(json_agg(p ORDER BY p.created_at), '[]'::json)
      FROM public.contest_prizes p
      WHERE p.contest_id = c.id
    ) AS prizes,
    (
      SELECT json_build_object(
        'total', COUNT(*),
        'correct', COUNT(*) FILTER (WHERE e.status = 'CORRECT'),
        'pending', COUNT(*) FILTER (WHERE e.status = 'PENDING'),
        'needs_review', COUNT(*) FILTER (WHERE e.status = 'NEEDS_REVIEW')
      )
      FROM public.contest_entries e
      WHERE e.contest_id = c.id
    ) AS entries_stats,
    (
      SELECT EXISTS(
        SELECT 1 FROM public.contest_winners w
        WHERE w.contest_id = c.id AND w.published = TRUE
      )
    ) AS winners_published,
    (
      SELECT COUNT(*)::int
      FROM public.contest_winners w
      WHERE w.contest_id = c.id AND w.published = TRUE
    ) AS winners_count,
    (
      SELECT public_proof
      FROM public.contest_winners w
      WHERE w.contest_id = c.id AND w.published = TRUE
      ORDER BY w.published_at DESC NULLS LAST, w.decided_at DESC
      LIMIT 1
    ) AS public_proof,
    (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'user_id', r.user_id,
            'role', r.role,
            'full_name', u.full_name,
            'display_name', u.display_name
          )
          ORDER BY r.created_at
        ),
        '[]'::json
      )
      FROM public.contest_referees r
      LEFT JOIN public.users u ON u.id = r.user_id
      WHERE r.contest_id = c.id
    ) AS referees,
    (
      SELECT COALESCE(json_agg(m ORDER BY m.created_at), '[]'::json)
      FROM public.contest_media m
      WHERE m.contest_id = c.id
    ) AS media,
    (
      SELECT json_build_object(
        'link_id', co.id,
        'kind', co.organizer_kind,
        'id', CASE
          WHEN co.organizer_kind = 'USER' THEN co.organizer_user_id
          WHEN co.organizer_kind = 'BUSINESS' THEN co.organizer_business_id
          ELSE NULL
        END,
        'name', cos.display_name,
        'avatar', COALESCE(cos.display_avatar_url, cos.display_logo_url),
        'logo', cos.display_logo_url,
        'website', cos.display_website_url,
        'phone', cos.display_phone,
        'whatsapp', NULL,
        'href', CASE
          WHEN co.organizer_kind = 'USER' AND co.organizer_user_id IS NOT NULL
            THEN '/profile/' || co.organizer_user_id
          WHEN co.organizer_kind = 'BUSINESS' AND co.organizer_business_id IS NOT NULL
            THEN '/businesses/' || co.organizer_business_id
          ELSE NULL
        END,
        'snapshot', json_build_object(
          'display_name', cos.display_name,
          'display_avatar_url', cos.display_avatar_url,
          'display_logo_url', cos.display_logo_url,
          'display_website_url', cos.display_website_url,
          'display_phone', cos.display_phone,
          'display_social_json', cos.display_social_json,
          'display_meta_json', cos.display_meta_json
        )
      )
      FROM public.contest_organizers co
      LEFT JOIN public.contest_organizer_snapshots cos ON cos.contest_organizer_id = co.id
      WHERE co.id = c.primary_organizer_link_id
         OR (c.primary_organizer_link_id IS NULL AND co.contest_id = c.id)
      ORDER BY co.is_primary DESC, co.created_at ASC
      LIMIT 1
    ) AS organizer
  FROM public.contests c
  WHERE c.slug = $1
  LIMIT 1
`;

export const getPublicOfferBySlug = cache(async (rawSlug: string): Promise<PublicOffer | null> => {
  const slug = rawSlug?.trim();
  if (!slug) return null;

  try {
    const { rows } = await pool.query(PUBLIC_OFFER_QUERY, [slug]);
    const row = rows[0] as (PublicOffer & { visibility?: string | null; status?: string | null }) | undefined;
    if (!row) return null;

    const visibility = (row.visibility ?? '').toString().trim().toLowerCase();
    if (visibility !== PUBLIC_VISIBILITY) return null;

    const status = (row.status ?? '').toString().trim().toUpperCase();
    if (!PUBLIC_STATUS_SET.has(status as (typeof PUBLIC_STATUSES)[number])) return null;

    return { ...row, status };
  } catch (error) {
    console.error('[publicOffers] Failed to load offer', { slug, error });
    return null;
  }
});
