export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req:Request){
  const u = await currentUser();
  if(!u) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const fd = await req.formData();
  const node_id = String(fd.get("node_id")||"");
  const lat = Number(fd.get("lat"));
  const lng = Number(fd.get("lng"));
  if(!node_id || Number.isNaN(lat) || Number.isNaN(lng)) return NextResponse.json({ error:"missing" }, { status:400 });

  const { rows:own } = await pool.query(`
    SELECT 1 FROM public.service_nodes sn
    JOIN public.services s ON s.id=sn.service_id
    WHERE sn.id=$1 AND s.owner_user_id=$2
  `, [node_id, u.id]);
  if(!own[0]) return NextResponse.json({ error:"forbidden" }, { status:403 });

  await pool.query(`
    UPDATE public.service_nodes
    SET geo_lat=$1, geo_lng=$2, updated_at=now()
    WHERE id=$3
  `, [lat, lng, node_id]);

  return NextResponse.json({ ok:true });
}




