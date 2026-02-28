
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: { id: string }}) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ entries_count: 0, limit: 0, can_enter: false });
  const { rows } = await pool.query(`SELECT count(*)::int AS c FROM public.contest_entries WHERE contest_id=$1 AND user_id=$2`, [params.id, u.id]);
  const { rows: crows } = await pool.query(`SELECT per_user_limit FROM public.contests WHERE id=$1`, [params.id]);
  const limit = crows[0]?.per_user_limit ?? 1;
  const cnt = rows[0]?.c ?? 0;
  return NextResponse.json({ entries_count: cnt, limit, can_enter: cnt < limit });
}
