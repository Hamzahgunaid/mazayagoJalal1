
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try{
    const user = await currentUser();
    if(!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

    const reviewId = params.id;
    const { body } = await req.json();
    if(!body || String(body).trim().length === 0){
      return NextResponse.json({ error:"Empty reply" }, { status:400 });
    }

    const q = await pool.query(
      `SELECT EXISTS(
          SELECT 1
          FROM public.review_service_map_v rsm
          JOIN public.service_members sm ON sm.service_id = rsm.service_id
          WHERE rsm.review_id = $1 AND sm.user_id = $2 AND sm.status='active'
        ) AS is_owner`,
      [reviewId, user.id]
    );
    const isOwner = !!q.rows[0]?.is_owner;

    await pool.query(
      `INSERT INTO public.review_replies(review_id, user_id, body, is_owner)
       VALUES ($1,$2,$3,$4)`,
      [reviewId, user.id, body, isOwner]
    );
    return NextResponse.json({ ok:true, is_owner:isOwner });
  }catch(e:any){
    return NextResponse.json({ error:e?.message || "Reply failed" }, { status:500 });
  }
}
