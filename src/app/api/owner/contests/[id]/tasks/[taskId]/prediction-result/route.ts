import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUser } from '../../../../../_helpers';

type Params = { params: { id: string; taskId: string } };

const normalizeScore = (value: any) => {
  if (value === null || value === undefined || value === '') return { value: null as number | null };
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0) {
    return { error: 'Scores must be non-negative integers.' };
  }
  return { value: num };
};

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

export async function POST(req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;

  const contestId = params.id;
  const taskId = params.taskId;
  const body = await req.json().catch(() => ({}));

  const correctOptionId =
    typeof body?.correctOptionId === 'string'
      ? body.correctOptionId
      : typeof body?.correct_option_id === 'string'
        ? body.correct_option_id
        : null;

  if (!contestId || !taskId || !correctOptionId) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const winnerRaw =
    typeof body?.resultWinner === 'string'
      ? body.resultWinner
      : typeof body?.result_winner === 'string'
        ? body.result_winner
        : null;

  const scoreAResult = normalizeScore(body?.resultTeamAScore ?? body?.result_team_a_score);
  if (scoreAResult.error) {
    return NextResponse.json({ error: scoreAResult.error }, { status: 400 });
  }
  const scoreBResult = normalizeScore(body?.resultTeamBScore ?? body?.result_team_b_score);
  if (scoreBResult.error) {
    return NextResponse.json({ error: scoreBResult.error }, { status: 400 });
  }

  const scoreA = scoreAResult.value;
  const scoreB = scoreBResult.value;
  if ((scoreA == null) !== (scoreB == null)) {
    return NextResponse.json({ error: 'Both scores are required.' }, { status: 400 });
  }
  if (scoreA == null || scoreB == null) {
    return NextResponse.json({ error: 'Scores are required.' }, { status: 400 });
  }
  if (!winnerRaw) {
    return NextResponse.json({ error: 'Winner is required.' }, { status: 400 });
  }

  const resultRecorded =
    typeof body?.resultRecorded === 'boolean'
      ? body.resultRecorded
      : typeof body?.result_recorded === 'boolean'
        ? body.result_recorded
        : true;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const taskResult = await client.query(
      `SELECT metadata FROM public.contest_tasks WHERE contest_id = $1 AND id = $2 LIMIT 1 FOR UPDATE`,
      [contestId, taskId],
    );
    if (!taskResult.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    const optionsResult = await client.query(
      `SELECT id FROM public.contest_mcq_options WHERE contest_id = $1 AND task_id = $2`,
      [contestId, taskId],
    );
    const optionIds = new Set(optionsResult.rows.map((row) => String(row.id)));
    if (!optionIds.has(correctOptionId)) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Invalid option id.' }, { status: 400 });
    }

    await client.query(
      `UPDATE public.contest_mcq_options
         SET is_correct = (id = $3)
       WHERE contest_id = $1 AND task_id = $2`,
      [contestId, taskId, correctOptionId],
    );

    const currentMeta = parseMetadata(taskResult.rows[0]?.metadata);
    const nextMeta = {
      ...currentMeta,
      result_recorded: resultRecorded,
      result_option_id: correctOptionId,
      result_winner: winnerRaw,
      result_team_a_score: scoreA,
      result_team_b_score: scoreB,
      result_updated_at: new Date().toISOString(),
    };

    await client.query(
      `UPDATE public.contest_tasks
          SET metadata = $3, updated_at = now()
        WHERE contest_id = $1 AND id = $2`,
      [contestId, taskId, nextMeta],
    );

    await client.query(`SELECT public.contest_entries_re_eval($1, $2)`, [contestId, taskId]);

    await client.query('COMMIT');
    return NextResponse.json({ ok: true, metadata: nextMeta });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('prediction result update failed', error);
    return NextResponse.json({ error: 'Failed to save prediction result.' }, { status: 500 });
  } finally {
    client.release();
  }
}
