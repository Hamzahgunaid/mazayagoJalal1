export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDrawById } from "@/lib/tools/giveawayPicker";
import { getR2PipelineClient, putR2Json } from "@/lib/server/r2Pipeline";
import { dispatchGithubRenderWorkflow } from "@/lib/server/githubRenderDispatch";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const draw = await getDrawById(params.id);
  if (!draw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!draw.public_view_slug) return NextResponse.json({ error: "Publish first" }, { status: 400 });

  const r2 = getR2PipelineClient();
  if (!r2) return NextResponse.json({ error: "R2 is not configured" }, { status: 400 });

  const slug = draw.public_view_slug;
  const now = new Date().toISOString();
  const base = `giveaway/${slug}`;

  await putR2Json(r2, `${base}/render-status.json`, {
    status: "queued",
    eta_seconds: 120,
    started_at: null,
    completed_at: null,
    render_duration_sec: null,
    error_message: null,
    updated_at: now,
  });

  await putR2Json(r2, `${base}/render-job.json`, {
    job_type: "giveaway_render",
    draw_id: params.id,
    slug,
    manifest_key: `${base}/manifest.json`,
    winners_key: `${base}/winners.json`,
    output: { video_key: `${base}/video.mp4` },
    queued_at: now,
    retried: true,
  });

  await dispatchGithubRenderWorkflow({ drawId: params.id, slug });

  return NextResponse.json({ ok: true });
}
