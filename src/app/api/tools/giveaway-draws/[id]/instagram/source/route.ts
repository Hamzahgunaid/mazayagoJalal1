export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { assertDrawEditable } from "@/lib/tools/giveawayPicker";

const schema = z.object({
  post_url: z.string().url(),
  ig_media_id: z.string().min(1).max(255).nullable().optional(),
  ig_shortcode: z.string().min(1).max(255).nullable().optional(),
  ig_username: z.string().min(1).max(255).nullable().optional(),
  media_type: z.string().min(1).max(100).nullable().optional(),
  media_cover_url: z.string().url().nullable().optional(),
  caption_snippet: z.string().max(500).nullable().optional(),
  post_published_at: z.string().datetime().nullable().optional(),
  comments_count: z.coerce.number().int().min(0).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const draw = await assertDrawEditable(params.id);
    if (draw.platform !== "INSTAGRAM") {
      return NextResponse.json({ error: "Draw platform must be INSTAGRAM" }, { status: 400 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const d = parsed.data;
    const q = await pool.query(
      `insert into public.giveaway_sources_instagram
      (draw_id, post_url, ig_media_id, ig_shortcode, ig_username, media_type, media_cover_url, caption_snippet, post_published_at, comments_count)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      on conflict (draw_id)
      do update set
        post_url=excluded.post_url,
        ig_media_id=excluded.ig_media_id,
        ig_shortcode=excluded.ig_shortcode,
        ig_username=excluded.ig_username,
        media_type=excluded.media_type,
        media_cover_url=excluded.media_cover_url,
        caption_snippet=excluded.caption_snippet,
        post_published_at=excluded.post_published_at,
        comments_count=excluded.comments_count
      returning *`,
      [
        params.id,
        d.post_url,
        d.ig_media_id ?? null,
        d.ig_shortcode ?? null,
        d.ig_username ?? null,
        d.media_type ?? null,
        d.media_cover_url ?? null,
        d.caption_snippet ?? null,
        d.post_published_at ?? null,
        d.comments_count ?? null,
      ],
    );

    return NextResponse.json({ ok: true, data: q.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 400 });
  }
}
