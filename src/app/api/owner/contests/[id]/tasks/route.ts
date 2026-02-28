import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import { pool } from '@/lib/db';
import { requireUser } from '../../../_helpers';

const baseSelect = `SELECT id, contest_id, round_id, kind, title, description, points, time_limit_sec, geo, metadata, position, created_at, updated_at
                     FROM public.contest_tasks`;

type McqOptionInput = {
  label?: string;
  is_correct?: boolean;
};

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const roundId = searchParams.get('round_id');

  let query = `${baseSelect} WHERE contest_id = $1`;
  const values: any[] = [params.id];
  if (roundId) {
    query += ' AND round_id = $2';
    values.push(roundId);
  }
  query += ' ORDER BY position ASC, created_at ASC';

  const { rows } = await pool.query(query, values);
  const mcqTaskIds = rows.filter((task) => task.kind === 'MCQ').map((task) => task.id);
  const optionsByTask = await fetchOptionsByTaskIds(mcqTaskIds);
  const items = rows.map((task) => ({
    ...task,
    options: optionsByTask[task.id] || [],
  }));
  return NextResponse.json({ items });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const kind = (body.kind || '').toString().trim().toUpperCase();
  if (!kind) return NextResponse.json({ error: 'Task kind is required.' }, { status: 400 });

  const title = (body.title || '').toString().trim();
  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });

  const roundId = body.round_id || null;
  const description = body.description ?? null;
  const points = Number.isFinite(body.points) ? Number(body.points) : parseInt(body.points ?? '0', 10) || 0;
  const timeLimit = body.time_limit_sec != null ? Number(body.time_limit_sec) : null;
  const geo = body.geo ?? null;
  const metadata = body.metadata ?? null;
  const mcqOptions: McqOptionInput[] = Array.isArray(body.options) ? body.options : [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO public.contest_tasks (
         contest_id, round_id, kind, title, description, points, time_limit_sec, geo, metadata, position
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         COALESCE((SELECT MAX(position) FROM public.contest_tasks WHERE contest_id = $1), 0) + 1
       )
       RETURNING id, contest_id, round_id, kind, title, description, points, time_limit_sec, geo, metadata, position, created_at, updated_at`,
      [params.id, roundId, kind, title, description, points, timeLimit, geo, metadata],
    );

    const task = rows[0];
    if (kind === 'MCQ') {
      await replaceMcqOptions(client, params.id, task.id, mcqOptions);
      const options = await fetchOptionsByTaskIds([task.id], client);
      await client.query('COMMIT');
      return NextResponse.json({ task: { ...task, options: options[task.id] || [] } }, { status: 201 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ task: { ...task, options: [] } }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('create task error', error);
    return NextResponse.json({ error: 'Failed to save task.' }, { status: 500 });
  } finally {
    client.release();
  }
}

async function replaceMcqOptions(client: PoolClient, contestId: string, taskId: string, options: McqOptionInput[]) {
  await client.query(`DELETE FROM public.contest_mcq_options WHERE task_id = $1`, [taskId]);
  let position = 1;
  for (const option of options) {
    const label = (option.label || '').toString().trim();
    if (!label) continue;
    const isCorrect = Boolean(option.is_correct);
    await client.query(
      `INSERT INTO public.contest_mcq_options (contest_id, task_id, label, is_correct, position)
       VALUES ($1, $2, $3, $4, $5)`,
      [contestId, taskId, label, isCorrect, position++],
    );
  }
}

async function fetchOptionsByTaskIds(taskIds: string[], client?: PoolClient) {
  if (!taskIds.length) return {};
  const runner = client ?? pool;
  const { rows } = await runner.query(
    `SELECT id, contest_id, task_id, label, is_correct, position
       FROM public.contest_mcq_options
      WHERE task_id = ANY($1)
      ORDER BY position ASC, id ASC`,
    [taskIds],
  );
  return rows.reduce<Record<string, any[]>>((acc, option) => {
    if (!option.task_id) return acc;
    const key = option.task_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(option);
    return acc;
  }, {});
}
