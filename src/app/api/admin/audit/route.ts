export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { z } from "zod";
import { adminNoStoreJson, requireAdminAccess } from "@/lib/adminConsole";
import { pool } from "@/lib/db";

const auditFilterSchema = z.object({
  action: z.string().optional(),
  table: z.string().optional(),
  actor: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(req: Request) {
  try {
    await requireAdminAccess();

    const parsed = auditFilterSchema.parse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    const where: string[] = [];
    const values: any[] = [];

    if (parsed.action) {
      values.push(parsed.action);
      where.push(`action = $${values.length}`);
    }
    if (parsed.table) {
      values.push(parsed.table);
      where.push(`table_name = $${values.length}`);
    }
    if (parsed.actor) {
      values.push(parsed.actor);
      where.push(`actor_user_id = $${values.length}::uuid`);
    }
    if (parsed.from) {
      values.push(parsed.from);
      where.push(`created_at >= $${values.length}::timestamptz`);
    }
    if (parsed.to) {
      values.push(parsed.to);
      where.push(`created_at <= $${values.length}::timestamptz`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countValues = [...values];
    values.push(parsed.pageSize);
    values.push((parsed.page - 1) * parsed.pageSize);

    const [rowsRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, actor_user_id, action, table_name, record_pk, before, after, ip::text AS ip, user_agent, created_at
           FROM public.admin_audit_logs
           ${whereSql}
          ORDER BY created_at DESC
          LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM public.admin_audit_logs ${whereSql}`, countValues),
    ]);

    return adminNoStoreJson({
      rows: rowsRes.rows,
      total: countRes.rows[0]?.total ?? 0,
      page: parsed.page,
      pageSize: parsed.pageSize,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return adminNoStoreJson({ error: "audit_fetch_failed" }, { status: 500 });
  }
}
