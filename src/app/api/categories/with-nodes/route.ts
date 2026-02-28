export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * تُرجع مجموعات الفئات العليا (root) وكل فئة فرعية (sub)
 * ومعها أعلى 5 خدمات (حسب عدد المراجعات، ثم المتوسّط) قابلة للنقر إلى /s/[slug].
 * تقبل فلاتر: country, q
 */
export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get("country") || "").trim();
  const q       = (searchParams.get("q") || "").trim();

  const { rows } = await pool.query(`
    WITH ec AS (
      SELECT service_node_id, category_id
      FROM public.effective_node_categories_v
    ),
    rev AS (
      SELECT r.id, r.service_node_id, r.rating
      FROM public.reviews r
      WHERE r.status = 'approved'
    ),
    node_stats AS (
      SELECT
        ec.category_id                        AS sub_id,
        sn.service_id,
        s.slug,
        s.display_name,
        MAX(sn.city)                           AS city,
        MAX(sn.country)                        AS country,
        COUNT(rev.id)                          AS reviews,
        ROUND(AVG(rev.rating)::numeric, 2)     AS avg_rating
      FROM ec
      JOIN public.service_nodes sn ON sn.id = ec.service_node_id
      JOIN public.services s       ON s.id   = sn.service_id
      LEFT JOIN rev                ON rev.service_node_id = sn.id
      WHERE ($1 = '' OR sn.country = $1)
        AND ($2 = '' OR sn.name ILIKE '%'||$2||'%')
      GROUP BY ec.category_id, sn.service_id, s.slug, s.display_name
    ),
    ranked AS (
      SELECT ns.*,
             ROW_NUMBER() OVER(
               PARTITION BY ns.sub_id
               ORDER BY ns.reviews DESC NULLS LAST,
                        ns.avg_rating DESC NULLS LAST,
                        ns.display_name ASC
             ) AS rk
      FROM node_stats ns
    ),
    top5 AS (
      SELECT sub_id,
             json_agg(
               json_build_object(
                 'slug', slug,
                 'name', display_name,
                 'city', city,
                 'country', country,
                 'reviews', reviews,
                 'avg_rating', avg_rating
               )
               ORDER BY reviews DESC NULLS LAST, avg_rating DESC NULLS LAST, display_name ASC
             ) AS top_services
      FROM ranked
      WHERE rk <= 5
      GROUP BY sub_id
    )
    SELECT
      root.id     AS root_id,
      root.slug   AS root_slug,
      root.name_en AS root_name,
      root.icon_key AS root_icon_key, -- إضافة عمود الأيقونة
      sub.id      AS sub_id,
      sub.slug    AS sub_slug,
      sub.name_en AS sub_name,
      COALESCE(t5.top_services, '[]'::json) AS top_services
    FROM public.categories root
    LEFT JOIN public.categories sub
      ON sub.parent_id = root.id AND sub.active = TRUE
    LEFT JOIN top5 t5
      ON t5.sub_id = sub.id
    WHERE root.parent_id IS NULL AND root.active = TRUE
    ORDER BY root.name_en, sub.name_en
  `, [country, q]);

  // تجميع صفوف SQL إلى مصفوفة مجموعات بدون تكرار
  const groups: any[] = [];
  const rootMap: Record<string, any> = {};

  for(const r of rows){
    if(!rootMap[r.root_id]) {
      const group = {
        root_id: r.root_id,
        root_slug: r.root_slug,
        root_name: r.root_name,
        root_icon_key: r.root_icon_key, // إضافة الأيقونة
        children: []
      };
      rootMap[r.root_id] = group;
      groups.push(group);
    }
    if (r.sub_id) {
      // منع تكرار الفئات الفرعية
      if (!rootMap[r.root_id].children.some((c: any) => c.sub_id === r.sub_id)) {
        rootMap[r.root_id].children.push({
          sub_id: r.sub_id,
          sub_slug: r.sub_slug,
          sub_name: r.sub_name,
          top_services: r.top_services || []
        });
      }
    }
  }

  return NextResponse.json({ groups });
}