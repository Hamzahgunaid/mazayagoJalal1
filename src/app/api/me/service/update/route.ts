export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      display_name: fd.get("display_name"),
      avatar_url: fd.get("avatar_url"),
    };
  }
}

export async function POST(req: Request){
  try{
    const user = await currentUser();
    if(!user) return NextResponse.json({ error:"unauthorized" }, { status:401 });
    const body = await readBody(req);
    const { display_name, avatar_url } = body as any;

    const own = await pool.query(`SELECT id FROM public.services WHERE owner_user_id=$1 LIMIT 1`, [user.id]);
    if(!own.rows.length) return NextResponse.json({ error:"no_service" }, { status:400 });
    const sid = own.rows[0].id;

    await pool.query(
      `UPDATE public.services SET
         display_name = COALESCE($1, display_name),
         avatar_url   = COALESCE($2, avatar_url),
         updated_at   = now()
       WHERE id = $3`,
      [display_name ?? null, avatar_url ?? null, sid]
    );

    return NextResponse.json({ ok:true, id: sid });
  }catch(e:any){
    return NextResponse.json({ error:"server_error", detail: String(e?.message || e) }, { status:500 });
  }
}




