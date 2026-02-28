export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { adminNoStoreJson, getAdminSchema, requireAdminAccess } from "@/lib/adminConsole";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    await requireAdminAccess();
    const schema = await getAdminSchema();
    const tables = Object.keys(schema.tables);

    const exists = (t: string) => tables.includes(t);
    const payload: Record<string, unknown> = {};

    if (exists("contests")) {
      payload.activeContests = (await pool.query(`SELECT COUNT(*)::int AS count FROM public.contests WHERE status IN ('active','published','live')`)).rows[0]?.count ?? 0;
    }
    if (exists("offers")) {
      payload.activeOffers = (await pool.query(`SELECT COUNT(*)::int AS count FROM public.offers WHERE status IN ('active','published','live')`)).rows[0]?.count ?? 0;
    }
    if (exists("contest_entries")) {
      payload.entries = (await pool.query(`SELECT
        COUNT(*) FILTER (WHERE created_at >= now() - interval '1 day')::int AS today,
        COUNT(*) FILTER (WHERE created_at >= now() - interval '7 day')::int AS d7,
        COUNT(*) FILTER (WHERE created_at >= now() - interval '30 day')::int AS d30,
        COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '1 day')::int AS unique_today,
        COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '7 day')::int AS unique_d7
      FROM public.contest_entries`)).rows[0] ?? null;
    }

    return adminNoStoreJson(payload);
  } catch (err) {
    if (err instanceof Response) return err;
    return adminNoStoreJson({ error: "reports_overview_failed" }, { status: 500 });
  }
}
