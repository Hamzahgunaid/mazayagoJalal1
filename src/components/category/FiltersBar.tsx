"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CountrySelect from "@/components/common/CountrySelect";
import CitySelect from "@/components/common/CitySelect";

type Props = {
  initial: {
    q: string;
    country: string;
    city: string;
    verifiedOnly: boolean;
    minStars: number;
    sort: string;
  };
};

const sorts = [
  { v: "most_reviewed", label: "Most reviewed" },
  { v: "top_rated", label: "Top rated" },
  { v: "recently_reviewed", label: "Recently reviewed" },
  { v: "newest", label: "Newest services" },
];

export default function FiltersBar({ initial }: Props) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [q, setQ] = useState(initial.q || "");
  const [country, setCountry] = useState(initial.country || "");
  const [city, setCity] = useState(initial.city || "");
  const [verified, setVerified] = useState(initial.verifiedOnly || false);
  const [stars, setStars] = useState<number>(initial.minStars || 0);
  const [sort, setSort] = useState(initial.sort || "most_reviewed");

  // عند تغيير دولة، نفرّغ المدينة
  useEffect(() => { setCity(""); }, [country]);

  function push() {
    const p = new URLSearchParams(sp.toString());
    const setOrDel = (k: string, v: string | number | boolean) => {
      if (!v || v === "" || v === 0 || v === false) p.delete(k);
      else p.set(k, String(v));
    };
    setOrDel("q", q.trim());
    setOrDel("country", country);
    setOrDel("city", city);
    setOrDel("verified", verified ? 1 : "");
    setOrDel("stars", stars || "");
    setOrDel("sort", sort || "");
    p.delete("offset"); // ارجع لأول صفحة عند تغيير الفلاتر
    router.push(`${pathname}?${p.toString()}`);
  }

  const activeChips = useMemo(() => {
    const z: string[] = [];
    if (q.trim()) z.push(`q="${q.trim()}"`);
    if (country) z.push(`country=${country}`);
    if (city) z.push(`city=${city}`);
    if (verified) z.push(`verified`);
    if (stars) z.push(`≥ ${stars}★`);
    if (sort && sort !== "most_reviewed") z.push(`sort=${sort}`);
    return z;
  }, [q, country, city, verified, stars, sort]);

  return (
    <section className="card p-4 space-y-3">
      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2 flex items-center gap-2 border rounded-xl p-2 bg-white">
          <input
            className="flex-1 outline-none px-2"
            placeholder="Search service name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-outline" onClick={push}>Search</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CountrySelect
            variant="native"
            value={country}
            onChange={(code) => setCountry(code)}
            placeholder="All countries"
          />
          <CitySelect
            country={country || undefined}
            value={city || undefined}
            onChange={(v) => setCity(v || "")}
            placeholder="All cities"
            variant="native"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            className="h-9 rounded-lg border border-slate-300 px-2 bg-white text-sm"
            value={stars}
            onChange={(e) => setStars(Number(e.target.value))}
          >
            <option value={0}>Any rating</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{`≥ ${n}★`}</option>
            ))}
          </select>

          <select
            className="h-9 rounded-lg border border-slate-300 px-2 bg-white text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {sorts.map((s) => (
              <option key={s.v} value={s.v}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
          />
          Verified only
        </label>

        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1 text-xs">
            {activeChips.length === 0 ? (
              <span className="text-slate-500">No filters</span>
            ) : (
              activeChips.map((c, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100">{c}</span>
              ))
            )}
          </div>
          <button
            className="btn"
            onClick={() => {
              setQ(""); setCountry(""); setCity("");
              setVerified(false); setStars(0); setSort("most_reviewed");
              const p = new URLSearchParams();
              // لا شيء → يزيل كل الفلاتر
              window.location.href = `${pathname}`;
            }}
          >
            Clear
          </button>
          <button className="btn btn-primary" onClick={push}>Apply</button>
        </div>
      </div>
    </section>
  );
}
