
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../../_helpers";

export async function DELETE(_req: Request, { params }:{ params: { id: string, userId: string }}){
  const { user, response } = await requireUser(); if (response) return response;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
    await client.query(`DELETE FROM public.contest_referees WHERE contest_id=$1 AND user_id=$2`, [params.id, params.userId]);
    await client.query('COMMIT');
    return NextResponse.json({}, { status: 204 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Unable to remove referee', detail: String(error?.message || error) }, { status: 500 });
  } finally {
    client.release();
  }
}
