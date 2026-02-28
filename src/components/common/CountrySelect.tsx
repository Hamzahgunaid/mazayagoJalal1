"use client";

import { useEffect, useMemo, useState } from "react";

type Country = { iso2: string; name_en: string };
type Props = {
  value?: string;
  onChange?: (code: string) => void;
  placeholder?: string;
  className?: string;
  /** "native" = <select> دروب داون | "popover" = السلوك السابق */
  variant?: "native" | "popover";
};

export default function CountrySelect({
  value,
  onChange,
  placeholder = "Select a country...",
  className = "",
  variant = "native",            // اجعل الديفولت دروب داون
}: Props) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/countries", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) setCountries(Array.isArray(j) ? j : j.countries || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return countries;
    const needle = q.trim().toLowerCase();
    return countries.filter(
      (c) =>
        c.name_en.toLowerCase().includes(needle) ||
        c.iso2.toLowerCase().includes(needle)
    );
  }, [countries, q]);

  // ====== وضع الدروب داون الأصلي ======
  if (variant === "native") {
    return (
      <select
        className={`h-9 rounded-lg border border-slate-300 px-2 bg-white text-sm ${className}`}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label="Country"
        disabled={loading}
      >
        <option value="">{placeholder}</option>
        {filtered.map((c) => (
          <option key={c.iso2} value={c.iso2}>
            {c.name_en} ({c.iso2})
          </option>
        ))}
      </select>
    );
  }

  // ====== (اختياري) وضع البوب-أب السابق ======
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className="h-9 w-full rounded-lg border border-slate-300 px-2 bg-white text-sm text-left"
      >
        {value
          ? `${countries.find((c) => c.iso2 === value)?.name_en || value} (${value})`
          : placeholder}
      </button>
      {/* القائمة المنبثقة البسيطة */}
      <div className="absolute z-20 mt-2 w-full rounded-lg border bg-white shadow">
        <div className="p-2">
          <input
            className="w-full h-8 rounded-md border border-slate-300 px-2 text-sm"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="max-h-64 overflow-auto text-sm">
          {filtered.map((c) => (
            <li
              key={c.iso2}
              className="px-3 py-2 hover:bg-slate-50 cursor-pointer"
              onClick={() => onChange?.(c.iso2)}
            >
              {c.name_en} <span className="text-slate-500">({c.iso2})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
