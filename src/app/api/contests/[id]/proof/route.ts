
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(_req: Request, { params }:{ params: { id: string }}){
  // تجميع البينة من أول صف فائز منشور (حسب publish_winners الحالية)
  const { rows } = await pool.query(`SELECT public_proof FROM public.contest_winners WHERE contest_id=$1 AND public_proof IS NOT NULL LIMIT 1`, [params.id]);
  if(!rows.length || !rows[0].public_proof) return NextResponse.json({}, { status: 204 });
  return NextResponse.json(rows[0].public_proof);
}
