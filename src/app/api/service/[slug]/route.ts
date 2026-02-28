import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }:{ params:{ slug:string } }){
  const svc = await pool.query(
    `SELECT id, display_name, slug, verified, meta_json
     FROM public.services WHERE slug=$1 LIMIT 1`, [params.slug]);
  if(!svc.rows[0]) return NextResponse.json({ error: "Not found" }, { status:404 });

  const serviceId = svc.rows[0].id;
  const agg = await pool.query(
    `SELECT ROUND(AVG(r.rating)::numeric,2) AS stars_mean,
            COUNT(*) FILTER (WHERE r.status='approved') AS reviews_count
     FROM public.reviews r
     JOIN public.service_nodes sn ON sn.id = r.service_node_id
     WHERE sn.service_id = $1 AND r.status='approved'`, [serviceId]);

  return NextResponse.json({ service: svc.rows[0], aggregates: agg.rows[0] ?? {} });
}
