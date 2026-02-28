export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function GET(){
  const user = await currentUser();
  if(!user || !(await isPlatformAdmin(user.id))) return NextResponse.json({ error:"forbidden" }, { status:403 });

  const { rows } = await pool.query(`
    SELECT r.id, r.title, r.body, r.rating, r.submitted_at,
           sn.name AS node_name, s.display_name AS service_name,
           u.full_name AS user_name, u.email AS user_email,
           COALESCE(rs.device_burst,false) AS suspicious_device_burst,
           COALESCE(rs.user_burst,false)   AS suspicious_user_burst,
           COALESCE(rs.ocr_low_conf,false) AS suspicious_ocr_low
    FROM public.reviews r
    JOIN public.service_nodes sn ON sn.id = r.service_node_id
    JOIN public.services s ON s.id = sn.service_id
    JOIN public.users u ON u.id = r.user_id
    LEFT JOIN public.review_suspicion_v rs ON rs.review_id = r.id
    WHERE r.status='pending'
    ORDER BY r.submitted_at ASC
    LIMIT 50
  `);
  return NextResponse.json(rows);
}




