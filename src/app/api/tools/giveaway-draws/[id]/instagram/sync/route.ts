export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  fetchInstagramComments,
  getDrawById,
  getRules,
  type InstagramComment,
} from "@/lib/tools/giveawayPicker";

function extractMentions(text: string) {
  const matches = text.match(/@[a-zA-Z0-9._]+/g) || [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

function normalizeTag(tag: string) {
  return tag.trim().replace(/^#/, "").toLowerCase();
}

function normalizeMention(value: string) {
  const v = value.trim().toLowerCase();
  return v.startsWith("@") ? v : `@${v}`;
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const draw = await getDrawById(params.id);
    if (!draw) return NextResponse.json({ error: "Draw not found" }, { status: 404 });
    if (draw.platform !== "INSTAGRAM") {
      return NextResponse.json({ error: "Draw platform must be INSTAGRAM" }, { status: 400 });
    }

    const sourceQ = await pool.query(`select * from public.giveaway_sources_instagram where draw_id=$1 limit 1`, [params.id]);
    const source = sourceQ.rows[0];
    if (!source) return NextResponse.json({ error: "Select source post first" }, { status: 400 });

    const rules = await getRules(params.id);
    const comments: InstagramComment[] = await fetchInstagramComments({
      source: {
        post_url: String(source.post_url || ""),
        ig_media_id: source.ig_media_id,
        ig_shortcode: source.ig_shortcode,
        ig_username: source.ig_username,
      },
    });

    const cutoff = draw.locked_at ? new Date(draw.locked_at).getTime() : Number.POSITIVE_INFINITY;
    const requiredKeyword = String(rules.required_keyword || "").trim().toLowerCase();
    const bannedKeyword = String(rules.banned_keyword || "").trim().toLowerCase();
    const minMentions = Math.max(0, Number(rules.min_mentions || 0));
    const requiredHashtag = normalizeTag(String(rules.required_hashtag || ""));
    const requiredMention = normalizeMention(String(rules.required_mention || "").trim());
    const blockList: string[] = Array.isArray(rules.block_list)
      ? rules.block_list.map((v: any) => String(v || "").trim().toLowerCase()).filter(Boolean)
      : [];

    let total = 0;
    let excluded = 0;
    let eligible = 0;
    let latestCommentAt: Date | null = null;
    const seenUsers = new Set<string>();
    const uniqueUsersInWindow = new Set<string>();
    const breakdown: Record<string, number> = {};

    for (const c of comments) {
      const commentId = String(c?.id || "");
      if (!commentId) continue;
      const commentText = String(c?.text || "");
      const userId = String(c?.user_id || "");
      const username = String(c?.username || "");
      const displayName = username || userId || "Instagram User";
      const created = c?.created_time ? new Date(c.created_time) : null;
      const createdMs = created ? created.getTime() : Number.POSITIVE_INFINITY;

      if (created && createdMs <= cutoff) {
        total += 1;
        latestCommentAt = !latestCommentAt || created.getTime() > latestCommentAt.getTime() ? created : latestCommentAt;
        if (userId) uniqueUsersInWindow.add(userId);
      }
      if (!created || createdMs > cutoff) continue;

      let status: "ELIGIBLE" | "EXCLUDED" = "ELIGIBLE";
      let reason: string | null = null;

      if (requiredKeyword && !commentText.toLowerCase().includes(requiredKeyword)) {
        status = "EXCLUDED";
        reason = "missing_required_keyword";
      }

      if (status === "ELIGIBLE" && bannedKeyword && commentText.toLowerCase().includes(bannedKeyword)) {
        status = "EXCLUDED";
        reason = "contains_banned_keyword";
      }

      if (status === "ELIGIBLE" && rules.dedup_one_entry_per_user && userId) {
        if (seenUsers.has(userId)) {
          status = "EXCLUDED";
          reason = "duplicate_user";
        } else {
          seenUsers.add(userId);
        }
      }

      const textLower = commentText.toLowerCase();
      const mentions = extractMentions(commentText);

      if (status === "ELIGIBLE" && minMentions > 0 && mentions.length < minMentions) {
        status = "EXCLUDED";
        reason = "mentions_below_min";
      }

      if (status === "ELIGIBLE" && requiredHashtag && !textLower.includes(`#${requiredHashtag}`)) {
        status = "EXCLUDED";
        reason = "missing_required_hashtag";
      }

      if (status === "ELIGIBLE" && requiredMention && !mentions.includes(requiredMention)) {
        status = "EXCLUDED";
        reason = "missing_required_mention";
      }

      if (status === "ELIGIBLE" && blockList.length) {
        const userKey = username.trim().toLowerCase();
        if ((userKey && blockList.includes(userKey)) || (userKey && blockList.includes(`@${userKey}`))) {
          status = "EXCLUDED";
          reason = "blocked_user";
        }
      }

      if (status === "ELIGIBLE") eligible += 1;
      else {
        excluded += 1;
        const key = reason || "other";
        breakdown[key] = (breakdown[key] || 0) + 1;
      }

      await pool.query(
        `insert into public.giveaway_entries (draw_id, platform_user_id, display_name, comment_id, comment_url, comment_text, comment_created_at, entry_status, exclusion_reason, is_correct)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (draw_id, comment_id)
         do update set platform_user_id=excluded.platform_user_id, display_name=excluded.display_name, comment_url=excluded.comment_url,
            comment_text=excluded.comment_text, comment_created_at=excluded.comment_created_at, entry_status=excluded.entry_status,
            exclusion_reason=excluded.exclusion_reason, is_correct=excluded.is_correct`,
        [
          params.id,
          userId || username || null,
          displayName || null,
          commentId,
          source.post_url ? `${source.post_url}?comment_id=${encodeURIComponent(commentId)}` : null,
          commentText || null,
          created,
          status,
          reason,
          null,
        ],
      );
    }

    await pool.query(
      `insert into public.giveaway_eligibility_snapshots
      (draw_id,fetched_at,total_comments_in_window,unique_users_count,eligible_count,excluded_count,exclusion_breakdown,latest_comment_at_in_window)
      values ($1,now(),$2,$3,$4,$5,$6,$7)`,
      [params.id, total, uniqueUsersInWindow.size, eligible, excluded, JSON.stringify(breakdown), latestCommentAt],
    );

    return NextResponse.json({
      ok: true,
      data: { total, unique_users: uniqueUsersInWindow.size, eligible, excluded, breakdown, latest_comment_at_in_window: latestCommentAt },
    });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 400 });
  }
}
