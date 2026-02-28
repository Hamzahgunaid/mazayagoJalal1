
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../_helpers";

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    quantity: row.quantity,
    amount: row.amount,
    currency: row.currency,
    prize_summary: row.prize_summary,
    voucher_template_id: row.voucher_template_id,
    metadata: row.metadata,
    created_at: row.created_at,
  };
}

export async function GET(_req: Request, { params }: { params: { id: string }}) {
  const { response } = await requireUser(); if (response) return response;
  const { rows } = await pool.query(
    `SELECT id, type, name, quantity, amount, currency, voucher_template_id, metadata, prize_summary, created_at
     FROM public.contest_prizes
     WHERE contest_id = $1
     ORDER BY created_at ASC NULLS LAST, id ASC`,
    [params.id]
  );
  return NextResponse.json({ items: rows.map(mapRow) });
}

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const { user, response } = await requireUser(); if (response) return response;
  const b = await req.json();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
    const { rows } = await client.query(
      `INSERT INTO public.contest_prizes (contest_id, type, name, quantity, amount, currency, voucher_template_id, metadata, prize_summary)
       VALUES ($1, $2::public.prize_type, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, type, name, quantity, amount, currency, voucher_template_id, metadata, prize_summary, created_at`,
      [params.id, b.type, b.name, b.quantity, b.amount || null, b.currency || null, b.voucher_template_id || null, b.metadata || null, b.prize_summary || null]
    );
    await client.query('COMMIT');
    return NextResponse.json({ prize: mapRow(rows[0]) }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Unable to save prize', detail: String(error?.message || error) }, { status: 500 });
  } finally {
    client.release();
  }
}
