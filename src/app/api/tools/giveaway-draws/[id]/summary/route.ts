export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const q = await pool.query(
    `select * from public.giveaway_eligibility_snapshots where draw_id=$1 order by fetched_at desc limit 1`,
    [params.id],
  );
  return NextResponse.json({ ok: true, data: q.rows[0] ?? null });
}
