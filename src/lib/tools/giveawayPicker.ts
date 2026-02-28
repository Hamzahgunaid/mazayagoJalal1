import crypto from "crypto";
import { pool } from "@/lib/db";
import { decryptString } from "@/lib/messengerCrypto";

export type GiveawayStatus = "DRAFT" | "READY" | "FROZEN" | "DRAWN" | "PUBLISHED";

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

export function evaluateCorrectness(
  commentText: string,
  correctAnswer: string,
  answerMatch: "EXACT" | "CONTAINS" | "NORMALIZED_EXACT",
): boolean {
  if (!correctAnswer) return true;
  if (answerMatch === "EXACT") return commentText.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  if (answerMatch === "CONTAINS") return commentText.toLowerCase().includes(correctAnswer.toLowerCase());
  return normalizeAnswer(commentText) === normalizeAnswer(correctAnswer);
}

export async function getDrawById(id: string) {
  const q = await pool.query(`select * from public.giveaway_draws where id=$1 limit 1`, [id]);
  return q.rows[0] ?? null;
}

export async function assertDrawEditable(id: string) {
  const draw = await getDrawById(id);
  if (!draw) throw new Error("Draw not found");
  if (draw.status === "FROZEN" || draw.status === "DRAWN" || draw.status === "PUBLISHED") {
    throw new Error("Draw is locked and cannot be modified");
  }
  return draw;
}

export async function getFacebookSource(drawId: string) {
  const q = await pool.query(
    `select s.*, sp.page_access_token_enc
     from public.giveaway_sources_facebook s
     join public.social_pages sp on sp.id=s.social_page_id
     where s.draw_id=$1
     limit 1`,
    [drawId],
  );
  return q.rows[0] ?? null;
}

export async function getRules(drawId: string) {
  const q = await pool.query(`select * from public.giveaway_rules where draw_id=$1 limit 1`, [drawId]);
  return (
    q.rows[0] ?? {
      dedup_one_entry_per_user: true,
      exclude_page_admins: false,
      include_replies: false,
      required_keyword: null,
      banned_keyword: null,
      require_like_page: false,
      require_like_post: false,
      require_like_comment: false,
      like_check_available: true,
    }
  );
}

export function pickRandomUnique<T>(items: T[], count: number): T[] {
  const source = [...items];
  const result: T[] = [];
  for (let i = 0; i < count && source.length > 0; i += 1) {
    const idx = crypto.randomInt(0, source.length);
    result.push(source[idx]);
    source.splice(idx, 1);
  }
  return result;
}

export function makeDrawCode() {
  return `FC-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

export function makePublicSlug() {
  return crypto.randomBytes(8).toString("hex");
}

export async function fetchFacebookPosts(socialPageId: string) {
  const pageQ = await pool.query(
    `select id, fb_page_id, fb_page_name, page_access_token_enc, status from public.social_pages where id=$1 and provider='FACEBOOK' limit 1`,
    [socialPageId],
  );
  const page = pageQ.rows[0];
  if (!page) throw new Error("Social page not found");
  if (page.status !== "ACTIVE") throw new Error("Social page is not active");

  const token = decryptString(page.page_access_token_enc);
  const params = new URLSearchParams({
    access_token: token,
    limit: "20",
    fields: "id,message,permalink_url,created_time",
  });
  const res = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(page.fb_page_id)}/posts?${params.toString()}`);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message || "Failed to fetch posts");
  }
  const posts = Array.isArray(json?.data) ? json.data.slice(0, 20) : [];
  return posts.map((p: any) => ({
    fb_post_id: String(p.id || ""),
    post_url: String(p.permalink_url || ""),
    post_text_snippet: String(p.message || "").slice(0, 280) || null,
    created_time: p.created_time,
  }));
}

export async function fetchFacebookComments(opts: {
  fbPostId: string;
  pageAccessTokenEnc: string;
  includeReplies: boolean;
}) {
  const token = decryptString(opts.pageAccessTokenEnc);
  const comments: any[] = [];
  let nextUrl: string | null = `https://graph.facebook.com/v24.0/${encodeURIComponent(opts.fbPostId)}/comments?${new URLSearchParams({
    access_token: token,
    fields: "id,message,created_time,from{id,name},parent{id}",
    limit: "100",
    ...(opts.includeReplies ? { filter: "stream" } : {}),
  }).toString()}`;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl);
    const json: any = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || "Failed to fetch comments");
    const pageData = Array.isArray(json?.data) ? json.data : [];
    for (const row of pageData) {
      if (!opts.includeReplies && row?.parent?.id) continue;
      comments.push(row);
    }
    nextUrl = typeof json?.paging?.next === "string" ? json.paging.next : null;
  }

  return comments;
}

export type InstagramComment = {
  id: string;
  text: string;
  username: string | null;
  user_id: string | null;
  created_time: string | null;
};

export type InstagramCommentsFetchInput = {
  source: {
    post_url: string;
    ig_media_id?: string | null;
    ig_shortcode?: string | null;
    ig_username?: string | null;
  };
};

export async function fetchInstagramComments(_opts: InstagramCommentsFetchInput): Promise<InstagramComment[]> {
  // TODO(instagram-picker): wire this to the Instagram provider service when available.
  throw new Error("Instagram comments fetcher is not implemented yet");
}
