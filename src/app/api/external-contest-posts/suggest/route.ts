import { NextResponse } from 'next/server';

import { suggestCardFieldsFromSourceText } from '@/lib/externalContestPosts';

export const dynamic = 'force-dynamic';

type SuggestBody = { source_text?: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SuggestBody;
  const suggestion = suggestCardFieldsFromSourceText(String(body.source_text || ''));

  return NextResponse.json({
    suggestion,
    note: 'TODO: add internal LLM extraction when available.',
  });
}
