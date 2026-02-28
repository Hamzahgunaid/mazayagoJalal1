export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const { rows } = await pool.query(
    `
    SELECT c.id, c.slug, c.name_en, c.name_ar, c.icon_key, c.parent_id
    FROM public.categories c
    WHERE c.active = TRUE
      AND ($1 = '' OR c.slug ILIKE '%'||$1||'%' OR c.name_en ILIKE '%'||$1||'%' OR c.name_ar ILIKE '%'||$1||'%')
    ORDER BY c.parent_id NULLS FIRST, c.name_en
    LIMIT 30
    `,
    [q]
  );

  return NextResponse.json({ items: rows });
}




