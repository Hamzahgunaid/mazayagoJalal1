import { NextResponse } from 'next/server';

import { pool } from '@/lib/db';
import type { CurrentUser } from '@/lib/session';

const REVIEWER_JUDGE_ROLES = new Set(['JUDGE', 'LEAD_JUDGE', 'PLATFORM_JUDGE', 'OWNER_JUDGE']);
const STAFF_ROLE_ALLOWLIST = new Set(['platform_admin']);

type ContestAccessParams = {
  user: CurrentUser | null;
  slug?: string;
  contestId?: string;
};

type ContestAccessContest = {
  id: string;
  slug: string;
  created_by_user_id: string | null;
};

export type ContestAccessResult = {
  ok: boolean;
  contest: ContestAccessContest | null;
  isOwner: boolean;
  isJudge: boolean;
  judgeRole?: string;
  isStaff: boolean;
  canViewStatus: boolean;
  canReviewEntries: boolean;
  denyResponse?: NextResponse;
};

const unauthorizedResult = (): ContestAccessResult => ({
  ok: false,
  contest: null,
  isOwner: false,
  isJudge: false,
  judgeRole: undefined,
  isStaff: false,
  canViewStatus: false,
  canReviewEntries: false,
  denyResponse: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
});

const forbiddenResult = (contest: ContestAccessContest | null): ContestAccessResult => ({
  ok: false,
  contest,
  isOwner: false,
  isJudge: false,
  judgeRole: undefined,
  isStaff: false,
  canViewStatus: false,
  canReviewEntries: false,
  denyResponse: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
});

async function getContestAccess({ user, slug, contestId }: ContestAccessParams): Promise<ContestAccessResult> {
  if (!user) return unauthorizedResult();

  const isBySlug = typeof slug === 'string' && slug.trim().length > 0;
  const isById = typeof contestId === 'string' && contestId.trim().length > 0;
  if (!isBySlug && !isById) {
    return forbiddenResult(null);
  }

  const whereClause = isBySlug ? 'c.slug = $1' : 'c.id = $1';
  const whereValue = isBySlug ? slug!.trim() : contestId!.trim();

  const { rows } = await pool.query(
    `
      SELECT
        c.id,
        c.slug,
        c.created_by_user_id,
        (
          SELECT r.role
          FROM public.contest_referees r
          WHERE r.contest_id = c.id
            AND r.user_id = $2
          ORDER BY r.created_at DESC
          LIMIT 1
        ) AS judge_role,
        EXISTS(
          SELECT 1
          FROM public.platform_roles pr
          WHERE pr.user_id = $2
            AND pr.role = ANY($3::text[])
        ) AS is_staff
      FROM public.contests c
      WHERE ${whereClause}
      LIMIT 1
    `,
    [whereValue, user.id, Array.from(STAFF_ROLE_ALLOWLIST)],
  );

  if (!rows.length) {
    return forbiddenResult(null);
  }

  const row = rows[0] as {
    id: string;
    slug: string;
    created_by_user_id: string | null;
    judge_role: string | null;
    is_staff: boolean;
  };

  const contest: ContestAccessContest = {
    id: row.id,
    slug: row.slug,
    created_by_user_id: row.created_by_user_id,
  };

  const judgeRole = row.judge_role ? String(row.judge_role).toUpperCase() : undefined;
  const isOwner = Boolean(row.created_by_user_id && row.created_by_user_id === user.id);
  const isJudge = Boolean(judgeRole && REVIEWER_JUDGE_ROLES.has(judgeRole));
  const isStaff = Boolean(row.is_staff);
  const canViewStatus = isOwner || isJudge || isStaff;
  const canReviewEntries = isOwner || isJudge || isStaff;

  if (!canViewStatus) {
    return {
      ...forbiddenResult(contest),
      contest,
      judgeRole,
      isOwner,
      isJudge,
      isStaff,
    };
  }

  return {
    ok: true,
    contest,
    isOwner,
    isJudge,
    judgeRole,
    isStaff,
    canViewStatus,
    canReviewEntries,
  };
}

export async function getContestAccessBySlug({ slug, user }: { slug: string; user: CurrentUser | null }) {
  return getContestAccess({ slug, user });
}

export async function getContestAccessById({ contestId, user }: { contestId: string; user: CurrentUser | null }) {
  return getContestAccess({ contestId, user });
}

export { REVIEWER_JUDGE_ROLES, STAFF_ROLE_ALLOWLIST };
