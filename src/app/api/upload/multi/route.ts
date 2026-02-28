// src/app/api/upload/route.ts  (أو .../multi/route.ts)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const R2_BUCKET = process.env.R2_BUCKET!;
const R2_ENDPOINT = process.env.R2_ENDPOINT!;        // مثل: https://<account-id>.r2.cloudflarestorage.com
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE!;  // مثل: https://pub-XXXXXXXXXXXX.r2.dev  (بدون /bucket)

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function extOf(name: string) {
  const m = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : ".bin";
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    // يدعم ملف واحد أو عدّة ملفات (حقل "file" أو "files")
    const files: File[] = [
      ...form.getAll("file"),
      ...form.getAll("files"),
    ].filter(Boolean) as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    const urls: string[] = [];

    for (const f of files) {
      const bytes = Buffer.from(await f.arrayBuffer());
      const key = `uploads/${new Date().toISOString().slice(0,10)}/${randomUUID()}${extOf(f.name)}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: bytes,
          ContentType: f.type || "application/octet-stream",
          ACL: "private", // اجعلها private؛ العرض يتم عبر R2_PUBLIC_BASE إذا كان البكت Public
        })
      );

      // ملاحظة: على R2 Public Dev URL لا تضع اسم البكت في الرابط
      // إذا جعلت البكت Public عبر R2، سيكون الوصول:
      //   https://<R2_PUBLIC_BASE>/<key>
      const publicUrl = `${R2_PUBLIC_BASE}/${key}`;
      urls.push(publicUrl);
    }

    // إذا كان الطلب لملف واحد أعد "url"؛ وإن كان متعددًا أعد "urls"
    return NextResponse.json(
      urls.length === 1 ? { ok: true, url: urls[0] } : { ok: true, urls }
    );
  } catch (e: any) {
    console.error("R2 upload error:", e);
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
