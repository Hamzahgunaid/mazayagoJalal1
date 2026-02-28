import { NextResponse } from 'next/server';

import { requireUser } from '@/app/api/_helpers';
import { pool } from '@/lib/db';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALPHANUM = `${LETTERS}${DIGITS}`;

const clampPreviewCount = (value?: string | null) => {
  const parsed = Number(value ?? 3);
  if (Number.isNaN(parsed) || parsed <= 0) return 3;
  return Math.min(6, Math.max(1, parsed));
};

const createSeededRandom = (seed: number) => {
  let value = seed || 1;
  return () => {
    value = (value * 48271) % 0x7fffffff;
    return value / 0x7fffffff;
  };
};

const generateFromPattern = (pattern: string, seed: number) => {
  const random = createSeededRandom(seed);
  const source = pattern && pattern.trim().length ? pattern : 'RV-XXXXX';
  return source
    .split('')
    .map((char) => {
      if (char === 'X') {
        const idx = Math.floor(random() * ALPHANUM.length);
        return ALPHANUM[idx] || 'X';
      }
      if (char === 'A') {
        const idx = Math.floor(random() * LETTERS.length);
        return LETTERS[idx] || 'A';
      }
      if (char === '9' || char === 'N') {
        const idx = Math.floor(random() * DIGITS.length);
        return DIGITS[idx] || '9';
      }
      return char;
    })
    .join('');
};

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const contestId = params.id;
  if (!contestId) {
    return NextResponse.json({ error: 'Missing contest id' }, { status: 400 });
  }

  const url = new URL(req.url);
  const previewCount = clampPreviewCount(url.searchParams.get('preview'));

  try {
    const { rows } = await pool.query(
      `
        SELECT
          b.id,
          b.name,
          b.pattern,
          b.created_at,
          COALESCE((
            SELECT COUNT(*)::int FROM public.contest_codes c WHERE c.batch_id = b.id
          ), 0) AS total_codes,
          COALESCE((
            SELECT COUNT(*)::int FROM public.contest_codes c WHERE c.batch_id = b.id AND c.redemptions_count > 0
          ), 0) AS redeemed_codes,
          COALESCE((
            SELECT COUNT(*)::int FROM public.contest_codes c WHERE c.batch_id = b.id AND c.redemptions_count < c.max_redemptions
          ), 0) AS remaining_codes
        FROM public.contest_code_batches b
        WHERE b.contest_id = $1
        ORDER BY b.created_at DESC
      `,
      [contestId],
    );

    const previews: Record<string, Array<{ id: string; code: string }>> = {};
    rows.forEach((batch, index) => {
      const items = Array.from({ length: previewCount }).map((_, idx) => ({
        id: `${batch.id}-${idx}`,
        code: generateFromPattern(batch.pattern || 'RV-XXXXX', index * previewCount + idx + 7),
      }));
      previews[batch.id] = items;
    });

    return NextResponse.json({
      batches: rows,
      previews,
    });
  } catch (error: any) {
    console.error('codes GET error', error);
    return NextResponse.json(
      { error: 'Unable to load code batches', detail: String(error?.message || error) },
      { status: 500 },
    );
  }
}
