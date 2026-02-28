import { NextResponse } from 'next/server';
import { processMessengerWebhookPayload } from '@/lib/meta/messengerHandler';
import { processFacebookCommentsWebhookPayload } from '@/lib/meta/facebookCommentsHandler';

function hasMessagingEntries(body: any) {
  return Array.isArray(body?.entry) && body.entry.some((entry: any) => Array.isArray(entry?.messaging) && entry.messaging.length > 0);
}

function hasFeedEntries(body: any) {
  return Array.isArray(body?.entry) && body.entry.some((entry: any) =>
    Array.isArray(entry?.changes) &&
    entry.changes.some((change: any) => change?.field === 'feed'),
  );
}

export async function dispatchMetaWebhookPayload(body: any) {
  if (body?.object !== 'page') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (hasMessagingEntries(body)) {
    await processMessengerWebhookPayload(body);
  }

  if (hasFeedEntries(body)) {
    await processFacebookCommentsWebhookPayload(body);
  }

  return NextResponse.json({ ok: true });
}
