export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || "";
  const q = (searchParams.get("q") || "").trim();

  // 1) ÙØ¦Ø§Øª (ÙƒÙ…Ø§ Ù‡ÙŠ)
  const cats = await pool.query(`
    SELECT c.id, c.name_en AS name, c.icon_key
    FROM public.categories c
    WHERE c.parent_id IS NOT NULL AND c.active = TRUE
    ORDER BY c.name_en
    LIMIT 20
  `);

  // 2) Ø£ÙØ¶Ù„ Ø§Ù„Ø®Ø¯Ù…Ø§Øª (ØªØ¬Ù…ÙŠØ¹ Ø¹Ù„Ù‰ Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø®Ø¯Ù…Ø© + Ø¥Ø±Ø¬Ø§Ø¹ slug Ùˆ Ø§Ù„Ù…ØªÙˆØ³Ø·Ø§Øª)
  const best = await pool.query(
    `
    WITH svc_reviews AS (
      SELECT
        sn.service_id,
        COUNT(r.*) FILTER (WHERE r.status='approved')               AS reviews,
        AVG(r.rating) FILTER (WHERE r.status='approved')            AS avg_rating
      FROM public.service_nodes sn
      LEFT JOIN public.reviews r ON r.service_node_id = sn.id
      GROUP BY sn.service_id
    ),
    svc_rscore AS (
      SELECT
        sn.service_id,
        AVG(t.r_score) AS r_score
      FROM public.service_transparency_v t
      JOIN public.service_nodes sn ON sn.id = t.service_node_id
      GROUP BY sn.service_id
    ),
    svc_place AS (
      -- Ù†Ø£Ø®Ø° Ù…Ø¯ÙŠÙ†Ø©/Ø¯ÙˆÙ„Ø© "ØªÙ…Ø«ÙŠÙ„ÙŠØ©" Ù„Ù„Ø®Ø¯Ù…Ø© (Ø¢Ø®Ø± Ù†ÙˆØ¯ Ù…ÙØ­Ø¯Ù‘ÙŽØ«)
      SELECT DISTINCT ON (sn.service_id)
        sn.service_id, sn.city, sn.country
      FROM public.service_nodes sn
      ORDER BY sn.service_id, sn.updated_at DESC NULLS LAST
    )
    SELECT
      s.id,
      s.slug,
      s.display_name AS name,
      sp.city,
      sp.country,
      COALESCE(sr.reviews,0)                                    AS reviews,
      ROUND(COALESCE(sr.avg_rating,0)::numeric, 2)              AS avg_rating,
      ROUND(COALESCE(rs.r_score,0)::numeric, 2)                 AS r_score
    FROM public.services s
    LEFT JOIN svc_reviews sr ON sr.service_id = s.id
    LEFT JOIN svc_rscore  rs ON rs.service_id = s.id
    LEFT JOIN svc_place   sp ON sp.service_id = s.id
    WHERE ($1 = '' OR sp.country = $1)
      AND ($2 = '' OR s.display_name ILIKE '%'||$2||'%')
    ORDER BY sr.reviews DESC NULLS LAST
    LIMIT 12
  `,
    [country, q]
  );

  // 3) Ø¢Ø®Ø± Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø§Øª (Ù†Ø¶ÙŠÙ slug Ù„Ù„Ø±Ø¨Ø·)
  const latest = await pool.query(
    `
    SELECT
      r.id,
      r.title,
      r.body,
      r.submitted_at,
      sn.name AS node_name,
      s.slug  AS service_slug
    FROM public.reviews r
    JOIN public.service_nodes sn ON sn.id = r.service_node_id
    JOIN public.services s      ON s.id  = sn.service_id
    WHERE r.status = 'approved'
      AND ($1 = '' OR sn.country = $1)
      AND ($2 = '' OR sn.name ILIKE '%'||$2||'%' OR r.title ILIKE '%'||$2||'%' OR r.body ILIKE '%'||$2||'%')
    ORDER BY r.submitted_at DESC
    LIMIT 12
  `,
    [country, q]
  );

  return NextResponse.json({
    categories: cats.rows,
    best_services: best.rows,
    latest_reviews: latest.rows,
  });
}




