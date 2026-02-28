export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const q = await pool.query(
    `update public.social_pages set status='REVOKED', updated_at=now() where id=$1 returning id`,
    [id],
  );
  if (!q.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
