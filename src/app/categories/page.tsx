"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import CountrySelect from "@/components/common/CountrySelect";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useTranslations } from "next-intl";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CategoriesPage() {
  const heroT = useTranslations("CategoriesPage.hero");
  const searchT = useTranslations("CategoriesPage.search");
  const topT = useTranslations("CategoriesPage.topServices");

  const [country, setCountry] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const { data } = useSWR(
    `/api/categories/with-nodes?country=${country}&q=${encodeURIComponent(q)}`,
    fetcher
  );

  const roots = useMemo(() => Object.values(data?.groups || {}), [data]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl p-8 border bg-gradient-to-br from-indigo-50 to-sky-50">
        <h1 className="text-2xl font-bold mb-2">{heroT("title")}</h1>
        <p className="text-slate-600">{heroT("subtitle")}</p>
      </section>

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(roots as any[]).map((root: any) => (
          <div key={root.root_id} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name={root.root_icon_key} className="w-5 h-5 text-slate-600" />
              <h2 className="font-semibold" dir="auto">
                {root.root_name}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(root.children || []).map((sub: any) => (
                <div key={sub.sub_id} className="rounded-xl border p-3 bg-white">
                  <div className="text-sm font-medium" dir="auto">
                    <Link href={`/category/${sub.sub_slug || sub.sub_id}`} className="hover:underline">
                      {sub.sub_name}
                    </Link>
                  </div>

                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                    {(sub.top_services || []).map((svc: any, i: number) => {
                      const location = [svc.city, svc.country].filter(Boolean).join(" · ");
                      const ratingValue =
                        typeof svc.avg_rating === "number"
                          ? svc.avg_rating.toFixed(1)
                          : svc.avg_rating ?? "—";
                      const reviewsCount =
                        typeof svc.reviews === "number" ? svc.reviews : Number(svc.reviews) || 0;

                      return (
                        <li key={`${svc.slug}-${i}`} className="flex items-center gap-2">
                          <span className="text-slate-400">{i + 1}.</span>
                          <Link
                            href={`/s/${svc.slug}`}
                            className="hover:underline"
                            title={`${svc.name}${location ? ` - ${location}` : ""}`}
                            dir="auto"
                          >
                            {svc.name}
                          </Link>
                          <span className="ml-auto text-slate-500 whitespace-nowrap">
                            {topT("rating", { rating: ratingValue })} · {topT("reviews", { count: reviewsCount })}
                          </span>
                        </li>
                      );
                    })}

                    {(!sub.top_services || sub.top_services.length === 0) && (
                      <li className="text-slate-400">{topT("none")}</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
