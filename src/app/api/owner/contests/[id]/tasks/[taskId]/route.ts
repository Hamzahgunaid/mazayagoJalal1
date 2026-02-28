import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import { pool } from '@/lib/db';
import { requireUser } from '../../../../_helpers';

export async function PATCH(req: Request, { params }: { params: { id: string; taskId: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const mcqOptions: McqOptionInput[] | null = Array.isArray(body.options) ? body.options : null;
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const allowed = [
    'round_id',
    'kind',
    'title',
    'description',
    'points',
    'time_limit_sec',
    'geo',
    'metadata',
    'position',
  ];

  for (const key of allowed) {
    if (!(key in body)) continue;
    let val = body[key];
    if (key === 'kind' && val != null) val = String(val).toUpperCase();
    if (key === 'title' && val != null) val = String(val);
    if (key === 'points' || key === 'time_limit_sec' || key === 'position') {
      val = val == null ? null : Number(val);
    }
    fields.push(`${key} = $${idx}`);
    values.push(val);
    idx += 1;
  }

  if (!fields.length) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  values.push(params.id, params.taskId);

  const query = `UPDATE public.contest_tasks
                 SET ${fields.join(', ')}, updated_at = now()
                 WHERE contest_id = $${idx} AND id = $${idx + 1}
                 RETURNING id, contest_id, round_id, kind, title, description, points, time_limit_sec, geo, metadata, position, created_at, updated_at`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(query, values);
    if (!rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }
    const task = rows[0];
    if (Array.isArray(mcqOptions) && task.kind === 'MCQ') {
      await syncMcqOptions(client, params.id, task.id, mcqOptions);
    }
    const optionsMap = task.kind === 'MCQ' ? await fetchOptionsByTaskIds([task.id], client) : {};
    await client.query('COMMIT');
    return NextResponse.json({ task: { ...task, options: optionsMap[task.id] || [] } });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('update task error', error);
    if (String(error?.message || '').includes('Invalid MCQ option id for task')) {
      return NextResponse.json({ error: 'Invalid option id in payload.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update task.' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; taskId: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  await pool.query(`DELETE FROM public.contest_mcq_options WHERE task_id = $1`, [params.taskId]);
  await pool.query(`DELETE FROM public.contest_tasks WHERE contest_id = $1 AND id = $2`, [
    params.id,
    params.taskId,
  ]);
  return NextResponse.json({ ok: true });
}

type McqOptionInput = {
  id?: string;
  label?: string;
  is_correct?: boolean;
};

async function syncMcqOptions(client: PoolClient, contestId: string, taskId: string, options: McqOptionInput[]) {
  const existingRes = await client.query(
    `SELECT id FROM public.contest_mcq_options WHERE contest_id=$1 AND task_id=$2`,
    [contestId, taskId],
  );
  const existingIds = new Set(existingRes.rows.map((row) => String(row.id)));

  let position = 1;
  const seenIds = new Set<string>();

  for (const option of options) {
    const label = (option?.label || '').toString().trim();
    if (!label) continue;
    const isCorrect = Boolean(option?.is_correct);
    const optionId = option?.id ? String(option.id) : null;

    if (optionId) {
      if (!existingIds.has(optionId)) {
        throw new Error('Invalid MCQ option id for task');
      }
      if (seenIds.has(optionId)) continue;
      seenIds.add(optionId);
      await client.query(
        `UPDATE public.contest_mcq_options
            SET label=$1, is_correct=$2, position=$3
          WHERE id=$4 AND contest_id=$5 AND task_id=$6`,
        [label, isCorrect, position++, optionId, contestId, taskId],
      );
      continue;
    }

    await client.query(
      `INSERT INTO public.contest_mcq_options (contest_id, task_id, label, is_correct, position)
       VALUES ($1, $2, $3, $4, $5)`,
      [contestId, taskId, label, isCorrect, position++],
    );
  }

  const keepIds = Array.from(seenIds);
  if (keepIds.length > 0) {
    await client.query(
      `DELETE FROM public.contest_mcq_options
        WHERE contest_id=$1 AND task_id=$2 AND id::text <> ALL($3::text[])`,
      [contestId, taskId, keepIds],
    );
  } else {
    await client.query(`DELETE FROM public.contest_mcq_options WHERE contest_id=$1 AND task_id=$2`, [contestId, taskId]);
  }
}

async function fetchOptionsByTaskIds(taskIds: string[], client: PoolClient) {
  if (!taskIds.length) return {};
  const { rows } = await client.query(
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
