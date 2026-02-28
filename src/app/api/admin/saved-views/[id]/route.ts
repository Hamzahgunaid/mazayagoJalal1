
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function DELETE(_: Request, { params }:{ params:{ id:string } }){
  const user = await currentUser();
  if(!user || !(await isPlatformAdmin(user.id))) return NextResponse.json({ error:"forbidden" }, { status:403 });
  await pool.query(`DELETE FROM public.admin_saved_views WHERE id=$1 AND user_id=$2`, [params.id, user.id]);
  return NextResponse.json({ ok:true });
}
