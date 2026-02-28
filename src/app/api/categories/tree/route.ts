export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
export async function GET(){
  const { rows } = await pool.query(`
    SELECT id, slug, name_en, name_ar, icon_set, icon_key, parent_id, path_slugs, path_names_ar
    FROM public.category_tree_v ORDER BY path_slugs
  `);
  return NextResponse.json(rows);
}




