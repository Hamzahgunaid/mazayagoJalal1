export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { assertDrawEditable } from "@/lib/tools/giveawayPicker";

const patchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  winners_count: z.coerce.number().int().min(1).max(500).optional(),
  alternates_count: z.coerce.number().int().min(0).max(500).optional(),
  locked_at: z.string().datetime().nullable().optional(),
  draw_mode: z.enum(["RANDOM_ALL", "RANDOM_CORRECT"]).optional(),
  correct_answer: z.string().max(300).nullable().optional(),
  answer_match: z.enum(["EXACT", "CONTAINS", "NORMALIZED_EXACT"]).optional(),
  logo_url: z.string().url().nullable().optional(),
  contest_image_url: z.string().url().nullable().optional(),
  show_logo: z.boolean().optional(),
  show_contest_image: z.boolean().optional(),
  video_format: z.enum(["V_9_16", "S_1_1", "H_16_9"]).optional(),
  animation_type: z.string().max(80).nullable().optional(),
  animation_enable_sounds: z.boolean().optional(),
  animation_duration_sec: z.coerce.number().int().min(1).max(600).nullable().optional(),
  animation_pick_one_by_one: z.boolean().optional(),
  main_color: z.string().max(40).nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const drawQ = await pool.query(`select * from public.giveaway_draws where id=$1 limit 1`, [params.id]);
  if (!drawQ.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sourceTable = drawQ.rows[0].platform === "INSTAGRAM" ? "giveaway_sources_instagram" : "giveaway_sources_facebook";

  const [source, rules, summary, winners, assets, participants] = await Promise.all([
    pool.query(`select * from public.${sourceTable} where draw_id=$1 limit 1`, [params.id]),
    pool.query(`select * from public.giveaway_rules where draw_id=$1 limit 1`, [params.id]),
    pool.query(`select * from public.giveaway_eligibility_snapshots where draw_id=$1 order by fetched_at desc limit 1`, [params.id]),
    pool.query(
      `select w.*, e.display_name, e.comment_url, e.comment_text
       from public.giveaway_winners w
       join public.giveaway_entries e on e.id=w.entry_id
       where w.draw_id=$1
       order by w.rank asc`,
      [params.id],
    ),
    pool.query(`select * from public.giveaway_publish_assets where draw_id=$1 limit 1`, [params.id]),
    pool.query(
      `select id, display_name, comment_text, comment_url, comment_created_at, entry_status
       from public.giveaway_entries
       where draw_id=$1
       order by comment_created_at desc nulls last, created_at desc
       limit 200`,
      [params.id],
    ),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      draw: drawQ.rows[0],
      source: source.rows[0] ?? null,
      rules: rules.rows[0] ?? null,
      summary: summary.rows[0] ?? null,
      participants: participants.rows,
      winners: winners.rows,
      assets: assets.rows[0] ?? null,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const draw = await assertDrawEditable(params.id);
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const next = { ...draw, ...parsed.data };
    if (next.draw_mode === "RANDOM_CORRECT" && !String(next.correct_answer || "").trim()) {
      return NextResponse.json({ error: "correct_answer is required when draw_mode=RANDOM_CORRECT" }, { status: 400 });
    }

    const q = await pool.query(
      `update public.giveaway_draws
        set title=$2, winners_count=$3, alternates_count=$4, locked_at=$5, draw_mode=$6, correct_answer=$7,
            answer_match=$8, logo_url=$9, contest_image_url=$10, show_logo=$11, show_contest_image=$12,
            video_format=$13, animation_type=$14, animation_enable_sounds=$15, animation_duration_sec=$16,
            animation_pick_one_by_one=$17, main_color=$18, updated_at=now()
        where id=$1
        returning *`,
      [
        params.id,
        next.title,
        next.winners_count,
        next.alternates_count,
        next.locked_at,
        next.draw_mode,
        next.correct_answer,
        next.answer_match,
        next.logo_url,
        next.contest_image_url,
        next.show_logo,
        next.show_contest_image,
        next.video_format,
        next.animation_type,
        next.animation_enable_sounds,
        next.animation_duration_sec,
        next.animation_pick_one_by_one,
        next.main_color,
      ],
    );
    return NextResponse.json({ ok: true, data: q.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 400 });
  }
}
