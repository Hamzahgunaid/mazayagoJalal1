'use client';

type Contest = {
  id: string; slug: string; title: string;
  description?: string | null;
  type: string; status: string;
  starts_at?: string | null; ends_at?: string | null;
  prize_summary?: string | null; prizes?: any[];
  branding_theme?: any;
};

function parseBrand(theme: any) {
  try { const t = typeof theme === 'string' ? JSON.parse(theme) : theme || {};
    return {
      primary: typeof t?.primary === 'string' ? t.primary : '#0ea5e9',
      cover: t?.cover || t?.image || null
    };
  } catch { return { primary:'#0ea5e9', cover:null }; }
}

function timeLeft(ends?: string | null) {
  if (!ends) return '';
  const diff = +new Date(ends) - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff/86400000);
  const h = Math.floor((diff%86400000)/3600000);
  if (d > 0) return `Ends in ${d}d ${h}h`;
  const m = Math.floor((diff%3600000)/60000);
  return `Ends in ${h}h ${m}m`;
}

export default function ContestCardV2({ contest, hrefBase }: { contest: Contest; hrefBase: string }) {
  const brand = parseBrand(contest.branding_theme);
  const href = `${hrefBase}/${contest.slug}`;
  const endsText = timeLeft(contest.ends_at);

  // محاولة استخراج صورة:
  const cover =
    brand.cover ||
    (contest as any).cover_url ||
    (contest as any).image_url ||
    '/images/offer-placeholder.jpg'; // ضع صورة placeholder عندك

  return (
    <a
      href={href}
      className="group rounded-2xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition hover:-translate-y-0.5"
      style={{ borderColor: 'rgba(0,0,0,.06)' }}
    >
      <div className="relative h-40 w-full overflow-hidden">
        <img
          src={cover}
          alt={contest.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        {/* overlay gradient */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.0) 35%, rgba(0,0,0,.28) 100%)` }}
        />
        {/* badge */}
        <div className="absolute left-3 top-3 inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full shadow"
             style={{ backgroundColor: brand.primary, color: 'white' }}>
          {contest.type}
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold leading-snug line-clamp-1">{contest.title}</h3>
        {contest.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{contest.description}</p>
        )}

        {/* footer */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs rounded-full px-2 py-1 border"
                style={{ borderColor: 'rgba(0,0,0,.08)' }}>
            {contest.status}
          </span>
          <span className="text-xs text-gray-500">{endsText}</span>
        </div>
      </div>
    </a>
  );
}
