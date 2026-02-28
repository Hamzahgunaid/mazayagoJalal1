export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { randomInt } from "node:crypto";
import { sendVerificationCodeEmail } from "@/lib/email";

const schema = z.object({
  fullName: z.string().max(200).optional(),
  email: z.string().email().max(255).optional(),
  country: z.string().length(2).optional(),
  phone: z.string().optional(),
});

const CODE_TTL_MINUTES = 15;
const RESEND_COOLDOWN_MS = 30_000;
const MAX_SENDS_PER_HOUR = 5;
const SHOULD_EXPOSE_DEV_CODE =
  process.env.NODE_ENV !== "production" && process.env.EXPOSE_DEV_CODE === "true";

function generateCode() {
  return String(randomInt(100000, 1000000));
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: Request){
  const json = await req.json().catch(()=> ({}));
  const p = schema.safeParse(json);
  if(!p.success) return NextResponse.json({ error:"Invalid data" }, { status:400 });
  const { fullName, email, country, phone } = p.data;

  const normalizedEmail = email ? normalizeEmail(email) : null;
  const hasPhone = Boolean(phone && String(phone).trim());
  if (!normalizedEmail && hasPhone) {
    return NextResponse.json(
      { error: "phone_not_supported", message: "Phone sign-up is not available yet." },
      { status: 400 }
    );
  }

  if(normalizedEmail){
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count, MAX(created_at) AS last_sent
         FROM public.auth_magic_tokens
        WHERE email = $1 AND created_at > now() - interval '1 hour'`,
      [normalizedEmail]
    );
    const count = rows[0]?.count ?? 0;
    const lastSent = rows[0]?.last_sent ? new Date(rows[0].last_sent) : null;
    if (lastSent && Date.now() - lastSent.getTime() < RESEND_COOLDOWN_MS) {
      return NextResponse.json(
        { error: "rate_limited", message: "Please wait before requesting another code." },
        { status: 429 }
      );
    }
    if (count >= MAX_SENDS_PER_HOUR) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  }

  let userId: string | null = null;
  if(normalizedEmail){
    const u = await pool.query(`SELECT id FROM public.users WHERE lower(email)=$1`, [normalizedEmail]);
    if(u.rowCount){
      userId = u.rows[0].id;
      await pool.query(
        `UPDATE public.users
           SET country = COALESCE($2,country),
               full_name = COALESCE($3,full_name),
               updated_at = now()
         WHERE id=$1`,
        [userId, country || null, fullName || null]
      );
    } else {
      const ins = await pool.query(
        `INSERT INTO public.users(id,email,country,full_name,status,created_at,updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'pending', now(), now())
         RETURNING id`,
        [normalizedEmail, country || null, fullName || null]
      );
      userId = ins.rows[0].id;
    }
  } else {
    return NextResponse.json({ error:"Email is required" }, { status:400 });
  }

  const code = generateCode();
  if(normalizedEmail){
    await pool.query(
      `UPDATE public.auth_magic_tokens SET used_at = now() WHERE email = $1 AND used_at IS NULL`,
      [normalizedEmail]
    );
    const insert = await pool.query(
      `INSERT INTO public.auth_magic_tokens(id,email,code,expires_at,created_at)
       VALUES (gen_random_uuid(),$1,$2, now() + interval '${CODE_TTL_MINUTES} minutes', now())
       RETURNING id`,
      [normalizedEmail, code]
    );
    const tokenId = insert.rows[0]?.id;
    try {
      await sendVerificationCodeEmail(normalizedEmail, code, CODE_TTL_MINUTES);
    } catch (err) {
      if (tokenId) {
        await pool.query(`DELETE FROM public.auth_magic_tokens WHERE id=$1`, [tokenId]);
      }
      return NextResponse.json(
        { error: "email_send_failed", message: "Unable to send the code right now. Please try again." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    SHOULD_EXPOSE_DEV_CODE ? { ok:true, dev_code: code } : { ok:true }
  );
}




