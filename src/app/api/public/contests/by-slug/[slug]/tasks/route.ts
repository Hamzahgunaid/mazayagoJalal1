export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { slug } = params || {};
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT
          t.id,
          t.contest_id,
          t.round_id,
          t.kind,
          t.title,
          t.description,
          t.points,
          t.time_limit_sec,
          t.geo,
          t.metadata,
          t.position,
          t.created_at,
          t.updated_at
        FROM public.contests c
        JOIN public.contest_tasks t ON t.contest_id = c.id
        WHERE c.slug = $1
        ORDER BY t.position ASC, t.created_at ASC
      `,
      [slug],
    );

    const mcqTaskIds = rows.filter((task) => task.kind === 'MCQ').map((task) => task.id);
    let optionsByTask: Record<string, any[]> = {};
    if (mcqTaskIds.length > 0) {
      const { rows: optionRows } = await pool.query(
        `SELECT id, contest_id, task_id, label, is_correct, position
           FROM public.contest_mcq_options
          WHERE task_id = ANY($1)
          ORDER BY position ASC, id ASC`,
        [mcqTaskIds],
      );
      optionsByTask = optionRows.reduce<Record<string, any[]>>((acc, option) => {
        if (!option.task_id) return acc;
        if (!acc[option.task_id]) acc[option.task_id] = [];
        acc[option.task_id].push(option);
        return acc;
      }, {});
    }

    const items = rows.map((task) => ({
      ...task,
      options: task.kind === 'MCQ' ? optionsByTask[task.id] || [] : [],
    }));

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('public tasks fetch failed', error);
    return NextResponse.json(
      { error: 'Server error', detail: String(error?.message || error) },
      { status: 500 },
    );
  }
}
