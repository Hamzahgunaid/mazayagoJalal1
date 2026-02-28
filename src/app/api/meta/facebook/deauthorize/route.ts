export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { pool } from "@/lib/db";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function decodeBase64UrlToBuffer(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function verifySignedRequest(signedRequest: string, appSecret: string) {
  const [sigB64Url, payloadB64Url] = signedRequest.split(".");
  if (!sigB64Url || !payloadB64Url) {
    return { ok: false as const };
  }

  const providedSig = decodeBase64UrlToBuffer(sigB64Url);
  const expectedSig = createHmac("sha256", appSecret).update(payloadB64Url).digest();

  if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false as const };
  }

  try {
    const payloadRaw = decodeBase64UrlToBuffer(payloadB64Url).toString("utf8");
    const payload = JSON.parse(payloadRaw) as { user_id?: string };
    if (!payload?.user_id) {
      return { ok: false as const };
    }

    return { ok: true as const, payload };
  } catch {
    return { ok: false as const };
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const signedRequest = String(form.get("signed_request") || "").trim();
    if (!signedRequest) {
      return NextResponse.json({ ok: false, error: "invalid_signed_request" }, { status: 400 });
    }

    const appSecret = requiredEnv("FACEBOOK_OAUTH_CLIENT_SECRET");
    const verified = verifySignedRequest(signedRequest, appSecret);
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: "invalid_signed_request" }, { status: 400 });
    }

    const fbUserId = verified.payload.user_id;
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id
         FROM public.users
        WHERE COALESCE(meta_json->'oauth'->'facebook'->>'user_id', '') = $1
        LIMIT 1`,
      [fbUserId]
    );

    const userId = rows[0]?.id;
    if (userId) {
      await pool.query(`DELETE FROM public.user_sessions WHERE user_id = $1`, [userId]);
      await pool.query(
        `UPDATE public.users
            SET meta_json = (COALESCE(meta_json, '{}'::jsonb) #- '{oauth,facebook}')
          WHERE id = $1`,
        [userId]
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
