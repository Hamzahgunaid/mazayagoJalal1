export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

function baseUrl(req: Request) {
  // استخدم ENV إن وجد (على الإنتاج)، وإلا ابنِ من الهيدرز
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env && /^https?:\/\//i.test(env)) return env.replace(/\/+$/,"");
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host  = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { node_id, ttl_days = 365, max_uses = 1_000_000 } = await req.json();

    if (!node_id) return NextResponse.json({ error: "node_id is required" }, { status: 400 });

    // تحقّق أن المستخدم يملك الخدمة التابعة لهذا النود
    const own = await pool.query(
      `SELECT s.id, s.slug, s.display_name
       FROM public.service_nodes sn
       JOIN public.services s ON s.id = sn.service_id
       WHERE sn.id = $1 AND s.owner_user_id = $2
       LIMIT 1`,
      [node_id, user.id]
    );
    const svc = own.rows[0];
    if (!svc) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // أنشئ جلسة QR (وظيفة DB أنشأناها سابقًا)
    const r = await pool.query(
      `SELECT token, expires_at
       FROM public.create_qr_session($1::uuid, $2::uuid, $3::int, $4::int)`,
      [node_id, user.id, ttl_days, max_uses]
    );
    const { token, expires_at } = r.rows[0];

    // رابط صفحة المراجعة مع التوكن
    const reviewUrl = `${baseUrl(req)}/s/${encodeURIComponent(svc.slug)}/review?session_token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      ok: true,
      service_slug: svc.slug,
      service_name: svc.display_name,
      token,
      expires_at,
      review_url: reviewUrl,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
