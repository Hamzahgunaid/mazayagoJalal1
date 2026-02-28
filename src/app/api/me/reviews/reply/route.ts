export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req:Request){
  const u = await currentUser();
  if(!u) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const fd = await req.formData();
  const review_id = String(fd.get("review_id")||"");
  const body = String(fd.get("reply_body")||"").trim();
  if(!review_id || !body) return NextResponse.json({ error:"missing" }, { status:400 });

  // own service?
  const { rows:own } = await pool.query(`
    SELECT 1
    FROM public.reviews r
    JOIN public.service_nodes sn ON sn.id = r.service_node_id
    JOIN public.services s ON s.id = sn.service_id
    WHERE r.id=$1 AND s.owner_user_id=$2
    LIMIT 1
  `, [review_id, u.id]);
  if(!own[0]) return NextResponse.json({ error:"forbidden" }, { status:403 });

  await pool.query(`
    INSERT INTO public.review_replies(review_id, author_user_id, body)
    VALUES($1,$2,$3)
    ON CONFLICT(review_id) DO UPDATE SET body=EXCLUDED.body, created_at=now()
  `, [review_id, u.id, body]);

  return NextResponse.redirect("/me/reviews", 303);
}




