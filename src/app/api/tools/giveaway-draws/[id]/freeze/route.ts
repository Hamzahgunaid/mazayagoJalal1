export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getDrawById, makeDrawCode } from "@/lib/tools/giveawayPicker";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const draw = await getDrawById(params.id);
  if (!draw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!draw.locked_at) return NextResponse.json({ error: "locked_at is required before freeze" }, { status: 400 });

  const sourceQ = await pool.query(`select id from public.giveaway_sources_facebook where draw_id=$1`, [params.id]);
  if (!sourceQ.rowCount) return NextResponse.json({ error: "Select source post first" }, { status: 400 });

  const q = await pool.query(
    `update public.giveaway_draws set status='FROZEN', draw_code=coalesce(draw_code,$2), updated_at=now() where id=$1 returning *`,
    [params.id, makeDrawCode()],
  );

  return NextResponse.json({ ok: true, data: q.rows[0] });
}
