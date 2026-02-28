export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await pool.query("select now() as now");
    return NextResponse.json({
      ok: true,
      db: "up",
      now: rows?.[0]?.now ?? null,
      pgsslmode: process.env.PGSSLMODE ?? null
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

