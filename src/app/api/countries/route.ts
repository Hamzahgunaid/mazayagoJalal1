export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(`
    SELECT iso2, name_en
    FROM public.countries
    WHERE iso2 IS NOT NULL AND name_en IS NOT NULL
    ORDER BY name_en
  `);
  // رجّع مصفوفة مباشرة
  return NextResponse.json(rows, { status: 200 });
}

