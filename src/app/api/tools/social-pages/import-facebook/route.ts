export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { encryptString } from "@/lib/messengerCrypto";

const schema = z.object({
  fb_page_id: z.string().min(1).max(255),
  fb_page_name: z.string().min(1).max(255),
  page_access_token: z.string().min(8).max(4000),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await pool.query(
    `select id, provider, fb_page_id, fb_page_name, page_access_token_last4, status, updated_at
     from public.social_pages
     where provider='FACEBOOK' and fb_page_id=$1 and status='ACTIVE'
     limit 1`,
    [parsed.data.fb_page_id],
  );

  const enc = encryptString(parsed.data.page_access_token);
  const last4 = parsed.data.page_access_token.slice(-4);

  const upsert = await pool.query(
    `insert into public.social_pages (provider, fb_page_id, fb_page_name, page_access_token_enc, page_access_token_last4, status, updated_at)
     values ('FACEBOOK',$1,$2,$3,$4,'ACTIVE',now())
     on conflict (provider, fb_page_id)
     do update set
       fb_page_name=excluded.fb_page_name,
       page_access_token_enc=excluded.page_access_token_enc,
       page_access_token_last4=excluded.page_access_token_last4,
       status='ACTIVE',
       updated_at=now()
     returning id, provider, fb_page_id, fb_page_name, page_access_token_last4, status, updated_at`,
    [parsed.data.fb_page_id, parsed.data.fb_page_name, enc, last4],
  );

  return NextResponse.json({
    ok: true,
    already_connected: !!existing.rowCount,
    message: existing.rowCount ? "Page already connected" : "Page connected",
    data: upsert.rows[0],
  });
}
