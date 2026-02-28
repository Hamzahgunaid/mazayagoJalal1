
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import crypto from "crypto";
import { requireUser } from "@/app/api/_helpers";


function genCode(len=10){
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s=''; for(let i=0;i<len;i++) s += alphabet[Math.floor(Math.random()*alphabet.length)];
  return `RV-${s}`;
}
function hash(raw:string){
  const pepper = process.env.CODE_PEPPER || 'rateverse-pepper';
  return crypto.createHash('sha256').update(raw + pepper).digest();
}

export async function POST(req: Request, { params }:{ params: { id: string }}){
  const { response } = await requireUser(); if (response) return response;
  const b = await req.json();
  const quantity = Math.min(100000, Math.max(1, Number(b.quantity || 1)));
  const len = Math.min(24, Math.max(6, Number(b.length || 10)));
  const tag = b.tag === 'GOLD' ? 'GOLD' : 'NORMAL';
  const sku = b.sku || null;
  const max_redemptions = Math.max(1, Number(b.max_redemptions || 1));
  const expires_at = b.expires_at || null;
  const rawName = (b.name ?? '').toString().trim();
  const batchName = rawName || `batch-${Date.now()}`;
  const pattern = (b.pattern || 'RV-XXXXX') as string;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const batch = await client.query(
      `INSERT INTO public.contest_code_batches (contest_id, name, pattern)
       VALUES ($1,$2,$3) RETURNING id`,
      [params.id, batchName, pattern]
    );
    const codes:any[] = [];
    for(let i=0;i<quantity;i++){
      const raw = genCode(len);
      const h = hash(raw);
      const ins = await client.query(`INSERT INTO public.contest_codes (contest_id, batch_id, code_hash, tag, sku, max_redemptions, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [params.id, batch.rows[0].id, h, tag, sku, max_redemptions, expires_at]);
      codes.push({ code: raw, tag, sku, max_redemptions, expires_at, id: ins.rows[0].id });
    }
    await client.query('COMMIT');
    return NextResponse.json({ batch_id: batch.rows[0].id, codes }, { status: 201 });
  } catch(e:any){
    await client.query('ROLLBACK');
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}
