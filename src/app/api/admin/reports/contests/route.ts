export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { adminNoStoreJson, getAdminSchema, requireAdminAccess } from "@/lib/adminConsole";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    await requireAdminAccess();
    const schema = await getAdminSchema();
    if (!schema.tables.contests || !schema.tables.contest_entries) {
      return adminNoStoreJson({ hidden: true, reason: "required_tables_missing" });
    }

    const [performance, entriesByDay] = await Promise.all([
      pool.query(`SELECT c.id, c.title, c.status, c.starts_at, c.ends_at,
          COUNT(e.*)::int AS total_entries,
          COUNT(DISTINCT e.user_id)::int AS unique_users
        FROM public.contests c
        LEFT JOIN public.contest_entries e ON e.contest_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT 100`),
      pool.query(`SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS entries
        FROM public.contest_entries
        WHERE created_at >= now() - interval '30 day'
        GROUP BY 1
        ORDER BY 1`)
    ]);

    return adminNoStoreJson({ performance: performance.rows, entriesByDay: entriesByDay.rows });
  } catch (err) {
    if (err instanceof Response) return err;
    return adminNoStoreJson({ error: "reports_contests_failed" }, { status: 500 });
  }
}
