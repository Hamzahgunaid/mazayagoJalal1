// src/app/api/services/new/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { slugify } from "@/lib/slug";
import ngeohash from "ngeohash";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson
    ? await req.json()
    : Object.fromEntries(await (await req.formData()).entries());

  const display_name = String(body.display_name || "").trim();
  if (!display_name)
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });

  const slugBase = slugify(body.slug || display_name);
  const short_description = String(body.short_description || "").slice(0, 240);

  const logo_url = body.logo_url ? String(body.logo_url) : null;
  const avatar_url = body.avatar_url ? String(body.avatar_url) : null;
  const cover_url = body.cover_url ? String(body.cover_url) : null;

  // meta_json (socials)
  const meta_json: Record<string, string> = {};
  ["website","facebook","instagram","twitter","tiktok","youtube","whatsapp","phone","email"].forEach((k) => {
    const v = (body as any)[k];
    if (v) meta_json[k] = String(v);
  });

  // أول نقطة (node)
  const node_name = String(body.node_name || display_name);
  const address = body.address ? String(body.address) : null;
  const city = body.city ? String(body.city) : null;
  const country = body.country ? String(body.country) : null;

  const geo_lat = body.geo_lat !== undefined && body.geo_lat !== null ? Number(body.geo_lat) : null;
  const geo_lng = body.geo_lng !== undefined && body.geo_lng !== null ? Number(body.geo_lng) : null;

  // نحسب geohash في السيرفر، ونخزن geo كنص "lng,lat" (بديل عن geography في غياب PostGIS)
  let geohash: string | null = null;
  let geo_source: string | null = null;
  let geo_text: string | null = null;
  if (geo_lat !== null && geo_lng !== null && !Number.isNaN(geo_lat) && !Number.isNaN(geo_lng)) {
    geohash = ngeohash.encode(geo_lat, geo_lng, 8); // نفس الدقة اللي كنت تستعملها
    geo_text = `${geo_lng},${geo_lat}`;
    geo_source = String(body.geo_source || "manual");
  }

  // جاليري
  let gallery_urls: string[] = [];
  try {
    gallery_urls = Array.isArray(body.gallery_urls)
      ? body.gallery_urls.map(String)
      : body.gallery_urls
      ? String(body.gallery_urls)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
  } catch {
    gallery_urls = [];
  }

  // كاتيجوري (slugs)
  let category_slugs: string[] = [];
  try {
    category_slugs = Array.isArray(body.category_slugs)
      ? body.category_slugs.map(String)
      : body.category_slugs
      ? String(body.category_slugs)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
  } catch {
    category_slugs = [];
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // تأكيد slug فريد
    let slug = slugBase || "service";
    for (let i = 0; ; i++) {
      const { rows } = await client.query(`SELECT 1 FROM public.services WHERE slug=$1 LIMIT 1`, [slug]);
      if (!rows[0]) break;
      slug = `${slugBase}-${i + 1}`;
    }

    // هل يوجد عمود group في جدول services؟ (لدعم قيودك بدون أن نكسر بيئات لا تحتويه)
    const colCheck = await client.query(
      `SELECT 1
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name='services' AND column_name='"group"'`
    );
    const hasGroup = !!colCheck.rowCount;

    // إدخال الخدمة
    let serviceId: string;
    if (hasGroup) {
      const svcIns = await client.query(
        `INSERT INTO public.services(
           owner_user_id, display_name, slug, "group", verified, status,
           logo_url, avatar_url, cover_url, short_description, meta_json
         )
         VALUES ($1,$2,$3,$4,false,'active',$5,$6,$7,$8,$9)
         RETURNING id, slug`,
        [
          user.id,
          display_name,
          slug,
          "service", // مهم من أجل check constraint إن وجد
          logo_url,
          avatar_url,
          cover_url,
          short_description || null,
          meta_json,
        ]
      );
      serviceId = svcIns.rows[0].id;
    } else {
      const svcIns = await client.query(
        `INSERT INTO public.services(
           owner_user_id, display_name, slug, verified, status,
           logo_url, avatar_url, cover_url, short_description, meta_json
         )
         VALUES ($1,$2,$3,false,'active',$4,$5,$6,$7,$8)
         RETURNING id, slug`,
        [
          user.id,
          display_name,
          slug,
          logo_url,
          avatar_url,
          cover_url,
          short_description || null,
          meta_json,
        ]
      );
      serviceId = svcIns.rows[0].id;
    }

    // إدخال أول فرع (node)
    const nodeIns = await client.query(
      `INSERT INTO public.service_nodes
         (service_id, kind, name, active,
          address, city, country,
          geo_lat, geo_lng, geohash, geo_source, geo,
          photo_url, cover_url, avatar_url, website_url, social_json)
       VALUES
         ($1,'location',$2,true,
          $3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15)
       RETURNING id`,
      [
        serviceId,
        node_name,
        address,
        city,
        country,
        geo_lat,
        geo_lng,
        geohash,
        geo_source,
        geo_text,
        // نعيد استخدام ميديا الخدمة كصور افتراضية للفرع الأول (لو رغبت)
        logo_url,
        cover_url,
        avatar_url,
        meta_json.website || null,
        {}, // social_json للـ node (اتركه فارغ الآن)
      ]
    );
    const nodeId = nodeIns.rows[0].id;

    // ربط التصنيفات
    if (category_slugs.length) {
      const cats = await client.query(
        `SELECT id, slug FROM public.categories WHERE slug = ANY($1) AND active = true`,
        [category_slugs]
      );
      for (const c of cats.rows) {
        await client.query(
          `INSERT INTO public.service_categories(service_id, category_id)
           VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [serviceId, c.id]
        );
      }
    }

    // الجاليري
    if (gallery_urls.length) {
      for (const u of gallery_urls) {
        await client.query(
          `INSERT INTO public.service_media(service_id, url, kind)
           VALUES ($1,$2,'image')`,
          [serviceId, u]
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, service_id: serviceId, service_slug: slug, node_id: nodeId });
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  } finally {
    client.release();
  }
}
