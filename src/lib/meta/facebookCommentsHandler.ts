import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '@/lib/db';
import { decryptString } from '@/lib/messengerCrypto';

type CommentInputMode = 'MCQ' | 'TEXT' | 'MEDIA_ONLY' | 'TEXT_OR_MEDIA' | 'OPTION_LIST' | 'IMAGE_ONLY' | 'TEXT_OR_IMAGE';

type SourceRow = {
  contest_id: string;
  fb_page_id: string;
  fb_post_id: string;
  is_active: boolean;
  comment_input_mode: CommentInputMode;
  task_id: string | null;
  allowed_options: unknown;
  allow_multiple_answers: boolean;
  max_answers_per_user: number;
  allow_replies: boolean;
  allow_media_only: boolean;
  require_text: boolean;
};

const R2_BUCKET = process.env.R2_BUCKET || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE || '';

const s3 =
  R2_BUCKET && R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: 'auto',
        endpoint: R2_ENDPOINT,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      })
    : null;


function parseAllowedOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeMode(mode: string): CommentInputMode {
  const upper = String(mode || '').toUpperCase();
  if (upper === 'OPTION_LIST') return 'MCQ';
  if (upper === 'IMAGE_ONLY') return 'MEDIA_ONLY';
  if (upper === 'MEDIA') return 'MEDIA_ONLY';
  if (upper === 'TEXT_OR_IMAGE') return 'TEXT_OR_MEDIA';
  if (upper === 'MCQ' || upper === 'TEXT' || upper === 'MEDIA_ONLY' || upper === 'TEXT_OR_MEDIA') return upper;
  return 'TEXT';
}

function normalizeComparableText(value: string) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[ـ]/g, '')
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ى]/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeCommentOptionValue(text: string) {
  const normalized = normalizeComparableText(text);
  const compact = normalized.replace(/\s+/g, '');
  const letterMap: Record<string, number> = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
    F: 6,
    G: 7,
    H: 8,
  };

  const toIndex = (token: string): number | null => {
    if (!token) return null;
    if (letterMap[token]) return letterMap[token];
    const numeric = Number(token);
    if (Number.isFinite(numeric) && numeric >= 1) return Math.floor(numeric);
    return null;
  };

  const direct = toIndex(compact);
  if (direct) return { index: direct, normalized: String(direct) };

  // Handle common formats like: "اختياري 2" or "الجواب B"
  for (const token of normalized.split(' ').filter(Boolean)) {
    const idx = toIndex(token);
    if (idx) return { index: idx, normalized: String(idx) };
  }

  return { index: null as number | null, normalized };
}


function matchOptionLabel(inputText: string, optionLabel: string) {
  const normalizedInput = normalizeComparableText(inputText);
  const normalizedLabel = normalizeComparableText(optionLabel);
  if (!normalizedInput || !normalizedLabel) return false;

  if (normalizedInput === normalizedLabel) return true;

  const compactInput = normalizedInput.replace(/\s+/g, '');
  const compactLabel = normalizedLabel.replace(/\s+/g, '');
  if (compactInput === compactLabel) return true;

  const inputWords = normalizedInput.split(' ').filter(Boolean);
  if (inputWords.includes(normalizedLabel)) return true;

  // Accept comments that contain the option label with extra context
  // e.g. "جوابي شملان" or "اختياري: A"
  if (normalizedInput.includes(normalizedLabel) && normalizedLabel.length >= 2) return true;

  return false;
}

function extractAttachmentUrl(attachment: any): string | null {
  if (!attachment || typeof attachment !== 'object') return null;
  const mediaUrl = attachment?.media?.image?.src || attachment?.media?.source || attachment?.url;
  if (mediaUrl && typeof mediaUrl === 'string') return mediaUrl;
  const nested = attachment?.subattachments?.data;
  if (Array.isArray(nested)) {
    for (const item of nested) {
      const u = extractAttachmentUrl(item);
      if (u) return u;
    }
  }
  return null;
}

async function loadPageToken(contestId: string, fbPageId: string) {
  const q = await pool.query(
    `
    select page_access_token_enc
      from public.messenger_pages
     where contest_id=$1
       and fb_page_id=$2
       and is_active=true
     limit 1
    `,
    [contestId, fbPageId],
  );
  if (q.rowCount === 0) return null;
  const enc = q.rows[0].page_access_token_enc;
  return enc ? decryptString(enc) : null;
}

async function fetchCommentDetails(commentId: string, pageToken: string) {
  const params = new URLSearchParams({
    fields: 'from,message,attachment,created_time,parent',
    access_token: pageToken,
  });
  const response = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(commentId)}?${params.toString()}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch comment details (${response.status}): ${detail}`);
  }
  return response.json();
}

async function uploadAttachmentToR2(remoteUrl: string, fbPageId: string, commentId: string) {
  if (!s3 || !R2_PUBLIC_BASE) return null;
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Failed to download attachment (${response.status})`);
  }
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await response.arrayBuffer());
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const ext = contentType.includes('/') ? contentType.split('/').pop() : 'bin';
  const safeExt = (ext || 'bin').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() || 'bin';
  const key = `uploads/facebook-comments/${new Date().toISOString().slice(0, 10)}/${fbPageId}-${commentId}-${randomUUID()}.${safeExt}`;

  const putResult = await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return {
    key,
    url: `${R2_PUBLIC_BASE}/${key}`,
    etag: putResult.ETag || null,
    sizeBytes: buffer.byteLength,
    sha256,
  };
}



async function storeWebhookAuditEvent(params: {
  objectType: string;
  pageId: string;
  eventType: string;
  contestId?: string | null;
  fbPostId?: string | null;
  fbCommentId?: string | null;
  fbUserId?: string | null;
  status?: string | null;
}) {
  await pool.query(
    `
    insert into public.meta_webhook_events (object, page_id, event_type, payload, received_at)
    values ($1,$2,$3,$4::jsonb,now())
    `,
    [
      params.objectType,
      params.pageId || null,
      params.eventType,
      JSON.stringify({
        contest_id: params.contestId || null,
        fb_post_id: params.fbPostId || null,
        fb_comment_id: params.fbCommentId || null,
        fb_user_id: params.fbUserId ? String(params.fbUserId).slice(-8) : null,
        status: params.status || null,
      }),
    ],
  );
  await pool.query(
    `
    delete from public.meta_webhook_events
     where id in (
       select id
         from public.meta_webhook_events
        order by received_at desc
        offset 50
     )
    `,
  );
}

async function mapOptionListAnswer(source: SourceRow, messageText: string | null) {
  const input = (messageText || '').trim();
  if (!input) return { status: 'DISQUALIFIED', reason: 'Missing option input' };

  if (source.task_id) {
    const { rows } = await pool.query(
      `
      select id, label, is_correct,
             row_number() over (order by position asc nulls last, created_at asc, id asc) as ordinal
        from public.contest_mcq_options
       where task_id=$1
      `,
      [source.task_id],
    );
    if (rows.length > 0) {
      const normalized = normalizeCommentOptionValue(input);
      const target = rows.find((row: any) => {
        if (normalized.index && Number(row.ordinal) === normalized.index) return true;
        return matchOptionLabel(input, String(row.label || ''));
      });
      if (!target) return { status: 'DISQUALIFIED', reason: 'Invalid option value' };
      return {
        status: 'PENDING',
        mcq_option_id: String(target.id),
        is_correct: target.is_correct === null || target.is_correct === undefined ? null : !!target.is_correct,
        answer_text: String(target.label || ''),
      };
    }
  }

  const fallback = parseAllowedOptions(source.allowed_options);
  if (fallback.length === 0) return { status: 'DISQUALIFIED', reason: 'No options configured' };
  const normalized = normalizeCommentOptionValue(input);
  let mapped: string | null = null;
  if (normalized.index) {
    mapped = fallback[normalized.index - 1] || null;
  } else {
    mapped = fallback.find((opt) => matchOptionLabel(input, opt)) || null;
  }
  if (!mapped) return { status: 'DISQUALIFIED', reason: 'Invalid option value' };
  return { status: 'PENDING', answer_text: mapped };
}


export async function processFacebookCommentsWebhookPayload(payload: any) {
  if (payload?.object !== 'page') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  for (const entry of payload.entry ?? []) {
    const fbPageId = String(entry?.id || '');
    for (const change of entry?.changes ?? []) {
      if (change?.field !== 'feed') continue;
      const value = change?.value || {};
      if (value?.item !== 'comment' || value?.verb !== 'add') continue;

      const fbPostId = String(value?.post_id || '').trim();
      const fbCommentId = String(value?.comment_id || value?.id || '').trim();
      const initialUserId = String(value?.from?.id || '').trim();
      const initialMessage = value?.message ? String(value.message) : null;
      const parentRaw = value?.parent_id ? String(value.parent_id) : null;
      const fbParentCommentId = parentRaw && parentRaw !== fbPostId ? parentRaw : null;

      if (!fbPostId || !fbCommentId) continue;

      const exists = await pool.query(
        `select 1 from public.facebook_comment_entries where fb_comment_id=$1 limit 1`,
        [fbCommentId],
      );
      if (exists.rowCount > 0) continue;

      const sourceRes = await pool.query(
        `
        select contest_id, fb_page_id, fb_post_id, is_active, comment_input_mode,
               task_id, allowed_options, allow_multiple_answers, max_answers_per_user,
               allow_replies, allow_media_only, require_text
          from public.facebook_comment_sources
         where fb_page_id=$1
           and fb_post_id=$2
           and is_active=true
         limit 1
        `,
        [fbPageId, fbPostId],
      );
      if (sourceRes.rowCount === 0) continue;

      const source = sourceRes.rows[0] as SourceRow;
      source.comment_input_mode = normalizeMode(source.comment_input_mode as any);
      const policyCount = await pool.query(
        `
        select count(*)::int as c
          from public.facebook_comment_entries
         where contest_id=$1 and fb_post_id=$2 and fb_user_id=$3
        `,
        [source.contest_id, fbPostId, initialUserId || 'unknown'],
      );
      const existingCount = Number(policyCount.rows[0]?.c || 0);
      const maxAllowed = source.allow_multiple_answers ? Math.max(1, Number(source.max_answers_per_user || 1)) : 1;
      const exceeded = existingCount >= maxAllowed;

      let detail: any = null;
      let detailError: string | null = null;
      let pageToken: string | null = null;
      try {
        pageToken = await loadPageToken(source.contest_id, source.fb_page_id || fbPageId);
        if (pageToken) {
          detail = await fetchCommentDetails(fbCommentId, pageToken);
        }
      } catch (error: any) {
        detailError = String(error?.message || error);
      }

      const messageText = detail?.message ? String(detail.message) : initialMessage;
      const fbUserId = detail?.from?.id ? String(detail.from.id) : initialUserId;
      const fbUserName = detail?.from?.name ? String(detail.from.name) : (value?.from?.name ? String(value.from.name) : null);
      const commentCreatedAt = detail?.created_time ? String(detail.created_time) : (value?.created_time ? String(value.created_time) : null);
      const attachmentUrl = extractAttachmentUrl(detail?.attachment);

      let r2Asset: {
        key: string;
        url: string;
        etag: string | null;
        sizeBytes: number;
        sha256: string;
      } | null = null;
      let mediaFetchError: string | null = null;
      if (attachmentUrl) {
        try {
          r2Asset = await uploadAttachmentToR2(attachmentUrl, source.fb_page_id || fbPageId, fbCommentId);
        } catch (error: any) {
          mediaFetchError = String(error?.message || error);
        }
      }

      let evaluatedStatus = exceeded ? 'DISQUALIFIED' : 'PENDING';
      let answerText: string | null = messageText || null;
      let mcqOptionId: string | null = null;
      let isCorrect: boolean | null = null;

      if (!exceeded) {
        if (source.comment_input_mode === 'MCQ') {
          const mapped = await mapOptionListAnswer(source, messageText || null);
          evaluatedStatus = mapped.status;
          answerText = (mapped as any).answer_text || null;
          mcqOptionId = (mapped as any).mcq_option_id || null;
          isCorrect = (mapped as any).is_correct ?? null;
        } else if (source.comment_input_mode === 'TEXT') {
          if (!messageText?.trim()) {
            evaluatedStatus = 'DISQUALIFIED';
          }
        } else if (source.comment_input_mode === 'MEDIA_ONLY') {
          if (!r2Asset?.url) {
            evaluatedStatus = 'DISQUALIFIED';
          }
          answerText = null;
        } else if (source.comment_input_mode === 'TEXT_OR_MEDIA') {
          if (!messageText?.trim() && !r2Asset?.url) {
            evaluatedStatus = 'DISQUALIFIED';
          }
        }
      }


      const ingestRes = await pool.query(
        `
        insert into public.facebook_comment_entries
          (contest_id, fb_page_id, fb_post_id, fb_comment_id, fb_parent_comment_id, fb_user_id,
           message_text, answer_text, task_id, mcq_option_id, is_correct, raw_event,
           fb_user_name, fb_comment_created_at,
           r2_key, r2_url, r2_etag, r2_size_bytes, r2_sha256, media_fetched_at, created_at)
        values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18,$19,$20,now())
        on conflict (fb_comment_id) do nothing
        returning status
        `,
        [
          source.contest_id,
          source.fb_page_id || fbPageId,
          fbPostId,
          fbCommentId,
          fbParentCommentId,
          fbUserId || 'unknown',
          messageText,
          answerText,
          source.task_id,
          mcqOptionId,
          isCorrect,
          JSON.stringify({
            entry,
            change,
            detail,
            detail_error: detailError,
            media_error: mediaFetchError,
            exceeded,
            evaluated_status: evaluatedStatus,
            fb_user_name: fbUserName,
            fb_comment_created_at: commentCreatedAt,
            mcq_option_id: mcqOptionId,
            is_correct: isCorrect,
            task_id: source.task_id,
            answer_text: answerText,
            r2_key: r2Asset?.key || null,
            r2_url: r2Asset?.url || null,
            r2_etag: r2Asset?.etag || null,
            r2_size_bytes: r2Asset?.sizeBytes || null,
            r2_sha256: r2Asset?.sha256 || null,
            media_fetched_at: r2Asset ? new Date().toISOString() : null,
          }),
          fbUserName,
          commentCreatedAt,
          r2Asset?.key || null,
          r2Asset?.url || null,
          r2Asset?.etag || null,
          r2Asset?.sizeBytes || null,
          r2Asset?.sha256 || null,
          r2Asset ? new Date().toISOString() : null,
        ],
      );
      const persistedStatus = ingestRes.rows[0]?.status ?? null;

      await storeWebhookAuditEvent({
        objectType: 'page',
        pageId: source.fb_page_id || fbPageId,
        eventType: 'feed_comment',
        contestId: source.contest_id,
        fbPostId,
        fbCommentId,
        fbUserId,
        status: persistedStatus,
      }).catch(() => {});

    }
  }

  return NextResponse.json({ ok: true });
}
