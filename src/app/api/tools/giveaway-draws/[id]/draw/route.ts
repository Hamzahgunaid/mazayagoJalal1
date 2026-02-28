export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getDrawById, pickRandomUnique } from "@/lib/tools/giveawayPicker";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const draw = await getDrawById(params.id);
  if (!draw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (draw.status !== "FROZEN") return NextResponse.json({ error: "Draw must be frozen first" }, { status: 400 });

  const entries = await pool.query(
    `select * from public.giveaway_entries where draw_id=$1 and entry_status='ELIGIBLE' ${draw.draw_mode === "RANDOM_CORRECT" ? "and is_correct=true" : ""}`,
    [params.id],
  );
  const eligibleIds = (entries.rows as any[]).map((row: any) => String(row.id)).sort();
  const seed = crypto.randomBytes(8).toString("hex");
  const hashBefore = crypto.createHash("sha256").update(`${params.id}:${seed}:${eligibleIds.join(",")}`).digest("hex");
  const picked = pickRandomUnique(entries.rows as any[], draw.winners_count + draw.alternates_count) as any[];

  await pool.query(`delete from public.giveaway_winners where draw_id=$1`, [params.id]);

  for (let i = 0; i < picked.length; i += 1) {
    const type = i < draw.winners_count ? "WINNER" : "ALTERNATE";
    const rank = i + 1;
    await pool.query(
      `insert into public.giveaway_winners (draw_id, rank, winner_type, entry_id, selected_at, proof_comment_url)
       values ($1,$2,$3,$4,now(),$5)`,
      [params.id, rank, type, picked[i].id, picked[i].comment_url || null],
    );
  }

  await pool.query(`update public.giveaway_draws set status='DRAWN', updated_at=now() where id=$1`, [params.id]);

  const hashAfter = crypto.createHash("sha256").update(picked.map((row: any) => String(row.id)).join(",")).digest("hex");

  return NextResponse.json({ ok: true, data: { picked, audit: { seed, hash_before: hashBefore, hash_after: hashAfter } } });
}
