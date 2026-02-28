import { pool } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import CompanyActivity from "@/components/service/CompanyActivity";
import AISummaryCard from "@/components/service/AISummaryCard";
import { safeUrl, whatsappHref, isNonEmpty, isLikelyEmail } from "@/lib/url";
import VoteButtonsClient from "@/components/service/VoteButtonsClient";
import {
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ slug: string }>;

export default async function ServicePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const intl = await getTranslations("ServicePage");


  
  // Banner Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­ Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â±Ã˜Â³Ã˜Â§Ã™â€ž (?submitted=1)
  const submitted = (sp?.submitted as string) === "1";

  // Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© (Ã™â€ Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ meta_json Ã™â€žÃ™â€žÃ˜Â³Ã™Ë†Ã˜Â´Ã™Å Ã˜Â§Ã™â€ž + description Ã™â€žÃ™â€žÃ™â€¦Ã™â€žÃ˜Â®Ã˜Âµ + Ã˜ÂµÃ™Ë†Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â¹Ã˜Â§Ã˜Â±/Ã˜Â§Ã™â€žÃ˜ÂºÃ™â€žÃ˜Â§Ã™Â/Ã˜Â£Ã™ÂÃ˜Â§Ã˜ÂªÃ˜Â§Ã˜Â±)
  const svc = await pool.query(
    `SELECT id, display_name, slug, verified,
            logo_url, avatar_url, cover_url, short_description, ai_summary, phone,  meta_json
     FROM public.services
     WHERE slug=$1
     LIMIT 1`,
    [slug]
  );
  const service = svc.rows[0];
  if (!service) return notFound();

  // Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â±Ã˜Â§Ã˜Â¶Ã™Å Ã˜Â© Ã™â€žÃ™â€žÃ˜ÂµÃ™Ë†Ã˜Â± (Ã˜ÂªÃ˜Â£Ã™Æ’Ã˜Â¯ Ã™â€¦Ã™â€  Ã™Ë†Ã˜Â¬Ã™Ë†Ã˜Â¯Ã™â€¡Ã˜Â§ Ã˜ÂªÃ˜Â­Ã˜Âª public/assets/defaults)
  const cover =
    service.cover_url || "/assets/defaults/cover-r.svg";
  const logo =
    service.logo_url || "/assets/defaults/service-logo-r.svg";
  const avatar =
    service.avatar_url || "/assets/defaults/avatar-r.svg";
  const desc = service.short_description || intl("hero.fallbackDescription");

  // Ã™â€¦Ã™â€žÃ˜Â®Ã˜ÂµÃ˜Â§Ã˜Âª Ã˜Â¹Ã˜Â§Ã™â€¦Ã˜Â©
  const agg = await pool.query(
    `SELECT ROUND(AVG(r.rating)::numeric,2) AS stars_mean,
            COUNT(*) FILTER (WHERE r.status='approved') AS reviews_count
     FROM public.reviews r
     JOIN public.service_nodes sn ON sn.id = r.service_node_id
     WHERE sn.service_id = $1 AND r.status='approved'`,
    [service.id]
  );
  const a = agg.rows[0] ?? { stars_mean: null, reviews_count: 0 };
  const ratingValue =
    a?.stars_mean !== null && a?.stars_mean !== undefined
      ? Number(a.stars_mean).toFixed(1)
      : "-";
  const reviewsCount = Number(a?.reviews_count ?? 0);

  const tv = await pool.query(
    `SELECT ROUND(AVG(t.r_score)::numeric,2)  AS r_score,
            COALESCE(SUM(t.reviews_d30),0)    AS reviews_d30,
            COALESCE(SUM(t.reviews_d365),0)   AS reviews_d365,
            ROUND(AVG(t.qr_share)::numeric,4) AS qr_share,
            ROUND(AVG(t.invite_share)::numeric,4) AS invite_share,
            ROUND(AVG(t.flagged_ratio)::numeric,4) AS flagged_ratio
     FROM public.service_transparency_v t
     JOIN public.service_nodes sn ON sn.id = t.service_node_id
     WHERE sn.service_id = $1`,
    [service.id]
  );
  const transparency = tv.rows[0] ?? ({} as any);

  // Ã˜ÂªÃ™Ë†Ã˜Â²Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ™Å Ã™Å Ã™â€¦Ã˜Â§Ã˜Âª 1..5
  const distq = await pool.query(
    `SELECT r.rating, COUNT(*) AS c
     FROM public.reviews r
     JOIN public.service_nodes sn ON sn.id=r.service_node_id
     WHERE sn.service_id=$1 AND r.status='approved'
     GROUP BY r.rating`,
    [service.id]
  );
  const distMap = new Map<number, number>();
  distq.rows.forEach((row: any) =>
    distMap.set(Number(row.rating), Number(row.c))
  );
  const byStars = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: distMap.get(s) ?? 0,
  }));
// 1) Ã˜Â£Ã™â€¡Ã™â€¦ Ã™â€¦Ã˜Â¯Ã™Å Ã™â€ Ã˜Â© Ã™â€žÃ™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© (Ã˜Â£Ã™Æ’Ã˜Â«Ã˜Â± Ã™ÂÃ˜Â±Ã™Ë†Ã˜Â¹Ã™â€¡Ã˜Â§ Ã™ÂÃ™Å Ã™â€¡Ã˜Â§)
const pc = await pool.query(
  `SELECT city, country, COUNT(*) AS c
   FROM public.service_nodes
   WHERE service_id=$1 AND active=true AND city IS NOT NULL
   GROUP BY city, country
   ORDER BY c DESC
   LIMIT 1`,
  [service.id]
);
const primaryCity = pc.rows[0]?.city || null;
const primaryCountry = pc.rows[0]?.country || null;

// 2) Ã™ÂÃ˜Â¦Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â©
const sc = await pool.query(
  `SELECT category_id FROM public.service_categories WHERE service_id=$1`,
  [service.id]
);
const svcCategoryIds: string[] = sc.rows.map((r:any)=>r.category_id);

// 3) Ã˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª Ã™â€¦Ã˜Â´Ã˜Â§Ã˜Â¨Ã™â€¡Ã˜Â©
// - Ã˜ÂªÃ˜Â´Ã˜Â§Ã˜Â±Ã™Æ’ Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã™Å Ã™â€ Ã˜Â© (Ã™â€žÃ™Ë† Ã™â€¦Ã˜ÂªÃ™Ë†Ã™ÂÃ˜Â±Ã˜Â©)
// - Ã˜Â£Ã™Ë† Ã˜ÂªÃ˜Â´Ã˜Â§Ã˜Â±Ã™Æ’ Ã˜Â£Ã™Å  Ã™ÂÃ˜Â¦Ã˜Â©
// - Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â©
// - Ã˜Â¥Ã˜Â­Ã˜Â¶Ã˜Â§Ã˜Â± slug + Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Ë†Ã˜Â³Ã˜Â·Ã˜Â§Ã˜Âª + Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â¹Ã˜Â§Ã˜Â± + Ã™â€¦Ã˜Â¯Ã™Å Ã™â€ Ã˜Â©
const related = await pool.query(
  `
  WITH svc_cats AS (
    SELECT $1::uuid AS service_id, UNNEST($2::uuid[]) AS category_id
  ), by_city AS (
    SELECT DISTINCT s2.id
    FROM public.services s2
    JOIN public.service_nodes sn2 ON sn2.service_id = s2.id AND sn2.active=true
    WHERE $3::text IS NOT NULL
      AND sn2.city = $3::text
      AND s2.id <> $1::uuid
  ), by_cat AS (
    SELECT DISTINCT s2.id
    FROM public.services s2
    JOIN public.service_categories sc2 ON sc2.service_id = s2.id
    WHERE sc2.category_id = ANY($2::uuid[])
      AND s2.id <> $1::uuid
  ), related_ids AS (
    SELECT id FROM by_city
    UNION
    SELECT id FROM by_cat
  )
  SELECT
    s.id,
    s.display_name,
    s.slug,
    s.logo_url,
    -- Ã™â€¦Ã˜Â¯Ã™Å Ã™â€ Ã˜Â© Ã™â€¦Ã˜Â±Ã˜Â¬Ã˜Â¹Ã™Å Ã˜Â©: Ã˜Â§Ã™â€žÃ˜Â£Ã™Æ’Ã˜Â«Ã˜Â± Ã˜Â¸Ã™â€¡Ã™Ë†Ã˜Â±Ã™â€¹Ã˜Â§ Ã˜Â¨Ã™Å Ã™â€  Ã™ÂÃ˜Â±Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â©
    (SELECT city FROM public.service_nodes snx
      WHERE snx.service_id = s.id AND snx.city IS NOT NULL
      GROUP BY city ORDER BY COUNT(*) DESC LIMIT 1
    ) AS city,
    -- Ã™â€¦Ã˜ÂªÃ™Ë†Ã˜Â³Ã˜Â· Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ™Å Ã™Å Ã™â€¦ Ã™Ë†Ã˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â§Ã˜Âª
    ROUND(AVG(CASE WHEN r.status='approved' THEN r.rating::numeric END),2) AS avg_rating,
    COUNT(*) FILTER (WHERE r.status='approved') AS reviews_count,
    -- R-Score (Ã™â€¦Ã˜ÂªÃ™Ë†Ã˜Â³Ã˜Â· Ã˜Â¹Ã˜Â¨Ã˜Â± Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã™Ë†Ã˜Â¹)
    ROUND(AVG(t.r_score),2) AS r_score
  FROM public.services s
  LEFT JOIN public.service_nodes sn ON sn.service_id = s.id
  LEFT JOIN public.reviews r ON r.service_node_id = sn.id
  LEFT JOIN public.service_transparency_v t ON t.service_node_id = sn.id
  WHERE s.id IN (SELECT id FROM related_ids)
  GROUP BY s.id, s.display_name, s.slug, s.logo_url
  ORDER BY reviews_count DESC NULLS LAST
  LIMIT 8
  `,
  [
    service.id,
    svcCategoryIds.length ? svcCategoryIds : ['00000000-0000-0000-0000-000000000000'], // Ã˜Â­Ã™â€¦Ã˜Â§Ã™Å Ã˜Â© Ã™â€žÃ™Ë† Ã˜Â¨Ã˜Â¯Ã™Ë†Ã™â€  Ã™ÂÃ˜Â¦Ã˜Â§Ã˜Âª
    primaryCity,
  ]
);
const relatedServices = related.rows as any[];

  // --------- Filters & Pagination ----------
  const q = (sp?.q as string)?.trim() || "";
  const stars = sp?.stars as string | undefined;
  const hasMedia = (sp?.has_media as string) === "1";
  const hasOwner = (sp?.has_owner_reply as string) === "1";
  const origin = sp?.origin as string | undefined;
  const sort = (sp?.sort as string) || "recent";
  const limit = 10;
  const offset = parseInt((sp?.offset as string) || "0") || 0;

  // WHERE + values
  const conditions: string[] = ["sn.service_id = $1", "r.status='approved'"];
  const vals: any[] = [service.id];
  let vi = 2;
  if (q) {
    conditions.push(`(r.title ILIKE $${vi} OR r.body ILIKE $${vi})`);
    vals.push("%" + q + "%");
    vi++;
  }
  if (stars) {
    conditions.push(`r.rating = $${vi}`);
    vals.push(parseInt(stars));
    vi++;
  }
  if (hasMedia) {
    conditions.push(
      "EXISTS (SELECT 1 FROM public.review_media m WHERE m.review_id = r.id)"
    );
  }
  if (hasOwner) {
    conditions.push(
      "EXISTS (SELECT 1 FROM public.review_replies rr WHERE rr.review_id=r.id AND rr.is_owner=TRUE)"
    );
  }
  if (origin === "qr") {
    conditions.push("rv.qr_scan_id IS NOT NULL");
  } else if (origin === "invite") {
    conditions.push(
      "(SELECT s.origin FROM public.review_sessions s WHERE s.id = rv.session_id) = 'invite'"
    );
  } else if (origin === "organic") {
    conditions.push(
      "rv.qr_scan_id IS NULL AND (rv.session_id IS NULL OR (SELECT s.origin FROM public.review_sessions s WHERE s.id = rv.session_id) IS NULL)"
    );
  }

  const order =
    (
      {
        recent: "r.submitted_at DESC",
        highest: "r.rating DESC, r.submitted_at DESC",
        lowest: "r.rating ASC, r.submitted_at DESC",
        helpful:
          "(COALESCE(vta.helpful_count,0) - COALESCE(vta.not_helpful_count,0)) DESC, r.submitted_at DESC",
      } as any
    )[sort] || "r.submitted_at DESC";

  // Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¬Ã™â€žÃ˜Â§Ã˜Âª (Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â±Ã™â€šÃ™Å Ã™â€¦)
  const totalq = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM public.reviews r
    JOIN public.service_nodes sn ON sn.id = r.service_node_id
    LEFT JOIN public.review_verifications rv ON rv.review_id = r.id
    WHERE ${conditions.join(" AND ")}
  `,
    vals
  );
  const total = totalq.rows[0]?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  // Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â§Ã˜Âª + Ã˜Â¢Ã˜Â®Ã˜Â± Ã˜Â±Ã˜Â¯ Ã™â€¦Ã™â€¦Ã™â€žÃ™Ë†Ã™Æ’
 const rev = await pool.query(
  `
  SELECT
    r.id, r.rating, r.title, r.body, r.submitted_at,
    (rv.qr_scan_id IS NOT NULL) AS is_qr,
    (SELECT s.origin FROM public.review_sessions s WHERE s.id = rv.session_id) AS session_origin,
    COALESCE(vta.helpful_count,0)::int       AS helpful_count,
    COALESCE(vta.not_helpful_count,0)::int   AS not_helpful_count,
    COALESCE(u.full_name, split_part(u.email,'@',1)) AS author_name,
    COALESCE(u.avatar_url, '/assets/defaults/user-avatar.svg') AS author_avatar,
    lrv.reply_body,
    lrv.reply_created_at
  FROM public.reviews r
  JOIN public.service_nodes sn ON sn.id = r.service_node_id
  LEFT JOIN public.review_verifications rv  ON rv.review_id = r.id
  LEFT JOIN public.review_votes_agg_v vta   ON vta.review_id = r.id
  LEFT JOIN public.latest_owner_reply_v lrv ON lrv.review_id = r.id
  LEFT JOIN public.users u                  ON u.id = r.user_id
  WHERE ${conditions.join(" AND ")}
  ORDER BY ${order}
  LIMIT ${limit} OFFSET ${offset}
  `,
  vals
);

  const reviews = rev.rows as any[];

  // JSON-LD Ã˜Â¨Ã˜Â³Ã™Å Ã˜Â· Ã™â€žÃ™â€žÃ™â‚¬ SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: service.display_name,
    url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/s/${
      service.slug
    }`,
    aggregateRating:
      a.stars_mean && a.reviews_count
        ? {
            "@type": "AggregateRating",
            ratingValue: a.stars_mean,
            reviewCount: a.reviews_count,
          }
        : undefined,
  };

  
  // Ã˜Â§Ã™â€žÃ˜Â³Ã™Ë†Ã˜Â´Ã™Å Ã˜Â§Ã™â€ž Ã™â€¦Ã™â€  meta_json

const meta = (service.meta_json ?? {}) as Record<string, any>;
const socialsObj = (meta.socials ?? {}) as Record<string, any>;
const contactsObj = (meta.contacts ?? {}) as Record<string, any>;

function pick(...candidates: Array<string | undefined | null>): string | undefined {
  for (const c of candidates) {
    if (isNonEmpty(c)) return c!.trim();
  }
  return undefined;
}

const socials = {
  // Website
  website:   pick(meta.website, meta.website_url),

  // Facebook
  facebook:  pick(socialsObj.facebook, meta.facebook, meta.facebook_url),

  // Instagram
  instagram: pick(socialsObj.instagram, meta.instagram, meta.instagram_url),

  // X/Twitter  (Ã™â€žÃ˜Â§Ã˜Â­Ã˜Â¸ Ã˜Â£Ã™â€  meta.socials.x Ã™â€¦Ã™Ë†Ã˜Â¬Ã™Ë†Ã˜Â¯ Ã˜Â¹Ã™â€ Ã˜Â¯Ã™Æ’)
  twitter:   pick(socialsObj.x, socialsObj.twitter, meta.twitter, meta.twitter_url),

  // TikTok
  tiktok:    pick(socialsObj.tiktok, meta.tiktok, meta.tiktok_url),

  // YouTube
  youtube:   pick(socialsObj.youtube, meta.youtube, meta.youtube_url),

  // WhatsApp: Ã™â€ Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Ã™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â± Ã˜Â£Ã™Ë† Ã˜Â±Ã™â€šÃ™â€¦
  whatsapp:  pick(contactsObj.whatsapp_link, contactsObj.whatsapp, meta.whatsapp),

  // Phone
  phone:     pick(contactsObj.phone, meta.phone),

  // Email
  email:     pick(contactsObj.email, meta.email),
};


  // Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã˜Â¹ Ã˜Â±Ã™Ë†Ã˜Â§Ã˜Â¨Ã˜Â· (Ã˜ÂªÃ˜Â¶Ã™Å Ã™Â https:// Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™â€¦Ã™ÂÃ™â€šÃ™Ë†Ã˜Â¯Ã˜Â©)
  const norm = (u?: string) =>
    !u ? undefined : /^(https?:)?\/\//i.test(u) ? u : `https://${u}`;

  // Ã˜Â±Ã™Ë†Ã˜Â§Ã˜Â¨Ã˜Â· Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â±Ã™â€šÃ™Å Ã™â€¦
  const base = (off: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stars) params.set("stars", stars);
    if (hasMedia) params.set("has_media", "1");
    if (hasOwner) params.set("has_owner_reply", "1");
    if (origin) params.set("origin", origin);
    if (sort) params.set("sort", sort);
    if (off > 0) params.set("offset", String(off));
    const qs = params.toString();
    return `/s/${service.slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      {/* SEO JSON-LD */}
      <script
        type="application/ld+json"
        // @ts-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />


{/* Hero cover */}
<div
  className="w-full h-44 md:h-56 rounded-xl mb-4 bg-slate-200 overflow-hidden"
  style={{ backgroundImage: `url('${cover}')`, backgroundSize: "cover", backgroundPosition: "center" }}
/>

      {/* Breadcrumbs */}
      <nav className="text-sm text-slate-500 mb-2">
        <Link href="/" className="hover:underline">
          {intl("breadcrumbs.home")}
        </Link>{" "}
        &rsaquo; <span className="text-slate-700" dir="auto">{service.display_name}</span>
      </nav>

      {/* Header */}
      <header className="flex items-center justify-between gap-4 mb-3">
  <div className="flex items-center gap-3">
    <img src={logo || avatar} alt="logo" className="w-14 h-14 rounded-xl ring-2 ring-white/60 shadow" />
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
  <span>{service.display_name}</span>

  {service.verified && (
    <span className="relative inline-flex items-center">
      <span className="ml-1 text-xs rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 cursor-default group">
        {intl("hero.verified")}
      </span>
      {/* Tooltip */}
      <span
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-md group-hover:block"
        role="tooltip"
      >
        {intl("hero.verifiedTooltip")}
      </span>
    </span>
  )}
</h1>

      <p className="text-sm text-slate-600 line-clamp-2" dir="auto">{desc}</p>
      <div className="text-sm text-slate-600">
        <span className="font-medium">{intl("hero.rating", { rating: ratingValue })}</span>
        <span className="ml-2">{intl("hero.reviews", { count: reviewsCount })}</span>
        {transparency?.r_score && (
          <span className="ml-2">{intl("hero.rScore", { score: transparency.r_score })}</span>
        )}
      </div>
    </div>
  </div>
  <Link href={`/s/${service.slug}/review`} className="btn btn-primary">{intl("hero.writeReview")}</Link>
</header>

      {/* Banner Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­ */}
      {submitted && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-2">
          {intl("submissionBanner.success")}
        </div>
      )}
      <section className="grid md:grid-cols-3 gap-4">
        {/* Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™Ë†Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â£Ã™Å Ã˜Â³Ã˜Â±: Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â§Ã˜Âª */}

        <div className="md:col-span-2 space-y-3">
          <AISummaryCard text={service.ai_summary ?? null} />

          {/* Ã˜Â­Ã˜Â§Ã™â€žÃ˜Â© Ã™ÂÃ˜Â§Ã˜Â±Ã˜ÂºÃ˜Â© */}
          {reviews.length === 0 ? (
            <div className="card p-6 text-center">
              <div className="text-slate-600">{intl("reviews.empty")}</div>
              <Link
                href={`/s/${service.slug}/review`}
                className="btn btn-primary mt-3"
              >
                {intl("reviews.cta")}
              </Link>
            </div>
          ) : (
            reviews.map((r: any) => (
              <article key={r.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <img
                      src={r.author_avatar}
                      alt=""
                      className="w-5 h-5 rounded-full ring-1 ring-slate-200"
                      loading="lazy"
                    />
                    <span className="font-medium">
                      {r.author_name ?? intl("reviews.authorFallback")}
                    </span>
                    <span>
                      {intl("reviews.timestamp", {
                        date: new Date(r.submitted_at).toLocaleString(),
                      })}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-700">{intl("hero.rating", { rating: r.rating })}</div>
                  {r.is_qr && (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      {intl("reviews.viaQR")}
                    </span>
                  )}
                  {r.session_origin === "invite" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {intl("reviews.viaInvite")}
                    </span>
                  )}
                </div>

                {r.title && (
                  <h3 className="mt-2 font-medium" dir="auto">
                    {r.title}
                  </h3>
                )}
                <p className="text-sm text-slate-700" dir="auto">
                  {r.body}
                </p>
                <div className="flex items-center gap-3 mt-2">
                <VoteButtonsClient
                 reviewId={r.id}
                  helpful={r.helpful_count}
                   notHelpful={r.not_helpful_count}
                 /></div>



                {/* Ã˜Â±Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’ Ã˜Â¨Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© */}
                {r.reply_body && (
                  <div className="mt-4 border-l-4 border-indigo-300 pl-3">
                    <div className="text-xs text-slate-500 mb-1">
                      {intl("reviews.replyPrefix", { name: service.display_name })}{" "}
                      {intl("reviews.timestamp", {
                        date: new Date(r.reply_created_at).toLocaleString(),
                      })}
                    </div>
                    <div className="text-sm" dir="auto">
                      {r.reply_body}
                    </div>
                  </div>
                )}
              </article>
            ))
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-slate-600">
              {intl("pagination.range", { from, to, total })}
            </div>
            <div className="flex gap-2">
              <Link
                href={base(Math.max(0, offset - limit))}
                aria-disabled={offset <= 0}
                className={`btn ${
                  offset <= 0 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                {intl("pagination.prev")}
              </Link>
              <Link
                href={base(offset + limit)}
                aria-disabled={offset + limit >= total}
                className={`btn ${
                  offset + limit >= total
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                {intl("pagination.next")}
              </Link>
            </div>
          </div>
        {relatedServices.length > 0 && (
  <section className="mt-8">
    <h2 className="text-lg font-semibold mb-3">{intl("related.title")}</h2>
    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {relatedServices.map((rs:any)=>(
        <Link
          key={rs.id}
          href={`/s/${rs.slug}`}
          className="card p-4 hover:shadow transition-shadow duration-150"
        >
          <div className="flex items-center gap-3">
            <img
              src={rs.logo_url || "/assets/defaults/service-logo-r.svg"}
              alt=""
              className="w-10 h-10 rounded-lg ring-1 ring-slate-200 object-cover"
            />
            <div className="min-w-0">
              <div className="font-medium truncate" dir="auto">{rs.display_name}</div>
              <div className="text-xs text-slate-500 truncate">
                {rs.city || primaryCity || primaryCountry || ""}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-2">
            {(() => {
              const relRating =
                rs.avg_rating !== null && rs.avg_rating !== undefined
                  ? Number(rs.avg_rating).toFixed(1)
                  : "-";
              const relScore =
                rs.r_score !== null && rs.r_score !== undefined
                  ? Number(rs.r_score).toFixed(1)
                  : "-";
              const relReviews = Number(rs.reviews_count ?? 0);
              return intl("related.ratingSummary", {
                rating: relRating,
                score: relScore,
                reviews: relReviews,
              });
            })()}
          </div>
        </Link>
      ))}
    </div>
  </section>
)}
</div>



        <aside className="space-y-3">
          <div className="card p-4">
            <div className="font-medium mb-2">{intl("metrics.ratings")}</div>
            <ul className="space-y-2 text-sm">
              {byStars.map((row) => {
                const share =
                  a.reviews_count > 0
                    ? `${Math.round((row.count / a.reviews_count) * 100)}%`
                    : "0%";
                return (
                  <li key={row.stars} className="flex items-center gap-2">
                    <span className="w-8 text-right">
                      {intl("hero.rating", { rating: row.stars })}
                    </span>
                    <div className="flex-1 h-2 rounded bg-slate-100 overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: share }} />
                    </div>
                    <span className="w-6 text-right">{row.count}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card p-4 space-y-2">
            <div className="font-medium">{intl("metrics.transparency")}</div>
            <dl className="text-sm grid grid-cols-2 gap-2">
              <dt>{intl("metrics.days30")}</dt>
              <dd>{transparency.reviews_d30 ?? 0}</dd>
              <dt>{intl("metrics.days365")}</dt>
              <dd>{transparency.reviews_d365 ?? 0}</dd>
              <dt>{intl("metrics.rScore")}</dt>
              <dd>{transparency.r_score ?? "-"}</dd>
              <dt>{intl("metrics.qrShare")}</dt>
              <dd>{transparency.qr_share ?? 0}</dd>
              <dt>{intl("metrics.inviteShare")}</dt>
              <dd>{transparency.invite_share ?? 0}</dd>
              <dt>{intl("metrics.flagged")}</dt>
              <dd>{transparency.flagged_ratio ?? 0}</dd>
            </dl>
            <div className="text-xs text-slate-500">{intl("metrics.note")}</div>
          </div>

          <CompanyActivity
            d30={transparency.reviews_d30 ?? 0}
            d365={transparency.reviews_d365 ?? 0}
            rscore={transparency.r_score ?? null}
          />

          {/* Social & Links */}
          {(socials.website ||
            socials.facebook ||
            socials.instagram ||
            socials.twitter ||
            socials.tiktok ||
            socials.youtube ||
            socials.whatsapp ||
            socials.phone ||
            socials.email) && (
            <div className="card p-4 space-y-3">
              <div className="font-medium">Social & Links</div>
              <div className="flex flex-wrap gap-2 text-sm">
                {socials.website && (
                  <a
                    href={safeUrl(socials.website)!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-soft"
                  >
                    <Globe className="size-4" />
                    <span className="ml-1">Website</span>
                  </a>
                )}
                {socials.facebook && (
                  <a
                    href={safeUrl(socials.facebook)!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-soft"
                  >
                    <Facebook className="size-4" />
                    <span className="ml-1">Facebook</span>
                  </a>
                )}
                {socials.instagram && (
                  <a
                    href={safeUrl(socials.instagram)!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-soft"
                  >
                    <Instagram className="size-4" />
                    <span className="ml-1">Instagram</span>
                  </a>
                )}
                {socials.twitter && (
                  <a
                    href={safeUrl(socials.twitter)!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-soft"
                  >
                    <Twitter className="size-4" />
                    <span className="ml-1">X / Twitter</span>
                  </a>
                )}
                {socials.youtube && (
                  <a
                    href={safeUrl(socials.youtube)!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-soft"
                  >
                    <Youtube className="size-4" />
                    <span className="ml-1">YouTube</span>
                  </a>
                )}
                {socials.tiktok && (
                  <a
                    href={safeUrl(socials.tiktok)!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-soft"
                  >
                    <span className="font-medium">TikTok</span>
                  </a>
                )}
                {socials.whatsapp && (
                  <a
                    href={whatsappHref(socials.whatsapp)!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-soft"
                  >
                    <MessageCircle className="size-4" />
                    <span className="ml-1">WhatsApp</span>
                  </a>
                )}
                {socials.phone && (
                  <a href={`tel:${socials.phone}`} className="btn btn-soft">
                    <Phone className="size-4" />
                    <span className="ml-1">{socials.phone}</span>
                  </a>
                )}
                {isLikelyEmail(socials.email) && (
                  <a href={`mailto:${socials.email}`} className="btn btn-soft">
                    <Mail className="size-4" />
                    <span className="ml-1">{socials.email}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}



