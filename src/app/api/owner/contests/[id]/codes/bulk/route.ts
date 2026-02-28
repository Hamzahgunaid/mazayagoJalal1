export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import crypto from 'crypto';

const PEPPER = process.env.RATEVERSE_CODE_PEPPER || process.env.CODE_PEPPER || 'rateverse-pepper';

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const contest_id = ctx.params?.id;
  if (!contest_id) return NextResponse.json({ error:'Missing id' }, { status:400 });

  const body = await req.json().catch(()=> ({}));
  let { batch_id, codes, tag, sku, max_redemptions } = body || {};
  if (!Array.isArray(codes) || codes.length === 0)
    return NextResponse.json({ error:'codes[] is required' }, { status:400 });

  tag = tag || 'NORMAL';
  sku = sku || null;
  max_redemptions = Number(max_redemptions ?? 1) || 1;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // تأكد من الدفعة إن لزم
    if (!batch_id) {
      const b = await client.query(
        `INSERT INTO public.contest_code_batches (contest_id, name)
         VALUES ($1, $2) RETURNING id`,
        [contest_id, `batch-${Date.now()}`]
      );
      batch_id = b.rows[0].id;
    }

    const rows: any[] = [];
    for (const raw of codes) {
      const code = String(raw || '').trim();
      if (!code) continue;
      const hash = crypto.createHash('sha256').update(code + PEPPER).digest(); // bytea
      rows.push({
        contest_id, batch_id, code_hash: hash, tag, sku, max_redemptions
      });
    }
    if (rows.length === 0) {
      await client.query('ROLLBACK').catch(()=>{});
      return NextResponse.json({ error:'No valid codes' }, { status:400 });
    }

    // إدخال جماعي
    const text =
      `INSERT INTO public.contest_codes
       (contest_id, batch_id, code_hash, tag, sku, max_redemptions, redemptions_count)
       VALUES ${rows.map((_,i)=>
         `($${i*6+1}, $${i*6+2}, $${i*6+3}, $${i*6+4}, $${i*6+5}, $${i*6+6}, 0)`
       ).join(',')}`;
    const values:any[] = [];
    rows.forEach(r => {
      values.push(r.contest_id, r.batch_id, r.code_hash, r.tag, r.sku, r.max_redemptions);
    });

    await client.query(text, values);
    await client.query('COMMIT');
    return NextResponse.json({ ok:true, inserted: rows.length, batch_id });
  } catch (e:any) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('codes/bulk error', e);
    return NextResponse.json({ error:'Server error', detail:String(e?.message||e) }, { status:500 });
  } finally {
    client.release();
  }
}
