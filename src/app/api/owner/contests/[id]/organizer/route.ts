export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUser } from '../../../_helpers';

export async function GET(_req: Request, ctx: { params: { id: string }}) {
  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  try {
    const q = await pool.query(
      `SELECT
         c.id as contest_id,
         c.primary_organizer_link_id,
         co.id as organizer_link_id,
         co.organizer_kind,
         co.organizer_user_id,
         co.organizer_business_id,
         co.role,
         co.is_primary,
         cos.display_name,
         cos.display_avatar_url,
         cos.display_logo_url,
         cos.display_website_url,
         cos.display_phone,
         cos.display_social_json,
         cos.display_meta_json
       FROM public.contests c
       LEFT JOIN LATERAL (
         SELECT co.*
         FROM public.contest_organizers co
         WHERE co.id = c.primary_organizer_link_id
            OR (c.primary_organizer_link_id IS NULL AND co.contest_id = c.id)
         ORDER BY co.is_primary DESC, co.created_at ASC
         LIMIT 1
       ) co ON true
       LEFT JOIN public.contest_organizer_snapshots cos ON cos.contest_organizer_id = co.id
       WHERE c.id=$1
       LIMIT 1`, [id]
    );
    if (q.rowCount === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const r = q.rows[0];
    const social = (r.display_social_json ?? {}) as Record<string, any>;
    const meta = (r.display_meta_json ?? {}) as Record<string, any>;
    const contacts = (meta.contacts ?? {}) as Record<string, any>;
    const pick = (...candidates: Array<string | null | undefined>) => {
      for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) return c.trim();
      }
      return null;
    };
    const socialWhatsapp = pick(
      social.whatsapp_link,
      social.whatsapp_url,
      social.whatsapp,
      contacts.whatsapp_link,
      contacts.whatsapp,
      meta.whatsapp,
      r.display_phone
    );
    const displayPhone = pick(contacts.phone, meta.phone, social.phone, r.display_phone);
    const organizerId = r.organizer_kind === 'USER' ? r.organizer_user_id : r.organizer_business_id;
    const organizer = r.organizer_link_id ? {
      link_id: r.organizer_link_id,
      kind: r.organizer_kind,
      id: organizerId,
      name: r.display_name || 'Organizer',
      avatar: r.display_avatar_url || r.display_logo_url || null,
      logo: r.display_logo_url || null,
      website: r.display_website_url || null,
      phone: displayPhone,
      whatsapp: socialWhatsapp,
      href:
        r.organizer_kind === 'USER' && organizerId
          ? `/profile/${organizerId}`
          : r.organizer_kind === 'BUSINESS' && organizerId
          ? `/businesses/${organizerId}`
          : null,
      snapshot: {
        display_name: r.display_name || null,
        display_avatar_url: r.display_avatar_url || null,
        display_logo_url: r.display_logo_url || null,
        display_website_url: r.display_website_url || null,
        display_phone: r.display_phone || null,
        display_social_json: r.display_social_json || null,
        display_meta_json: r.display_meta_json || null,
      }
    } : null;
    return NextResponse.json({ organizer });
  } catch (e:any) {
    return NextResponse.json({ error:'Server error', detail:String(e?.message||e)}, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: { id: string }}) {
  const contestId = ctx.params?.id;
  if (!contestId) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const { user, response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const kind = String(body.organizer_kind || '').toUpperCase();
  if (kind !== 'USER' && kind !== 'BUSINESS') {
    return NextResponse.json({ error: 'Invalid organizer_kind' }, { status: 400 });
  }

  const organizerId = String(body.organizer_id || '').trim()
    || (kind === 'USER' ? String(body.organizer_user_id || '').trim() : String(body.organizer_business_id || '').trim());

  if (!organizerId) {
    return NextResponse.json({ error: 'Missing organizer id' }, { status: 400 });
  }

  const role = String(body.role || 'HOST').trim() || 'HOST';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);

    await client.query(
      `UPDATE public.contest_organizers
         SET is_primary = false
       WHERE contest_id = $1
         AND is_primary = true`,
      [contestId]
    );

    const organizerUserId = kind === 'USER' ? organizerId : null;
    const organizerBusinessId = kind === 'BUSINESS' ? organizerId : null;

    const existing = await client.query(
      `SELECT id
         FROM public.contest_organizers
        WHERE contest_id = $1
          AND organizer_kind = $2
          AND organizer_user_id IS NOT DISTINCT FROM $3
          AND organizer_business_id IS NOT DISTINCT FROM $4
        LIMIT 1`,
      [contestId, kind, organizerUserId, organizerBusinessId]
    );

    if (existing.rowCount) {
      await client.query(
        `UPDATE public.contest_organizers
           SET is_primary = true,
               role = $2,
               updated_at = now()
         WHERE id = $1`,
        [existing.rows[0].id, role]
      );
    } else {
      await client.query(
        `INSERT INTO public.contest_organizers
          (contest_id, organizer_kind, organizer_user_id, organizer_business_id, role, is_primary, created_by_user_id)
         VALUES ($1,$2,$3,$4,$5,true,$6)`,
        [contestId, kind, organizerUserId, organizerBusinessId, role, user.id]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Server error', detail: String(e?.message || e) }, { status: 500 });
  } finally {
    client.release();
  }
}
