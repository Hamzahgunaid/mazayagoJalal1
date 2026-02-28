
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function POST(_: Request, { params }:{ params:{ id:string } }){
  const user = await currentUser();
  if(!user || !(await isPlatformAdmin(user.id))) return NextResponse.json({ error:"forbidden" }, { status:403 });
  const { rows } = await pool.query(`UPDATE public.categories SET active = NOT active, updated_at = now() WHERE id=$1 RETURNING id, active`, [params.id]);
  if(rows.length){
    await pool.query(`INSERT INTO public.audit_log(user_id, action, target_type, target_id, meta) VALUES ($1,'toggle_category','category',$2, jsonb_build_object('active', $3))`, [user.id, params.id, rows[0].active]);
  }
  return NextResponse.json(rows[0] || { ok:false });
}
