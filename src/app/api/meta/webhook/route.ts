import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyMetaWebhookChallenge } from '@/lib/meta/webhookVerify';
import { verifyMetaWebhookSignature } from '@/lib/meta/webhookSignature';
import { dispatchMetaWebhookPayload } from '@/lib/meta/webhookRouter';

export const runtime = 'nodejs';

function detectEventTypes(body: any) {
  const types = new Set<string>();
  if (Array.isArray(body?.entry)) {
    for (const entry of body.entry) {
      if (Array.isArray(entry?.messaging) && entry.messaging.length > 0) {
        types.add('messaging');
      }
      if (Array.isArray(entry?.changes)) {
        const hasFeed = entry.changes.some((c: any) => c?.field === 'feed');
        const hasComments = entry.changes.some((c: any) => c?.field === 'feed' && c?.value?.item === 'comment');
        if (hasFeed) types.add('feed');
        if (hasComments) types.add('feed_comment');
      }
    }
  }
  return Array.from(types);
}

async function storeValidWebhookEvent(body: any) {
  const firstEntry = Array.isArray(body?.entry) ? body.entry[0] : null;
  const pageId = String(firstEntry?.id || '').trim() || null;
  const eventTypes = detectEventTypes(body);
  await pool.query(
    `
    insert into public.meta_webhook_events (object, page_id, event_type, payload, received_at)
    values ($1,$2,$3,$4::jsonb,now())
    `,
    [
      String(body?.object || 'unknown'),
      pageId,
      eventTypes.join(',') || 'unknown',
      JSON.stringify({
        request_entry_count: Array.isArray(body?.entry) ? body.entry.length : 0,
        event_types: eventTypes,
      }),
    ],
  );
}

export async function GET(req: Request) {
  const challenge = verifyMetaWebhookChallenge(req);
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
  const requestId = randomUUID();
  const rawBody = Buffer.from(await req.arrayBuffer());
  const userAgent = String(req.headers.get('user-agent') || '').slice(0, 200);
  const verification = verifyMetaWebhookSignature(req.headers, rawBody);

  console.log(
    JSON.stringify({
      tag: 'meta_webhook_received',
      request_id: requestId,
      has_sig256: verification.hasSig256,
      has_sig1: verification.hasSig1,
      body_length: rawBody.length,
      user_agent: userAgent,
      path: new URL(req.url).pathname,
    }),
  );

  if (!verification.ok) {
    console.warn(
      JSON.stringify({
        tag: 'meta_webhook_signature_failed',
        request_id: requestId,
        has_sig256: verification.hasSig256,
        has_sig1: verification.hasSig1,
        used_algo: verification.usedAlgo,
        signature_prefix: verification.signaturePrefix,
        computed_prefix: verification.computedPrefix,
      }),
    );
    return new NextResponse('Bad signature', { status: 401 });
  }

  const body = JSON.parse(rawBody.toString('utf8'));
  const eventTypes = detectEventTypes(body);
  console.log(
    JSON.stringify({
      tag: 'meta_webhook_verified',
      request_id: requestId,
      used_algo: verification.usedAlgo,
      signature_prefix: verification.signaturePrefix,
      computed_prefix: verification.computedPrefix,
      object: String(body?.object || ''),
      entry_count: Array.isArray(body?.entry) ? body.entry.length : 0,
      event_types: eventTypes,
    }),
  );

  await storeValidWebhookEvent(body).catch((error) => {
    console.warn(
      JSON.stringify({
        tag: 'meta_webhook_event_store_failed',
        request_id: requestId,
        error: String((error as any)?.message || error),
      }),
    );
  });

  return dispatchMetaWebhookPayload(body);
}
