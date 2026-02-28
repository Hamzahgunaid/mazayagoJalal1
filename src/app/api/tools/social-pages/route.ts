export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { encryptString } from "@/lib/messengerCrypto";

const inputSchema = z.object({
  provider: z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"]).default("FACEBOOK"),
  fb_page_id: z.string().min(1).max(255),
  fb_page_name: z.string().min(1).max(255),
  page_access_token: z.string().min(8).max(4000),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = (url.searchParams.get("provider") || "FACEBOOK").toUpperCase();
  if (!["FACEBOOK", "INSTAGRAM", "TIKTOK"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  const q = await pool.query(
    `select id, provider, fb_page_id, fb_page_name, page_access_token_last4, status, created_at, updated_at
     from public.social_pages
     where provider=$1
     order by updated_at desc`,
    [provider],
  );
  return NextResponse.json({ ok: true, data: q.rows });
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const enc = encryptString(parsed.data.page_access_token);
  const last4 = parsed.data.page_access_token.slice(-4);

  const q = await pool.query(
    `insert into public.social_pages (provider, fb_page_id, fb_page_name, page_access_token_enc, page_access_token_last4, status, updated_at)
      values ($1,$2,$3,$4,$5,'ACTIVE',now())
      on conflict (provider, fb_page_id)
      do update set
        fb_page_name=excluded.fb_page_name,
        page_access_token_enc=excluded.page_access_token_enc,
        page_access_token_last4=excluded.page_access_token_last4,
        status='ACTIVE',
        updated_at=now()
      returning id, provider, fb_page_id, fb_page_name, page_access_token_last4, status, updated_at`,
    [parsed.data.provider, parsed.data.fb_page_id, parsed.data.fb_page_name, enc, last4],
  );

  return NextResponse.json({ ok: true, data: q.rows[0] });
}
