
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try{
    const user = await currentUser();
    if(!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

    const reviewId = params.id;
    const { reason } = await req.json();
    await pool.query(
      `INSERT INTO public.review_flags(review_id, flagger_user_id, reason, status)
       VALUES ($1,$2,$3,'open')`,
      [reviewId, user.id, reason || null]
    );
    return NextResponse.json({ ok:true });
  }catch(e:any){
    return NextResponse.json({ error:e?.message || "Flag failed" }, { status:500 });
  }
}
