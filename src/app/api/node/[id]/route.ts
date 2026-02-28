import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const { rows: nodeRows } = await pool.query(
    `SELECT sn.id, sn.name, sn.city, sn.country, sn.geo_lat, sn.geo_lng,
            s.id AS service_id, s.display_name AS service_name, s.slug,
            (SELECT r_score FROM public.service_transparency_v t WHERE t.service_node_id = sn.id) AS r_score
     FROM public.service_nodes sn
     JOIN public.services s ON s.id = sn.service_id
     WHERE sn.id = $1::uuid`,
    [id]
  );
  if (!nodeRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rows: agg } = await pool.query(
    `SELECT
        COUNT(*) FILTER (WHERE submitted_at >= now() - interval '30 days')  AS reviews_d30,
        COUNT(*) FILTER (WHERE submitted_at >= now() - interval '365 days') AS reviews_d365,
        ROUND(AVG(rating)::numeric, 2) AS avg_rating
     FROM public.reviews
     WHERE service_node_id = $1 AND status='approved' AND rating IS NOT NULL`,
    [id]
  );

  return NextResponse.json({ node: nodeRows[0], metrics: agg[0] });
}
