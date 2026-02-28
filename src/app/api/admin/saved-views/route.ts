export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function GET(){
  const user = await currentUser();
  if(!user || !(await isPlatformAdmin(user.id))) return NextResponse.json([], { status:200 });
  const { rows } = await pool.query(`SELECT id, name, query_json, created_at FROM public.admin_saved_views WHERE user_id=$1 ORDER BY created_at DESC`, [user.id]);
  return NextResponse.json(rows);
}

export async function POST(req: Request){
  const user = await currentUser();
  if(!user || !(await isPlatformAdmin(user.id))) return NextResponse.json({ error:"forbidden" }, { status:403 });
  const form = await req.formData().catch(()=>null);
  if(form){
    // From settings form or similar key/value pairs
    const keys = form.getAll("__jsonkeys__");
    const obj:any = {};
    keys.forEach((k:any)=>{ obj[k] = form.get(k); });
    const { rows } = await pool.query(`INSERT INTO public.admin_saved_views(user_id, name, query_json) VALUES ($1,$2,$3) RETURNING id`,
      [user.id, form.get("name") || "Saved View", obj]);
    return NextResponse.json({ ok:true, id: rows[0].id });
  }
  const body = await req.json().catch(()=>({}));
  const name = (body?.name || "").toString().slice(0, 80) || "Saved View";
  const data = body?.query_json || {};
  const { rows } = await pool.query(`INSERT INTO public.admin_saved_views(user_id, name, query_json) VALUES ($1,$2,$3) RETURNING id`,
    [user.id, name, data]);
  return NextResponse.json({ ok:true, id: rows[0].id });
}




