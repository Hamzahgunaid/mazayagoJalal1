export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function GET() {
  const user = await currentUser();
  if (!user || !(await isPlatformAdmin(user.id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { rows: daily }  = await pool.query(`SELECT day, total_reviews, approved_reviews, approval_rate_pct, flagged_count, qr_share, invite_share FROM public.dashboard_daily_metrics_v ORDER BY day`);
  const { rows: rep }    = await pool.query(`SELECT * FROM public.platform_reputation_v`);
  const { rows: rolling }= await pool.query(`SELECT * FROM public.admin_kpi_rolling_v`);
  const { rows: mix365 } = await pool.query(`SELECT * FROM public.channel_mix_365_v`);
  const { rows: timings }= await pool.query(`SELECT * FROM public.moderation_timings_v`);
  const { rows: funnel } = await pool.query(`SELECT * FROM public.platform_funnel_v`);

  return NextResponse.json({
    daily,
    platform: rep[0] || null,
    rolling:  rolling[0] || null,
    mix365:   mix365[0] || null,
    timings:  timings[0] || null,
    funnel:   funnel[0] || null,
  });
}




