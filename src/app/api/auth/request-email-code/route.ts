export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { randomInt } from "node:crypto";
import { sendVerificationCodeEmail } from "@/lib/email";

const bodySchema = z.object({ email: z.string().email().max(255) });
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
  const parse = bodySchema.safeParse(json);
  if(!parse.success) return NextResponse.json({ error:"Invalid email" },{ status:400 });
  const email = normalizeEmail(parse.data.email);
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count, MAX(created_at) AS last_sent
       FROM public.auth_magic_tokens
      WHERE email = $1 AND created_at > now() - interval '1 hour'`,
    [email]
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

  const code = generateCode();
  await pool.query(
    `UPDATE public.auth_magic_tokens SET used_at = now() WHERE email = $1 AND used_at IS NULL`,
    [email]
  );
  const insert = await pool.query(
    `INSERT INTO public.auth_magic_tokens(id,email,code,expires_at,created_at)
     VALUES (gen_random_uuid(),$1,$2, now() + interval '${CODE_TTL_MINUTES} minutes', now())
     RETURNING id`,
    [email, code]
  );
  const tokenId = insert.rows[0]?.id;
  try {
    await sendVerificationCodeEmail(email, code, CODE_TTL_MINUTES);
  } catch (err) {
    if (tokenId) {
      await pool.query(`DELETE FROM public.auth_magic_tokens WHERE id=$1`, [tokenId]);
    }
    return NextResponse.json(
      { error: "email_send_failed", message: "Unable to send the code right now. Please try again." },
      { status: 500 }
    );
  }
  return NextResponse.json(
    SHOULD_EXPOSE_DEV_CODE ? { ok:true, dev_code: code } : { ok:true }
  );
}




