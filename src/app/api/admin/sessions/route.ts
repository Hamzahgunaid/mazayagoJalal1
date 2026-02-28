export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function GET(){
  const user = await currentUser();
  if(!user || !(await isPlatformAdmin(user.id))) return NextResponse.json({ error:"forbidden" }, { status:403 });
  const { rows } = await pool.query(`
    SELECT us.user_id, u.email, u.full_name, us.token, us.expires_at, us.created_at, us.user_agent, us.ip
    FROM public.user_sessions us
    JOIN public.users u ON u.id = us.user_id
    WHERE us.expires_at > now()
    ORDER BY us.created_at DESC
    LIMIT 100
  `);
  return NextResponse.json(rows);
}




