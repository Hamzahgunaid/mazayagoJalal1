export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { adminNoStoreJson, getAdminSchema, requireAdminAccess } from "@/lib/adminConsole";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    await requireAdminAccess();
    const schema = await getAdminSchema();
    if (!schema.tables.users) return adminNoStoreJson({ hidden: true, reason: "users_table_missing" });

    const [newUsersByDay, topParticipants] = await Promise.all([
      pool.query(`SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS users
        FROM public.users
        WHERE created_at >= now() - interval '30 day'
        GROUP BY 1 ORDER BY 1`),
      schema.tables.contest_entries
        ? pool.query(`SELECT user_id, COUNT(*)::int AS accepted_entries
            FROM public.contest_entries
            WHERE status IN ('accepted','approved')
            GROUP BY user_id ORDER BY accepted_entries DESC LIMIT 20`)
        : Promise.resolve({ rows: [] as any[] })
    ]);

    return adminNoStoreJson({ newUsersByDay: newUsersByDay.rows, topParticipants: topParticipants.rows });
  } catch (err) {
    if (err instanceof Response) return err;
    return adminNoStoreJson({ error: "reports_users_failed" }, { status: 500 });
  }
}
