export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getDrawById } from "@/lib/tools/giveawayPicker";
import { getR2PipelineClient, putR2Json } from "@/lib/server/r2Pipeline";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const expectedSecret = process.env.RENDER_CALLBACK_SECRET || "";
  const providedSecret = req.headers.get("x-render-secret") || "";
  if (expectedSecret && expectedSecret !== providedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const draw = await getDrawById(params.id);
  if (!draw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!draw.public_view_slug) return NextResponse.json({ error: "Missing public slug" }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const status = String(body?.status || "rendering");
  const renderDurationSec = body?.render_duration_sec ?? null;
  const errorMessage = body?.error_message ?? null;
  const etaSeconds = body?.eta_seconds ?? null;
  const videoUrl = body?.videoUrl ? String(body.videoUrl) : body?.video_url ? String(body.video_url) : null;

  const r2 = getR2PipelineClient();
  if (r2) {
    const now = new Date().toISOString();
    await putR2Json(r2, `giveaway/${draw.public_view_slug}/render-status.json`, {
      status,
      eta_seconds: etaSeconds,
      started_at: body?.started_at ?? null,
      completed_at: body?.completed_at ?? (status === "published" ? now : null),
      render_duration_sec: renderDurationSec,
      error_message: errorMessage,
      updated_at: now,
    });
  }

  if (videoUrl) {
    await pool.query(
      `update public.giveaway_publish_assets
       set video_url=coalesce($2, video_url),
           published_at=coalesce(published_at, now())
       where draw_id=$1`,
      [params.id, videoUrl],
    );
  }

  return NextResponse.json({ ok: true });
}
