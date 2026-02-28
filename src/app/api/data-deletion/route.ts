export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type DataDeletionPayload = {
  request_type?: string;
  email?: string;
  messenger_mt?: string;
  psid?: string;
  page?: string;
  contest_url?: string;
  notes?: string;
  website?: string;
};

const REQUEST_TYPES = new Set(["MESSENGER", "WEBSITE", "BOTH"]);
const MAX_BODY_CHARS = 10000;
const MAX_FIELD = {
  email: 255,
  messenger_mt: 160,
  psid: 160,
  page: 200,
  contest_url: 600,
  notes: 2000,
} as const;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 8;

type RateEntry = { count: number; resetAt: number };
type RateStore = Map<string, RateEntry>;

const rateStore = (() => {
  const globalRef = globalThis as { __dataDeletionRate__?: RateStore };
  if (!globalRef.__dataDeletionRate__) {
    globalRef.__dataDeletionRate__ = new Map();
  }
  return globalRef.__dataDeletionRate__;
})();

export async function POST(req: Request) {
  try {
    const { payload, errorResponse } = await readPayload(req);
    if (errorResponse) return errorResponse;

    const honeypot = cleanStr(payload.website, 120);
    if (honeypot) {
      return NextResponse.json({ ok: true, request_id: null });
    }

    const requestTypeRaw = cleanStr(payload.request_type, 20);
    const requestType = requestTypeRaw ? requestTypeRaw.toUpperCase() : null;
    if (!requestType || !REQUEST_TYPES.has(requestType)) {
      return NextResponse.json({ error: "invalid_request_type" }, { status: 400 });
    }

    const email = normalizeEmail(cleanStr(payload.email, MAX_FIELD.email));
    const messengerMt = cleanStr(payload.messenger_mt, MAX_FIELD.messenger_mt);
    const psid = cleanStr(payload.psid, MAX_FIELD.psid);
    const page = cleanStr(payload.page, MAX_FIELD.page);
    const contestUrl = cleanStr(payload.contest_url, MAX_FIELD.contest_url);
    const notes = cleanStr(payload.notes, MAX_FIELD.notes);

    if (!messengerMt && !psid && !contestUrl && !page) {
      return NextResponse.json({ error: "missing_locator" }, { status: 400 });
    }

    const ip = getClientIp(req) ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO public.data_deletion_requests
        (request_type, email, messenger_mt, psid, page, contest_url, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
      [requestType, email, messengerMt, psid, page, contestUrl, notes],
    );

    const requestId = rows[0]?.id;
    return NextResponse.json({ ok: true, request_id: requestId });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function readPayload(req: Request): Promise<{
  payload: DataDeletionPayload;
  errorResponse?: NextResponse;
}> {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) {
      return {
        payload: {},
        errorResponse: NextResponse.json({ error: "payload_too_large" }, { status: 413 }),
      };
    }
    if (!raw) return { payload: {} };
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { payload: {} };
      return { payload: parsed as DataDeletionPayload };
    } catch {
      return {
        payload: {},
        errorResponse: NextResponse.json({ error: "invalid_json" }, { status: 400 }),
      };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) {
      return {
        payload: {},
        errorResponse: NextResponse.json({ error: "payload_too_large" }, { status: 413 }),
      };
    }
    const params = new URLSearchParams(raw);
    const payload: DataDeletionPayload = {};
    for (const [key, value] of params.entries()) {
      payload[key as keyof DataDeletionPayload] = value;
    }
    return { payload };
  }

  return {
    payload: {},
    errorResponse: NextResponse.json({ error: "unsupported_content_type" }, { status: 415 }),
  };
}

function cleanStr(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) return trimmed.slice(0, maxLength);
  return trimmed;
}

function normalizeEmail(value: string | null) {
  if (!value) return null;
  return value.toLowerCase();
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || undefined;
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = rateStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  rateStore.set(key, entry);
  return true;
}
