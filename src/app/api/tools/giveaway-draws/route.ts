export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";

const createSchema = z.object({
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"]).default("FACEBOOK"),
  title: z.string().min(1).max(300),
  winners_count: z.coerce.number().int().min(1).max(500),
  alternates_count: z.coerce.number().int().min(0).max(500).default(0),
  locked_at: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const q = await pool.query(
    `insert into public.giveaway_draws (
      platform,status,title,winners_count,alternates_count,locked_at,draw_mode,answer_match,show_logo,show_contest_image,video_format,updated_at
    ) values ($1,'DRAFT',$2,$3,$4,$5,'RANDOM_ALL','NORMALIZED_EXACT',false,false,'V_9_16',now())
    returning *`,
    [parsed.data.platform, parsed.data.title, parsed.data.winners_count, parsed.data.alternates_count, parsed.data.locked_at ?? null],
  );
  return NextResponse.json({ ok: true, data: q.rows[0] });
}
