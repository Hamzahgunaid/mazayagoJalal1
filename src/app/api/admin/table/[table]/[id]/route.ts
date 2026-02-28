export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { z } from "zod";
import { adminNoStoreJson, assertAdminCsrf, assertAllowedIdentifier, canWrite, getAdminSchema, requireAdminAccess, writeAuditLog } from "@/lib/adminConsole";
import { pool } from "@/lib/db";

const updateSchema = z.object({ values: z.record(z.string(), z.any()) });
const deleteSchema = z.object({ confirmPhrase: z.string().min(1) });

export async function PUT(req: Request, { params }: { params: { table: string; id: string } }) {
  try {
    const access = await requireAdminAccess();
    assertAdminCsrf(req);
    if (!canWrite()) return adminNoStoreJson({ error: "read_only" }, { status: 403 });

    const schema = await getAdminSchema();
    const table = params.table;
    assertAllowedIdentifier(table, Object.keys(schema.tables));

    const meta = schema.tables[table];
    if (meta.objectType === "VIEW") return adminNoStoreJson({ error: "view_read_only" }, { status: 400 });
    if (!meta.primaryKey) return adminNoStoreJson({ error: "no_primary_key" }, { status: 400 });

    const { values } = updateSchema.parse(await req.json());
    const allowedCols = meta.columns.filter((c) => !c.isReadonly).map((c) => c.name);
    const keys = Object.keys(values).filter((k) => allowedCols.includes(k));
    if (!keys.length) return adminNoStoreJson({ error: "no_mutable_columns" }, { status: 400 });

    const before = await pool.query(`SELECT * FROM public.${table} WHERE ${meta.primaryKey}::text = $1 LIMIT 1`, [params.id]);
    const setSql = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const args = keys.map((k) => values[k]);
    args.push(params.id);

    const updated = await pool.query(
      `UPDATE public.${table} SET ${setSql} WHERE ${meta.primaryKey}::text = $${args.length} RETURNING *`,
      args
    );

    if (updated.rowCount === 0) {
      return adminNoStoreJson({ error: "not_found" }, { status: 404 });
    }

    await writeAuditLog({
      actorUserId: access.user.id,
      action: "UPDATE",
      tableName: table,
      recordPk: params.id,
      before: before.rows[0] ?? null,
      after: updated.rows[0] ?? null,
      ip: access.ip,
      userAgent: access.userAgent,
    });

    return adminNoStoreJson({ ok: true, row: updated.rows[0] ?? null });
  } catch (err) {
    if (err instanceof Response) return err;
    return adminNoStoreJson({ error: "table_update_failed", detail: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { table: string; id: string } }) {
  try {
    const access = await requireAdminAccess();
    assertAdminCsrf(req);
    if (!canWrite()) return adminNoStoreJson({ error: "read_only" }, { status: 403 });

    const schema = await getAdminSchema();
    const table = params.table;
    assertAllowedIdentifier(table, Object.keys(schema.tables));

    const meta = schema.tables[table];
    if (meta.objectType === "VIEW") return adminNoStoreJson({ error: "view_read_only" }, { status: 400 });
    if (!meta.primaryKey) return adminNoStoreJson({ error: "no_primary_key" }, { status: 400 });

    const { confirmPhrase } = deleteSchema.parse(await req.json());
    if (confirmPhrase !== `DELETE ${table}`) {
      return adminNoStoreJson({ error: "invalid_confirmation" }, { status: 400 });
    }

    const before = await pool.query(`SELECT * FROM public.${table} WHERE ${meta.primaryKey}::text = $1 LIMIT 1`, [params.id]);
    const deleted = await pool.query(`DELETE FROM public.${table} WHERE ${meta.primaryKey}::text = $1 RETURNING *`, [params.id]);
    if (deleted.rowCount === 0) {
      return adminNoStoreJson({ error: "not_found" }, { status: 404 });
    }

    await writeAuditLog({
      actorUserId: access.user.id,
      action: "DELETE",
      tableName: table,
      recordPk: params.id,
      before: before.rows[0] ?? null,
      after: null,
      ip: access.ip,
      userAgent: access.userAgent,
    });

    return adminNoStoreJson({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return adminNoStoreJson({ error: "table_delete_failed", detail: (err as Error).message }, { status: 400 });
  }
}
