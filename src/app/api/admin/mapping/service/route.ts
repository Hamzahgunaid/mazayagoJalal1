export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function POST(req: Request){
  const user = await currentUser();
  if(!user || !(await isPlatformAdmin(user.id))) return NextResponse.json({ error:"forbidden" }, { status:403 });
  const { service_id, category_slug } = await req.json();
  await pool.query(`SELECT public.link_service_to_category($1::uuid, $2::text)`, [service_id, category_slug]);
  return NextResponse.json({ ok:true });
}




