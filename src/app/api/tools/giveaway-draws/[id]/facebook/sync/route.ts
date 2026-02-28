export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { evaluateCorrectness, fetchFacebookComments, getDrawById, getFacebookSource, getRules } from "@/lib/tools/giveawayPicker";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const draw = await getDrawById(params.id);
    if (!draw) return NextResponse.json({ error: "Draw not found" }, { status: 404 });
    const source = await getFacebookSource(params.id);
    if (!source) return NextResponse.json({ error: "Select source post first" }, { status: 400 });

    const rules = await getRules(params.id);
    const comments = await fetchFacebookComments({
      fbPostId: source.fb_post_id,
      pageAccessTokenEnc: source.page_access_token_enc,
      includeReplies: !!rules.include_replies,
    });

    const cutoff = draw.locked_at ? new Date(draw.locked_at).getTime() : Number.POSITIVE_INFINITY;
    const requiredKeyword = String(rules.required_keyword || "").trim().toLowerCase();
    const bannedKeyword = String(rules.banned_keyword || "").trim().toLowerCase();

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
      const commentText = String(c?.message || "");
      const userId = String(c?.from?.id || "");
      const displayName = String(c?.from?.name || "");
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
      if (status === "ELIGIBLE" && !rules.like_check_available && (rules.require_like_comment || rules.require_like_page || rules.require_like_post)) {
        status = "EXCLUDED";
        reason = "like_check_unavailable";
      }

      const isCorrect = draw.draw_mode === "RANDOM_CORRECT" ? evaluateCorrectness(commentText, String(draw.correct_answer || ""), draw.answer_match) : null;
      if (status === "ELIGIBLE" && draw.draw_mode === "RANDOM_CORRECT" && !isCorrect) {
        status = "EXCLUDED";
        reason = "wrong_answer";
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
        [params.id, userId || null, displayName || null, commentId, source.post_url ? `${source.post_url}?comment_id=${encodeURIComponent(commentId)}` : null, commentText || null, created, status, reason, isCorrect],
      );
    }

    await pool.query(
      `insert into public.giveaway_eligibility_snapshots
      (draw_id,fetched_at,total_comments_in_window,unique_users_count,eligible_count,excluded_count,exclusion_breakdown,latest_comment_at_in_window)
      values ($1,now(),$2,$3,$4,$5,$6,$7)`,
      [params.id, total, uniqueUsersInWindow.size, eligible, excluded, JSON.stringify(breakdown), latestCommentAt],
    );

    return NextResponse.json({ ok: true, data: { total, unique_users: uniqueUsersInWindow.size, eligible, excluded, breakdown, latest_comment_at_in_window: latestCommentAt } });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 400 });
  }
}
