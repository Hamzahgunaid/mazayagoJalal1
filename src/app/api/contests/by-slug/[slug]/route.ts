import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

export async function GET(_req: Request, ctx: { params: { slug: string } }) {
  const slug = ctx.params?.slug;
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE public.contests
          SET seed_commit = rules_json->>'seed_commit'
        WHERE slug = $1
          AND seed_commit IS NULL
          AND rules_json ? 'seed_commit'`,
      [slug],
    );
    const q = await client.query(
      `
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
        ) AS entries_stats
        ,
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
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', w.id,
                'contest_id', w.contest_id,
                'user_id', w.user_id,
                'entry_id', w.entry_id,
                'prize_id', w.prize_id,
                'decided_at', w.decided_at,
                'published_at', w.published_at,
                'method_used', w.method_used,
                'user_display_name', COALESCE(NULLIF(u.display_name, ''), NULLIF(u.full_name, '')),
                'user_avatar_url', u.avatar_url,
                'prize_name', p.name,
                'prize_description', p.prize_summary
              )
              ORDER BY w.published_at DESC NULLS LAST,
                       w.decided_at DESC NULLS LAST
            ),
            '[]'::json
          )
          FROM public.contest_winners_public_v w
          LEFT JOIN public.contest_entries e
            ON e.id = w.entry_id
          LEFT JOIN public.users u
            ON u.id = COALESCE(w.user_id, e.user_id)
          LEFT JOIN public.contest_prizes p
            ON p.id = w.prize_id
          WHERE w.slug = c.slug
        ) AS winners,
        (
          SELECT public_proof
          FROM public.contest_winners w
          WHERE w.contest_id = c.id AND w.published = TRUE
          ORDER BY w.published_at DESC NULLS LAST, w.decided_at DESC
          LIMIT 1
        ) AS public_proof
        ,
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
        ) AS organizer,
        (
          SELECT EXISTS(
            SELECT 1
            FROM public.contest_winners w
            WHERE w.contest_id = c.id
              AND w.published = TRUE
          )
        ) AS winners_published,
        (
          SELECT count(*)::int
          FROM public.contest_winners w
          WHERE w.contest_id = c.id
            AND w.published = TRUE
        ) AS winners_count,
        (
          SELECT public_proof
          FROM public.contest_winners w
          WHERE w.contest_id = c.id
            AND w.published = TRUE
          ORDER BY w.published_at DESC NULLS LAST, w.decided_at DESC
          LIMIT 1
        ) AS public_proof,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', w.id,
                'user_id', w.user_id,
                'entry_id', w.entry_id,
                'prize_id', w.prize_id,
                'decided_at', w.decided_at,
                'published_at', w.published_at,
                'method_used', w.method_used,
                'user_display_name', COALESCE(NULLIF(u.display_name, ''), NULLIF(u.full_name, '')),
                'user_avatar_url', u.avatar_url,
                'prize_name', p.name,
                'prize_description', p.prize_summary
              )
              ORDER BY w.published_at DESC NULLS LAST, w.decided_at DESC NULLS LAST
            ),
            '[]'::json
          )
          FROM public.contest_winners w
          LEFT JOIN public.contest_entries e
            ON e.id = w.entry_id
          LEFT JOIN public.users u
            ON u.id = COALESCE(w.user_id, e.user_id)
          LEFT JOIN public.contest_prizes p
            ON p.id = w.prize_id
          WHERE w.contest_id = c.id
            AND w.published = TRUE
        ) AS winners,
        (
          SELECT EXISTS(
            SELECT 1 FROM public.contest_winners w
            WHERE w.contest_id = c.id
              AND w.published = TRUE
          )
        ) AS has_published_winners
        ,
        (
          SELECT json_build_object(
            'messenger', json_build_object(
              'enabled', COALESCE(mp.is_active, false),
              'page_id', mp.fb_page_id,
              'link', CASE
                WHEN mp.is_active = true AND mp.fb_page_id IS NOT NULL
                  THEN 'https://m.me/' || mp.fb_page_id || '?ref=' || c.slug
                ELSE NULL
              END
            ),
            'comments', json_build_object(
              'enabled', COALESCE(fcs.is_active, false),
              'page_id', fcs.fb_page_id,
              'post_id', fcs.fb_post_id,
              'link', CASE
                WHEN fcs.is_active = true AND fcs.fb_page_id IS NOT NULL AND fcs.fb_post_id IS NOT NULL
                  THEN 'https://www.facebook.com/' || fcs.fb_page_id || '/posts/' || split_part(fcs.fb_post_id, '_', 2)
                ELSE NULL
              END
            )
          )
          FROM (
            SELECT fb_page_id, is_active
            FROM public.messenger_pages
            WHERE contest_id = c.id
            ORDER BY updated_at DESC NULLS LAST
            LIMIT 1
          ) mp
          FULL JOIN (
            SELECT fb_page_id, fb_post_id, is_active
            FROM public.facebook_comment_sources
            WHERE contest_id = c.id
            ORDER BY updated_at DESC NULLS LAST
            LIMIT 1
          ) fcs ON TRUE
        ) AS participation_channels
      FROM public.contests c
      WHERE c.slug = $1
      LIMIT 1
      `,
      [slug]
    );

    if (q.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // رجّع بصيغة موحّدة
    return NextResponse.json({ contest: q.rows[0] });
  } catch (e: any) {
    console.error('by-slug GET error', e);
    return NextResponse.json({ error: 'Server error', detail: String(e?.message || e) }, { status: 500 });
  } finally {
    client.release();
  }
}
