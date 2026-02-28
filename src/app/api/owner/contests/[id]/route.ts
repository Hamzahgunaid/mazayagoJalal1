export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUser } from '../../_helpers';

const UPDATABLE = [
  'title','description','starts_at','ends_at','max_winners','require_receipt',
  'per_user_limit','prize_summary','visibility','selection','status','branding_theme',
  'rules_json','eligibility_json','geo_restrictions','seed_commit'
];

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ error:'Missing id' }, { status:400 });

  const { user, response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(()=> ({}));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);

    const cur = await client.query('SELECT * FROM public.contests WHERE id = $1 LIMIT 1', [id]);
    if (cur.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error:'Not found' }, { status:404 });
    }

    const { rows: publishedRows } = await client.query(
      `SELECT EXISTS(
        SELECT 1 FROM public.contest_winners
        WHERE contest_id = $1 AND published = TRUE
      ) AS has_published_winners`,
      [id],
    );
    const hasPublishedWinners = Boolean(publishedRows[0]?.has_published_winners);

    const row = cur.rows[0];
    const patch: any = {};
    for (const k of UPDATABLE) {
      if (k in body) patch[k] = body[k];
    }
    if (typeof patch.selection === 'string') {
      patch.selection = patch.selection.toUpperCase();
    }
    if (typeof patch.status === 'string') {
      patch.status = patch.status.toUpperCase();
    }
    if ('seed_commit' in patch) {
      const rawSeedCommit = patch.seed_commit;
      patch.seed_commit =
        rawSeedCommit == null || String(rawSeedCommit).trim() === '' ? null : String(rawSeedCommit).trim();
    }
    if (hasPublishedWinners) {
      const changesLockedField = (field: 'seed_commit' | 'selection' | 'max_winners') =>
        field in patch && patch[field] !== row[field];
      if (
        changesLockedField('seed_commit') ||
        changesLockedField('selection') ||
        changesLockedField('max_winners')
      ) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Contest is locked after winners are published.' },
          { status: 409 },
        );
      }
    }
    const merged = { ...row, ...patch };

    const q = await client.query(
      `UPDATE public.contests
       SET title=$1, description=$2, starts_at=$3, ends_at=$4, max_winners=$5,
           require_receipt=$6, per_user_limit=$7, prize_summary=$8, visibility=$9,
           selection=$10, status=$11, branding_theme=$12, rules_json=$13, eligibility_json=$14,
           geo_restrictions=$15, seed_commit=$16, updated_at=now()
       WHERE id=$17
       RETURNING *`,
      [
        merged.title, merged.description, merged.starts_at, merged.ends_at, merged.max_winners,
        merged.require_receipt, merged.per_user_limit, merged.prize_summary, merged.visibility,
        merged.selection, merged.status, merged.branding_theme, merged.rules_json, merged.eligibility_json,
        merged.geo_restrictions, merged.seed_commit, id
      ]
    );
    const { rows: proofRows } = await client.query(
      `SELECT public_proof
        FROM public.contest_winners
        WHERE contest_id = $1 AND published = TRUE
        ORDER BY published_at DESC NULLS LAST, decided_at DESC
        LIMIT 1`,
      [id],
    );
    await client.query('COMMIT');
    return NextResponse.json({
      contest: {
        ...q.rows[0],
        has_published_winners: hasPublishedWinners,
        public_proof: proofRows[0]?.public_proof ?? null,
      },
    });
  } catch (e:any) {
    console.error('PATCH /owner/contests error', e);
    await client.query('ROLLBACK');
    return NextResponse.json({ error:'Server error', detail:String(e?.message||e) }, { status:500 });
  } finally {
    client.release();
  }
}
