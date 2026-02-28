import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function POST(_: Request, { params }:{ params:{ id:string } }){
  const user = await currentUser();
  if(!user || !(await isPlatformAdmin(user.id))) return NextResponse.json({ error:"forbidden" }, { status:403 });

  await pool.query(`UPDATE public.reviews SET status='approved', approved_at=now(), updated_at=now() WHERE id=$1`, [params.id]);
  return NextResponse.json({ ok:true });
}
