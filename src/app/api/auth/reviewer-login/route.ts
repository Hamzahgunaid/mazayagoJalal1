export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/session";

const schema = z.object({
  k: z.string().min(1),
  next: z.string().optional(),
});

const REVIEWER_EMAIL = "demo@gmail.com";

function resolveIp(headerList: Headers, req: Request) {
  const forwarded = headerList.get("x-forwarded-for") || headerList.get("x-real-ip") || "";
  const fromForwarded = forwarded.split(",")[0]?.trim();
  if (fromForwarded) return fromForwarded;
  const socketIp = (req as { socket?: { remoteAddress?: string } }).socket?.remoteAddress;
  return socketIp || undefined;
}

function normalizeNext(value: string | undefined) {
  if (!value) return "/";
  return value.startsWith("/") ? value : "/";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const secret = process.env.REVIEW_LOGIN_SECRET;
  if (!secret || parsed.data.k !== secret) {
    return NextResponse.json({ error: "invalid_secret" }, { status: 401 });
  }

  const email = REVIEWER_EMAIL.toLowerCase();
  const { rows } = await pool.query(
    `SELECT id
       FROM public.users
      WHERE lower(email) = $1
      LIMIT 1`,
    [email]
  );
  const userId = rows[0]?.id as string | undefined;
  if (!userId) {
    return NextResponse.json(
      { error: "reviewer_user_not_found", message: "Reviewer user demo@gmail.com does not exist." },
      { status: 404 }
    );
  }

  const headerList = headers();
  const userAgent = headerList.get("user-agent") || undefined;
  const ip = resolveIp(headerList, req);
  await createSession(userId, 30, { userAgent, ip });

  return NextResponse.json({ ok: true, next: normalizeNext(parsed.data.next) });
}
