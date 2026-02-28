import { handleMetaWebhookGet, handleMessengerWebhookPost } from '@/lib/meta/messengerHandler';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  return handleMetaWebhookGet(req);
}

export async function POST(req: Request) {
  return handleMessengerWebhookPost(req);
}
