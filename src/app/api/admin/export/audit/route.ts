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

  const { rows } = await pool.query(
    `SELECT user_id, action, target_type, target_id, created_at
     FROM public.audit_log
     ORDER BY created_at DESC
     LIMIT 1000`
  );

  const head = "user_id,action,target_type,target_id,created_at\n";
  const csv =
    head +
    rows
      .map((r: any) =>
        [r.user_id, r.action, r.target_type, r.target_id, new Date(r.created_at).toISOString()].join(",")
      )
      .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=audit.csv",
    },
  });
}




