import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUser } from '../../../../_helpers';

const baseSelect = `SELECT id, contest_id, name, starts_at, ends_at, position, rules_json, created_at, updated_at
                     FROM public.contest_rounds`;

export async function PATCH(req: Request, { params }: { params: { id: string; roundId: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const allowed: { [key: string]: (value: any) => any } = {
    name: (val) => (val == null ? null : String(val).trim()),
    starts_at: (val) => (val ? new Date(val) : null),
    ends_at: (val) => (val ? new Date(val) : null),
    position: (val) => (val == null ? null : Number(val)),
    rules_json: (val) => (val ?? null),
  };

  for (const key of Object.keys(allowed)) {
    if (!(key in body)) continue;
    const normalised = allowed[key](body[key]);
    if ((key === 'starts_at' || key === 'ends_at') && normalised && Number.isNaN(normalised.getTime())) {
      return NextResponse.json({ error: `Invalid value for ${key}.` }, { status: 400 });
    }
    fields.push(`${key} = $${idx}`);
    values.push(
      normalised instanceof Date ? normalised.toISOString() : normalised,
    );
    idx += 1;
  }

  if (!fields.length) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  values.push(params.id, params.roundId);

  const query = `UPDATE public.contest_rounds
                 SET ${fields.join(', ')}, updated_at = now()
                 WHERE contest_id = $${idx} AND id = $${idx + 1}
                 RETURNING id, contest_id, name, starts_at, ends_at, position, rules_json, created_at, updated_at`;

  const { rows } = await pool.query(query, values);
  if (!rows.length) {
    return NextResponse.json({ error: 'Round not found.' }, { status: 404 });
  }
  return NextResponse.json({ round: rows[0] });
}

export async function DELETE(_req: Request, { params }: { params: { id: string; roundId: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  await pool.query(`DELETE FROM public.contest_rounds WHERE contest_id = $1 AND id = $2`, [
    params.id,
    params.roundId,
  ]);
  return NextResponse.json({ ok: true });
}
