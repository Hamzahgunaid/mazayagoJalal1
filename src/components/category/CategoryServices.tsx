import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CategoryServices({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: SearchParams;
}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (typeof v === "string" && v) p.set(k, v);
  }

  const res = await fetch(`/api/category/${encodeURIComponent(slug)}?${p.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return <div className="card p-4">Failed to load services.</div>;
  }
  const { services, total, limit, offset, latestReviews } = await res.json();

  const pageLink = (off: number) => {
    const sp = new URLSearchParams(p.toString());
    if (off > 0) sp.set("offset", String(off)); else sp.delete("offset");
    return `/category/${slug}${sp.toString() ? `?${sp.toString()}` : ""}`;
  };

  const defaultLogo = "/assets/defaults/service-logo-r.svg";
  const defaultAvatar = "/assets/defaults/avatar-r.svg";

  return (
    <>
      {/* Latest reviews slider */}
      {Array.isArray(latestReviews) && latestReviews.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Latest reviews in this category</h2>
          <div className="overflow-x-auto">
            <div className="flex gap-3 min-w-full">
              {latestReviews.map((r: any) => (
                <a
                  key={r.id}
                  href={`/s/${r.slug}`}
                  className="min-w-[280px] max-w-[320px] card p-3 hover:shadow transition"
                  title={r.display_name}
                >
                  <div className="text-xs text-slate-500">
                    {new Date(r.submitted_at).toLocaleString()}
                  </div>
                  <div className="mt-1 text-sm font-medium" dir="auto">
                    {r.title || (r.body ? String(r.body).slice(0, 80) : "—")}
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    ⭐ {r.rating} • {r.display_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {[r.city, r.country].filter(Boolean).join(" • ")}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services list + pagination */}
      <section className="space-y-3">
        {(!services || services.length === 0) ? (
          <div className="card p-6 text-center">
            <div className="text-slate-600">No services found in this category.</div>
            <div className="mt-3">
              <Link href={pageLink(0)} className="btn">Clear filters</Link>{" "}
              <Link href="/s/new" className="btn btn-primary">Add your service</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((s: any) => (
                <Link
                  key={s.service_id}
                  href={`/s/${s.slug}`}
                  className="card p-4 hover:shadow transition-shadow duration-150"
                  title={s.display_name}
                >
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.logo_url || s.avatar_url || defaultLogo || defaultAvatar}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200"
                    />
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {s.display_name}
                        {s.verified && (
                          <span className="text-[11px] rounded bg-emerald-50 text-emerald-700 px-2 py-0.5">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        {s.avg_rating ?? "—"}★ • {s.reviews_count ?? 0} reviews
                      </div>
                      <div className="text-xs text-slate-500">
                        {[s.city, s.country].filter(Boolean).join(" • ")}
                      </div>
                    </div>
                  </div>
                  {s.short_description && (
                    <p className="text-sm text-slate-700 mt-3 line-clamp-2" dir="auto">
                      {s.short_description}
                    </p>
                  )}
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-slate-600">
                Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + limit, total)} of {total}
              </div>
              <div className="flex gap-2">
                <Link
                  href={pageLink(Math.max(0, offset - limit))}
                  aria-disabled={offset <= 0}
                  className={`btn ${offset <= 0 ? "pointer-events-none opacity-50" : ""}`}
                >
                  Previous
                </Link>
                <Link
                  href={pageLink(offset + limit)}
                  aria-disabled={offset + limit >= total}
                  className={`btn ${offset + limit >= total ? "pointer-events-none opacity-50" : ""}`}
                >
                  Next
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
