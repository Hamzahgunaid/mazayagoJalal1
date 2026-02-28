
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function POST(_: Request, { params }:{ params:{ token:string } }){
  const user = await currentUser();
  if(!user || !(await isPlatformAdmin(user.id))) return NextResponse.json({ error:"forbidden" }, { status:403 });
  await pool.query(`UPDATE public.user_sessions SET expires_at = now() WHERE token = $1::uuid`, [params.token]);
  await pool.query(`INSERT INTO public.audit_log(user_id, action, target_type, target_id, meta) VALUES ($1,'terminate_session','session',$2, jsonb_build_object('by','admin'))`, [user.id, params.token]);
  return NextResponse.json({ ok:true });
}
