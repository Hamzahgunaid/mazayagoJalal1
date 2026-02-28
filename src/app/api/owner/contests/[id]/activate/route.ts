import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../_helpers";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { user, response } = await requireUser(); if (response) return response;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
    await client.query(`UPDATE public.contests SET status='ACTIVE' WHERE id=$1`, [params.id]);
    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Server error', detail: String(error?.message || error) }, { status: 500 });
  } finally {
    client.release();
  }
}
