export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT id, name, avatar_url, logo_url, website_url, phone, social_json, meta_json, created_at
       FROM public.businesses
      WHERE owner_user_id = $1
      ORDER BY created_at DESC`,
    [user.id]
  );

  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const avatarUrl = body.avatar_url || null;
  const logoUrl = body.logo_url || null;
  const websiteUrl = body.website_url || null;
  const phone = body.phone || null;
  const socialJson = body.social_json ?? {};
  const metaJson = body.meta_json ?? {};

  const { rows } = await pool.query(
    `INSERT INTO public.businesses
      (owner_user_id, name, avatar_url, logo_url, website_url, phone, social_json, meta_json)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)
     RETURNING id, name, avatar_url, logo_url, website_url, phone, social_json, meta_json, created_at`,
    [
      user.id,
      name,
      avatarUrl,
      logoUrl,
      websiteUrl,
      phone,
      JSON.stringify(socialJson),
      JSON.stringify(metaJson),
    ]
  );

  return NextResponse.json({ item: rows[0] });
}
