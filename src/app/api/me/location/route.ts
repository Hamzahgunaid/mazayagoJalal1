export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req:Request){
  const u = await currentUser();
  if(!u) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const { node_id, lat, lng } = await req.json();
  if(!node_id) return NextResponse.json({ error:"node_id required" }, { status:400 });

  // Ensure ownership
  const { rows:own } = await pool.query(`
    SELECT 1 FROM public.service_nodes sn
    JOIN public.services s ON s.id = sn.service_id
    WHERE sn.id=$1 AND s.owner_user_id=$2 LIMIT 1
  `, [node_id, u.id]);
  if(!own[0]) return NextResponse.json({ error:"forbidden" }, { status:403 });
//  Only update lat/lng (no PostGIS dependency)
  await pool.query(
    "UPDATE public.service_nodes SET geo_lat=$1, geo_lng=$2 WHERE id=$3",
    [lat, lng, node_id]
  );
  return NextResponse.json({ ok:true });
}






