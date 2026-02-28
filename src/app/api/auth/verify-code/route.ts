export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import { createSession } from "@/lib/session";

const schema = z.object({
  identifier: z.string().min(3).max(255),
  code: z.string().regex(/^\d{6}$/),
  accepted_terms_privacy: z.boolean().optional(),
});

function isEmail(value: string){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function normalizeEmail(value: string){ return value.trim().toLowerCase(); }

const TERMS_URL = "https://www.mazayago.com/terms";
const PRIVACY_URL = "https://www.mazayago.com/privacy";
const TERMS_VERSION = "2025-08-10";
const PRIVACY_VERSION = "2025-08-10";
const SOURCE = "signup_email";

function parseFirstLocale(value: string | null) {
  if (!value) return undefined;
  return value.split(",")[0]?.trim() || undefined;
}

function resolveIp(headerList: Headers, req: Request) {
  const forwarded = headerList.get("x-forwarded-for") || headerList.get("x-real-ip") || "";
  const fromForwarded = forwarded.split(",")[0]?.trim();
  if (fromForwarded) return fromForwarded;
  const socketIp = (req as { socket?: { remoteAddress?: string } }).socket?.remoteAddress;
  return socketIp || undefined;
}

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=> ({}));
    const parse = schema.safeParse(body);
    if(!parse.success){
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    const acceptedTermsPrivacy = parse.data.accepted_terms_privacy === true;
    const identifier = String(parse.data.identifier || "").trim();
    const code = String(parse.data.code || "").trim();
    if(!identifier || !code){
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    let userId: string | null = null;

    if(isEmail(identifier)){
      const email = normalizeEmail(identifier);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          `SELECT id, code, expires_at, used_at
             FROM public.auth_magic_tokens
            WHERE email = $1
            ORDER BY created_at DESC
            LIMIT 1`,
          [email]
        );
        const row = rows[0];
        if(!row) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error:"invalid_code" }, { status: 400 });
        }
        if(row.used_at) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error:"code_used" }, { status: 400 });
        }
        if(new Date(row.expires_at) < new Date()) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error:"code_expired" }, { status: 400 });
        }
        if(String(row.code) !== code) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error:"invalid_code" }, { status: 400 });
        }

        const u = await client.query(`SELECT id, status FROM public.users WHERE lower(email)=$1 LIMIT 1`, [email]);
        let createdUser = false;
        if(u.rows.length){ userId = u.rows[0].id; }
        else{
          if (!acceptedTermsPrivacy) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: "terms_required", message: "You must accept the Terms and Privacy Policy to continue." },
              { status: 400 }
            );
          }
          const ins = await client.query(
            `INSERT INTO public.users(email, status) VALUES($1,'active') RETURNING id`,
            [email]
          );
          userId = ins.rows[0].id;
          createdUser = true;
        }
        if(userId){
          await client.query(
            `UPDATE public.users SET status='active', updated_at=now() WHERE id=$1 AND status IS DISTINCT FROM 'active'`,
            [userId]
          );
        }

        if (createdUser && userId && acceptedTermsPrivacy) {
          const headerList = headers();
          const userAgent = headerList.get("user-agent") || null;
          const ip = resolveIp(headerList, req) || null;
          const locale = parseFirstLocale(headerList.get("accept-language")) || null;
          const consentResult = await client.query(
            `INSERT INTO public.user_legal_consents
              (user_id, doc_type, doc_url, doc_version, accepted_at, ip, user_agent, locale, source, metadata)
             VALUES
              ($1, 'terms', $2, $3, now(), $4, $5, $6, $7, '{}'::jsonb),
              ($1, 'privacy', $8, $9, now(), $4, $5, $6, $7, '{}'::jsonb)
             ON CONFLICT (user_id, doc_type, doc_version) DO NOTHING`,
            [userId, TERMS_URL, TERMS_VERSION, ip, userAgent, locale, SOURCE, PRIVACY_URL, PRIVACY_VERSION]
          );
          if (consentResult.rowCount > 0) {
            console.info("Inserted legal consents for user", { userId, source: SOURCE });
          }
        }

        await client.query(`UPDATE public.auth_magic_tokens SET used_at=now() WHERE id=$1`, [row.id]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }else{
      return NextResponse.json(
        { error: "phone_not_supported", message: "Phone sign-in is not available yet." },
        { status: 400 }
      );
    }

    if(!userId){
      return NextResponse.json({ error:"user_creation_failed" }, { status: 500 });
    }
    const headerList = headers();
    const userAgent = headerList.get("user-agent") || undefined;
    const ip = resolveIp(headerList, req);
    await createSession(userId, 30, { userAgent, ip });

    return NextResponse.json({ ok:true });
  }catch(e:any){
    return NextResponse.json({ error:"server_error", detail:String(e?.message||e) }, { status: 500 });
  }
}


