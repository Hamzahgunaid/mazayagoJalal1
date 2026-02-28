import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }:{ params:{ slug:string } }){
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const stars = url.searchParams.get("stars");
  const hasMedia = url.searchParams.get("has_media")==="1";
  const hasOwner = url.searchParams.get("has_owner_reply")==="1";
  const origin = url.searchParams.get("origin"); // qr|invite|organic
  const country = url.searchParams.get("country") || "";
  const city = url.searchParams.get("city") || "";
  const sort = url.searchParams.get("sort") || "recent";
  const limit = Math.min(parseInt(url.searchParams.get("limit")||"10"), 50);
  const offset = Math.max(parseInt(url.searchParams.get("offset")||"0"), 0);

  const svc = await pool.query(`SELECT id FROM public.services WHERE slug=$1`, [params.slug]);
  if(!svc.rows[0]) return NextResponse.json({ error:"Not found" }, { status:404 });

  const conditions: string[] = [
    "sn.service_id = $1",
    "r.status='approved'"
  ];
  const vals: any[] = [svc.rows[0].id];
  let vi = 2;

  if(q){ conditions.push(`(r.title ILIKE $${vi} OR r.body ILIKE $${vi})`); vals.push(`%${q}%`); vi++; }
  if(stars){ conditions.push(`r.rating = $${vi}`); vals.push(parseInt(stars)); vi++; }
  if(country){ conditions.push(`sn.country = $${vi}`); vals.push(country); vi++; }
  if(city){ conditions.push(`sn.city = $${vi}`); vals.push(city); vi++; }
  if(hasMedia){ conditions.push("EXISTS (SELECT 1 FROM public.review_media m WHERE m.review_id = r.id)"); }
  if(hasOwner){ conditions.push("EXISTS (SELECT 1 FROM public.review_replies rr WHERE rr.review_id=r.id AND rr.is_owner=TRUE)"); }
  if(origin==="qr"){ conditions.push("rv.qr_scan_id IS NOT NULL"); }
  else if(origin==="invite"){ conditions.push("(SELECT s.origin FROM public.review_sessions s WHERE s.id = rv.session_id) = 'invite'"); }
  else if(origin==="organic"){ conditions.push("rv.qr_scan_id IS NULL AND (rv.session_id IS NULL OR (SELECT s.origin FROM public.review_sessions s WHERE s.id = rv.session_id) IS NULL)"); }

  const order = ({
    recent: "r.submitted_at DESC",
    highest: "r.rating DESC, r.submitted_at DESC",
    lowest: "r.rating ASC, r.submitted_at DESC",
    helpful: "(COALESCE(vta.helpful_count,0) - COALESCE(vta.not_helpful_count,0)) DESC, r.submitted_at DESC"
  } as any)[sort] || "r.submitted_at DESC";

  const sql = `
    SELECT r.id, r.rating, r.title, r.body, r.submitted_at,
           (rv.qr_scan_id IS NOT NULL) AS is_qr,
           (SELECT s.origin FROM public.review_sessions s WHERE s.id = rv.session_id) AS session_origin,
           COALESCE(vta.helpful_count,0)::int AS helpful_count,
           COALESCE(vta.not_helpful_count,0)::int AS not_helpful_count
    FROM public.reviews r
    JOIN public.service_nodes sn ON sn.id = r.service_node_id
    LEFT JOIN public.review_verifications rv ON rv.review_id = r.id
    LEFT JOIN public.review_votes_agg_v vta ON vta.review_id = r.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY ${order}
    LIMIT ${limit} OFFSET ${offset}`;

  const { rows } = await pool.query(sql, vals);
  return NextResponse.json({ items: rows, nextOffset: offset + rows.length });
}
