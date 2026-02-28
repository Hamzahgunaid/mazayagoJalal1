export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

type TotalsRow = {
  task_id: string;
  answer_kind: string;
  answer_key: string | null;
  count: number;
};

const parseJsonValue = (value: any) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value;
  return {};
};

const isAllowedKind = (value: string) => ['PREDICTION', 'MCQ', 'TEXT'].includes(value);

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { slug } = params || {};
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  try {
    const contestRes = await pool.query(
      `select id, type, rules_json from public.contests where slug=$1 limit 1`,
      [slug],
    );
    if (contestRes.rowCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const contest = contestRes.rows[0];
    const contestType = String(contest.type || '').toUpperCase();
    if (contestType !== 'PREDICTION') {
      return NextResponse.json({ ok: false }, { status: 204 });
    }

    const rules = parseJsonValue(contest.rules_json);
    if (rules.hide_live_prediction === true || rules.hide_live_leaderboard === true) {
      return NextResponse.json({ ok: false }, { status: 204 });
    }

    const messengerRes = await pool.query(
      `select fb_page_id
         from public.messenger_pages
        where contest_id=$1 and is_active=true
        limit 1`,
      [contest.id],
    );

    if (messengerRes.rowCount === 0) {
      return NextResponse.json({ ok: false }, { status: 204 });
    }

    const fbPageId = messengerRes.rows[0].fb_page_id;

    let messengerRows: any[] = [];
    if (fbPageId) {
      const { rows } = await pool.query(
        `
          select task_id, answer_kind, answer_key, sum(answers_count)::int as answers_count
            from public.messenger_entries_analytics
           where contest_id=$1
             and fb_page_id=$2
             and answer_kind in ('PREDICTION', 'MCQ', 'TEXT')
           group by task_id, answer_kind, answer_key
        `,
        [contest.id, fbPageId],
      );
      messengerRows = rows;
    }

    const { rows: webRows } = await pool.query(
      `
        select
          task_id,
          case
            when prediction_winner is not null and prediction_winner <> '' then 'PREDICTION'
            when mcq_option_id is not null then 'MCQ'
            when answer_text is not null and answer_text <> '' then 'TEXT'
            else 'UNKNOWN'
          end as answer_kind,
          case
            when prediction_winner is not null and prediction_winner <> '' then upper(prediction_winner)
            when mcq_option_id is not null then mcq_option_id::text
            else null
          end as answer_key,
          count(*)::int as answers_count
        from public.contest_entries
        where contest_id=$1
        group by task_id, answer_kind, answer_key
      `,
      [contest.id],
    );

    const totalsMap = new Map<string, TotalsRow>();
    const mergeRows = (rows: any[]) => {
      rows.forEach((row) => {
        if (!row?.task_id) return;
        const answerKind = String(row.answer_kind || '').toUpperCase();
        if (!isAllowedKind(answerKind)) return;
        const answerKey = row.answer_key === null ? null : String(row.answer_key);
        const key = `${row.task_id}::${answerKind}::${answerKey ?? ''}`;
        const prev = totalsMap.get(key);
        const count = Number(row.answers_count) || 0;
        if (prev) {
          prev.count += count;
        } else {
          totalsMap.set(key, {
            task_id: String(row.task_id),
            answer_kind: answerKind,
            answer_key: answerKey,
            count,
          });
        }
      });
    };

    mergeRows(messengerRows);
    mergeRows(webRows);

    const totals = Array.from(totalsMap.values());

    return NextResponse.json({
      ok: true,
      contest_id: contest.id,
      fb_page_id: fbPageId,
      totals,
    });
  } catch (error: any) {
    console.error('prediction stats fetch failed', error);
    return NextResponse.json(
      { error: 'Server error', detail: String(error?.message || error) },
      { status: 500 },
    );
  }
}
