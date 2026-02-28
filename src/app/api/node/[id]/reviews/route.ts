import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const stars = url.searchParams.get("stars"); // "1,2,3"
  const order = url.searchParams.get("order") || "newest"; // newest|highest|lowest

  const starList = stars ? stars.split(",").map(s => parseInt(s)).filter(n => n>=1 && n<=5) : [];
  const where = [`r.service_node_id = $1`, `r.status='approved'`, `r.rating IS NOT NULL`];
  const values: any[] = [id];

  if (q) {
    values.push(`%${q}%`);
    where.push(`(r.title ILIKE $${values.length} OR r.body ILIKE $${values.length})`);
  }
  if (starList.length) {
    values.push(starList);
    where.push(`r.rating = ANY($${values.length})`);
  }

  const orderBy =
    order === "highest" ? "r.rating DESC, r.submitted_at DESC" :
    order === "lowest"  ? "r.rating ASC,  r.submitted_at DESC" :
                          "r.submitted_at DESC";

  const sql = `
    SELECT r.id, r.rating, r.title, r.body, r.submitted_at,
           u.full_name,
           COALESCE(v.helpful_count,0) AS helpful_count,
           COALESCE(v.not_helpful_count,0) AS not_helpful_count
    FROM public.reviews r
    LEFT JOIN public.users u ON u.id = r.user_id
    LEFT JOIN public.review_votes_agg_v v ON v.review_id = r.id
    WHERE ${where.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT 30`;
  const { rows } = await pool.query(sql, values);
  return NextResponse.json({ reviews: rows });
}
