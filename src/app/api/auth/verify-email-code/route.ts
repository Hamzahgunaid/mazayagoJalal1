export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/session";

const bodySchema = z.object({ email: z.string().email().max(255), code: z.string().regex(/^\d{6}$/) });

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: Request){
  const json = await req.json().catch(()=> ({}));
  const parse = bodySchema.safeParse(json);
  if(!parse.success) return NextResponse.json({ error:"Invalid data" },{ status:400 });
  const email = normalizeEmail(parse.data.email);
  const code = String(parse.data.code || "").trim();
  const { rows } = await pool.query(
    `SELECT id, code, expires_at, used_at
       FROM public.auth_magic_tokens
      WHERE email=$1
      ORDER BY created_at DESC
      LIMIT 1`,
    [email]
  );
  const row = rows[0];
  if(!row) return NextResponse.json({ error:"Invalid or expired code" },{ status:400 });
  if(row.used_at) return NextResponse.json({ error:"Code already used" },{ status:400 });
  if(new Date(row.expires_at) < new Date()) return NextResponse.json({ error:"Invalid or expired code" },{ status:400 });
  if(String(row.code) !== code) return NextResponse.json({ error:"Invalid or expired code" },{ status:400 });
  await pool.query(`UPDATE public.auth_magic_tokens SET used_at=now() WHERE id=$1`, [row.id]);

  const u = await pool.query(`SELECT id, status FROM public.users WHERE lower(email)=$1 LIMIT 1`, [email]);
  let userId = u.rows[0]?.id;
  if(!userId){
    const ins = await pool.query(
      `INSERT INTO public.users(id,email,status,created_at,updated_at)
       VALUES (gen_random_uuid(),$1,'active',now(),now()) RETURNING id`, [email]);
    userId = ins.rows[0].id;
  } else {
    await pool.query(
      `UPDATE public.users SET status='active', updated_at=now() WHERE id=$1 AND status IS DISTINCT FROM 'active'`,
      [userId]
    );
  }
  await createSession(userId);
  return NextResponse.json({ ok:true });
}




