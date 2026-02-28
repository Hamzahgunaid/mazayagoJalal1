import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function POST(req: Request, { params }:{ params:{ id:string } }){
  const user = await currentUser();
  if(!user || !(await isPlatformAdmin(user.id))) return NextResponse.json({ error:"forbidden" }, { status:403 });

  const body = await req.json().catch(()=>({}));
  const reason = (body?.reason || "").toString().slice(0, 500);
  await pool.query(
    `UPDATE public.reviews SET status='rejected', rejection_reason=$2, updated_at=now() WHERE id=$1`,
    [params.id, reason || null]
  );
  return NextResponse.json({ ok:true });
}
