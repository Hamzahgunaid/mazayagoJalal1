import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { decryptString } from "@/lib/messengerCrypto";
import { normalizeArabicNumerals } from "@/lib/normalizeArabicNumerals";
import { verifyMetaSignature } from "@/lib/meta/webhookSignature";
import { verifyMetaWebhookChallenge } from "@/lib/meta/webhookVerify";

type ContestRow = {
  id: string;
  slug: string;
  rules_json?: any;
};

type TaskRow = {
  id: string;
  kind: string;
  title: string;
  description?: string | null;
  metadata?: any;
  round_id?: string | null;
};

type ThreadRow = {
  contest_id: string | null;
  cursor_index?: number | null;
  current_task_id?: string | null;
  state_json?: any;
  status?: string | null;
  user_id?: string | null;
};

type EntryRow = {
  answer_text?: string | null;
  mcq_option_id?: string | null;
  prediction_winner?: string | null;
  prediction_team_a_score?: number | null;
  prediction_team_b_score?: number | null;
};

function extractRef(evt: any): string | null {
  return evt?.referral?.ref || evt?.postback?.referral?.ref || null;
}

function extractQuickReplyPayload(evt: any): string | null {
  return evt?.message?.quick_reply?.payload || null;
}

function extractText(evt: any): string | null {
  const text = evt?.message?.text;
  return text ? String(text).trim() : null;
}

function maskPsid(psid: string) {
  if (!psid) return "";
  return psid.length <= 6 ? psid : psid.slice(-6);
}

function parseJsonValue(value: any) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function buildPrompt(task: TaskRow) {
  const title = (task.title || "").trim();
  const description = (task.description || "").trim();
  if (title && description) return `${title}\n${description}`;
  return title || "السؤال التالي:";
}

function parseScoreInput(text: string | null, maxGoals: number) {
  if (!text) return null;
  const normalized = normalizeArabicNumerals(text).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > maxGoals) return null;
  return value;
}

function isMcqKind(kind: string) {
  return kind.toUpperCase().includes("MCQ");
}

function isPredictionTask(task: TaskRow) {
  const kind = (task.kind || "").toUpperCase();
  const meta = parseJsonValue(task.metadata) || {};
  return kind === "PREDICTION" || meta.match_prediction === true;
}

function getPredictionMeta(task: TaskRow, rulesJson: any) {
  const metadata = parseJsonValue(task.metadata) || {};
  const rules = parseJsonValue(rulesJson) || {};
  const teamA = String(metadata.teamA || metadata.team_a || rules.teamA || rules.team_a || "الفريق الأول");
  const teamB = String(metadata.teamB || metadata.team_b || rules.teamB || rules.team_b || "الفريق الثاني");
  const allowDraw = metadata.allowDraw ?? metadata.allow_draw;
  const allowDrawResolved = allowDraw === undefined ? true : allowDraw !== false;
  const maxGoalsRaw = Number(metadata.maxGoals ?? rules.maxGoals ?? rules.max_goals);
  const maxGoals = Number.isFinite(maxGoalsRaw) ? Math.max(0, maxGoalsRaw) : 20;
  const predictionMode = String(rules.prediction_mode || "").toUpperCase();
  const requireScoresFlag = metadata.requiresScores ?? metadata.require_scores;
  const requiresScores =
    requireScoresFlag === true
      ? true
      : requireScoresFlag === false
        ? false
        : ["TOURNAMENT", "SCORE", "SCORES"].includes(predictionMode);
  return { teamA, teamB, allowDraw: allowDrawResolved, maxGoals, requiresScores };
}

async function sendToMessenger(pageToken: string, payload: any) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(pageToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    console.error("Send API failed:", res.status, t);
  }
}

async function sendQuickReplies(
  pageToken: string,
  psid: string,
  text: string,
  options: { title: string; payload: string }[],
) {
  return sendToMessenger(pageToken, {
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: {
      text,
      quick_replies: options.map((o) => ({
        content_type: "text",
        title: o.title.slice(0, 20),
        payload: o.payload,
      })),
    },
  });
}

async function sendButtons(
  pageToken: string,
  psid: string,
  text: string,
  buttons: { title: string; url: string }[],
) {
  return sendToMessenger(pageToken, {
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text,
          buttons: buttons.slice(0, 3).map((b) => ({
            type: "web_url",
            title: b.title.slice(0, 20),
            url: b.url,
          })),
        },
      },
    },
  });
}

async function loadPageToken(fbPageId: string) {
  const tokRow = await pool.query(
    `select page_access_token_enc from public.messenger_pages where fb_page_id=$1 and is_active=true limit 1`,
    [fbPageId],
  );
  if (tokRow.rowCount === 0) return null;
  return decryptString(tokRow.rows[0].page_access_token_enc);
}

async function loadPageTokenByContest(contestId: string, fbPageId: string) {
  const hasPlain = await pool.query(
    `select 1
       from information_schema.columns
      where table_schema='public'
        and table_name='messenger_pages'
        and column_name='page_access_token'
      limit 1`,
  );

  if (hasPlain.rowCount > 0) {
    const q = await pool.query(
      `select page_access_token, page_access_token_enc
         from public.messenger_pages
        where contest_id=$1 and fb_page_id=$2 and is_active=true
        limit 1`,
      [contestId, fbPageId],
    );
    if (q.rowCount === 0) return null;
    const enc = q.rows[0].page_access_token_enc;
    if (enc) return decryptString(enc);
    return q.rows[0].page_access_token || null;
  }

  const q = await pool.query(
    `select page_access_token_enc
       from public.messenger_pages
      where contest_id=$1 and fb_page_id=$2 and is_active=true
      limit 1`,
    [contestId, fbPageId],
  );
  if (q.rowCount === 0) return null;
  const enc = q.rows[0].page_access_token_enc;
  return enc ? decryptString(enc) : null;
}

async function loadContestBySlug(slug: string): Promise<ContestRow | null> {
  const q = await pool.query(
    `select id, slug, rules_json from public.contests where slug=$1 limit 1`,
    [slug],
  );
  return q.rowCount ? q.rows[0] : null;
}

async function loadContestById(contestId: string): Promise<ContestRow | null> {
  const q = await pool.query(
    `select id, slug, rules_json from public.contests where id=$1 limit 1`,
    [contestId],
  );
  return q.rowCount ? q.rows[0] : null;
}

async function loadOrderedTasks(contestId: string): Promise<TaskRow[]> {
  const { rows } = await pool.query(
    `
      select t.id, t.kind, t.title, t.description, t.metadata, t.round_id
       from public.contest_tasks t
        left join public.contest_rounds r on r.id = t.round_id
       where t.contest_id=$1
       order by r.position asc nulls last, t.position asc nulls last, t.created_at asc
       limit 1
    `,
    [contestId],
  );
  return rows || [];
}

async function loadMcqOptions(taskId: string) {
  const { rows } = await pool.query(
    `select id, label from public.contest_mcq_options where task_id=$1 order by "position" asc, id asc`,
    [taskId],
  );
  return rows || [];
}

async function loadMcqOptionLabel(taskId: string, optionId: string) {
  const { rows } = await pool.query(
    `select label from public.contest_mcq_options where id=$1 and task_id=$2 limit 1`,
    [optionId, taskId],
  );
  return rows?.[0]?.label ? String(rows[0].label) : null;
}

async function loadExistingEntry(
  contestId: string,
  fbPageId: string,
  psid: string,
  taskId: string,
): Promise<EntryRow | null> {
  const { rows } = await pool.query(
    `
    select answer_text, mcq_option_id, prediction_winner, prediction_team_a_score, prediction_team_b_score
      from public.messenger_entries
     where contest_id=$1 and fb_page_id=$2 and psid=$3 and task_id=$4
     limit 1
    `,
    [contestId, fbPageId, psid, taskId],
  );
  return rows?.[0] ?? null;
}

async function getLinkedUserId(fbPageId: string, psid: string) {
  const q = await pool.query(
    `select user_id from public.messenger_user_links where fb_page_id=$1 and psid=$2 limit 1`,
    [fbPageId, psid],
  );
  return q.rowCount ? (q.rows[0].user_id as string) : null;
}

async function buildExistingAnswer(task: TaskRow, contest: ContestRow, entry: EntryRow) {
  if (isPredictionTask(task)) {
    const meta = getPredictionMeta(task, contest.rules_json);
    const winnerKey = String(entry.prediction_winner || "").toUpperCase();
    let winnerLabel = "";
    if (winnerKey === "TEAM_A") winnerLabel = meta.teamA;
    if (winnerKey === "TEAM_B") winnerLabel = meta.teamB;
    if (winnerKey === "DRAW") winnerLabel = "تعادل";
    if (!winnerLabel && entry.prediction_winner) {
      winnerLabel = String(entry.prediction_winner);
    }

    const parts: string[] = [];
    if (winnerLabel) parts.push(`الفائز: ${winnerLabel}`);
    if (
      Number.isFinite(entry.prediction_team_a_score) &&
      Number.isFinite(entry.prediction_team_b_score)
    ) {
      parts.push(`النتيجة: ${entry.prediction_team_a_score}-${entry.prediction_team_b_score}`);
    }
    return parts.length ? parts.join("، ") : null;
  }

  if (isMcqKind(task.kind)) {
    if (!entry.mcq_option_id) return null;
    const label = await loadMcqOptionLabel(task.id, entry.mcq_option_id);
    return label || null;
  }

  const answer = entry.answer_text ? String(entry.answer_text).trim() : "";
  return answer || null;
}

async function upsertThreadStart(
  fbPageId: string,
  psid: string,
  contestId: string,
  firstTaskId: string | null,
  userId: string | null,
) {
  const { rows } = await pool.query(
    `
    insert into public.messenger_threads
      (contest_id, fb_page_id, psid, cursor_index, current_task_id, status, state_json, created_at, updated_at, user_id)
    values
      ($1, $2, $3, 0, $4, 'ACTIVE', '{}'::jsonb, now(), now(), $5)
    on conflict (contest_id, fb_page_id, psid)
    do update set
      cursor_index = 0,
      current_task_id = excluded.current_task_id,
      status = 'ACTIVE',
      state_json = '{}'::jsonb,
      updated_at = now(),
      user_id = coalesce(excluded.user_id, messenger_threads.user_id)
    returning id, contest_id, fb_page_id, psid, cursor_index, current_task_id, status, updated_at
    `,
    [contestId, fbPageId, psid, firstTaskId, userId],
  );
  return rows[0];
}

async function updateThreadState(
  fbPageId: string,
  psid: string,
  patch: Partial<{
    cursor_index: number | null;
    current_task_id: string | null;
    state_json: any;
    status: string | null;
    user_id: string | null;
  }>,
) {
  const fields: string[] = [];
  const values: any[] = [fbPageId, psid];
  let idx = values.length;
  const addField = (name: string, value: any) => {
    idx += 1;
    fields.push(`${name}=$${idx}`);
    values.push(value);
  };

  if (patch.cursor_index !== undefined) addField("cursor_index", patch.cursor_index);
  if (patch.current_task_id !== undefined) addField("current_task_id", patch.current_task_id);
  if (patch.state_json !== undefined) addField("state_json", JSON.stringify(patch.state_json ?? {}));
  if (patch.status !== undefined) addField("status", patch.status);
  if (patch.user_id !== undefined) addField("user_id", patch.user_id);
  addField("updated_at", new Date().toISOString());
  addField("last_seen_at", new Date().toISOString());

  await pool.query(
    `update public.messenger_threads set ${fields.join(", ")} where fb_page_id=$1 and psid=$2`,
    values,
  );
}

async function sendButtonConfirmation(
  pageToken: string | null,
  psid: string,
  contest: ContestRow,
) {
  if (!pageToken) {
    console.warn(`[messenger] completion skipped: token missing psid=${maskPsid(psid)}`);
    return;
  }

  const detailsUrl = `https://www.mazayago.com/offers/${contest.slug}`;
  const message = "✅ تم تسجيل مشاركتك! اضغط لمشاهدة تفاصيل التحدي.";
  const textMessage = `${message}\nتفاصيل التحدي: ${detailsUrl}`;

  await sendToMessenger(pageToken, {
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: { text: textMessage },
  });
  await sendButtons(pageToken, psid, "تفاصيل التحدي", [
    { title: "عرض تفاصيل التحدي", url: detailsUrl },
  ]);
  console.log(`[messenger] completion sent psid=${maskPsid(psid)} slug=${contest.slug}`);
}

async function sendAlreadyParticipated(
  pageToken: string | null,
  psid: string,
  contest: ContestRow,
  answerText: string | null,
) {
  if (!pageToken) {
    console.warn(`[messenger] already-participated skipped: token missing psid=${maskPsid(psid)}`);
    return;
  }

  const detailsUrl = `https://www.mazayago.com/offers/${contest.slug}`;
  const lines = ["سبق وأن شاركت في هذه المسابقة."];
  if (answerText) lines.push(`إجابتك: ${answerText}`);
  lines.push(`تفاصيل التحدي: ${detailsUrl}`);

  await sendToMessenger(pageToken, {
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: { text: lines.join("\n") },
  });
  await sendButtons(pageToken, psid, "تفاصيل التحدي", [
    { title: "عرض تفاصيل التحدي", url: detailsUrl },
  ]);
}
async function sendTaskPrompt(
  pageToken: string,
  fbPageId: string,
  psid: string,
  contest: ContestRow,
  task: TaskRow,
  cursorIndex: number,
) {
  const prompt = buildPrompt(task);
  const kind = task.kind.toUpperCase();

  if (isPredictionTask(task)) {
    const meta = getPredictionMeta(task, contest.rules_json);
    const state = {
      mode: "PREDICTION",
      step: "pick_winner",
      data: { winner: null, a: null, b: null },
      requiresScores: meta.requiresScores,
      maxGoals: meta.maxGoals,
      teamA: meta.teamA,
      teamB: meta.teamB,
      allowDraw: meta.allowDraw,
    };
    await updateThreadState(fbPageId, psid, {
      cursor_index: cursorIndex,
      current_task_id: task.id,
      state_json: state,
      status: "ACTIVE",
    });

      const options = [
        { title: meta.teamA, payload: "pred:winner:TEAM_A" },
        ...(meta.allowDraw ? [{ title: "تعادل", payload: "pred:winner:DRAW" }] : []),
        { title: meta.teamB, payload: "pred:winner:TEAM_B" },
      ];
    await sendQuickReplies(pageToken, psid, prompt, options);
    return;
  }

  await updateThreadState(fbPageId, psid, {
    cursor_index: cursorIndex,
    current_task_id: task.id,
    state_json: {},
    status: "ACTIVE",
  });

  if (isMcqKind(kind)) {
    const options = await loadMcqOptions(task.id);
    if (options.length === 0) {
      await sendToMessenger(pageToken, {
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: { text: `${prompt}\nأرسل إجابتك الآن.` },
      });
      return;
    }
    await sendQuickReplies(
      pageToken,
      psid,
      prompt,
      options.slice(0, 13).map((opt: any) => ({
        title: String(opt.label || ""),
        payload: `opt:${opt.id}`,
      })),
    );
    return;
  }

  await sendToMessenger(pageToken, {
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: { text: `${prompt}\nأرسل إجابتك الآن.` },
  });
}

async function advanceToNextTask(
  pageToken: string,
  fbPageId: string,
  psid: string,
  contest: ContestRow,
  tasks: TaskRow[],
  nextIndex: number,
  userId: string | null,
) {
  if (nextIndex >= tasks.length) {
    await sendButtonConfirmation(pageToken, psid, contest);
    await updateThreadState(fbPageId, psid, {
      cursor_index: nextIndex,
      current_task_id: null,
      state_json: {},
      status: "COMPLETED",
      user_id: userId ?? undefined,
    });
    return;
  }

  const nextTask = tasks[nextIndex];
  await updateThreadState(fbPageId, psid, {
    cursor_index: nextIndex,
    current_task_id: nextTask.id,
    state_json: {},
    status: "ACTIVE",
    user_id: userId ?? undefined,
  });
  await sendTaskPrompt(pageToken, fbPageId, psid, contest, nextTask, nextIndex);
}

async function handlePredictionStep(params: {
  pageToken: string;
  fbPageId: string;
  psid: string;
  contest: ContestRow;
  task: TaskRow;
  cursorIndex: number;
  state: any;
  quick: string | null;
  text: string | null;
  userId: string | null;
  tasks: TaskRow[];
  rawEvent: any;
}) {
  const { pageToken, fbPageId, psid, contest, task, cursorIndex, state, quick, text, userId, tasks, rawEvent } = params;
  const step = state?.step;
  const teamA = state?.teamA || "الفريق الأول";
  const teamB = state?.teamB || "الفريق الثاني";
  const maxGoalsRaw = Number(state?.maxGoals);
  const maxGoals = Number.isFinite(maxGoalsRaw) ? Math.max(0, maxGoalsRaw) : 20;
  const allowDraw = state?.allowDraw !== false;

  if (step === "pick_winner") {
    if (!quick || !quick.startsWith("pred:winner:")) {
      const options = [
        { title: teamA, payload: "pred:winner:TEAM_A" },
        ...(allowDraw ? [{ title: "تعادل", payload: "pred:winner:DRAW" }] : []),
        { title: teamB, payload: "pred:winner:TEAM_B" },
      ];
      await sendQuickReplies(pageToken, psid, buildPrompt(task), options);
      return true;
    }

    const winner = quick.replace("pred:winner:", "");
    if (!["TEAM_A", "TEAM_B", "DRAW"].includes(winner)) {
      await sendQuickReplies(pageToken, psid, buildPrompt(task), [
        { title: teamA, payload: "pred:winner:TEAM_A" },
        ...(allowDraw ? [{ title: "تعادل", payload: "pred:winner:DRAW" }] : []),
        { title: teamB, payload: "pred:winner:TEAM_B" },
      ]);
      return true;
    }

    if (!state.requiresScores) {
      await pool.query(
        `
        insert into public.messenger_entries
          (contest_id, task_id, round_id, fb_page_id, psid, prediction_winner, status, raw_event, user_id)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [contest.id, task.id, task.round_id, fbPageId, psid, winner, "PENDING_LINK", rawEvent, userId],
      );
      await advanceToNextTask(pageToken, fbPageId, psid, contest, tasks, cursorIndex + 1, userId);
      return true;
    }

    const nextState = {
      ...state,
      step: "score_a",
      data: { ...(state.data || {}), winner },
    };
    await updateThreadState(fbPageId, psid, { state_json: nextState });
    await sendToMessenger(pageToken, {
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: { text: `كم هدف ${teamA}؟ (0 - ${maxGoals})` },
    });
    return true;
  }

  if (step === "score_a") {
    const scoreA = parseScoreInput(text, maxGoals);
    if (scoreA === null) {
      await sendToMessenger(pageToken, {
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: { text: `أدخل رقمًا صحيحًا بين 0 و ${maxGoals} لـ ${teamA}.` },
      });
      return true;
    }

    const nextState = {
      ...state,
      step: "score_b",
      data: { ...(state.data || {}), a: scoreA },
    };
    await updateThreadState(fbPageId, psid, { state_json: nextState });
    await sendToMessenger(pageToken, {
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: { text: `كم هدف ${teamB}؟ (0 - ${maxGoals})` },
    });
    return true;
  }

  if (step === "score_b") {
    const scoreB = parseScoreInput(text, maxGoals);
    if (scoreB === null) {
      await sendToMessenger(pageToken, {
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: { text: `أدخل رقمًا صحيحًا بين 0 و ${maxGoals} لـ ${teamB}.` },
      });
      return true;
    }

    const winner = state?.data?.winner || null;
    const scoreA = state?.data?.a ?? null;
    await pool.query(
      `
      insert into public.messenger_entries
        (contest_id, task_id, round_id, fb_page_id, psid, prediction_winner, prediction_team_a_score, prediction_team_b_score, status, raw_event, user_id)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
      [contest.id, task.id, task.round_id, fbPageId, psid, winner, scoreA, scoreB, "PENDING_LINK", rawEvent, userId],
    );

    await advanceToNextTask(pageToken, fbPageId, psid, contest, tasks, cursorIndex + 1, userId);
    return true;
  }

  return false;
}

export async function handleMetaWebhookGet(req: Request) {
  const challenge = verifyMetaWebhookChallenge(req);
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function processMessengerWebhookPayload(body: any) {
  if (body.object !== "page") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  for (const entry of body.entry ?? []) {
    const fbPageId = String(entry.id || "");
    for (const evt of entry.messaging ?? []) {
      const psid = String(evt.sender?.id || "");
      if (!fbPageId || !psid) continue;

      const ref = extractRef(evt);
      const quick = extractQuickReplyPayload(evt);
      const text = extractText(evt);

      const pageToken = await loadPageToken(fbPageId);
      if (!pageToken) continue;

      if (ref) {
        const contest = await loadContestBySlug(ref);
        if (!contest) continue;
        const linkCheck = await pool.query(
          `select 1 from public.messenger_pages where contest_id=$1 and fb_page_id=$2 and is_active=true limit 1`,
          [contest.id, fbPageId],
        );
        if (linkCheck.rowCount === 0) continue;

        const tasks = await loadOrderedTasks(contest.id);
        const linkedUserId = await getLinkedUserId(fbPageId, psid);
        const firstTaskId = tasks[0]?.id ?? null;
        const threadRow = await upsertThreadStart(fbPageId, psid, contest.id, firstTaskId, linkedUserId);
        if (threadRow) {
          // Acceptance: 1) click m.me link (ref=slug) 2) check logs 3) call owner debug endpoint.
          console.log(
            `[messenger_threads] upsert ok id=${threadRow.id} contest=${threadRow.contest_id} page=${threadRow.fb_page_id} psid=${maskPsid(psid)} cursor=${threadRow.cursor_index} task=${threadRow.current_task_id ?? "null"} status=${threadRow.status}`,
          );
        }

        if (tasks.length === 0) {
          await updateThreadState(fbPageId, psid, { status: "COMPLETED" });
          await sendButtonConfirmation(pageToken, psid, contest);
          continue;
        }

        const task = tasks[0];
        const existingEntry = await loadExistingEntry(contest.id, fbPageId, psid, task.id);
        if (existingEntry) {
          const answerText = await buildExistingAnswer(task, contest, existingEntry);
          await updateThreadState(fbPageId, psid, {
            cursor_index: tasks.length,
            current_task_id: null,
            state_json: {},
            status: "COMPLETED",
            user_id: linkedUserId ?? undefined,
          });
          await sendAlreadyParticipated(pageToken, psid, contest, answerText);
          continue;
        }

        await sendTaskPrompt(pageToken, fbPageId, psid, contest, task, 0);
        continue;
      }

      const threadRes = await pool.query(
        `select contest_id, cursor_index, current_task_id, state_json, status, user_id
           from public.messenger_threads
          where fb_page_id=$1 and psid=$2
          order by updated_at desc nulls last, last_seen_at desc nulls last
          limit 1`,
        [fbPageId, psid],
      );
      if (threadRes.rowCount === 0) continue;
      const thread = threadRes.rows[0] as ThreadRow;
      if (!thread.contest_id) continue;

      const contest = await loadContestById(thread.contest_id);
      if (!contest) continue;
      const tasks = await loadOrderedTasks(contest.id);
      if (tasks.length === 0) {
        await updateThreadState(fbPageId, psid, { status: "COMPLETED" });
        await sendButtonConfirmation(pageToken, psid, contest);
        continue;
      }

      let cursorIndex = thread.cursor_index ?? 0;
      if (cursorIndex < 0) cursorIndex = 0;
      const task = tasks[cursorIndex];
      if (!task) {
        await updateThreadState(fbPageId, psid, {
          status: "COMPLETED",
          cursor_index: tasks.length,
          current_task_id: null,
          state_json: {},
        });
        await sendButtonConfirmation(pageToken, psid, contest);
        continue;
      }

      let userId = thread.user_id || null;
      if (!userId) {
        const linked = await getLinkedUserId(fbPageId, psid);
        if (linked) {
          userId = linked;
          await updateThreadState(fbPageId, psid, { user_id: linked });
        }
      }

      if (thread.status && thread.status.toUpperCase() === "COMPLETED") {
        await sendButtonConfirmation(pageToken, psid, contest);
        continue;
      }

      const state = parseJsonValue(thread.state_json) || {};
      if (isPredictionTask(task)) {
        if (state?.mode === "PREDICTION") {
          const handled = await handlePredictionStep({
            pageToken,
            fbPageId,
            psid,
            contest,
            task,
            cursorIndex,
            state,
            quick,
            text,
            userId,
            tasks,
            rawEvent: evt,
          });
          if (handled) continue;
        }

        await sendTaskPrompt(pageToken, fbPageId, psid, contest, task, cursorIndex);
        continue;
      }

      if (isMcqKind(task.kind)) {
        const options = await loadMcqOptions(task.id);
        if (!quick || !quick.startsWith("opt:")) {
          if (options.length > 0) {
            await sendQuickReplies(
              pageToken,
              psid,
              buildPrompt(task),
              options.slice(0, 13).map((opt: any) => ({
                title: String(opt.label || ""),
                payload: `opt:${opt.id}`,
              })),
            );
          }
          continue;
        }

        const mcqOptionId = quick.slice(4);
        let isCorrect: boolean | null = null;
        if (mcqOptionId) {
          const oc = await pool.query(
            `select is_correct from public.contest_mcq_options where id=$1 and task_id=$2 limit 1`,
            [mcqOptionId, task.id],
          );
          if (oc.rowCount) isCorrect = !!oc.rows[0].is_correct;
        }

        await pool.query(
          `
          insert into public.messenger_entries
            (contest_id, task_id, round_id, fb_page_id, psid, mcq_option_id, is_correct, raw_event, user_id)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          `,
          [contest.id, task.id, task.round_id, fbPageId, psid, mcqOptionId, isCorrect, evt, userId],
        );

        await advanceToNextTask(pageToken, fbPageId, psid, contest, tasks, cursorIndex + 1, userId);
        continue;
      }

      if (!text) {
        await sendToMessenger(pageToken, {
          recipient: { id: psid },
          messaging_type: "RESPONSE",
          message: { text: `${buildPrompt(task)}\nأرسل إجابتك الآن.` },
        });
        continue;
      }

      await pool.query(
        `
        insert into public.messenger_entries
          (contest_id, task_id, round_id, fb_page_id, psid, answer_text, raw_event, user_id)
        values ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [contest.id, task.id, task.round_id, fbPageId, psid, text, evt, userId],
      );

      await advanceToNextTask(pageToken, fbPageId, psid, contest, tasks, cursorIndex + 1, userId);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function handleMessengerWebhookPost(req: Request) {
  const ab = await req.arrayBuffer();
  const rawBody = Buffer.from(ab);

  const sig = req.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, sig)) {
    return new NextResponse("Bad signature", { status: 401 });
  }

  const body = JSON.parse(rawBody.toString("utf8"));
  return processMessengerWebhookPayload(body);
}
