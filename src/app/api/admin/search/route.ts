export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

type Result = { type: "service" | "node" | "user"; label: string; href: string };

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || !(await isPlatformAdmin(user.id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (!q) return NextResponse.json<Result[]>([]);

  const like = `%${q.replace(/%/g, "")}%`;
  const results: Result[] = [];

  // Services
  const { rows: s } = await pool.query(
    `SELECT id, display_name AS label
     FROM public.services
     WHERE lower(display_name) LIKE $1
     LIMIT 5`,
    [like]
  );
  s.forEach((r: any) => results.push({ type: "service", label: r.label, href: `/services/${r.id}` }));

  // Nodes
  const { rows: n } = await pool.query(
    `SELECT id, name AS label
     FROM public.service_nodes
     WHERE lower(name) LIKE $1
     LIMIT 5`,
    [like]
  );
  n.forEach((r: any) => results.push({ type: "node", label: r.label, href: `/nodes/${r.id}` }));

  // Users
  const { rows: u } = await pool.query(
    `SELECT id, COALESCE(full_name, email) AS label
     FROM public.users
     WHERE lower(COALESCE(full_name, email, '')) LIKE $1
     LIMIT 5`,
    [like]
  );
  u.forEach((r: any) => results.push({ type: "user", label: r.label, href: `/admin/users/${r.id}` }));

  return NextResponse.json(results);
}




