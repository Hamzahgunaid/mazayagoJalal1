export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ error:'Missing id' }, { status:400 });

  const { options, correctIndex } = await req.json().catch(()=> ({}));
  if (!Array.isArray(options) || options.length === 0)
    return NextResponse.json({ error:'options[] is required' }, { status:400 });

  const idx = Number(correctIndex ?? 0);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.contest_mcq_options WHERE contest_id = $1', [id]);

    let position = 1;
    for (let i=0;i<options.length;i++) {
      const label = String(options[i] ?? '').trim();
      if (!label) continue;
      const is_correct = i === idx;
      await client.query(
        `INSERT INTO public.contest_mcq_options (contest_id, label, is_correct, position)
         VALUES ($1, $2, $3, $4)`,
        [id, label, is_correct, position++]
      );
    }
    await client.query('COMMIT');
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('mcq-options error', e);
    return NextResponse.json({ error:'Server error', detail:String(e?.message||e) }, { status:500 });
  } finally {
    client.release();
  }
}
