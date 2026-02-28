import { NextResponse } from 'next/server';

import { getExternalContestFeed } from '@/lib/server/externalContestPostsRepo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await getExternalContestFeed();
  return NextResponse.json({ items });
}
