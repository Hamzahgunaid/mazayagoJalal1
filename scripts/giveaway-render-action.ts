import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const execFileAsync = promisify(execFile);

type WinnerRow = {
  rank: number;
  winner_type: string;
  display_name: string;
};

type R2Client = {
  client: S3Client;
  bucket: string;
  publicBase: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name] || "";
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function getR2Client(): R2Client {
  const endpoint = requiredEnv("R2_ENDPOINT");
  const bucket = requiredEnv("R2_BUCKET");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  const publicBase = process.env.R2_PUBLIC_BASE || `${endpoint}/${bucket}`;

  return {
    client: new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
    publicBase,
  };
}

function r2PublicUrl(r2: R2Client, key: string): string {
  return `${r2.publicBase}/${key}`;
}

async function getR2Json<T>(r2: R2Client, key: string): Promise<T> {
  const obj = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: key }));
  if (!obj.Body) throw new Error(`R2 object has no body: ${key}`);
  const text = await obj.Body.transformToString();
  return JSON.parse(text) as T;
}

async function putR2Json(r2: R2Client, key: string, payload: unknown): Promise<void> {
  await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: Buffer.from(JSON.stringify(payload, null, 2), "utf-8"),
      ContentType: "application/json; charset=utf-8",
    }),
  );
}

async function hasFfmpeg(): Promise<boolean> {
  return execFileAsync("ffmpeg", ["-version"]).then(() => true).catch(() => false);
}

async function renderVideoWithFfmpeg(outputPath: string, winnersTextPath: string): Promise<void> {
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

async function postCallback(payload: Record<string, unknown>): Promise<void> {
  const callbackTemplate = requiredEnv("RENDER_CALLBACK_URL");
  const callbackSecret = requiredEnv("RENDER_CALLBACK_SECRET");
  const drawId = String(payload.drawId || "");
  const callbackUrl = callbackTemplate.replace("{drawId}", drawId);

  await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-render-secret": callbackSecret,
    },
    body: JSON.stringify(payload),
  });
}

async function run(): Promise<void> {
  const drawId = requiredEnv("DRAW_ID");
  const slug = requiredEnv("DRAW_SLUG");
  const r2 = getR2Client();

  const base = `giveaway/${slug}`;
  const manifestKey = `${base}/manifest.json`;
  const winnersKey = `${base}/winners.json`;
  const renderJobKey = `${base}/render-job.json`;
  const renderStatusKey = `${base}/render-status.json`;
  const videoKey = `${base}/video.mp4`;

  const startedAt = new Date().toISOString();
  await putR2Json(r2, renderStatusKey, {
    status: "rendering",
    eta_seconds: 90,
    started_at: startedAt,
    completed_at: null,
    render_duration_sec: null,
    error_message: null,
    updated_at: startedAt,
  });

  const startMs = Date.now();
  const tempDir = await mkdtemp(path.join(tmpdir(), "giveaway-gh-render-"));

  try {
    await getR2Json(r2, manifestKey);
    await getR2Json(r2, renderJobKey);
    const winnersPayload = await getR2Json<{ winners?: WinnerRow[] }>(r2, winnersKey);
    const winners = Array.isArray(winnersPayload?.winners) ? winnersPayload.winners : [];

    const ffmpegReady = await hasFfmpeg();
    if (!ffmpegReady) {
      throw new Error("ffmpeg is not available in GitHub Actions runtime");
    }

    const winnersTextPath = path.join(tempDir, "winners.txt");
    const videoPath = path.join(tempDir, "video.mp4");

    const winnersText = winners.map((w) => `${w.rank}. ${w.winner_type} - ${w.display_name || "-"}`).join("\n");
    await writeFile(winnersTextPath, winnersText || "No winners found", "utf-8");

    await renderVideoWithFfmpeg(videoPath, winnersTextPath);

    const videoBody = await readFile(videoPath);

    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: videoKey,
        Body: videoBody,
        ContentType: "video/mp4",
      }),
    );

    const completedAt = new Date().toISOString();
    const renderDurationSec = Math.max(1, Math.round((Date.now() - startMs) / 1000));
    const videoUrl = r2PublicUrl(r2, videoKey);

    await putR2Json(r2, renderStatusKey, {
      status: "published",
      eta_seconds: 0,
      started_at: startedAt,
      completed_at: completedAt,
      render_duration_sec: renderDurationSec,
      error_message: null,
      updated_at: completedAt,
      video_url: videoUrl,
    });

    await postCallback({
      drawId,
      slug,
      status: "published",
      videoUrl,
      render_duration_sec: renderDurationSec,
      started_at: startedAt,
      completed_at: completedAt,
      eta_seconds: 0,
    });
  } catch (error) {
    const completedAt = new Date().toISOString();
    const renderDurationSec = Math.max(1, Math.round((Date.now() - startMs) / 1000));
    const errorMessage = String((error as any)?.message || error);

    await putR2Json(r2, renderStatusKey, {
      status: "failed",
      eta_seconds: null,
      started_at: startedAt,
      completed_at: completedAt,
      render_duration_sec: renderDurationSec,
      error_message: errorMessage,
      updated_at: completedAt,
    });

    await postCallback({
      drawId,
      slug,
      status: "failed",
      error_message: errorMessage,
      render_duration_sec: renderDurationSec,
      started_at: startedAt,
      completed_at: completedAt,
    });

    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error("giveaway-render-action failed:", error);
  process.exitCode = 1;
});
