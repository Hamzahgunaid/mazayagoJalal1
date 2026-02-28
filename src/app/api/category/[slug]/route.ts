export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// helpers
function toInt(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const slugOrId = params.slug;

    // فلاتر
    const q = (searchParams.get("q") || "").trim();
    const country = (searchParams.get("country") || "").trim().toUpperCase();
    const city = (searchParams.get("city") || "").trim();
    const verifiedOnly = searchParams.get("verified") === "1";
    const minStars = Math.max(0, Math.min(5, toInt(searchParams.get("stars"), 0)));
    const sort = (searchParams.get("sort") || "most_reviewed").trim();
    const limit = Math.min(48, Math.max(1, toInt(searchParams.get("limit"), 12)));
    const offset = Math.max(0, toInt(searchParams.get("offset"), 0));

    // جلب الفئة
    const catq = await pool.query(
      `SELECT id, slug, name_en, name_ar, icon_set, icon_key
       FROM public.category_tree_v
       WHERE slug = $1 OR id::text = $1
       LIMIT 1`,
      [slugOrId]
    );
    const category = catq.rows[0];
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    // شروط مشتركة
    const where: string[] = ["e.category_id = $1"];
    const vals: any[] = [category.id];
    let vi = 2;
    if (country) { where.push(`sn.country = $${vi}`); vals.push(country); vi++; }
    if (city)    { where.push(`sn.city = $${vi}`);    vals.push(city);    vi++; }
    if (q)       { where.push(`(s.display_name ILIKE $${vi})`); vals.push("%"+q+"%"); vi++; }
    if (verifiedOnly) where.push(`s.verified = TRUE`);

    const orderBy =
      ({
        most_reviewed: "reviews_count DESC NULLS LAST, avg_rating DESC NULLS LAST, s.display_name ASC",
        top_rated: "avg_rating DESC NULLS LAST, reviews_count DESC NULLS LAST, s.display_name ASC",
        recently_reviewed: "last_reviewed_at DESC NULLS LAST, reviews_count DESC NULLS LAST",
        newest: "s.created_at DESC NULLS LAST",
      } as Record<string, string>)[sort] || "reviews_count DESC NULLS LAST";

    // تجميع الخدمات داخل الفئة (على مستوى service)
    const baseSQL = `
      WITH e AS (
        SELECT service_node_id, category_id
        FROM public.effective_node_categories_v
        WHERE category_id = $1
      ),
      joined AS (
        SELECT
          s.id                           AS service_id,
          s.slug,
          s.display_name,
          s.verified,
          s.logo_url,
          s.avatar_url,
          s.cover_url,
          s.short_description,
          MAX(sn.city)                   AS city,
          MAX(sn.country)                AS country,
          COUNT(r.id)                    AS reviews_count,
          ROUND(AVG(r.rating)::numeric,2) AS avg_rating,
          MAX(r.submitted_at)            AS last_reviewed_at
        FROM e
        JOIN public.service_nodes sn ON sn.id = e.service_node_id
        JOIN public.services s ON s.id = sn.service_id
        LEFT JOIN public.service_reviews_clean_v r
          ON r.service_node_id = sn.id AND r.status='approved'
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        GROUP BY s.id, s.slug, s.display_name, s.verified, s.logo_url, s.avatar_url, s.cover_url, s.short_description
      )
      SELECT * FROM joined
      ${minStars > 0 ? `WHERE avg_rating >= ${minStars}` : ""}
    `;

    // إجمالي
    const totalQ = await pool.query(`SELECT COUNT(*)::int AS total FROM (${baseSQL}) Z`, vals);
    const total = totalQ.rows[0]?.total ?? 0;

    // صفحة النتائج
    const pageQ = await pool.query(
      `SELECT * FROM (${baseSQL}) Z ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
      vals
    );
    const services = pageQ.rows;

    // آخر المراجعات (للسلايدر)
    const latestQ = await pool.query(
      `
      WITH e AS (
        SELECT service_node_id, category_id
        FROM public.effective_node_categories_v
        WHERE category_id = $1
      )
      SELECT
        r.id,
        r.rating,
        r.title,
        r.body,
        r.submitted_at,
        s.slug,
        s.display_name,
        sn.city,
        sn.country
      FROM public.service_reviews_clean_v r
      JOIN public.service_nodes sn ON sn.id = r.service_node_id
      JOIN public.services s ON s.id = sn.service_id
      JOIN e ON e.service_node_id = sn.id
      WHERE r.status='approved'
      ORDER BY r.submitted_at DESC
      LIMIT 10
    `,
      [category.id]
    );
    const latestReviews = latestQ.rows;

    return NextResponse.json({
      category,
      services,
      total,
      limit,
      offset,
      latestReviews,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
