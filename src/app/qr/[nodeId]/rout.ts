// src/app/qr/[nodeId]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request, ctx: { params: Promise<{ nodeId: string }> }) {
  try {
    const { nodeId } = await ctx.params;

    const srow = await pool.query(
      `SELECT s.slug
         FROM public.service_nodes sn
         JOIN public.services s ON s.id = sn.service_id
        WHERE sn.id = $1
        LIMIT 1`,
      [nodeId]
    );
    const slug = srow.rows[0]?.slug;
    if (!slug) return NextResponse.redirect(new URL("/", req.url), 302);

    await pool.query(
      `INSERT INTO public.qr_scans(service_node_id, scanned_at) VALUES ($1, now())`,
      [nodeId]
    );

    const sess = await pool.query(
      `SELECT token
         FROM public.create_qr_session($1::uuid, NULL::uuid, $2::int, $3::int)`,
      [nodeId, 3650, 100000000] // ~10 سنوات، عدد استخدامات ضخم
    );

    const token = sess.rows[0]?.token;
    const target = token
      ? `/s/${encodeURIComponent(slug)}/review?session_token=${encodeURIComponent(token)}`
      : `/s/${encodeURIComponent(slug)}/review`;

    return NextResponse.redirect(new URL(target, req.url), 302);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(new URL("/", req.url), 302);
  }
}
