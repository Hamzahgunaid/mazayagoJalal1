export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

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
    `UPDATE public.businesses
        SET name = $1,
            avatar_url = $2,
            logo_url = $3,
            website_url = $4,
            phone = $5,
            social_json = $6::jsonb,
            meta_json = $7::jsonb,
            updated_at = now()
      WHERE id = $8
        AND owner_user_id = $9
      RETURNING id, name, avatar_url, logo_url, website_url, phone, social_json, meta_json, created_at`,
    [
      name,
      avatarUrl,
      logoUrl,
      websiteUrl,
      phone,
      JSON.stringify(socialJson),
      JSON.stringify(metaJson),
      id,
      user.id,
    ]
  );

  if (!rows.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ item: rows[0] });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { rows } = await pool.query(
    `DELETE FROM public.businesses
      WHERE id = $1
        AND owner_user_id = $2
      RETURNING id`,
    [id, user.id]
  );

  if (!rows.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
