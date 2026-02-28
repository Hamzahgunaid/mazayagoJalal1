import { notFound } from 'next/navigation';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

type OrganizerRow = {
  contest_id: string;
  contest_title: string | null;
  contest_slug: string | null;
  organizer_link_id: string | null;
  organizer_kind: 'USER' | 'BUSINESS' | string | null;
  organizer_user_id: string | null;
  organizer_business_id: string | null;
  display_name: string | null;
  display_avatar_url: string | null;
  display_logo_url: string | null;
  display_website_url: string | null;
  display_phone: string | null;
  display_social_json: any;
  display_meta_json: any;
  frozen_at: string | null;
};

const PUBLIC_STATUSES = ['ACTIVE', 'PAUSED', 'ENDED'];

const pick = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

const normalizeWhatsappLink = (value: string | null) => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^wa\.me\//i.test(raw)) return `https://${raw}`;
  if (/^whatsapp\.com\//i.test(raw)) return `https://${raw}`;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  return `https://wa.me/${digits}`;
};

const IconBase = ({
  children,
  className,
}: {
  children: JSX.Element;
  className?: string;
}) => (
  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white shadow ${className || ''}`}>
    {children}
  </span>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="12" cy="12" r="7" />
    <path d="M5 12h14" />
    <path d="M12 5c2.5 2.8 2.5 10.2 0 14" />
    <path d="M12 5c-2.5 2.8-2.5 10.2 0 14" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14.2 8.2h2.5V5.6h-2.7c-2.1 0-3.6 1.7-3.6 3.7v1.8H8v2.6h2.4V19h2.7v-5.3h2.6l.4-2.6h-3V9.4c0-.7.3-1.2 1.1-1.2z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="5" y="5" width="14" height="14" rx="4" />
    <circle cx="12" cy="12" r="3.2" />
    <circle cx="16.3" cy="7.7" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 4h3.5l4.2 5.7L17 4h2.6l-6 8.1L19.4 20h-3.5l-4.5-6-4.6 6H4.2l6.4-8.4L5 4z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 4c.6 1.6 1.8 2.8 3.4 3.4V10c-1.4 0-2.8-.5-3.9-1.4v5.6a5 5 0 1 1-4.4-5v2.6a2.4 2.4 0 1 0 1.8 2.3V4h3.1z" />
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3.5" y="6.2" width="17" height="11.6" rx="3" />
    <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.4 9.3h2.6V18H6.4V9.3zm1.3-4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.1 9.3h2.5v1.2h.1c.4-.7 1.3-1.4 2.7-1.4 2 0 3.1 1.2 3.1 3.6V18h-2.6v-4.5c0-1.1-.4-1.8-1.4-1.8-.8 0-1.3.5-1.5 1-.1.2-.1.5-.1.8V18h-2.8V9.3z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.8 5.2L3.6 11.4c-.7.3-.7 1.3.1 1.5l4.1 1.2 1.6 5.3c.2.7 1.1.9 1.5.3l2.6-3.5 4.3 3.1c.6.4 1.4 0 1.5-.7l2.4-12.6c.1-.7-.6-1.3-1.3-1.1z" />
  </svg>
);

const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 5.5c-1.9 0-3.4 1.5-3.4 3.4v2.7c0 .7-.5 1.2-1.2 1.3l-1.4.2c-.5.1-.7.7-.3 1.1.6.6 1.6 1.1 2.7 1.3l.7 2.2c.1.4.5.6.9.5 1-.2 1.9-.2 2.9 0 .4.1.8-.1.9-.5l.7-2.2c1.1-.2 2.1-.7 2.7-1.3.4-.4.2-1-.3-1.1l-1.4-.2c-.7-.1-1.2-.6-1.2-1.3V8.9c0-1.9-1.5-3.4-3.4-3.4z" />
  </svg>
);

const WhatsappIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M7 18l-1.5 3 3-1.5A8 8 0 1 0 7 18z" />
    <path d="M9.3 9.7c1.6 2.4 3.6 4.1 5.1 4.8l1.2-.9c.4-.3.9-.3 1.3 0l1.2 1.2c.3.3.3.8 0 1.1l-.8.8c-.7.7-1.7.9-2.6.6-2.4-.8-5.1-3.4-6-5.9-.3-.9-.1-1.9.6-2.6l.8-.8c.3-.3.8-.3 1.1 0l1.1 1.1c.3.3.3.9 0 1.3l-.9 1.3z" />
  </svg>
);

const EmailIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="4" y="6.5" width="16" height="11" rx="2.5" />
    <path d="M4.5 8l7.5 5 7.5-5" />
  </svg>
);

const getSocialStyle = (label: string) => {
  switch (label) {
    case 'WhatsApp':
      return { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100', icon: 'bg-emerald-500', Icon: WhatsappIcon };
    case 'YouTube':
      return { chip: 'bg-red-50 text-red-700 ring-red-200 hover:bg-red-100', icon: 'bg-red-500', Icon: YouTubeIcon };
    case 'Instagram':
      return { chip: 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100', icon: 'bg-rose-500', Icon: InstagramIcon };
    case 'Facebook':
      return { chip: 'bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100', icon: 'bg-blue-600', Icon: FacebookIcon };
    case 'X':
      return { chip: 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200', icon: 'bg-slate-900', Icon: XIcon };
    case 'TikTok':
      return { chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 hover:bg-fuchsia-100', icon: 'bg-fuchsia-500', Icon: TikTokIcon };
    case 'LinkedIn':
      return { chip: 'bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100', icon: 'bg-sky-600', Icon: LinkedInIcon };
    case 'Telegram':
      return { chip: 'bg-cyan-50 text-cyan-700 ring-cyan-200 hover:bg-cyan-100', icon: 'bg-cyan-500', Icon: TelegramIcon };
    case 'Snapchat':
      return { chip: 'bg-yellow-50 text-yellow-700 ring-yellow-200 hover:bg-yellow-100', icon: 'bg-yellow-400', Icon: SnapchatIcon };
    case 'Email':
      return { chip: 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200', icon: 'bg-slate-600', Icon: EmailIcon };
    case 'Website':
      return { chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100', icon: 'bg-indigo-500', Icon: GlobeIcon };
    default:
      return { chip: 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200', icon: 'bg-slate-500', Icon: GlobeIcon };
  }
};

const buildSocialLinks = (social: Record<string, any>, meta: Record<string, any>) => {
  const contacts = (meta.contacts || {}) as Record<string, any>;
  const links: Array<{ label: string; url: string }> = [];
  const push = (label: string, url?: string | null) => {
    const value = pick(url || null);
    if (value) links.push({ label, url: value });
  };

  push('Website', pick(social.website, meta.website));
  push('Facebook', pick(social.facebook, contacts.facebook));
  push('Instagram', pick(social.instagram, contacts.instagram));
  push('X', pick(social.x, social.twitter));
  push('TikTok', pick(social.tiktok));
  push('YouTube', pick(social.youtube));
  push('LinkedIn', pick(social.linkedin));
  push('Telegram', pick(social.telegram));
  push('Snapchat', pick(social.snapchat));

  const whatsapp = normalizeWhatsappLink(
    pick(
      social.whatsapp_link,
      social.whatsapp_url,
      social.whatsapp,
      contacts.whatsapp_link,
      contacts.whatsapp
    )
  );
  if (whatsapp) links.push({ label: 'WhatsApp', url: whatsapp });

  const email = pick(social.email, contacts.email, meta.email);
  if (email) links.push({ label: 'Email', url: `mailto:${email}` });

  return links;
};

export default async function OfferOrganizerPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug;
  if (!slug) notFound();

  const { rows } = await pool.query<OrganizerRow>(
    `SELECT
       c.id as contest_id,
       c.title as contest_title,
       c.slug as contest_slug,
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
       cos.display_meta_json,
       cos.frozen_at
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
     WHERE c.slug = $1
       AND c.visibility::text = 'public'
       AND c.status::text = ANY($2::text[])
     LIMIT 1`,
    [slug, PUBLIC_STATUSES]
  );

  const row = rows[0];
  if (!row) {
    notFound();
  }

  const snapshotSocial = (row.display_social_json || {}) as Record<string, any>;
  const snapshotMeta = (row.display_meta_json || {}) as Record<string, any>;
  const snapshotLinks = buildSocialLinks(snapshotSocial, snapshotMeta);

  const snapshotName = pick(row.display_name);
  const displayName = snapshotName || 'Organizer';

  const snapshotAvatar = pick(row.display_avatar_url, row.display_logo_url);
  const avatar = snapshotAvatar || '/img/placeholder-avatar.png';

  const snapshotWebsite = pick(row.display_website_url);
  const snapshotPhone = pick(row.display_phone);

  const profileHref = row.organizer_kind === 'USER' && row.organizer_user_id
    ? `/profile/${row.organizer_user_id}`
    : row.organizer_kind === 'BUSINESS' && row.organizer_business_id
    ? `/businesses/${row.organizer_business_id}`
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950/5 px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-white to-slate-50" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <div className="border-b border-slate-100 bg-slate-50/60 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatar}
                  alt=""
                  className="h-14 w-14 rounded-2xl border border-slate-200 object-cover"
                />
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Organizer</div>
                  <h1 className="text-2xl font-semibold text-slate-900">{displayName}</h1>
                  <p className="text-sm text-slate-500">
                    {row.contest_title ? `For ${row.contest_title}` : 'Contest organizer'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/offers/${row.contest_slug}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </a>
                {profileHref && null}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <dt className="text-slate-500">Display name</dt>
                <dd className="font-medium text-slate-900">{snapshotName || '-'}</dd>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <dt className="text-slate-500">Website</dt>
                <dd className="font-medium text-slate-900">{snapshotWebsite || '-'}</dd>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">{snapshotPhone || '-'}</dd>
              </div>
            </dl>

            {snapshotLinks.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {snapshotLinks.map((link) => {
                    const style = getSocialStyle(link.label);
                    const Icon = style.Icon;
                    return (
                      <a
                        key={`${link.label}-${link.url}`}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-sm ring-1 ring-inset transition ${style.chip}`}
                      >
                        <IconBase className={style.icon}>
                          <Icon className="h-4 w-4" />
                        </IconBase>
                        <span>{link.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
