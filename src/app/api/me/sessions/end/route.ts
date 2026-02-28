export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req:Request){
  const u = await currentUser();
  if(!u) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const fd = await req.formData();
  const session_id = fd.get("session_id");
  if(!session_id) return NextResponse.json({ error:"session_id required" }, { status:400 });
  await pool.query(`DELETE FROM public.user_sessions WHERE id=$1 AND user_id=$2`, [session_id, u.id]);
  return NextResponse.json({ ok:true });
}




