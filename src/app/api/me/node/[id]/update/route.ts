import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

async function readBody(req: Request){
  const ct = req.headers.get("content-type") || "";
  if(ct.includes("application/json")){
    return await req.json();
  }else{
    const fd = await req.formData();
    return {
      name: fd.get("name"),
      address: fd.get("address"),
      city: fd.get("city"),
      country: fd.get("country"),
      geo_lat: fd.get("geo_lat"),
      geo_lng: fd.get("geo_lng"),
      avatar_url: fd.get("avatar_url"),
    };
  }
}

export async function POST(req: Request, { params }:{ params:{ id: string } }){
  try{
    const user = await currentUser();
    if(!user) return NextResponse.json({ error:"unauthorized" }, { status:401 });
    const body = await readBody(req);
    const id = params.id;

    // permission: owner or active member on service owning this node
    const perm = await pool.query(
      `SELECT 1
         FROM public.service_nodes sn
         LEFT JOIN public.services s ON s.id = sn.service_id
         LEFT JOIN public.service_members sm ON sm.service_id = sn.service_id AND sm.user_id = $2 AND sm.status='active'
        WHERE sn.id = $1 AND (s.owner_user_id = $2 OR sm.user_id IS NOT NULL)
        LIMIT 1`,
      [id, user.id]
    );
    if(!perm.rows.length) return NextResponse.json({ error:"forbidden" }, { status:403 });

    await pool.query(
      `UPDATE public.service_nodes SET
         name     = COALESCE($1, name),
         address  = COALESCE($2, address),
         city     = COALESCE($3, city),
         country  = COALESCE($4, country),
         geo_lat  = COALESCE(NULLIF($5::text,'' )::double precision, geo_lat),
         geo_lng  = COALESCE(NULLIF($6::text,'' )::double precision, geo_lng),
         avatar_url = COALESCE($7, avatar_url),
         updated_at = now()
       WHERE id = $8`,
      [body.name ?? null, body.address ?? null, body.city ?? null, body.country ?? null, body.geo_lat ?? null, body.geo_lng ?? null, body.avatar_url ?? null, id]
    );

    return NextResponse.json({ ok:true });
  }catch(e:any){
    return NextResponse.json({ error:"server_error", detail: String(e?.message || e) }, { status:500 });
  }
}
