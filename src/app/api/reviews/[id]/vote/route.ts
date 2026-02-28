import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params; // review_id
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { kind } = await req.json().catch(() => ({}));
  if (kind !== "helpful" && kind !== "not_helpful") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  // احضر التصويت الحالي للمستخدم على هذه المراجعة
  const cur = await pool.query(
    `SELECT id, kind FROM public.review_votes WHERE review_id=$1 AND user_id=$2 LIMIT 1`,
    [id, user.id]
  );

  if (cur.rows[0]) {
    if (cur.rows[0].kind === kind) {
      // نفس النوع → إلغاء التصويت (toggle off)
      await pool.query(`DELETE FROM public.review_votes WHERE id=$1`, [cur.rows[0].id]);
    } else {
      // تغيير النوع
      await pool.query(`UPDATE public.review_votes SET kind=$1 WHERE id=$2`, [kind, cur.rows[0].id]);
    }
  } else {
    // إنشاء تصويت
    await pool.query(
      `INSERT INTO public.review_votes(review_id, user_id, kind) VALUES ($1,$2,$3)`,
      [id, user.id, kind]
    );
  }

  // أعِدّ العدادات المحدثة
  const agg = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN kind='helpful'     THEN 1 ELSE 0 END),0)::int AS helpful_count,
       COALESCE(SUM(CASE WHEN kind='not_helpful' THEN 1 ELSE 0 END),0)::int AS not_helpful_count
     FROM public.review_votes WHERE review_id=$1`,
    [id]
  );
  const { helpful_count = 0, not_helpful_count = 0 } = agg.rows[0] || {};

  return NextResponse.json({ ok: true, helpful_count, not_helpful_count });
}
