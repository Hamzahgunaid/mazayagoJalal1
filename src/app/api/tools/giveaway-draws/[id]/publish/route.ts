export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getDrawById, makePublicSlug } from "@/lib/tools/giveawayPicker";
import { getR2PipelineClient, putR2Json, r2PublicUrl } from "@/lib/server/r2Pipeline";
import { dispatchGithubRenderWorkflow } from "@/lib/server/githubRenderDispatch";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const draw = await getDrawById(params.id);
  if (!draw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (draw.status !== "DRAWN") return NextResponse.json({ error: "Run official draw first" }, { status: 400 });

  const slug = draw.public_view_slug || makePublicSlug();
  const r2 = getR2PipelineClient();

  const winnersQ = await pool.query(
    `select w.rank, w.winner_type, e.display_name, e.comment_url
     from public.giveaway_winners w
     join public.giveaway_entries e on e.id=w.entry_id
     where w.draw_id=$1
     order by w.rank asc`,
    [params.id],
  );

  const packageKey = `giveaway/${slug}`;
  const manifestKey = `${packageKey}/manifest.json`;
  const winnersKey = `${packageKey}/winners.json`;
  const renderStatusKey = `${packageKey}/render-status.json`;
  const renderJobKey = `${packageKey}/render-job.json`;
  const videoKey = `${packageKey}/video.mp4`;

  const fallbackBase = `https://example.com/giveaway/${slug}`;
  const videoUrl = r2 ? r2PublicUrl(r2, videoKey) : `${fallbackBase}/video.mp4`;

  const publishedAt = new Date().toISOString();
  const manifestPayload = {
    draw_id: params.id,
    slug,
    published_at: publishedAt,
    assets: {
      video_output: videoUrl,
      winners_file: r2 ? r2PublicUrl(r2, winnersKey) : `${fallbackBase}/winners.json`,
    },
    note: "Video is rendered asynchronously by worker from this package.",
  };

  const winnersPayload = {
    draw_id: params.id,
    slug,
    winners: winnersQ.rows,
  };

  const renderStatusPayload = {
    status: "queued",
    eta_seconds: 120,
    started_at: null,
    completed_at: null,
    render_duration_sec: null,
    error_message: null,
    updated_at: publishedAt,
  };

  const renderJobPayload = {
    job_type: "giveaway_render",
    draw_id: params.id,
    slug,
    manifest_key: manifestKey,
    winners_key: winnersKey,
    output: { video_key: videoKey },
    queued_at: publishedAt,
  };

  let manifestUrl: string | null = null;
  let winnersUrl: string | null = null;
  let renderStatusUrl: string | null = null;
  let renderJobUrl: string | null = null;

  try {
    if (r2) {
      manifestUrl = await putR2Json(r2, manifestKey, manifestPayload);
      winnersUrl = await putR2Json(r2, winnersKey, winnersPayload);
      renderStatusUrl = await putR2Json(r2, renderStatusKey, renderStatusPayload);
      renderJobUrl = await putR2Json(r2, renderJobKey, renderJobPayload);
      await dispatchGithubRenderWorkflow({ drawId: params.id, slug });
    }
  } catch (error) {
    return NextResponse.json({ error: `Failed to upload publish package: ${String((error as any)?.message || error)}` }, { status: 500 });
  }

  const assets = await pool.query(
    `insert into public.giveaway_publish_assets (draw_id, video_url, published_at)
     values ($1,$2,now())
     on conflict (draw_id)
     do update set video_url=excluded.video_url, published_at=excluded.published_at
     returning *`,
    [params.id, videoUrl],
  );

  const drawQ = await pool.query(
    `update public.giveaway_draws set status='PUBLISHED', public_view_slug=$2, updated_at=now() where id=$1 returning *`,
    [params.id, slug],
  );

  return NextResponse.json({
    ok: true,
    data: {
      draw: drawQ.rows[0],
      assets: assets.rows[0],
      package: {
        storage: r2 ? "R2" : "fallback",
        manifest_url: manifestUrl,
        winners_url: winnersUrl,
        render_status_url: renderStatusUrl,
        render_job_url: renderJobUrl,
        expected_files: [videoUrl],
      },
    },
  });
}
