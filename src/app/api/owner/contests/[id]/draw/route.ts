
import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "../../../_helpers";
import { getContestAccessById } from "@/lib/auth/contestAccess";

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const { user, response } = await requireUser(); if (response) return response;
  const access = await getContestAccessById({ contestId: params.id, user });
  if (!access.ok || !access.canReviewEntries) {
    return NextResponse.json({ error: "FORBIDDEN", code: "FORBIDDEN" }, { status: 403 });
  }
  const b = await req.json().catch(() => ({}));
  const contestId = params.id;
  const seedRevealInput = typeof b.seed_reveal === "string" ? b.seed_reveal : null;
  const externalEntropy = typeof b.external_entropy === "string" ? b.external_entropy : null;
  const takeRaw = Number(b.take);
  const take = Number.isFinite(takeRaw) && takeRaw >= 0 ? Math.trunc(takeRaw) : 1;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);

    let seedReveal = seedRevealInput;
    const { rows: seedColumnRows } = await client.query(
      `SELECT 1
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'contests'
          AND column_name = 'seed_commit'
        LIMIT 1`,
    );
    const hasSeedCommit = seedColumnRows.length > 0;
    if (hasSeedCommit) {
      await client.query(
        `UPDATE public.contests
            SET seed_commit = rules_json->>'seed_commit'
          WHERE id = $1
            AND seed_commit IS NULL
            AND rules_json ? 'seed_commit'`,
        [contestId],
      );
      if (take > 0 && !seedReveal) {
        seedReveal = typeof randomUUID === "function" ? randomUUID() : `${Date.now()}-${Math.random()}`;
      }
      const commit = seedReveal ? createHash("sha256").update(seedReveal).digest("hex") : null;
      const { rows: contestRows } = await client.query(
        `UPDATE public.contests
            SET seed_commit = COALESCE(NULLIF(seed_commit, ''), $2)
          WHERE id = $1
          RETURNING seed_commit`,
        [contestId, commit],
      );
      if (!contestRows.length) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: "Contest not found" }, { status: 404 });
      }
      if (take > 0 && !contestRows[0]?.seed_commit) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: "seed_commit not set on contest" }, { status: 400 });
      }
    } else {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: "Database is missing contests.seed_commit. Apply the seed_commit migration before drawing." },
        { status: 500 },
      );
    }

    await client.query(`SELECT public.publish_winners($1, $2, $3, $4)`, [contestId, seedReveal, externalEntropy, take]);
    const { rows: winnerRows } = await client.query(
      `SELECT *
        FROM public.contest_winners
        WHERE contest_id = $1 AND published = TRUE
        ORDER BY published_at DESC NULLS LAST, decided_at DESC`,
      [contestId],
    );
    const { rows: proofRows } = await client.query(
      `SELECT public_proof
         FROM public.contest_winners
        WHERE contest_id = $1 AND published = TRUE
        ORDER BY published_at DESC NULLS LAST, decided_at DESC
        LIMIT 1`,
      [contestId],
    );
    await client.query('COMMIT');
    return NextResponse.json({
      published: true,
      has_published_winners: true,
      count: winnerRows.length,
      winners: winnerRows,
      public_proof: proofRows[0]?.public_proof ?? null,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    const message = String(error?.message || error);
    if (message.includes('seed_reveal does not match seed_commit')) {
      return NextResponse.json(
        { error: 'Seed reveal does not match seed commit. Cannot publish.' },
        { status: 400 },
      );
    }
    if (message.includes('Contest configuration is locked after winners are published')) {
      return NextResponse.json({ error: 'Contest is locked after winners are published.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to draw winners', detail: message }, { status: 500 });
  } finally {
    client.release();
  }
}
