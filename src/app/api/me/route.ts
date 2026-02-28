import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }

  const { rows } = await pool.query<{ role: string }>(
    `SELECT role FROM public.platform_roles WHERE user_id = $1`,
    [user.id],
  );
  return NextResponse.json({ user: { ...user, roles: rows.map((row) => row.role) } });
}
