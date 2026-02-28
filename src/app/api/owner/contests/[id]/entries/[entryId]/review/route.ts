import { NextResponse } from 'next/server';

import { currentUser } from '@/lib/session';
import { pool } from '@/lib/db';
import { getContestAccessById } from '@/lib/auth/contestAccess';

const REVIEW_STATUSES = new Set(['CORRECT', 'INCORRECT']);

const parseMetadata = (value: any) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value;
  return {};
};

const isPredictionMatch = (entryType: string | null, taskKind: string | null, taskMetadata: any) => {
  const normalizedEntryType = String(entryType || '').toUpperCase();
  const normalizedTaskKind = String(taskKind || '').toUpperCase();
  const metadata = parseMetadata(taskMetadata);
  if (metadata.match_prediction === true) return true;
  if (normalizedTaskKind === 'PREDICTION') return true;
  return normalizedEntryType === 'PREDICTION' && metadata.match_prediction === true;
};

export async function POST(req: Request, { params }: { params: { id: string; entryId: string } }) {
  const contestId = params.id;
  const entryId = params.entryId;
  if (!contestId || !entryId) {
    return NextResponse.json({ error: 'Missing contest or entry id' }, { status: 400 });
  }

  const user = await currentUser();
  const access = await getContestAccessById({ contestId, user });
  if (!access.canReviewEntries) {
    return access.denyResponse || NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const status = String(body?.status || '').toUpperCase();
  const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 5000) : null;
  if (!REVIEW_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    const entryResult = await db.query(
      `
      SELECT
        e.id,
        e.entry_type,
        e.task_id,
        t.kind AS task_kind,
        t.points AS task_points,
        t.metadata AS task_metadata
      FROM public.contest_entries e
      LEFT JOIN public.contest_tasks t
        ON t.id = e.task_id
       AND t.contest_id = e.contest_id
      WHERE e.id = $1
        AND e.contest_id = $2
      LIMIT 1
      FOR UPDATE OF e
      `,
      [entryId, contestId],
    );

    if (!entryResult.rows.length) {
      await db.query('ROLLBACK');
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const row = entryResult.rows[0];
    if (isPredictionMatch(row.entry_type, row.task_kind, row.task_metadata)) {
      await db.query('ROLLBACK');
      return NextResponse.json(
        {
          code: 'PREDICTION_AUTO_GRADED',
          error: 'PREDICTION_AUTO_GRADED',
          message: 'Prediction-match entries are graded automatically after official results.',
        },
        { status: 400 },
      );
    }

    const rawTaskPoints = row.task_points == null ? null : Number(row.task_points);
    const safeTaskPoints = rawTaskPoints != null && Number.isFinite(rawTaskPoints) ? rawTaskPoints : 1;
    const computedScore = status === 'CORRECT' ? safeTaskPoints : 0;

    const updateResult = await db.query(
      `
      UPDATE public.contest_entries
      SET status = $3,
          score = $4
      WHERE id = $1
        AND contest_id = $2
      RETURNING id, contest_id, user_id, task_id, status, score, created_at
      `,
      [entryId, contestId, status, computedScore],
    );

    if (!updateResult.rows.length) {
      await db.query('ROLLBACK');
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await db.query(
      `
      INSERT INTO public.contest_judgements (entry_id, referee_user_id, score, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (entry_id, referee_user_id)
      DO UPDATE SET
        score = EXCLUDED.score,
        notes = EXCLUDED.notes,
        created_at = now()
      `,
      [entryId, user!.id, computedScore, notes],
    );

    await db.query('COMMIT');
    return NextResponse.json({ ok: true, entry: updateResult.rows[0] });
  } catch (error: any) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('entry review update failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    db.release();
  }
}
