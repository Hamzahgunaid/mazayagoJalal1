export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { z } from "zod";
import { adminNoStoreJson, assertAdminCsrf, assertAllowedIdentifier, canWrite, getAdminSchema, requireAdminAccess, tableQuerySchema, writeAuditLog } from "@/lib/adminConsole";
import { pool } from "@/lib/db";

const createSchema = z.record(z.string(), z.any());

export async function GET(req: Request, { params }: { params: { table: string } }) {
  try {
    const access = await requireAdminAccess();
    const schema = await getAdminSchema();
    const table = params.table;
    assertAllowedIdentifier(table, Object.keys(schema.tables));

    const parsed = tableQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    const meta = schema.tables[table];

    const where: string[] = [];
    const values: any[] = [];

    if (parsed.q) {
      const searchable = meta.columns
        .filter((c) => ["text", "character varying", "uuid"].includes(c.type))
        .map((c) => c.name)
        .slice(0, 8);
      if (searchable.length) {
        const searchClauses = searchable.map((col) => `${col}::text ILIKE $${values.length + 1}`);
        values.push(`%${parsed.q}%`);
        where.push(`(${searchClauses.join(" OR ")})`);
      }
    }

    if (parsed.createdFrom && meta.columns.some((c) => c.name === "created_at")) {
      values.push(parsed.createdFrom);
      where.push(`created_at >= $${values.length}::timestamptz`);
    }
    if (parsed.createdTo && meta.columns.some((c) => c.name === "created_at")) {
      values.push(parsed.createdTo);
      where.push(`created_at <= $${values.length}::timestamptz`);
    }
    if (parsed.status && meta.columns.some((c) => c.name === "status")) {
      values.push(parsed.status);
      where.push(`status = $${values.length}`);
    }
    if (parsed.userId && meta.columns.some((c) => c.name === "user_id")) {
      values.push(parsed.userId);
      where.push(`user_id = $${values.length}::uuid`);
    }
    if (parsed.contestId && meta.columns.some((c) => c.name === "contest_id")) {
      values.push(parsed.contestId);
      where.push(`contest_id = $${values.length}::uuid`);
    }
    if (parsed.offerId && meta.columns.some((c) => c.name === "offer_id")) {
      values.push(parsed.offerId);
      where.push(`offer_id = $${values.length}::uuid`);
    }

    const sortColumn = parsed.sort && meta.columns.find((c) => c.name === parsed.sort)
      ? parsed.sort
      : (meta.columns.find((c) => c.name === "created_at") ? "created_at" : (meta.primaryKey || meta.columns[0]?.name));

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    if (parsed.export === "csv") {
      const { rows } = await pool.query(`SELECT * FROM public.${table} ${whereSql} ORDER BY ${sortColumn} ${parsed.sortDir} LIMIT 5000`, values);
      const headers = Object.keys(rows[0] || {});
      const csv = [headers.join(",")]
        .concat(rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")))
        .join("\n");

      await writeAuditLog({
        actorUserId: access.user.id,
        action: "EXPORT",
        tableName: table,
        recordPk: null,
        before: null,
        after: { exportedRows: rows.length, filters: parsed },
        ip: access.ip,
        userAgent: access.userAgent,
      });

      return new Response(csv, { headers: { "Content-Type": "text/csv", "Cache-Control": "no-store" } });
    }

    const countValues = [...values];
    values.push(parsed.pageSize);
    values.push((parsed.page - 1) * parsed.pageSize);

    const [dataRes, countRes] = await Promise.all([
      pool.query(`SELECT * FROM public.${table} ${whereSql} ORDER BY ${sortColumn} ${parsed.sortDir} LIMIT $${values.length - 1} OFFSET $${values.length}`, values),
      pool.query(`SELECT COUNT(*)::int AS total FROM public.${table} ${whereSql}`, countValues),
    ]);

    let stats: any = { total: countRes.rows[0]?.total || 0, last_24h: 0, last_7d: 0 };
    if (meta.columns.some((c) => c.name === "created_at")) {
      const statRes = await pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hour')::int AS last_24h,
                COUNT(*) FILTER (WHERE created_at >= now() - interval '7 day')::int AS last_7d
           FROM public.${table}`
      );
      stats = statRes.rows[0];
    }

    return adminNoStoreJson({
      table,
      page: parsed.page,
      pageSize: parsed.pageSize,
      total: countRes.rows[0]?.total || 0,
      rows: dataRes.rows,
      stats,
      writeEnabled: access.writeEnabled,
      schema: meta,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return adminNoStoreJson({ error: "table_read_failed", detail: (err as Error).message }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: { table: string } }) {
  try {
    const access = await requireAdminAccess();
    assertAdminCsrf(req);
    if (!canWrite()) return adminNoStoreJson({ error: "read_only" }, { status: 403 });

    const schema = await getAdminSchema();
    const table = params.table;
    assertAllowedIdentifier(table, Object.keys(schema.tables));

    const meta = schema.tables[table];
    if (meta.objectType === "VIEW") return adminNoStoreJson({ error: "view_read_only" }, { status: 400 });

    const body = createSchema.parse(await req.json());
    const allowedCols = meta.columns.filter((c) => !c.isReadonly).map((c) => c.name);
    
    const keys = Object.keys(body).filter((k) => allowedCols.includes(k));
    if (!keys.length) return adminNoStoreJson({ error: "no_columns" }, { status: 400 });

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const values = keys.map((k) => body[k]);

    const inserted = await pool.query(`INSERT INTO public.${table} (${keys.join(",")}) VALUES (${placeholders}) RETURNING *`, values);

    const pk = meta.primaryKey;
    
    await writeAuditLog({
      actorUserId: access.user.id,
      action: "CREATE",
      tableName: table,
      recordPk: pk ? String(inserted.rows[0]?.[pk] ?? "") : null,
      before: null,
      after: inserted.rows[0],
      ip: access.ip,
      userAgent: access.userAgent,
    });

    return adminNoStoreJson({ ok: true, row: inserted.rows[0] }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return adminNoStoreJson({ error: "table_create_failed", detail: (err as Error).message }, { status: 400 });
  }
}