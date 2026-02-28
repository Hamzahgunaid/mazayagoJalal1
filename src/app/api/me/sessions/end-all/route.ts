export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(){
  const u = await currentUser();
  if(!u) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  await pool.query(`DELETE FROM public.user_sessions WHERE user_id=$1`, [u.id]);
  return NextResponse.json({ ok:true });
}




