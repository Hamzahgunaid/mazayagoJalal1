import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { pool } from "@/lib/db";
import { getR2Json, getR2PipelineClient, putR2Json, r2PublicUrl } from "@/lib/server/r2Pipeline";

const execFileAsync = promisify(execFile);

type RenderJob = {
  drawId: string;
  slug: string;
  winnersKey: string;
  videoKey: string;
};

function hasFfmpeg(): Promise<boolean> {
  return execFileAsync("ffmpeg", ["-version"]).then(() => true).catch(() => false);
}

async function renderVideoWithFfmpeg(outputPath: string, winnersTextPath: string) {
  const filter = [
    "drawtext=fontcolor=white:fontsize=54:text='MazayaGo Giveaway Draw':x=(w-text_w)/2:y=100",
    `drawtext=fontcolor=white:fontsize=34:textfile='${winnersTextPath.replace(/:/g, "\\:")}':x=100:y=220:line_spacing=14`,
    "drawtext=fontcolor=gray:fontsize=24:text='Official Transparency Render':x=(w-text_w)/2:y=h-80",
  ].join(",");

  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x111827:s=1280x720:d=12",
    "-vf",
    filter,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

export async function runGiveawayRenderWorker(job: RenderJob) {
  const r2 = getR2PipelineClient();
  if (!r2) throw new Error("R2 is not configured");

  const statusKey = `giveaway/${job.slug}/render-status.json`;

  await putR2Json(r2, statusKey, {
    status: "rendering",
    eta_seconds: 90,
    started_at: new Date().toISOString(),
    completed_at: null,
    render_duration_sec: null,
    error_message: null,
    updated_at: new Date().toISOString(),
  });

  const start = Date.now();
  const tempDir = await mkdtemp(path.join(tmpdir(), "giveaway-render-"));

  try {
    const winnersPayload = await getR2Json<{ winners?: any[] }>(r2, job.winnersKey);
    const winners = Array.isArray(winnersPayload?.winners) ? winnersPayload!.winners! : [];
    const winnersText = winners.map((w: any) => `${w.rank}. ${w.winner_type} - ${w.display_name || "-"}`).join("\n");

    const winnersTextPath = path.join(tempDir, "winners.txt");
    const videoPath = path.join(tempDir, "video.mp4");
    await writeFile(winnersTextPath, winnersText || "No winners found");

    const ffmpegReady = await hasFfmpeg();
    if (!ffmpegReady) {
      throw new Error("ffmpeg is not available in runtime environment");
    }

    await renderVideoWithFfmpeg(videoPath, winnersTextPath);

    const videoBody = await readFile(videoPath);

    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: job.videoKey,
        Body: videoBody,
        ContentType: "video/mp4",
      }),
    );


    const videoUrl = r2PublicUrl(r2, job.videoKey);
    const durationSec = Math.max(1, Math.round((Date.now() - start) / 1000));

    await putR2Json(r2, statusKey, {
      status: "published",
      eta_seconds: 0,
      started_at: new Date(start).toISOString(),
      completed_at: new Date().toISOString(),
      render_duration_sec: durationSec,
      error_message: null,
      updated_at: new Date().toISOString(),
    });

    await pool.query(
      `update public.giveaway_publish_assets
       set video_url=$2, published_at=coalesce(published_at, now())
       where draw_id=$1`,
      [job.drawId, videoUrl],
    );
  } catch (error: any) {
    await putR2Json(r2, statusKey, {
      status: "failed",
      eta_seconds: null,
      started_at: new Date(start).toISOString(),
      completed_at: new Date().toISOString(),
      render_duration_sec: Math.max(1, Math.round((Date.now() - start) / 1000)),
      error_message: String(error?.message || error),
      updated_at: new Date().toISOString(),
    });
    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
