export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req:Request){
  const u = await currentUser();
  if(!u) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const fd = await req.formData();
  const display_name = String(fd.get("display_name")||"").trim();
  const group = String(fd.get("group")||"business");
  const slug = String(fd.get("slug")||"");
  if(!display_name) return NextResponse.json({ error:"display_name required" }, { status:400 });

  const { rows } = await pool.query(
    `INSERT INTO public.services(owner_user_id, display_name, "group", slug)
     VALUES($1,$2,$3, NULLIF($4,'')) RETURNING id`, [u.id, display_name, group, slug]
  );

  const sid = rows[0].id;
  await pool.query(`
    INSERT INTO public.service_nodes(service_id, kind, name, active)
    VALUES($1,'main','Main Branch',true)
  `, [sid]);

  return NextResponse.json({ ok:true, service_id: sid });
}




