import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import SectionCard from "@/components/me/SectionCard";
import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

type OfferRow = {
  id: string;
  slug: string | null;
  title: string | null;
  type: string | null;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
};

export default async function MeHome() {
  const user = await currentUser();
  if (!user?.id) redirect("/sign-in");

  const t = await getTranslations("MePage");
  const locale = await getLocale();
  const uid = user.id;

  const [profileRes, statsRes, offersRes] = await Promise.all([
    pool.query(
      `SELECT full_name, display_name, avatar_url, country, email
         FROM public.users
        WHERE id=$1`,
      [uid]
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM public.services WHERE owner_user_id=$1) AS services_count,
         (SELECT COUNT(*) FROM public.service_nodes sn JOIN public.services s ON s.id=sn.service_id WHERE s.owner_user_id=$1) AS nodes_count,
         (SELECT COUNT(*) FROM public.contests WHERE created_by_user_id=$1) AS offers_count,
         (SELECT COUNT(*) FROM public.reviews r JOIN public.service_nodes sn ON sn.id=r.service_node_id JOIN public.services s ON s.id=sn.service_id WHERE s.owner_user_id=$1 AND r.status='approved') AS reviews_count`,
      [uid]
    ),
    pool.query(
      `SELECT id, slug, title, type, status, starts_at, ends_at, created_at
         FROM public.contests
        WHERE created_by_user_id=$1
        ORDER BY created_at DESC
        LIMIT 3`,
      [uid]
    ),
  ]);

  const profile = profileRes.rows[0] || {};
  const stats = statsRes.rows[0] || {};
  const offers = (offersRes.rows as OfferRow[]) || [];

  const heroName = profile.full_name || user.full_name || t("fallbacks.accountName");
  const heroSubtitle = profile.display_name
    ? `@${profile.display_name}`
    : profile.email || user.email || "";
  const avatar = profile.avatar_url
    ? encodeURI(profile.avatar_url.trim())
    : "/assets/defaults/avatar-r.svg";

  const statItems = [{ label: t("stats.challenges"), value: Number(stats.offers_count ?? 0) }];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={avatar}
              alt=""
              className="h-16 w-16 rounded-2xl border border-white/20 object-cover"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t("hero.badge")}</p>
              <h1 className="text-2xl font-semibold md:text-3xl">{heroName}</h1>
              <p className="text-sm text-white/70">{heroSubtitle || t("hero.completeProfile")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/me/profile"
              className="inline-flex items-center rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              {t("hero.editProfile")}
            </Link>
            <Link
              href="/offers/new"
              className="inline-flex items-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:-translate-y-0.5"
            >
              {t("hero.createChallenge")}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statItems.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <SectionCard
        title={t("challenges.title")}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/offers/new"
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("hero.createChallenge")}
            </Link>
            <Link
              href="/me/offers"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              {t("challenges.viewAll")}
            </Link>
          </div>
        }
      >
        <div className="space-y-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-2xl border border-slate-100 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{offer.title || t("challenges.untitled")}</div>
                  <div className="text-xs text-slate-500">
                    {offer.type || t("challenges.fallbackType")} - {t("challenges.started")}{" "}
                    {formatDate(offer.starts_at || offer.created_at, locale)}
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {offer.status || t("challenges.statusDraft")}
                </span>
              </div>
              <div className="mt-3 flex gap-3 text-xs">
                {offer.slug && (
                  <Link
                    href={`/offers/${offer.slug}/manage`}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    {t("challenges.manage")}
                  </Link>
                )}
                {offer.slug && (
                  <Link
                    href={`/offers/${offer.slug}/status`}
                    className="font-semibold text-slate-600 hover:underline"
                  >
                    {t("challenges.analytics")}
                  </Link>
                )}
              </div>
            </div>
          ))}
          {!offers.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 space-y-3">
              <p>{t("challenges.empty")}</p>
              <Link
                href="/offers/new"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:-translate-y-0.5"
              >
                {t("challenges.createFirst")}
              </Link>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function formatDate(value?: string | Date | null, locale?: string) {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}
