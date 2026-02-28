export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

type ProfilePayload = {
  full_name?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  private_profile?: boolean | null;
  display_name?: string | null;
  phone?: string | null;
  headline?: string | null;
  bio?: string | null;
  website?: string | null;
  location_city?: string | null;
  location_state?: string | null;
};

const META_FIELDS = ["headline", "bio", "website", "location_city", "location_state"] as const;
const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let payload: ProfilePayload = {};
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    payload = (await req.json().catch(() => ({}))) as ProfilePayload;
  } else {
    const fd = await req.formData();
    payload.full_name = fd.has("full_name") ? (fd.get("full_name") as string) ?? "" : undefined;
    payload.display_name = fd.has("display_name") ? (fd.get("display_name") as string) ?? "" : undefined;
    payload.country = fd.has("country") ? (fd.get("country") as string) ?? "" : undefined;
    payload.avatar_url = fd.has("avatar_url") ? (fd.get("avatar_url") as string) ?? "" : undefined;
    payload.phone = fd.has("phone") ? (fd.get("phone") as string) ?? "" : undefined;
    if (fd.has("private_profile")) {
      const raw = fd.get("private_profile");
      payload.private_profile = toBool(raw);
    }
    payload.headline = fd.has("headline") ? (fd.get("headline") as string) ?? "" : undefined;
    payload.bio = fd.has("bio") ? (fd.get("bio") as string) ?? "" : undefined;
    payload.website = fd.has("website") ? (fd.get("website") as string) ?? "" : undefined;
    payload.location_city = fd.has("location_city") ? (fd.get("location_city") as string) ?? "" : undefined;
    payload.location_state = fd.has("location_state") ? (fd.get("location_state") as string) ?? "" : undefined;
  }

  sanitizeStrings(payload, ["full_name", "display_name", "country", "avatar_url", "phone"]);
  payload.private_profile =
    payload.private_profile === undefined ? undefined : toBool(payload.private_profile);

  const metaPayload = await buildMetaPayload(user.id, payload);

  const fields: string[] = [];
  const values: any[] = [];
  function set(name: string, val: any) {
    if (val !== undefined) {
      fields.push(`${name}=$${fields.length + 1}`);
      values.push(val);
    }
  }

  set("full_name", payload.full_name);
  set("display_name", payload.display_name);
  set("country", payload.country);
  set("avatar_url", payload.avatar_url);
  set("phone", payload.phone);
  set("private_profile", payload.private_profile);
  if (metaPayload !== undefined) {
    set("meta_json", metaPayload);
  }

  if (!fields.length) return NextResponse.json({ ok: true });

  values.push(user.id);
  await pool.query(
    `UPDATE public.users SET ${fields.join(", ")}, updated_at=now() WHERE id=$${values.length}`,
    values
  );
  return NextResponse.json({ ok: true });
}

function sanitizeStrings(payload: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (payload[key] === undefined) continue;
    const raw = payload[key];
    if (raw === null) {
      payload[key] = null;
      continue;
    }
    const str = String(raw).trim();
    payload[key] = str.length ? str : null;
  }
}

function toBool(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const str = String(value).trim().toLowerCase();
  if (!str) return false;
  if (TRUE_VALUES.has(str)) return true;
  return false;
}

async function buildMetaPayload(userId: string, payload: ProfilePayload) {
  const updates: Record<string, string | null> = {};
  for (const key of META_FIELDS) {
    const val = payload[key];
    if (val === undefined) continue;
    if (typeof val === "string") {
      const trimmed = val.trim();
      updates[key] = trimmed.length ? trimmed : null;
    } else if (val === null) {
      updates[key] = null;
    } else {
      updates[key] = String(val);
    }
    // ensure we don't try to set these as columns
    delete payload[key];
  }

  if (!Object.keys(updates).length) return undefined;

  const { rows } = await pool.query<{ meta_json: Record<string, any> | null }>(
    `SELECT meta_json FROM public.users WHERE id=$1 LIMIT 1`,
    [userId]
  );
  const current = rows[0]?.meta_json ?? {};
  const next = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  if (!Object.keys(next).length) return {};
  return next;
}




