export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(req:Request){
  const u = await currentUser();
  if(!u) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const fd = await req.formData();
  const service_id = fd.get("service_id") || null;
  const service_node_id = fd.get("service_node_id") || null;
  const notes = fd.get("notes") || null;

  await pool.query(`
    INSERT INTO public.nfc_card_requests(user_id, service_id, service_node_id, payload)
    VALUES($1, NULLIF($2,'')::uuid, NULLIF($3,'')::uuid, jsonb_build_object('notes',$4))
  `, [u.id, service_id, service_node_id, notes]);
  return NextResponse.json({ ok:true });
}




