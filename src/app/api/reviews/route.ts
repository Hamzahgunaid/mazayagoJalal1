export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") || "";
  let payload: any = {};
  if (ct.includes("application/json")) {
    payload = await req.json();
  } else {
    const form = await req.formData();
    for (const [k, v] of form.entries()) payload[k] = v;
  }

  const {
    service_id,
    service_node_id,
    node_id,
    rating,
    title,
    body,
    visit_date,
    session_token,
  } = payload;

  let nodeId: string | null = node_id || service_node_id || null;

  if (!nodeId && service_id) {
    const r = await pool.query(
      `SELECT id FROM public.service_nodes WHERE service_id=$1 AND active=true ORDER BY created_at ASC LIMIT 1`,
      [service_id]
    );
    nodeId = r.rows[0]?.id || null;
  }
  if (!nodeId) return NextResponse.json({ error: "No service node available" }, { status: 400 });

  const rInt = parseInt(rating);
  if (!Number.isFinite(rInt) || rInt < 1 || rInt > 5) {
    return NextResponse.json({ error: "Invalid rating (must be 1..5)" }, { status: 400 });
  }

  // 1) Rate-limit: Ù†ÙØ³ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¹Ù„Ù‰ Ù†ÙØ³ Ø§Ù„Ù†ÙˆØ¯ Ø®Ù„Ø§Ù„ 10 Ø¯Ù‚Ø§Ø¦Ù‚
  const recent = await pool.query(
    `SELECT 1 FROM public.reviews
     WHERE user_id=$1 AND service_node_id=$2 AND submitted_at >= now() - interval '10 minutes'
     LIMIT 1`,
    [user.id, nodeId]
  );
  if (recent.rows[0]) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // 2) Ø¬Ø±Ù‘Ø¨ Ø§Ø³ØªÙ‡Ù„Ø§Ùƒ Ø³ÙŠØ´Ù† (Ø¯Ø¹ÙˆØ©/QR). Ù„Ùˆ ÙØ´Ù„ Ù†Ø¨Ù‚Ù‰ Organic.
  let consumedSessionId: string | null = null;
  if (session_token && typeof session_token === "string" && session_token.length >= 8) {
    try {
      const asInvite = await pool.query(
        `SELECT public.consume_review_session($1::text, $2::uuid, 'invite') AS sid`,
        [session_token, nodeId]
      );
      consumedSessionId = asInvite.rows[0]?.sid || null;
      if (!consumedSessionId) {
        const asQr = await pool.query(
          `SELECT public.consume_review_session($1::text, $2::uuid, 'qr') AS sid`,
          [session_token, nodeId]
        );
        consumedSessionId = asQr.rows[0]?.sid || null;
      }
    } catch {
      consumedSessionId = null;
    }
  }

  // 3) Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©
  const ins = await pool.query(
    `INSERT INTO public.reviews
       (user_id, service_node_id, rating, title, body, visited_at, type, status, submitted_at, updated_at)
     VALUES
       ($1, $2, $3, NULLIF($4,''), $5, $6, 'text', 'pending', now(), now())
     RETURNING id`,
    [user.id, nodeId, rInt, title || null, body, visit_date || null]
  );
  const reviewId: string = ins.rows[0].id;

  // 4) Ø§Ø±Ø¨Ø· Ø§Ù„ØªØ­Ù‚Ù‚ Ø¨Ø§Ù„Ø¬Ù„Ø³Ø© Ø¥Ù† ÙˆÙØ¬Ø¯Øª
  if (consumedSessionId) {
    try {
      await pool.query(
        `INSERT INTO public.review_verifications (review_id, node_kind_snapshot, session_id)
         VALUES ($1, 'node', $2)
         ON CONFLICT (review_id) DO UPDATE SET session_id = EXCLUDED.session_id`,
        [reviewId, consumedSessionId]
      );
    } catch {}
  }

  // (Ø§Ø®ØªÙŠØ§Ø±ÙŠ) Audit
  try {
    await pool.query(
      `INSERT INTO public.audit_log (user_id, action, target_type, target_id, created_at)
       VALUES ($1, 'create_review', 'review', $2, now())`,
      [user.id, reviewId]
    );
  } catch {}

  // 5) ÙˆØ¬Ù‘Ù‡ Ù…Ø¨Ø§Ø´Ø±Ø© Ù„ØµÙØ­Ø© Ø§Ù„ÙØ±Ø¹ Ù…Ø¹ Banner Ù†Ø¬Ø§Ø­
  return NextResponse.json({ ok: true, review_id: reviewId, redirect: `/service/${nodeId}?submitted=1` });
}




