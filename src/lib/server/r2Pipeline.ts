import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type PipelineClient = {
  client: S3Client;
  bucket: string;
  publicBase: string;
};

export function getR2PipelineClient(): PipelineClient | null {
  const endpoint = process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");
  const bucket = process.env.R2_BUCKET || "";
  const publicBase = process.env.R2_PUBLIC_BASE || (endpoint && bucket ? `${endpoint}/${bucket}` : "");

  if (!endpoint || !bucket || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !publicBase) {
    return null;
  }

  return {
    client: new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    }),
    bucket,
    publicBase,
  };
}

export function r2PublicUrl(r2: PipelineClient, key: string): string {
  return `${r2.publicBase}/${key}`;
}

export async function putR2Json(r2: PipelineClient, key: string, payload: unknown) {
  await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: Buffer.from(JSON.stringify(payload, null, 2), "utf-8"),
      ContentType: "application/json; charset=utf-8",
    }),
  );
  return r2PublicUrl(r2, key);
}

export async function getR2Json<T = any>(r2: PipelineClient, key: string): Promise<T | null> {
  try {
    const obj = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: key }));
    if (!obj.Body) return null;
    const text = await obj.Body.transformToString();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
