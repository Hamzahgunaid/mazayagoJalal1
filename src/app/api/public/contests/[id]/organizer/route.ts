import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
