import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request){
  try{
    const user = await currentUser();
    if(!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

    const body = await req.json();
    const { service_id, service_node_id, payload } = body || {};
    if(!service_id || !service_node_id) {
      return NextResponse.json({ error:"Missing service_id or service_node_id" }, { status:400 });
    }

    // (اختياري) تحقّق ملكية/عضوية
    const can = await pool.query(
      `SELECT 1
         FROM public.service_nodes sn
         JOIN public.services s ON s.id = sn.service_id
    LEFT JOIN public.service_members sm ON sm.service_id = s.id AND sm.user_id = $3
        WHERE sn.id = $1 AND s.id = $2 AND (s.owner_user_id = $3 OR sm.user_id IS NOT NULL)
        LIMIT 1`,
      [service_node_id, service_id, user.id]
    );
    if (!can.rows[0]) return NextResponse.json({ error:"Forbidden" }, { status:403 });

    const ins = await pool.query(
      `INSERT INTO public.nfc_card_requests(user_id, service_id, service_node_id, payload, status)
       VALUES ($1,$2,$3,$4::jsonb,'requested')
       RETURNING id`,
      [user.id, service_id, service_node_id, JSON.stringify(payload||{})]
    );
    return NextResponse.json({ ok:true, request_id: ins.rows[0].id });
  }catch(e:any){
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status:500 });
  }
}
