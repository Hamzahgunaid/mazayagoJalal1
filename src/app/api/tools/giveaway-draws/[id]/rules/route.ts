export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { assertDrawEditable } from "@/lib/tools/giveawayPicker";

const schema = z.object({
  dedup_one_entry_per_user: z.boolean().default(true),
  exclude_page_admins: z.boolean().default(false),
  include_replies: z.boolean().default(false),
  required_keyword: z.string().max(120).nullable().optional(),
  banned_keyword: z.string().max(120).nullable().optional(),
  require_like_page: z.boolean().default(false),
  require_like_post: z.boolean().default(false),
  require_like_comment: z.boolean().default(false),
  min_mentions: z.coerce.number().int().min(0).max(50).default(0),
  required_hashtag: z.string().max(120).nullable().optional(),
  required_mention: z.string().max(120).nullable().optional(),
  bonus_extra_chances: z.array(z.any()).default([]),
  block_list: z.array(z.any()).default([]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await assertDrawEditable(params.id);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const d = parsed.data;
    const likeCheckAvailable = !(d.require_like_page || d.require_like_post || d.require_like_comment);

    const q = await pool.query(
      `insert into public.giveaway_rules
      (draw_id,dedup_one_entry_per_user,exclude_page_admins,include_replies,required_keyword,banned_keyword,require_like_page,require_like_post,require_like_comment,like_check_available,min_mentions,required_hashtag,required_mention,bonus_extra_chances,block_list)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb)
      on conflict (draw_id)
      do update set
        dedup_one_entry_per_user=excluded.dedup_one_entry_per_user,
        exclude_page_admins=excluded.exclude_page_admins,
        include_replies=excluded.include_replies,
        required_keyword=excluded.required_keyword,
        banned_keyword=excluded.banned_keyword,
        require_like_page=excluded.require_like_page,
        require_like_post=excluded.require_like_post,
        require_like_comment=excluded.require_like_comment,
        like_check_available=excluded.like_check_available,
        min_mentions=excluded.min_mentions,
        required_hashtag=excluded.required_hashtag,
        required_mention=excluded.required_mention,
        bonus_extra_chances=excluded.bonus_extra_chances,
        block_list=excluded.block_list
      returning *`,
      [params.id, d.dedup_one_entry_per_user, d.exclude_page_admins, d.include_replies, d.required_keyword ?? null, d.banned_keyword ?? null, d.require_like_page, d.require_like_post, d.require_like_comment, likeCheckAvailable, d.min_mentions, d.required_hashtag ?? null, d.required_mention ?? null, JSON.stringify(d.bonus_extra_chances || []), JSON.stringify(d.block_list || [])],
    );

    return NextResponse.json({ ok: true, data: q.rows[0], warning: likeCheckAvailable ? null : "Like verification unavailable for this provider setup" });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 400 });
  }
}
