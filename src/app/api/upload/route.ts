// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs"; // مهم: لا تستخدم edge هنا

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_BASE =
  process.env.R2_PUBLIC_BASE || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    const form = await req.formData();

    // ممكن ترسل "file" أو فقط "filename" + "contentType"
    const file = form.get("file") as File | null;
    const filenameFromForm = (form.get("filename") as string) || undefined;

    const filename =
      filenameFromForm ||
      file?.name ||
      `upload-${Date.now().toString(36)}.bin`;

    const contentType =
      (form.get("contentType") as string) || file?.type || "application/octet-stream";

    const extFromName = filename.includes(".") ? filename.split(".").pop() : "";
    const extFromType = contentType.includes("/") ? contentType.split("/").pop() : "";
    const extRaw = (extFromName || extFromType || "bin").toLowerCase();
    const safeExt = extRaw.replace(/[^a-z0-9]+/g, "") || "bin";

    const ownerRaw = user?.id ? String(user.id) : "anon";
    const owner = ownerRaw.replace(/[^a-zA-Z0-9_-]+/g, "") || "anon";
    const timestamp = Date.now();

    // مفتاح التخزين داخل البكت
    const yyyyMmDd = new Date().toISOString().slice(0, 10); // 2025-10-09
    const key = `uploads/${yyyyMmDd}/${owner}-${timestamp}.${safeExt}`;

    // نوقّع URL لعملية PUT
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      // (اختياري) ACL غير مدعومة في R2، الروابط العامة عبر R2_PUBLIC_BASE
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

    // هذا هو الرابط العام الذي تحفظه في قاعدة البيانات وتعرضه بالواجهة
    const publicUrl = `${R2_PUBLIC_BASE}/${key}`;

    return NextResponse.json({
      ok: true,
      signedUrl,
      contentType,
      key,
      publicUrl,
    });
  } catch (err: any) {
    console.error("R2 sign error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "SIGN_ERROR" },
      { status: 500 }
    );
  }
}
