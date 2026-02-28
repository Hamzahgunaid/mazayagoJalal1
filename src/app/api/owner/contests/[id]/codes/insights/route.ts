export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { pool } from '@/lib/db';
import { requireUser } from '@/app/api/owner/_helpers';

const MAX_LIMIT = 200;

const clampLimit = (value?: string | null) => {
  const parsed = Number(value ?? 50);
  if (Number.isNaN(parsed) || parsed <= 0) return 50;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
};

const clampOffset = (value?: string | null) => {
  const parsed = Number(value ?? 0);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
};

const toInt = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const contestId = params?.id;
  if (!contestId) {
    return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });
  }

  const url = new URL(req.url);
  const limit = clampLimit(url.searchParams.get('limit'));
  const offset = clampOffset(url.searchParams.get('offset'));
  const batchId = url.searchParams.get('batch');
  const statusFilter = url.searchParams.get('status');
  const searchTerm = (url.searchParams.get('q') || '').trim();

  const filterClauses: string[] = ['c.contest_id = $1'];
  const filterParams: any[] = [contestId];

  if (batchId) {
    filterParams.push(batchId);
    filterClauses.push(`c.batch_id = $${filterParams.length}`);
  }

  if (statusFilter === 'unused') {
    filterClauses.push('COALESCE(c.redemptions_count, 0) = 0');
  } else if (statusFilter === 'active') {
    filterClauses.push(
      'COALESCE(c.redemptions_count, 0) > 0 AND COALESCE(c.redemptions_count, 0) < COALESCE(c.max_redemptions, 1)',
    );
  } else if (statusFilter === 'redeemed') {
    filterClauses.push('COALESCE(c.redemptions_count, 0) > 0');
  } else if (statusFilter === 'exhausted') {
    filterClauses.push('COALESCE(c.redemptions_count, 0) >= COALESCE(c.max_redemptions, 1)');
  }

  if (searchTerm) {
    filterParams.push(`%${searchTerm.toLowerCase()}%`);
    const idx = filterParams.length;
    filterClauses.push(
      `(encode(c.code_hash, 'hex') ILIKE $${idx}
        OR LOWER(COALESCE(c.sku, '')) LIKE $${idx}
        OR LOWER(COALESCE(b.name, '')) LIKE $${idx}
        OR EXISTS (
          SELECT 1
          FROM public.contest_entries se
          WHERE se.contest_id = c.contest_id
            AND se.code_hash = c.code_hash
            AND LOWER(COALESCE(se.code_submitted, '')) LIKE $${idx}
        ))`,
    );
  }

  const baseWhere = filterClauses.join(' AND ');
  const dataParams = [...filterParams];
  const limitIndex = dataParams.push(limit + 1);
  const offsetIndex = dataParams.push(offset);
  const dataQuery = `
    SELECT
      c.id,
      c.batch_id,
      b.name AS batch_name,
      c.tag,
      c.sku,
      c.max_redemptions,
      c.redemptions_count,
      c.expires_at,
      c.created_at,
      encode(c.code_hash, 'hex') AS code_hash_hex,
      entry_info.entry_id,
      entry_info.code_submitted,
      entry_info.entry_status,
      entry_info.entry_created_at,
      entry_info.user_id,
      entry_info.user_name,
      entry_info.user_avatar_url
    FROM public.contest_codes c
    LEFT JOIN public.contest_code_batches b ON b.id = c.batch_id
    LEFT JOIN LATERAL (
      SELECT
        e.id AS entry_id,
        e.code_submitted,
        e.status AS entry_status,
        e.created_at AS entry_created_at,
        e.user_id,
        COALESCE(u.display_name, u.full_name, 'Participant') AS user_name,
        u.avatar_url AS user_avatar_url
      FROM public.contest_entries e
      LEFT JOIN public.users u ON u.id = e.user_id
      WHERE e.contest_id = c.contest_id AND e.code_hash = c.code_hash
      ORDER BY e.created_at DESC
      LIMIT 1
    ) AS entry_info ON true
    WHERE ${baseWhere}
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;
  const countQuery = `
    SELECT COUNT(*)::int AS count
    FROM public.contest_codes c
    LEFT JOIN public.contest_code_batches b ON b.id = c.batch_id
    WHERE ${baseWhere}
  `;

  const statsQuery = `
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN COALESCE(c.redemptions_count, 0) > 0 THEN 1 ELSE 0 END)::int AS redeemed,
      SUM(
        CASE
          WHEN COALESCE(c.redemptions_count, 0) >= COALESCE(c.max_redemptions, 1) THEN 1
          ELSE 0
        END
      )::int AS exhausted,
      SUM(
        CASE
          WHEN COALESCE(c.redemptions_count, 0) = 0 THEN 1
          ELSE 0
        END
      )::int AS unused,
      SUM(
        CASE
          WHEN COALESCE(c.redemptions_count, 0) < COALESCE(c.max_redemptions, 1) THEN 1
          ELSE 0
        END
      )::int AS available
    FROM public.contest_codes c
    WHERE c.contest_id = $1
  `;

  const batchesQuery = `
    SELECT
      b.id,
      b.name,
      b.pattern,
      b.created_at,
      COALESCE((
        SELECT COUNT(*)::int FROM public.contest_codes c WHERE c.batch_id = b.id
      ), 0) AS total_codes,
      COALESCE((
        SELECT COUNT(*)::int FROM public.contest_codes c
        WHERE c.batch_id = b.id AND COALESCE(c.redemptions_count, 0) > 0
      ), 0) AS redeemed_codes,
      COALESCE((
        SELECT COUNT(*)::int FROM public.contest_codes c
        WHERE c.batch_id = b.id AND COALESCE(c.redemptions_count, 0) < COALESCE(c.max_redemptions, 1)
      ), 0) AS remaining_codes
    FROM public.contest_code_batches b
    WHERE b.contest_id = $1
    ORDER BY b.created_at DESC
  `;

  const [dataResult, countResult, statsResult, batchesResult] = await Promise.all([
    pool.query(dataQuery, dataParams),
    pool.query(countQuery, filterParams),
    pool.query(statsQuery, [contestId]),
    pool.query(batchesQuery, [contestId]),
  ]);

  const dataRows = dataResult.rows ?? [];
  const codes = dataRows.slice(0, limit);
  const hasMore = dataRows.length > limit;
  const totalCount = toInt(countResult.rows?.[0]?.count, 0);
  const statsRaw: any = statsResult.rows?.[0] ?? {};
  const stats = {
    total: toInt(statsRaw.total, 0),
    redeemed: toInt(statsRaw.redeemed, 0),
    exhausted: toInt(statsRaw.exhausted, 0),
    unused: toInt(statsRaw.unused, 0),
    available: toInt(statsRaw.available, 0),
  };
  const batches = (batchesResult.rows || []).map((row: any) => ({
    ...row,
    total_codes: toInt(row.total_codes, 0),
    redeemed_codes: toInt(row.redeemed_codes, 0),
    remaining_codes: toInt(row.remaining_codes, 0),
  }));

  return NextResponse.json({
    codes,
    pagination: {
      limit,
      offset,
      total: totalCount,
      hasMore,
    },
    stats,
    batches,
  });
}
