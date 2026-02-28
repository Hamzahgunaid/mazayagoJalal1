export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get("country") || "").trim().toUpperCase();
  const q = (searchParams.get("q") || "").trim();

  if (!country) return NextResponse.json({ cities: [] });

  // Ù†ÙØ±Ø¬Ù‘Ø¹ Ø§Ø³Ù… Ù…Ø¯ÙŠÙ†Ø© Ù…ÙˆØ­Ù‘Ø¯ (Ø¹Ø±Ø¨ÙŠ Ø¥Ù† ÙˆØ¬Ø¯ ÙˆØ¥Ù„Ø§ Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ)
  const { rows } = await pool.query(
    `
    SELECT DISTINCT
      COALESCE(NULLIF(c.name_ar, ''), NULLIF(c.name_en, '')) AS city
    FROM public.cities c
    WHERE
      c.country_iso2 = $1
      AND COALESCE(NULLIF(c.name_ar, ''), NULLIF(c.name_en, '')) IS NOT NULL
      AND (
        $2 = '' OR
        LOWER(COALESCE(c.name_ar, '')) LIKE '%'||LOWER($2)||'%' OR
        LOWER(COALESCE(c.name_en, '')) LIKE '%'||LOWER($2)||'%'
      )
    ORDER BY city
    LIMIT 300
    `,
    [country, q]
  );

  return NextResponse.json({ cities: rows.map(r => r.city) });
}




