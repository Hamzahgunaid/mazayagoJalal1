import { pool } from "@/lib/db";
import Link from "next/link";
import FiltersBar from "@/components/category/FiltersBar";
import LatestReviewedSlider from "@/components/category/LatestReviewedSlider";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function num(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  // ----- قراءة الفئة -----
  const catRes = await pool.query(
    `
    SELECT id, slug, name_en, name_ar, icon_set, icon_key
    FROM public.category_tree_v
    WHERE slug = $1 OR id::text = $1
    LIMIT 1
  `,
    [slug] // ✅ استخدم slug الصحيح
  );
  const category = catRes.rows[0];
  if (!category) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Category not found</h1>
        <Link href="/categories" className="text-indigo-700 hover:underline">
          Back to categories
        </Link>
      </div>
    );
  }

  // ----- فلاتر -----
  const q = (sp?.q as string)?.trim() || "";
  const country = ((sp?.country as string) || "").trim().toUpperCase();
  const city = ((sp?.city as string) || "").trim();
  const verifiedOnly = (sp?.verified as string) === "1";
  const minStars = num(sp?.stars, 0); // 0..5
  const sort = (sp?.sort as string) || "most_reviewed"; // most_reviewed|top_rated|recently_reviewed|newest
  const limit = 12;
  const offset = Math.max(0, num(sp?.offset, 0));

  // ----- شروط الاستعلام -----
  const where: string[] = ["e.category_id = $1"];
  const values: any[] = [category.id];
  let vi = 2;

  if (country) {
    where.push(`sn.country = $${vi}`);
    values.push(country);
    vi++;
  }
  if (city) {
    where.push(`sn.city = $${vi}`);
    values.push(city);
    vi++;
  }
  if (q) {
    where.push(`(s.display_name ILIKE $${vi})`);
    values.push("%" + q + "%");
    vi++;
  }
  if (verifiedOnly) {
    where.push(`s.verified = TRUE`);
  }

  // ترتيب النتائج (لاحظ الأسماء بدون alias s.)
  const orderBy =
    (
      {
        most_reviewed:
          "reviews_count DESC NULLS LAST, avg_rating DESC NULLS LAST, display_name ASC",
        top_rated:
          "avg_rating DESC NULLS LAST, reviews_count DESC NULLS LAST, display_name ASC",
        recently_reviewed:
          "last_reviewed_at DESC NULLS LAST, reviews_count DESC NULLS LAST",
        newest: "svc_created_at DESC NULLS LAST", // ✅ بدل s.created_at
      } as Record<string, string>
    )[sort] || "reviews_count DESC NULLS LAST";

  // ----- الاستعلام الرئيسي (تجميع على مستوى service) -----
  const baseSQL = `
    WITH e AS (
      SELECT service_node_id, category_id
      FROM public.effective_node_categories_v
      WHERE category_id = $1
    ),
    joined AS (
      SELECT
        s.id                           AS service_id,
        s.slug,
        s.display_name,
        s.verified,
        s.logo_url,
        s.avatar_url,
        s.cover_url,
        s.short_description,
        MAX(sn.city)                   AS city,
        MAX(sn.country)                AS country,
        COUNT(r.id)                    AS reviews_count,
        ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
        MAX(r.submitted_at)            AS last_reviewed_at,
        MIN(s.created_at)              AS svc_created_at     -- ✅ للت排序 newest
      FROM e
      JOIN public.service_nodes sn ON sn.id = e.service_node_id
      JOIN public.services s       ON s.id = sn.service_id
      LEFT JOIN public.service_reviews_clean_v r
        ON r.service_node_id = sn.id AND r.status='approved'
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      GROUP BY
        s.id, s.slug, s.display_name, s.verified,
        s.logo_url, s.avatar_url, s.cover_url, s.short_description
    )
    SELECT *
    FROM joined
    ${minStars > 0 ? `WHERE avg_rating >= ${minStars}` : ""}
  `;

  // إجمالي النتائج
  const totalQ = await pool.query(
    `SELECT COUNT(*)::int AS total FROM (${baseSQL}) Z`,
    values
  );
  const total = totalQ.rows[0]?.total ?? 0;

  // صفحة النتائج
  const pageQ = await pool.query(
    `
    SELECT *
    FROM (${baseSQL}) Z
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `,
    values
  );
  const services = pageQ.rows;

  // ----- سلايدر آخر المراجعات -----
  const sliderQ = await pool.query(
    `
    WITH e AS (
      SELECT service_node_id, category_id
      FROM public.effective_node_categories_v
      WHERE category_id = $1
    )
    SELECT
      r.id,
      r.rating,
      r.title,
      r.body,
      r.submitted_at,
      s.slug,
      s.display_name,
      sn.city,
      sn.country
    FROM public.service_reviews_clean_v r
    JOIN public.service_nodes sn ON sn.id = r.service_node_id
    JOIN public.services s       ON s.id = sn.service_id
    JOIN e ON e.service_node_id  = sn.id
    WHERE r.status='approved'
    ORDER BY r.submitted_at DESC
    LIMIT 10
  `,
    [category.id]
  );
  const latestReviews = sliderQ.rows as any[];

  // ----- JSON-LD -----
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${baseUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Categories",
        item: `${baseUrl}/categories`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name_en,
        item: `${baseUrl}/category/${category.slug}`,
      },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: services.map((s: any, i: number) => ({
      "@type": "ListItem",
      position: i + 1 + offset,
      url: `${baseUrl}/s/${s.slug}`,
      name: s.display_name,
    })),
  };

  // ----- روابط الترقيم -----
  const pageLink = (off: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (country) p.set("country", country);
    if (city) p.set("city", city);
    if (verifiedOnly) p.set("verified", "1");
    if (minStars) p.set("stars", String(minStars));
    if (sort) p.set("sort", sort);
    if (off > 0) p.set("offset", String(off));
    const qs = p.toString();
    return `/category/${category.slug}${qs ? `?${qs}` : ""}`;
  };

  // ----- Fallbacks للصور -----
  const defaultLogo = "/assets/defaults/service-logo-r.svg";

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      {/* Breadcrumbs */}
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        <span>›</span>{" "}
        <Link href="/categories" className="hover:underline">
          Categories
        </Link>{" "}
        <span>›</span>{" "}
        <span className="text-slate-700">{category.name_en}</span>
      </nav>

      {/* Hero */}
      <header className="rounded-2xl border p-5 bg-gradient-to-br from-indigo-50 to-sky-50">
        <div className="flex items-center gap-3">
          <Icon
            set={category.icon_set}
            name={category.icon_key}
            className="size-5 text-slate-700"
          />
          <h1 className="text-2xl font-semibold">{category.name_en}</h1>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Link href="/s/new" className="btn btn-primary">
            Add your service
          </Link>
        </div>
      </header>

      {/* Filters */}
      <FiltersBar
        initial={{ q, country, city, verifiedOnly, minStars, sort }}
      />

     

      {/* Services List */}
      <section className="space-y-3">
        {services.length === 0 ? (
          <div className="card p-6 text-center">
            <div className="text-slate-600">
              No services found in this category.
            </div>
            <div className="mt-3">
              <Link href={pageLink(0)} className="btn">
                Clear filters
              </Link>{" "}
              <Link href="/s/new" className="btn btn-primary">
                Add your service
              </Link>
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
                      src={s.logo_url || s.avatar_url || defaultLogo}
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

            {/* Pagination */}
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
       {/* Latest reviews slider */}
      {latestReviews.length > 0 && (
        <LatestReviewedSlider items={latestReviews} />
      )}
    </div>
  );
}
