export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { pool } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { getContestAccessBySlug } from '@/lib/auth/contestAccess';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const STATUS_ALLOWLIST = new Set([
  'PENDING',
  'CORRECT',
  'INCORRECT',
  'VALIDATED',
  'NEEDS_REVIEW',
  'IN_REVIEW',
  'SUBMITTED',
  'DISQUALIFIED',
]);

const normalizeLimit = (value: string | null) => {
  const parsed = Number.parseInt(value || String(DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

const normalizeOffset = (value: string | null) => {
  const parsed = Number.parseInt(value || '0', 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(parsed, 0);
};

export async function GET(req: Request, ctx: { params: { slug: string } }) {
  const { slug } = ctx.params || {};
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const url = new URL(req.url);
  const mine = url.searchParams.get('mine') === '1';
  const limit = normalizeLimit(url.searchParams.get('limit'));
  const offset = normalizeOffset(url.searchParams.get('offset'));
  const statusParam = String(url.searchParams.get('status') || '').trim().toUpperCase();
  const taskFilter = String(url.searchParams.get('task_id') || '').trim();
  const queryFilter = String(url.searchParams.get('q') || '').trim();

  const user = await currentUser();
  if (mine && !user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!mine) {
    const access = await getContestAccessBySlug({ slug, user });
    if (!access.canReviewEntries) {
      return access.denyResponse || NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const client = await pool.connect();
  try {
    const contestQuery = await client.query(
      `SELECT id FROM public.contests WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    if (contestQuery.rowCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const contestId = String(contestQuery.rows[0].id);

    const filters: string[] = ['e.contest_id = $1'];
    const params: any[] = [contestId];

    if (mine) {
      params.push(user!.id);
      filters.push(`e.user_id = $${params.length}`);
    }

    if (statusParam) {
      if (!STATUS_ALLOWLIST.has(statusParam)) {
        return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
      }
      params.push(statusParam);
      filters.push(`e.status = $${params.length}`);
    }

    if (taskFilter) {
      params.push(taskFilter);
      filters.push(`e.task_id = $${params.length}`);
      params.push(contestId);
      filters.push(
        `EXISTS (
          SELECT 1
          FROM public.contest_tasks t
          WHERE t.id = e.task_id
            AND t.contest_id = $${params.length}
        )`,
      );
    }

    if (queryFilter) {
      params.push(`%${queryFilter}%`);
      const qIdx = params.length;
      filters.push(
        `(
          COALESCE(e.answer_text, '') ILIKE $${qIdx}
          OR COALESCE(e.code_submitted, '') ILIKE $${qIdx}
          OR COALESCE(e.prediction_winner, '') ILIKE $${qIdx}
          OR COALESCE(pi.display_name, '') ILIKE $${qIdx}
          OR COALESCE(u.display_name, '') ILIKE $${qIdx}
          OR COALESCE(u.full_name, '') ILIKE $${qIdx}
          OR COALESCE(u.email, '') ILIKE $${qIdx}
          OR COALESCE(u.phone, '') ILIKE $${qIdx}
        )`,
      );
    }

    const whereClause = filters.join(' AND ');

    const totalResult = await client.query(
      `
      SELECT COUNT(*)::int AS c
      FROM public.contest_entries e
      LEFT JOIN public.users u ON u.id = e.user_id
      LEFT JOIN public.participant_identities pi ON pi.id = e.identity_id
      WHERE ${whereClause}
      `,
      params,
    );

    const listParams = [...params, limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const result = await client.query(
      `
      SELECT
        e.id,
        e.contest_id,
        e.user_id,
        e.identity_id,
        e.entry_type,
        e.task_id,
        e.round_id,
        e.answer_text,
        e.mcq_option_id,
        mo.label AS mcq_option_label,
        e.code_submitted,
        encode(e.code_hash, 'hex') AS code_hash_hex,
        e.code_id,
        e.asset_url,
        e.evidence_image_url,
        e.prediction_team_a_score,
        e.prediction_team_b_score,
        e.prediction_winner,
        e.score,
        e.elapsed_ms,
        e.status,
        e.created_at,
        pi.display_name AS identity_name,
        u.display_name AS user_display_name,
        u.full_name AS user_full_name,
        u.email AS user_email,
        u.phone AS user_phone,
        u.avatar_url AS user_avatar_url
      FROM public.contest_entries e
      LEFT JOIN public.users u ON u.id = e.user_id
      LEFT JOIN public.participant_identities pi ON pi.id = e.identity_id
      LEFT JOIN public.contest_mcq_options mo ON mo.id = e.mcq_option_id
      WHERE ${whereClause}
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
      `,
      listParams,
    );

    const items = result.rows.map((r: any) => ({
      id: r.id,
      contest_id: r.contest_id,
      user_id: r.user_id,
      identity_id: r.identity_id,
      identity_name: r.identity_name || null,
      user: {
        id: r.user_id,
        name: r.identity_name || r.user_display_name || r.user_full_name || 'Participant',
        display_name: r.user_display_name || null,
        full_name: r.user_full_name || null,
        email: r.user_email || null,
        phone: r.user_phone || null,
        avatar_url: r.user_avatar_url || null,
      },
      entry_type: r.entry_type,
      task_id: r.task_id,
      round_id: r.round_id,
      answer_text: r.answer_text,
      mcq_option_id: r.mcq_option_id,
      mcq_option_label: r.mcq_option_label,
      code_submitted: r.code_submitted,
      code_hash: r.code_hash_hex || null,
      code_id: r.code_id,
      asset_url: r.asset_url,
      evidence_image_url: r.evidence_image_url,
      prediction_team_a_score: r.prediction_team_a_score,
      prediction_team_b_score: r.prediction_team_b_score,
      prediction_winner: r.prediction_winner,
      score: r.score,
      elapsed_ms: r.elapsed_ms,
      status: r.status,
      created_at: r.created_at,
    }));

    return NextResponse.json({
      items,
      contest_id: contestId,
      total: totalResult.rows[0]?.c ?? 0,
      limit,
      offset,
    });
  } catch (e: any) {
    console.error('entries by-slug GET error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
