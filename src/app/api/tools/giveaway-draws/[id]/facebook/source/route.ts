export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { assertDrawEditable } from "@/lib/tools/giveawayPicker";

const schema = z.object({
  social_page_id: z.string().uuid(),
  fb_post_id: z.string().min(1).max(255),
  post_url: z.string().url().or(z.literal("")),
  post_text_snippet: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await assertDrawEditable(params.id);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const pageQ = await pool.query(`select id, fb_page_id, fb_page_name from public.social_pages where id=$1 and provider='FACEBOOK' and status='ACTIVE'`, [parsed.data.social_page_id]);
    if (!pageQ.rowCount) return NextResponse.json({ error: "Active Facebook page not found" }, { status: 404 });
    const page = pageQ.rows[0];

    const q = await pool.query(
      `insert into public.giveaway_sources_facebook (draw_id, social_page_id, fb_page_id, fb_page_name, fb_post_id, post_url, post_text_snippet)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (draw_id)
       do update set social_page_id=excluded.social_page_id, fb_page_id=excluded.fb_page_id, fb_page_name=excluded.fb_page_name,
         fb_post_id=excluded.fb_post_id, post_url=excluded.post_url, post_text_snippet=excluded.post_text_snippet
       returning *`,
      [params.id, page.id, page.fb_page_id, page.fb_page_name, parsed.data.fb_post_id, parsed.data.post_url || null, parsed.data.post_text_snippet ?? null],
    );
    return NextResponse.json({ ok: true, data: q.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 400 });
  }
}
