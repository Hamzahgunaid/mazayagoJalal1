
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/app/api/owner/_helpers";


export async function GET(_req: Request, { params }:{ params: { id: string }}){
  const { response } = await requireUser(); if (response) return response;
  const { rows } = await pool.query(
    `SELECT r.user_id, r.role, r.created_at,
            u.full_name, u.display_name, u.email
       FROM public.contest_referees r
       LEFT JOIN public.users u ON u.id = r.user_id
      WHERE r.contest_id = $1
      ORDER BY r.created_at DESC`,
    [params.id]
  );
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request, { params }:{ params: { id: string }}){
  const { user, response } = await requireUser(); if (response) return response;
  const b = await req.json();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
    const { rows } = await client.query(
      `WITH ins AS (
         INSERT INTO public.contest_referees (contest_id, user_id, role)
         VALUES ($1,$2,$3)
         RETURNING contest_id, user_id, role, created_at
       )
       SELECT i.user_id, i.role, i.created_at, u.full_name, u.display_name, u.email
         FROM ins i
         LEFT JOIN public.users u ON u.id = i.user_id`,
      [params.id, b.user_id, b.role || 'JUDGE']
    );
    await client.query('COMMIT');
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Unable to add referee', detail: String(error?.message || error) }, { status: 500 });
  } finally {
    client.release();
  }
}
