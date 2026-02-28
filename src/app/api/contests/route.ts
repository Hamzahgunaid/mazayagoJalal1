export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(`  SELECT
    c.*,
    f.first_image_url
  FROM public.contests c
  LEFT JOIN public.contest_first_image_v f ON f.contest_id = c.id
  WHERE c.visibility='public'
  ORDER BY c.starts_at DESC
  LIMIT 100
`);
  return NextResponse.json({ items: rows });
}




