export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { resolveAndParseFacebookPostUrl } from '@/lib/meta/resolveAndParsePostUrl';
import { decryptString } from '@/lib/messengerCrypto';

type CommentInputMode = 'MCQ' | 'TEXT' | 'MEDIA' | 'MEDIA_ONLY' | 'TEXT_OR_MEDIA' | 'OPTION_LIST' | 'IMAGE_ONLY' | 'TEXT_OR_IMAGE';

const INPUT_MODES: CommentInputMode[] = ['MCQ', 'TEXT', 'MEDIA_ONLY', 'TEXT_OR_MEDIA', 'OPTION_LIST', 'IMAGE_ONLY', 'TEXT_OR_IMAGE'];

function normalizeInputMode(mode: string): CommentInputMode {
  const upper = mode.toUpperCase();
  if (upper === 'OPTION_LIST') return 'MCQ';
  if (upper === 'IMAGE_ONLY') return 'MEDIA_ONLY';
  if (upper === 'MEDIA') return 'MEDIA_ONLY';
  if (upper === 'TEXT_OR_IMAGE') return 'TEXT_OR_MEDIA';
  if (upper === 'MCQ' || upper === 'TEXT' || upper === 'MEDIA_ONLY' || upper === 'TEXT_OR_MEDIA') return upper;
  return 'TEXT';
}


function toDbCommentInputMode(mode: CommentInputMode): 'MCQ' | 'TEXT' | 'MEDIA' | 'TEXT_OR_MEDIA' {
  if (mode === 'MEDIA_ONLY') return 'MEDIA';
  if (mode === 'MCQ' || mode === 'TEXT' || mode === 'TEXT_OR_MEDIA') return mode;
  return 'TEXT';
}

function normalizeStoredMode(mode: string): CommentInputMode {
  return normalizeInputMode(mode);
}

async function requireContestOwner(contestId: string) {
  const user = await currentUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }

  const q = await pool.query(
    `select id from public.contests where id=$1 and created_by_user_id=$2 limit 1`,
    [contestId, user.id],
  );
  if (q.rowCount === 0) {
    return { response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }

  return { response: null as NextResponse | null };
}

function parseAllowedOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => String(option || '').trim())
    .filter(Boolean)
    .slice(0, 50);
}

function deriveModeFlags(mode: CommentInputMode) {
  if (mode === 'MEDIA_ONLY') {
    return { allow_media_only: true, require_text: false };
  }
  if (mode === 'TEXT_OR_MEDIA') {
    return { allow_media_only: false, require_text: false };
  }
  return { allow_media_only: false, require_text: true };
}

async function loadMcqTaskOptions(contestId: string) {
  const { rows } = await pool.query(
    `
    select t.id as task_id,
           t.title,
           json_agg(
             json_build_object('id', o.id, 'label', o.label, 'position', o.position)
             order by o.position asc nulls last, o.created_at asc, o.id asc
           ) as options
      from public.contest_tasks t
      join public.contest_mcq_options o on o.task_id=t.id
     where t.contest_id=$1
     group by t.id, t.title
     order by t.created_at asc, t.id asc
    `,
    [contestId],
  );
  return rows;
}

async function resolveAllowedOptionsStorage() {
  const q = await pool.query(
    `
    select data_type, udt_name
      from information_schema.columns
     where table_schema='public'
       and table_name='facebook_comment_sources'
       and column_name='allowed_options'
     limit 1
    `,
  );

  const row = q.rows[0] || {};
  const dataType = String(row.data_type || '').toLowerCase();
  const udtName = String(row.udt_name || '').toLowerCase();
  if (udtName === '_text' || dataType === 'array') {
    return {
      value: (options: string[]) => options,
      cast: 'text[]' as const,
    };
  }

  return {
    value: (options: string[]) => JSON.stringify(options),
    cast: 'jsonb' as const,
  };
}

async function hasRoundIdColumnInCommentSources() {
  const q = await pool.query(
    `
    select 1
      from information_schema.columns
     where table_schema='public'
       and table_name='facebook_comment_sources'
       and column_name='round_id'
     limit 1
    `,
  );
  return q.rowCount > 0;
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const contestId = ctx.params?.id;
  if (!contestId) {
    return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });
  }

  const { response } = await requireContestOwner(contestId);
  if (response) return response;

  const [configRes, mcqTasks] = await Promise.all([
    pool.query(
      `
      select contest_id, fb_page_id, fb_post_id, is_active, comment_input_mode,
             task_id, allowed_options, allow_multiple_answers, max_answers_per_user,
             allow_replies, allow_media_only, require_text, require_regex, created_at, updated_at
        from public.facebook_comment_sources
       where contest_id=$1
       limit 1
      `,
      [contestId],
    ),
    loadMcqTaskOptions(contestId),
  ]);

  const data = configRes.rowCount ? { ...configRes.rows[0], comment_input_mode: normalizeStoredMode(String(configRes.rows[0].comment_input_mode || 'TEXT')) } : null;

  return NextResponse.json({
    ok: true,
    data,
    mcq_tasks: mcqTasks,
  });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const contestId = ctx.params?.id;
  if (!contestId) {
    return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });
  }

  const { response } = await requireContestOwner(contestId);
  if (response) return response;

  const body = await req.json().catch(() => null);

  const postUrl = String(body?.post_url || '').trim();
  let fbPostId = String(body?.fb_post_id || '').trim();
  const isActive = body?.is_active !== false;
  const mode = normalizeInputMode(String(body?.comment_input_mode || 'TEXT'));
  const taskId = body?.task_id ? String(body.task_id) : null;
  const allowedOptions = parseAllowedOptions(body?.allowed_options);
  const allowMultipleAnswers = body?.allow_multiple_answers === true;
  const maxAnswersPerUserRaw = Number(body?.max_answers_per_user ?? 1);
  const maxAnswersPerUser =
    allowMultipleAnswers && Number.isFinite(maxAnswersPerUserRaw)
      ? Math.max(1, Math.min(100, Math.floor(maxAnswersPerUserRaw)))
      : 1;
  const allowReplies = body?.allow_replies === true;

  if (!INPUT_MODES.includes(mode)) {
    return NextResponse.json({ error: 'Invalid comment_input_mode' }, { status: 400 });
  }

  const messengerRes = await pool.query(
    `select fb_page_id, page_access_token_enc from public.messenger_pages where contest_id=$1 and is_active=true limit 1`,
    [contestId],
  );
  const fbPageId = messengerRes.rowCount ? String(messengerRes.rows[0].fb_page_id || '') : '';
  const pageTokenEnc = messengerRes.rowCount ? String(messengerRes.rows[0].page_access_token_enc || '') : '';
  let pageToken = '';
  try {
    pageToken = pageTokenEnc ? decryptString(pageTokenEnc) : '';
  } catch {
    pageToken = '';
  }

  if (postUrl) {
    const { parsed } = await resolveAndParseFacebookPostUrl(postUrl, fbPageId || null, pageToken || null);
    if (!parsed?.fb_post_id) {
      return NextResponse.json(
        { error: 'Could not parse Facebook Post URL. Paste a direct post/permalink/share link.' },
        { status: 400 },
      );
    }
    if (parsed.pageId !== fbPageId) {
      return NextResponse.json({ error: 'Post URL page does not match connected page' }, { status: 400 });
    }
    fbPostId = parsed.fb_post_id;
  }

  if (fbPostId && !fbPostId.startsWith(`${fbPageId}_`)) {
    return NextResponse.json({ error: 'Post id page prefix does not match connected page' }, { status: 400 });
  }

  if (isActive && (!fbPageId || !fbPostId)) {
    return NextResponse.json({ error: 'Connect active messenger page and choose fb_post_id first' }, { status: 400 });
  }
  const resolved = { taskId: null as string | null, roundId: null as string | null };

  if (taskId) {
    const taskCheck = await pool.query(
      `
      select t.id,
             t.round_id,
             exists (select 1 from public.contest_mcq_options o where o.task_id=t.id) as has_mcq_options
        from public.contest_tasks t
       where t.id=$1
         and t.contest_id=$2
       limit 1
      `,
      [taskId, contestId],
    );
    if (taskCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Invalid task_id for contest' }, { status: 400 });
    }

    const row = taskCheck.rows[0];
    const hasMcqOptions = row?.has_mcq_options === true;
    if (mode === 'MCQ' && !hasMcqOptions && allowedOptions.length === 0) {
      return NextResponse.json({ error: 'Invalid task_id for contest MCQ mapping' }, { status: 400 });
    }

    resolved.taskId = String(row.id);
    resolved.roundId = row.round_id ? String(row.round_id) : null;
  } else {
    const fallbackTaskRes = await pool.query(
      `
      select t.id,
             t.round_id,
             exists (select 1 from public.contest_mcq_options o where o.task_id=t.id) as has_mcq_options
        from public.contest_tasks t
       where t.contest_id=$1
       order by (t.round_id is null) asc,
                t.position asc nulls last,
                t.created_at asc,
                t.id asc
       limit 1
      `,
      [contestId],
    );

    if (fallbackTaskRes.rowCount > 0) {
      const fallback = fallbackTaskRes.rows[0];
      resolved.taskId = String(fallback.id);
      resolved.roundId = fallback.round_id ? String(fallback.round_id) : null;
    }
  }

  const resolvedTaskId = resolved.taskId;
  const resolvedRoundId = resolved.roundId;

  if (mode === 'MCQ' && !resolvedTaskId && allowedOptions.length === 0) {
    return NextResponse.json(
      { error: 'OPTION_LIST mode requires task_id or non-empty allowed_options' },
      { status: 400 },
    );
  }

  const flags = deriveModeFlags(mode);
  const dbMode = toDbCommentInputMode(mode);
  const allowedOptionsStorage = await resolveAllowedOptionsStorage();
  const hasRoundIdColumn = await hasRoundIdColumnInCommentSources();
  const allowedOptionsValue = allowedOptionsStorage.value(allowedOptions);
  const allowedOptionsCastExpr = allowedOptionsStorage.cast === 'text[]' ? '$7::text[]' : '$7::jsonb';

  const updateQuery = hasRoundIdColumn
    ? `
    update public.facebook_comment_sources
       set fb_page_id=$2,
           fb_post_id=$3,
           is_active=$4,
           comment_input_mode=$5,
           task_id=$6,
           allowed_options=${allowedOptionsCastExpr},
           allow_multiple_answers=$8,
           max_answers_per_user=$9,
           allow_replies=$10,
           allow_media_only=$11,
           require_text=$12,
           round_id=$13,
           updated_at=now()
     where contest_id=$1
    `
    : `
    update public.facebook_comment_sources
       set fb_page_id=$2,
           fb_post_id=$3,
           is_active=$4,
           comment_input_mode=$5,
           task_id=$6,
           allowed_options=${allowedOptionsCastExpr},
           allow_multiple_answers=$8,
           max_answers_per_user=$9,
           allow_replies=$10,
           allow_media_only=$11,
           require_text=$12,
           updated_at=now()
     where contest_id=$1
    `;

  const updateParams = hasRoundIdColumn
    ? [
        contestId,
        fbPageId,
        fbPostId,
        isActive,
        dbMode,
        resolvedTaskId,
        allowedOptionsValue,
        allowMultipleAnswers,
        maxAnswersPerUser,
        allowReplies,
        flags.allow_media_only,
        flags.require_text,
        resolvedRoundId,
      ]
    : [
        contestId,
        fbPageId,
        fbPostId,
        isActive,
        dbMode,
        resolvedTaskId,
        allowedOptionsValue,
        allowMultipleAnswers,
        maxAnswersPerUser,
        allowReplies,
        flags.allow_media_only,
        flags.require_text,
      ];

  const updateRes = await pool.query(
    updateQuery,
    updateParams,
  );

  if (updateRes.rowCount === 0) {
    const insertQuery = hasRoundIdColumn
      ? `
      insert into public.facebook_comment_sources
        (contest_id, fb_page_id, fb_post_id, is_active, comment_input_mode, task_id,
         allowed_options, allow_multiple_answers, max_answers_per_user, allow_replies,
         allow_media_only, require_text, round_id, created_at, updated_at)
      values
        ($1,$2,$3,$4,$5,$6,${allowedOptionsCastExpr},$8,$9,$10,$11,$12,$13,now(),now())
      `
      : `
      insert into public.facebook_comment_sources
        (contest_id, fb_page_id, fb_post_id, is_active, comment_input_mode, task_id,
         allowed_options, allow_multiple_answers, max_answers_per_user, allow_replies,
         allow_media_only, require_text, created_at, updated_at)
      values
        ($1,$2,$3,$4,$5,$6,${allowedOptionsCastExpr},$8,$9,$10,$11,$12,now(),now())
      `;

    const insertParams = hasRoundIdColumn
      ? [
          contestId,
          fbPageId,
          fbPostId,
          isActive,
          dbMode,
          resolvedTaskId,
          allowedOptionsValue,
          allowMultipleAnswers,
          maxAnswersPerUser,
          allowReplies,
          flags.allow_media_only,
          flags.require_text,
          resolvedRoundId,
        ]
      : [
          contestId,
          fbPageId,
          fbPostId,
          isActive,
          dbMode,
          resolvedTaskId,
          allowedOptionsValue,
          allowMultipleAnswers,
          maxAnswersPerUser,
          allowReplies,
          flags.allow_media_only,
          flags.require_text,
        ];

    await pool.query(insertQuery, insertParams);
  }

  const result = await pool.query(
    `
    select contest_id, fb_page_id, fb_post_id, is_active, comment_input_mode,
           task_id, allowed_options, allow_multiple_answers, max_answers_per_user,
           allow_replies, allow_media_only, require_text, require_regex, created_at, updated_at
      from public.facebook_comment_sources
     where contest_id=$1
     limit 1
    `,
    [contestId],
  );

  const row = result.rows[0] ? { ...result.rows[0], comment_input_mode: normalizeStoredMode(String(result.rows[0].comment_input_mode || 'TEXT')) } : null;
  return NextResponse.json({ ok: true, data: row });
}
