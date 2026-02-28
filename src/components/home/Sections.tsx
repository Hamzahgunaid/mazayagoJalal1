"use client";

import useSWR from "swr";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import CountrySelect from "@/components/common/CountrySelect";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HomeSections() {
  const router = useRouter();
  const searchT = useTranslations("HomeSections.search");
  const categoriesT = useTranslations("HomeSections.categories");
  const bestT = useTranslations("HomeSections.best");
  const reviewsT = useTranslations("HomeSections.reviews");

  const [country, setCountry] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const { data: highlights } = useSWR(
    `/api/home/highlights?country=${country}&q=${encodeURIComponent(q)}`,
    fetcher
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  function scroll(dx: number) {
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  }

  return (
    <div className="space-y-10">
      {/* Search + Country */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 border rounded-xl p-2 bg-white">
          <input
            className="flex-1 outline-none px-2"
            placeholder={searchT("placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-outline">{searchT("button")}</button>
        </div>

        <CountrySelect
          variant="native"
          value={country}
          onChange={(code) => setCountry(code)}
          placeholder={searchT("countryPlaceholder")}
        />
      </div>

      {/* Section 1: categories horizontal */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{categoriesT("title")}</h2>
          <div className="hidden md:flex items-center gap-2">
            <button
              className="btn btn-outline"
              onClick={() => scroll(-400)}
              aria-label={categoriesT("scrollLeft")}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="btn btn-outline"
              onClick={() => scroll(400)}
              aria-label={categoriesT("scrollRight")}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto no-scrollbar pb-2 whitespace-nowrap"
        >
          {(highlights?.categories || []).map((c: any) => (
            <a key={c.id} href={`/category/${c.id}`} className="chip hover:bg-slate-100">
              <Icon name={c.icon_key} className="mr-2 h-4 w-4 inline" />
              {c.name}
            </a>
          ))}
        </div>
      </section>

      {/* Section 2: Best services */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{bestT("title")}</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(highlights?.best_services ?? []).map((s: any) => {
            const ratingValue =
              typeof s.avg_rating === "number" ? s.avg_rating.toFixed(1) : s.avg_rating ?? "-";
            const scoreValue =
              typeof s.r_score === "number" ? s.r_score.toFixed(1) : s.r_score ?? "-";
            const reviewsCount =
              typeof s.reviews === "number" ? s.reviews : Number(s.reviews) || 0;

            return (
              <Link
                key={s.id}
                href={`/s/${s.slug}`}
                className="card p-4 hover:shadow transition-shadow duration-150 block rounded-lg"
                aria-label={bestT("openService", { name: s.name })}
              >
                <div className="space-y-1">
                  <div className="font-semibold line-clamp-1" dir="auto">
                    {s.name}
                  </div>
                  <div className="text-sm text-slate-600 line-clamp-1">
                    {[s.city, s.country].filter(Boolean).join(", ")}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {bestT("ratingSummary", {
                      rating: ratingValue,
                      score: scoreValue,
                      reviews: reviewsCount,
                    })}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/s/${s.slug}/review`);
                    }}
                  >
                    {bestT("writeReview")}
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Section 3: Latest reviews */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{reviewsT("title")}</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(highlights?.latest_reviews || []).map((r: any) => {
            const href = r.service_slug
              ? `/s/${r.service_slug}`
              : r.service_id
              ? `/service/${r.service_id}`
              : r.service_node_id
              ? `/node/${r.service_node_id}`
              : "#";
            const displayName = r.node_name || reviewsT("fallbackName");

            return (
              <Link
                key={r.id}
                href={href}
                className="card block hover:shadow-md transition rounded-lg"
                aria-label={reviewsT("open", { name: displayName })}
              >
                <div className="font-semibold" dir="auto">
                  {r.node_name}
                </div>
                <div className="text-sm text-slate-700 line-clamp-2" dir="auto">
                  {r.title || r.body || reviewsT("fallbackReview")}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {new Date(r.submitted_at).toLocaleDateString()}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
