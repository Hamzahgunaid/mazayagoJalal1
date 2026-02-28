
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";
import crypto from "crypto";

const CODE_PEPPER = process.env.RATEVERSE_CODE_PEPPER || process.env.CODE_PEPPER || "rateverse-pepper";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();

  const rawCodeInput =
    (typeof b.code_hash === "string" && b.code_hash.trim()) ||
    (typeof b.code === "string" && b.code.trim()) ||
    "";
  let codeHashBuffer: Buffer | null = null;
  const predictionScores = b?.prediction_scores || null;
  const normalizeScore = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Math.trunc(Number(value));
    }
    return null;
  };
  const predictionTeamAScore = normalizeScore(predictionScores?.team_a);
  const predictionTeamBScore = normalizeScore(predictionScores?.team_b);
  const predictionWinner =
    typeof b?.prediction_winner === "string" && b.prediction_winner.trim()
      ? b.prediction_winner.trim().toLowerCase()
      : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const contestRes = await client.query(
      `SELECT per_user_limit FROM public.contests WHERE id=$1 FOR UPDATE`,
      [params.id]
    );
    if (!contestRes.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const currentLimit = contestRes.rows[0]?.per_user_limit ?? 1;
    const tasksRes = await client.query(
      `SELECT COUNT(*)::int AS c FROM public.contest_tasks WHERE contest_id=$1`,
      [params.id]
    );
    const tasksCount = tasksRes.rows[0]?.c ?? 0;
    const desiredLimit =
      tasksCount > currentLimit ? tasksCount : currentLimit;
    if (desiredLimit > currentLimit) {
      await client.query(
        `UPDATE public.contests SET per_user_limit = $2 WHERE id=$1`,
        [params.id, desiredLimit]
      );
    }
    const normalizedTaskId =
      b.task_id && typeof b.task_id === "string" ? b.task_id : b.task_id ? String(b.task_id) : null;
    if (normalizedTaskId) {
      const duplicate = await client.query(
        `SELECT 1 FROM public.contest_entries WHERE contest_id=$1 AND user_id=$2 AND task_id=$3 LIMIT 1`,
        [params.id, u.id, normalizedTaskId]
      );
      if (duplicate.rowCount > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "TASK_ALREADY_SUBMITTED", message: "You already submitted this task." },
          { status: 400 }
        );
      }
    }

    if (rawCodeInput) {
      codeHashBuffer = crypto.createHash("sha256").update(rawCodeInput + CODE_PEPPER).digest();
      const codeRes = await client.query(
        `SELECT id, max_redemptions, redemptions_count, expires_at
           FROM public.contest_codes
          WHERE contest_id = $1 AND code_hash = $2
          FOR UPDATE`,
        [params.id, codeHashBuffer]
      );

      if (!codeRes.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "INVALID_CODE", message: "The code you entered is not valid for this offer." },
          { status: 400 }
        );
      }

      const row = codeRes.rows[0];
      const remaining = Number(row.max_redemptions || 1) - Number(row.redemptions_count || 0);
      if (remaining <= 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "CODE_ALREADY_USED", message: "This code has already been used." },
          { status: 400 }
        );
      }

      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "CODE_EXPIRED", message: "This code is no longer valid." },
          { status: 400 }
        );
      }
    }

    const insertRes = await client.query(
      `
        INSERT INTO public.contest_entries
          (contest_id, user_id, entry_type, task_id, round_id, answer_text, mcq_option_id, code_submitted, code_hash, asset_url, evidence_image_url, prediction_team_a_score, prediction_team_b_score, prediction_winner, status)
        VALUES
          ($1,$2,$3::public.contest_type,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'PENDING')
        RETURNING *
      `,
      [
        params.id,
        u.id,
        b.entry_type,
        normalizedTaskId || null,
        b.round_id || null,
        b.answer_text || null,
        b.mcq_option_id || null,
        rawCodeInput || null,
        codeHashBuffer,
        b.asset_url || null,
        b.evidence_image_url || null,
        predictionTeamAScore,
        predictionTeamBScore,
        predictionWinner,
      ]
    );

    await client.query("COMMIT");
    return NextResponse.json(insertRes.rows[0], { status: 201 });
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error?.message || "Unable to submit entry." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
