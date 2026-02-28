export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { cookies, headers } from 'next/headers';

const DEFAULT_SELECTION: Record<string, string> = {
  RIDDLE: 'RANDOM_FROM_CORRECT',
  QR_CODE: 'EVERY_CODE',
  LEADERBOARD: 'TOP_SCORE',
  TREASURE_HUNT: 'FASTEST_TIME',
  UGC: 'RANDOM_FROM_CORRECT',
  REFERRAL: 'MOST_CODES',
  PREDICTION: 'RANDOM_FROM_CORRECT',
  SURVEY: 'RANDOM_FROM_CORRECT',
  RAFFLE: 'EVERY_CODE',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function slugify(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\-_\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'offer';
}

async function ensureUniqueSlug(base: string) {
  const root = base;
  let candidate = base;
  for (let i = 0; i < 100; i++) {
    const q = await pool.query('SELECT 1 FROM public.contests WHERE slug=$1 LIMIT 1', [candidate]);
    if (q.rowCount === 0) return candidate;
    candidate = `${root}-${i + 1}`;
  }
  return `${root}-${Date.now()}`;
}

/** استخراج user_id حصراً من الهيدر أو الجلسة (بدون أي fallback). */
async function resolveUserIdStrict(): Promise<string | null> {
  // 1) من الهيدر x-user-id
  const h = headers();
  const hdrUid = h.get('x-user-id');
  if (hdrUid && UUID_RE.test(hdrUid)) {
    const ok = await pool.query('SELECT 1 FROM public.users WHERE id=$1 LIMIT 1', [hdrUid]);
    if (ok.rowCount) return hdrUid;
  }

  // 2) من كوكي جلسة: نطابق user_sessions.token (UUID) غير منتهي
  const c = cookies();
  const sessionKeys = ['rv_session', 'session', 'sid', 'token'];
  for (const k of sessionKeys) {
    const v = c.get(k)?.value;
    if (v && UUID_RE.test(v)) {
      const q = await pool.query(
        `SELECT user_id
           FROM public.user_sessions
          WHERE token=$1
            AND (expires_at IS NULL OR expires_at > now())
          ORDER BY expires_at DESC NULLS LAST
          LIMIT 1`,
        [v]
      );
      if (q.rowCount) return q.rows[0].user_id as string;
    }
  }

  // لا fallback
  return null;
}

/* ---------------- GET (اختياري لعرض قائمة) ---------------- */
export async function GET() {
  try {
    const q = await pool.query(
      `SELECT * FROM public.contests ORDER BY created_at DESC LIMIT 200`
    );
    return NextResponse.json({ items: q.rows });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Server error', detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}

/* ---------------- POST: إنشاء عرض جديد ---------------- */
export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const userId = await resolveUserIdStrict();
    if (!userId) {
      return NextResponse.json(
        { error: 'AUTH_REQUIRED', message: 'User must be provided via header x-user-id or a valid session cookie.' },
        { status: 401 }
      );
    }

    const rawType = String(body.type || '').toUpperCase();
    if (!rawType) return NextResponse.json({ error: 'Type is required' }, { status: 400 });

    const title: string = (body.title || '').toString().trim();
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const desiredSlug = slugify(String(body.slug || title));
    const slug = await ensureUniqueSlug(desiredSlug);

    const selection =
      String(body.selection || DEFAULT_SELECTION[rawType] || 'RANDOM_FROM_CORRECT').toUpperCase();

    const starts_at = body.starts_at ? new Date(body.starts_at).toISOString() : null;
    const ends_at   = body.ends_at   ? new Date(body.ends_at).toISOString()   : null;

    if (starts_at && ends_at && new Date(ends_at) < new Date(starts_at)) {
      return NextResponse.json({ error: 'Ends_at must be after starts_at' }, { status: 400 });
    }

    const branding_theme   = body.branding_theme   || { primary: '#4f46e5' };
    const rules_json       = body.rules_json       || {};
    const eligibility_json = body.eligibility_json || {};
    const geo_restrictions = body.geo_restrictions || {};

    const max_winners = body.max_winners == null ? null : Number(body.max_winners);
    const per_user_limit = body.per_user_limit == null ? 1 : Math.max(1, Number(body.per_user_limit));
    const require_receipt = !!body.require_receipt;
    const prize_summary = body.prize_summary || null;
    const visibility = (body.visibility || 'public').toString();
    const status = (body.status || 'ACTIVE').toString();
    const rawSeedCommit = body.seed_commit;
    const seed_commit =
      rawSeedCommit == null || String(rawSeedCommit).trim() === '' ? null : String(rawSeedCommit).trim();

    const owner_kind = 'USER';
    const owner_ref_id = null;
    const primary_organizer_link_id = body.primary_organizer_link_id || null;

    const requestedOrganizerKind = String(body.organizer_kind || '').toUpperCase();
    const isBusinessOrganizer = requestedOrganizerKind === 'BUSINESS';
    const isUserOrganizer = requestedOrganizerKind === 'USER' || !requestedOrganizerKind;
    const organizerId = String(body.organizer_id || '').trim()
      || (isBusinessOrganizer ? String(body.organizer_business_id || '').trim() : String(body.organizer_user_id || '').trim());
    if (requestedOrganizerKind && !organizerId) {
      return NextResponse.json({ error: 'Organizer id is required' }, { status: 400 });
    }
    const organizerKind = isBusinessOrganizer ? 'BUSINESS' : 'USER';
    const organizerUserId = organizerKind === 'USER' ? (organizerId || userId) : null;
    const organizerBusinessId = organizerKind === 'BUSINESS' ? organizerId : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);

      const ins = await client.query(
          `INSERT INTO public.contests
           (owner_kind, owner_ref_id, created_by_user_id, primary_organizer_link_id,
            slug, title, description, branding_theme,
            type, selection, starts_at, ends_at,
            max_winners, require_receipt, per_user_limit,
            geo_restrictions, eligibility_json, rules_json, seed_commit,
            prize_summary, public_randomness_source, status, visibility)
         VALUES
           ($1,$2,$3,$4,
            $5,$6,$7,$8::jsonb,
            $9,$10,$11,$12,
            $13,$14,$15,
            $16::jsonb,$17::jsonb,$18::jsonb,$19,
            $20,NULL,$21,$22)
         RETURNING *`,
        [
          owner_kind,
          owner_ref_id,
          userId,                 // created_by_user_id (مطلوب)
          primary_organizer_link_id,
          slug,
          title,
          body.description || null,
          JSON.stringify(branding_theme),
          rawType,
          selection,
          starts_at,
          ends_at,
          max_winners,
          require_receipt,
          per_user_limit,
          JSON.stringify(geo_restrictions),
          JSON.stringify(eligibility_json),
          JSON.stringify(rules_json),
          seed_commit,
          prize_summary,
          status,
          visibility,
        ]
      );

      const contest = ins.rows[0];

      await client.query(
        `INSERT INTO public.contest_organizers
           (contest_id, organizer_kind, organizer_user_id, organizer_business_id, role, is_primary, created_by_user_id)
         VALUES ($1,$2,$3,$4,$5,true,$6)`,
        [contest.id, organizerKind, organizerUserId, organizerBusinessId, 'HOST', userId]
      );

      // إدراج خيارات RIDDLE تلقائياً إن وُجدت في rules_json
      if (rawType === 'RIDDLE') {
        const rr = rules_json?.riddle;
        const options: string[] = Array.isArray(rr?.options) ? rr.options : [];
        const correctIndex = typeof rr?.correct_index === 'number' ? rr.correct_index : -1;
        if (options.length > 0) {
          let pos = 1;
          for (let i = 0; i < options.length; i++) {
            const label = String(options[i] || '').trim();
            if (!label) continue;
            const is_correct = i === correctIndex;
            await client.query(
              `INSERT INTO public.contest_mcq_options (contest_id, label, is_correct, position)
               VALUES ($1,$2,$3,$4)`,
              [contest.id, label, is_correct, pos++]
            );
          }
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ contest });
    } catch (txErr: any) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Server error', detail: String(txErr?.message || txErr) },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Server error', detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
