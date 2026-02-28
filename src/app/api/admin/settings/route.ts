export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

type SettingRow = { key: string; value: any };

export async function GET() {
  const user = await currentUser();
  if (!user || !(await isPlatformAdmin(user.id))) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const result = await pool.query(`SELECT key, value FROM public.platform_settings`);
  const rows = result.rows as SettingRow[]; // <<< Ø£Ù‡Ù… Ø³Ø·Ø±
  const obj: Record<string, any> = {};

  rows.forEach((r: SettingRow) => { // <<< Ø§Ù„Ø¢Ù† r Ù…Ø¹Ù„ÙˆÙ… Ø§Ù„Ù†ÙˆØ¹
    obj[r.key] = r.value;
  });

  return NextResponse.json(obj);
}




