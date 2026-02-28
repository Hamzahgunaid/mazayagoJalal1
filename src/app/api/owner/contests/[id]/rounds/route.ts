import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUser } from '../../../_helpers';

const baseSelect = `SELECT id, contest_id, name, starts_at, ends_at, position, rules_json, created_at, updated_at
                     FROM public.contest_rounds`;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const { rows } = await pool.query(
    `${baseSelect} WHERE contest_id = $1 ORDER BY position ASC, created_at ASC`,
    [params.id],
  );
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').toString().trim();
  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  const startsAt = body.starts_at ? new Date(body.starts_at) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: 'Invalid starts_at value.' }, { status: 400 });
  }
  const endsAt = body.ends_at ? new Date(body.ends_at) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: 'Invalid ends_at value.' }, { status: 400 });
  }

  const rulesJson = body.rules_json ?? null;

  const { rows } = await pool.query(
    `INSERT INTO public.contest_rounds (contest_id, name, starts_at, ends_at, position, rules_json)
     VALUES ($1, $2, $3, $4,
       COALESCE((SELECT MAX(position) FROM public.contest_rounds WHERE contest_id = $1), 0) + 1,
       $5)
     RETURNING id, contest_id, name, starts_at, ends_at, position, rules_json, created_at, updated_at`,
    [params.id, name, startsAt ? startsAt.toISOString() : null, endsAt ? endsAt.toISOString() : null, rulesJson],
  );

  return NextResponse.json({ round: rows[0] }, { status: 201 });
}
