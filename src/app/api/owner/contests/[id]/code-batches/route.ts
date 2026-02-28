export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const contest_id = ctx.params?.id;
  if (!contest_id) return NextResponse.json({ error:'Missing id' }, { status:400 });

  const { name, pattern } = await req.json().catch(()=> ({}));
  if (!name) return NextResponse.json({ error:'name is required' }, { status:400 });

  try {
    const q = await pool.query(
      `INSERT INTO public.contest_code_batches (contest_id, name, pattern)
       VALUES ($1, $2, $3) RETURNING *`,
      [contest_id, name, pattern || null]
    );
    return NextResponse.json({ batch: q.rows[0] });
  } catch (e:any) {
    console.error('code-batches error', e);
    return NextResponse.json({ error:'Server error', detail:String(e?.message||e) }, { status:500 });
  }
}
