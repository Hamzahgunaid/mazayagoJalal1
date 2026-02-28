import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

const IDENTIFIER_RE = /^[a-z_][a-z0-9_]*$/;
const WRITE_ENABLED = process.env.ADMIN_WRITE_ENABLED === "true";

const ADMIN_TABLE_HINTS = [
  "users",
  "user_sessions",
  "platform_roles",
  "contests",
  "contest_entries",
  "contest_winners",
  "offers",
  "offer_entries",
  "rewards",
  "payouts",
  "admin_audit_logs",
];

const ADMIN_EXTRA_OBJECTS = [
  ...(process.env.ADMIN_EXTRA_TABLES || "").split(",").map((v) => v.trim()).filter(Boolean),
  ...(process.env.ADMIN_EXTRA_VIEWS || "").split(",").map((v) => v.trim()).filter(Boolean),
];

type AllowlistTable = {
  table: string;
  objectType: "BASE TABLE" | "VIEW";
  columns: Array<{ 
    name: string; 
    type: string; 
    nullable: boolean; 
    defaultValue: string | null; 
    isPrimaryKey: boolean; 
    isReadonly: boolean 
  }>;
  primaryKey: string | null;
  foreignKeys: Array<{ column: string; referencesTable: string; referencesColumn: string }>;
  constraints: Array<{ name: string; type: string }>;
  triggers: Array<{ name: string; timing: string; event: string }>;
  relatedFunctions: string[];
};

const routeLimiter = new Map<string, { hits: number; windowStart: number }>();

function checkRateLimit(key: string, max = 180, windowMs = 60_000) {
  const now = Date.now();
  const item = routeLimiter.get(key);
  if (!item || now - item.windowStart > windowMs) {
    routeLimiter.set(key, { hits: 1, windowStart: now });
    return true;
  }
  if (item.hits >= max) return false;
  item.hits += 1;
  return true;
}

function normalizeIp(ip: string) {
  const trimmed = ip.trim();
  if (trimmed.startsWith("[")) {
    return trimmed.replace(/^\[/, "").replace(/\](:\d+)?$/, "");
  }
  return trimmed.replace(/:\d+$/, "");
}

function getTrustedClientIp(h: Headers) {
  const direct = h.get("x-vercel-forwarded-for")
    || h.get("cf-connecting-ip")
    || h.get("fly-client-ip")
    || h.get("x-real-ip");
  if (direct) return normalizeIp(direct);

  const xff = h.get("x-forwarded-for");
  if (xff) {
    const chain = xff.split(",").map((part) => part.trim()).filter(Boolean);
    if (chain.length) {
      return normalizeIp(chain[chain.length - 1]);
    }
  }

  return "unknown";
}

export function adminNoStoreJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers || {}),
    },
  });
}

export async function requireAdminAccess() {
  const user = await currentUser();
  if (!user || !(await isPlatformAdmin(user.id))) {
    throw adminNoStoreJson({ error: "forbidden" }, { status: 403 });
  }

  const h = headers();
  const ip = getTrustedClientIp(h);
  const userAgent = h.get("user-agent") || "unknown";

  const ipAllow = process.env.ADMIN_IP_ALLOWLIST?.split(",").map((v) => v.trim()).filter(Boolean);
  if (ipAllow?.length && !ipAllow.includes(ip)) {
    throw adminNoStoreJson({ error: "forbidden_ip" }, { status: 403 });
  }

  if (!checkRateLimit(`${user.id}:${ip}`)) {
    throw adminNoStoreJson({ error: "rate_limited" }, { status: 429 });
  }

  return { user, ip, userAgent, writeEnabled: WRITE_ENABLED };
}

export function assertAdminCsrf(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  const fetchSite = req.headers.get("sec-fetch-site");

  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    throw new Error("csrf_blocked");
  }

  if (origin && host) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new Error("csrf_blocked");
    }
    if (originHost !== host) throw new Error("csrf_blocked");
  }
}

export async function getAdminSchema() {
  const { rows: tableRows } = await pool.query(
    `SELECT table_name, table_type
       FROM information_schema.tables
      WHERE table_schema='public'
        AND table_type IN ('BASE TABLE','VIEW')
        AND (
          table_name LIKE 'contest%'
          OR table_name LIKE 'offer%'
          OR table_name = ANY($1::text[])
          OR table_name = ANY($2::text[])
        )
      ORDER BY CASE WHEN table_type='BASE TABLE' THEN 0 ELSE 1 END, table_name`,
    [ADMIN_TABLE_HINTS, ADMIN_EXTRA_OBJECTS]
  );

  const result: Record<string, AllowlistTable> = {};

  for (const row of tableRows as Array<{ table_name: string; table_type: "BASE TABLE" | "VIEW" }>) {
    const table = row.table_name;
    if (!IDENTIFIER_RE.test(table)) continue;

    const { rows: cols } = await pool.query(
      `SELECT c.column_name, c.data_type, c.is_nullable, c.column_default,
              EXISTS (
                SELECT 1
                  FROM information_schema.table_constraints tc
                  JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                 WHERE tc.table_schema='public' AND tc.table_name = c.table_name
                   AND tc.constraint_type='PRIMARY KEY' AND kcu.column_name = c.column_name
              ) AS is_primary_key
         FROM information_schema.columns c
        WHERE c.table_schema='public' AND c.table_name=$1
        ORDER BY c.ordinal_position`,
      [table]
    );

    const { rows: fks } = await pool.query(
      `SELECT kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema='public'
          AND tc.table_name = $1`,
      [table]
    );

    const { rows: constraints } = await pool.query(
      `SELECT constraint_name, constraint_type
         FROM information_schema.table_constraints
        WHERE table_schema='public' AND table_name=$1
        ORDER BY constraint_type, constraint_name`,
      [table]
    );

    const { rows: triggers } = await pool.query(
      `SELECT trigger_name, action_timing, event_manipulation
         FROM information_schema.triggers
        WHERE trigger_schema='public' AND event_object_table=$1
        ORDER BY trigger_name`,
      [table]
    );

    const { rows: relatedFunctions } = await pool.query(
      `SELECT p.proname
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname='public'
          AND pg_get_functiondef(p.oid) ILIKE '%' || $1 || '%'
        ORDER BY p.proname
        LIMIT 30`,
      [table]
    ).catch(() => ({ rows: [] as any[] }));

    const primaryKey = (cols.find((c: any) => c.is_primary_key)?.column_name as string | undefined) || null;

    result[table] = {
      table,
      objectType: row.table_type,
      primaryKey,
      columns: cols.map((c: any) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === "YES",
        defaultValue: c.column_default,
        isPrimaryKey: c.is_primary_key,
        isReadonly: row.table_type === "VIEW" || c.is_primary_key || c.column_name === "created_at",
      })),
      foreignKeys: fks.map((fk: any) => ({
        column: fk.column_name,
        referencesTable: fk.foreign_table_name,
        referencesColumn: fk.foreign_column_name,
      })),
      constraints: constraints.map((c: any) => ({ name: c.constraint_name, type: c.constraint_type })),
      triggers: triggers.map((t: any) => ({ name: t.trigger_name, timing: t.action_timing, event: t.event_manipulation })),
      relatedFunctions: relatedFunctions.map((f: any) => f.proname),
    };
  }

  const { rows: enumRows } = await pool.query(
    `SELECT t.typname AS enum_name, e.enumlabel AS enum_value
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder`
  );

  const enums: Record<string, string[]> = {};
  enumRows.forEach((r: any) => {
    enums[r.enum_name] = enums[r.enum_name] || [];
    enums[r.enum_name].push(r.enum_value);
  });

  return { tables: result, enums, writeEnabled: WRITE_ENABLED };
}

export function assertAllowedIdentifier(value: string, allowed: string[]) {
  if (!IDENTIFIER_RE.test(value) || !allowed.includes(value)) {
    throw new Error("invalid_identifier");
  }
}

export const tableQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  q: z.string().max(120).optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  status: z.string().optional(),
  userId: z.string().uuid().optional(),
  contestId: z.string().uuid().optional(),
  offerId: z.string().uuid().optional(),
  export: z.enum(["csv"]).optional(),
});

export function canWrite() {
  return WRITE_ENABLED;
}

export async function writeAuditLog(args: {
  actorUserId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "EXPORT";
  tableName: string;
  recordPk: string | null;
  before: unknown;
  after: unknown;
  ip: string;
  userAgent: string;
}) {
  await pool.query(
    `INSERT INTO public.admin_audit_logs
      (actor_user_id, action, table_name, record_pk, before, after, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::inet, $8)`,
    [
      args.actorUserId,
      args.action,
      args.tableName,
      args.recordPk,
      JSON.stringify(args.before ?? null),
      JSON.stringify(args.after ?? null),
      args.ip === "unknown" ? null : args.ip,
      args.userAgent,
    ]
  );
}