import { NextResponse } from 'next/server';

import { currentUser } from '@/lib/session';
import { pool } from '@/lib/db';
import { getContestAccessById } from '@/lib/auth/contestAccess';

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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const contestId = params.id;
  if (!contestId) return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });

  const user = await currentUser();
  const access = await getContestAccessById({ contestId, user });
  if (!access.canReviewEntries) {
    return access.denyResponse || NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = normalizeLimit(url.searchParams.get('limit'));
  const offset = normalizeOffset(url.searchParams.get('offset'));
  const statusParam = String(url.searchParams.get('status') || '').trim().toUpperCase();
  const taskFilter = String(url.searchParams.get('task_id') || '').trim();
  const queryFilter = String(url.searchParams.get('q') || '').trim();

  const db = await pool.connect();
  try {
    const filters: string[] = ['e.contest_id = $1'];
    const paramsList: any[] = [contestId];

    if (statusParam) {
      if (!STATUS_ALLOWLIST.has(statusParam)) {
        return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
      }
      paramsList.push(statusParam);
      filters.push(`e.status = $${paramsList.length}`);
    }

    if (taskFilter) {
      paramsList.push(taskFilter);
      filters.push(`e.task_id = $${paramsList.length}`);
      paramsList.push(contestId);
      filters.push(
        `EXISTS (
          SELECT 1
          FROM public.contest_tasks t
          WHERE t.id = e.task_id
            AND t.contest_id = $${paramsList.length}
        )`,
      );
    }

    if (queryFilter) {
      paramsList.push(`%${queryFilter}%`);
      const qIdx = paramsList.length;
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

    const totalResult = await db.query(
      `
      SELECT COUNT(*)::int AS c
      FROM public.contest_entries e
      LEFT JOIN public.users u ON u.id = e.user_id
      LEFT JOIN public.participant_identities pi ON pi.id = e.identity_id
      WHERE ${whereClause}
      `,
      paramsList,
    );

    const listParams = [...paramsList, limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const list = await db.query(
      `
      SELECT
        e.id,
        e.contest_id,
        e.user_id,
        e.identity_id,
        e.task_id,
        e.round_id,
        e.entry_type,
        e.status,
        e.score,
        e.answer_text,
        e.mcq_option_id,
        e.code_submitted,
        encode(e.code_hash, 'hex') AS code_hash_hex,
        e.asset_url,
        e.evidence_image_url,
        e.prediction_team_a_score,
        e.prediction_team_b_score,
        e.prediction_winner,
        e.created_at,
        pi.display_name AS identity_name,
        u.display_name,
        u.full_name,
        u.email,
        u.phone
      FROM public.contest_entries e
      LEFT JOIN public.users u ON u.id = e.user_id
      LEFT JOIN public.participant_identities pi ON pi.id = e.identity_id
      WHERE ${whereClause}
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
      `,
      listParams,
    );

    return NextResponse.json({
      items: list.rows,
      total: totalResult.rows[0]?.c ?? 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('owner entries list failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    db.release();
  }
}
