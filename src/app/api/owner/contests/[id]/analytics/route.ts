
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../_helpers";

export async function GET(_req: Request, { params }:{ params: { id: string }}){
  const { response } = await requireUser(); if (response) return response;
  const cid = params.id;
  const q = async (sql:string, args:any[]=[]) => (await pool.query(sql,args)).rows;
  const [participants, entries, correct, incorrect, winners, codes] = await Promise.all([
    q(`SELECT count(DISTINCT user_id)::int AS c FROM public.contest_entries WHERE contest_id=$1`, [cid]),
    q(`SELECT count(*)::int AS c FROM public.contest_entries WHERE contest_id=$1`, [cid]),
    q(`SELECT count(*)::int AS c FROM public.contest_entries WHERE contest_id=$1 AND status='CORRECT'`, [cid]),
    q(`SELECT count(*)::int AS c FROM public.contest_entries WHERE contest_id=$1 AND status='INCORRECT'`, [cid]),
    q(`SELECT count(*)::int AS c FROM public.contest_winners WHERE contest_id=$1`, [cid]),
    q(`SELECT coalesce(sum(redemptions_count),0)::int AS c FROM public.contest_codes WHERE contest_id=$1`, [cid]),
  ]);
  const daily = await q(`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d, count(*)::int AS c
    FROM public.contest_entries WHERE contest_id=$1 GROUP BY 1 ORDER BY 1
  `, [cid]);
  return NextResponse.json({
    participants: participants[0]?.c || 0,
    entries: entries[0]?.c || 0,
    correct: correct[0]?.c || 0,
    incorrect: incorrect[0]?.c || 0,
    winners: winners[0]?.c || 0,
    codes_redeemed: codes[0]?.c || 0,
    daily
  });
}
