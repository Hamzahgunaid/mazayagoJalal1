
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../../_helpers";

export async function PATCH(req: Request, { params }: { params: { id: string, prizeId: string }}) {
  const { user, response } = await requireUser(); if (response) return response;

  const body = await req.json().catch(() => ({}));
  const fields: Array<keyof typeof body> = [
    'name',
    'type',
    'quantity',
    'amount',
    'currency',
    'voucher_template_id',
    'metadata',
    'prize_summary',
  ];

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const field of fields) {
    if (field in body) {
      if (field === 'type') {
        updates.push(`type = $${idx}::public.prize_type`);
      } else {
        updates.push(`${field} = $${idx}`);
      }
      values.push(body[field]);
      idx += 1;
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  values.push(params.id, params.prizeId);

  const query = `UPDATE public.contest_prizes
                 SET ${updates.join(', ')}
                 WHERE contest_id = $${idx} AND id = $${idx + 1}
                 RETURNING id, type, name, quantity, amount, currency, voucher_template_id, metadata, prize_summary, created_at`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
    const { rows } = await client.query(query, values);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await client.query('COMMIT');
    return NextResponse.json({ prize: rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Unable to update prize', detail: String(error?.message || error) }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string, prizeId: string }}) {
  const { user, response } = await requireUser(); if (response) return response;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
    await client.query(`DELETE FROM public.contest_prizes WHERE contest_id=$1 AND id=$2`, [params.id, params.prizeId]);
    await client.query('COMMIT');
    return NextResponse.json({}, { status: 204 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Unable to delete prize', detail: String(error?.message || error) }, { status: 500 });
  } finally {
    client.release();
  }
}
