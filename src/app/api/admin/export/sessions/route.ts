export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function GET() {
  const user = await currentUser();
  if (!user || !(await isPlatformAdmin(user.id))) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const { rows } = await pool.query(`
    SELECT u.email, u.full_name, us.token, us.created_at, us.expires_at, us.user_agent, us.ip
    FROM public.user_sessions us
    JOIN public.users u ON u.id = us.user_id
    ORDER BY us.created_at DESC
    LIMIT 1000
  `);

  const head = "email,full_name,token,created_at,expires_at,user_agent,ip\n";
  const csv =
    head +
    rows
      .map((r: any) =>
        [
          r.email ?? "",
          (r.full_name ?? "").replace(/,/g, ";"),
          r.token,
          new Date(r.created_at).toISOString(),
          new Date(r.expires_at).toISOString(),
          (r.user_agent ?? "").replace(/,/g, ";"),
          r.ip ?? "",
        ].join(",")
      )
      .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=sessions.csv",
    },
  });
}




