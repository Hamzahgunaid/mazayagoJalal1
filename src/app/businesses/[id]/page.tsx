import { pool } from '@/lib/db';

interface Props {
  params: { id: string };
}

export default async function BusinessPage({ params }: Props) {
  const { id } = params;
  const { rows } = await pool.query(
    `SELECT
       b.id,
       b.name,
       b.avatar_url,
       b.logo_url,
       b.cover_url,
       b.website_url,
       b.phone,
       b.social_json,
       b.meta_json,
       b.created_at
     FROM public.businesses b
     WHERE b.id = $1
     LIMIT 1`,
    [id]
  );

  const business = rows[0];

  if (!business) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Business not found</h1>
        <p className="text-sm text-slate-600">We could not find this business.</p>
      </div>
    );
  }

  const avatar =
    business.avatar_url ||
    '/img/placeholder-avatar.png';

  const social = (business.social_json || {}) as Record<string, any>;
  const meta = (business.meta_json || {}) as Record<string, any>;
  const contacts = (meta.contacts || {}) as Record<string, any>;

  const pick = (...values: Array<string | null | undefined>) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  };

  const phone = pick(business.phone, contacts.phone, meta.phone);
  const email = pick(social.email, contacts.email, meta.email);
  const whatsapp = pick(
    social.whatsapp_link,
    social.whatsapp_url,
    social.whatsapp,
    contacts.whatsapp_link,
    contacts.whatsapp,
    meta.whatsapp
  );
  const normalizeWhatsappLink = (value: string | null) => {
    if (!value) return null;
    const raw = value.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^wa\.me\//i.test(raw)) return `https://${raw}`;
    if (/^whatsapp\.com\//i.test(raw)) return `https://${raw}`;
    const digits = raw.replace(/\D/g, "");
    if (!digits) return raw;
    return `https://wa.me/${digits}`;
  };

  const socialLinks: Array<{ label: string; url: string }> = [];
  const knownSocials = [
    ['facebook', 'Facebook'],
    ['instagram', 'Instagram'],
    ['x', 'X'],
    ['twitter', 'Twitter'],
    ['tiktok', 'TikTok'],
    ['youtube', 'YouTube'],
    ['linkedin', 'LinkedIn'],
    ['snapchat', 'Snapchat'],
    ['telegram', 'Telegram'],
    ['website', 'Website'],
  ];

  for (const [key, label] of knownSocials) {
    const url = pick(social[key], contacts[key], meta[key]);
    if (url) socialLinks.push({ label, url });
  }

  if (whatsapp) {
    socialLinks.push({ label: 'WhatsApp', url: normalizeWhatsappLink(whatsapp) || whatsapp });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar}
          alt=""
          className="h-16 w-16 rounded-full border border-slate-200 object-cover"
        />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
          {business.website_url && (
            <a
              href={business.website_url}
              className="text-sm text-indigo-600 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {business.website_url}
            </a>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Business ID</div>
            <div className="font-medium text-slate-900">{business.id}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Phone</div>
            <div className="font-medium text-slate-900">{phone || '-'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</div>
            <div className="font-medium text-slate-900">{email || '-'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Created</div>
            <div className="font-medium text-slate-900">
              {business.created_at ? new Date(business.created_at).toLocaleString() : '-'}
            </div>
          </div>
        </div>
      </div>

      {socialLinks.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Social links</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {socialLinks.map((item) => (
              <a
                key={`${item.label}-${item.url}`}
                href={item.url}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
                target="_blank"
                rel="noreferrer"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
