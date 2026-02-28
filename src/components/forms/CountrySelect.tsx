"use client";
import { useEffect, useState } from "react";

type Country = { code: string; name: string };

export default function CountrySelect({
  name = "country",
  defaultValue = "",
  className = "",
}: {
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  const [items, setItems] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/countries", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) {
          // نقبل الشكلين: مصفوفة [{code,name}] أو كائن {SA:"Saudi Arabia", ...}
          const arr: Country[] = Array.isArray(j)
            ? j
            : Object.entries(j).map(([code, name]) => ({
                code,
                name: String(name),
              }));
          setItems(arr);
        }
      } catch {
        // Fallback بسيط في حال فشل الـ API
        setItems([
          { code: "SA", name: "Saudi Arabia" },
          { code: "AE", name: "United Arab Emirates" },
          { code: "QA", name: "Qatar" },
          { code: "KW", name: "Kuwait" },
          { code: "OM", name: "Oman" },
          { code: "BH", name: "Bahrain" },
          { code: "EG", name: "Egypt" },
          { code: "JO", name: "Jordan" },
          { code: "IQ", name: "Iraq" },
          { code: "TR", name: "Türkiye" },
          { code: "US", name: "United States" },
          { code: "GB", name: "United Kingdom" },
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 ${className}`}
    >
      {!defaultValue && <option value="">Select country…</option>}
      {items.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
