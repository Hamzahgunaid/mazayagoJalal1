"use client";
import { useEffect, useMemo, useState } from "react";

export default function CitySelect({
  country,           // iso2 مثل "YE"
  value,
  onChange,
  placeholder = "Select a city...",
}: {
  country?: string | null;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  const [data, setData] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    let active = true;
    if (!country) { setData([]); return; }
    (async () => {
      const r = await fetch(`/api/cities?country=${country}&q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const j = await r.json();
      if (!active) return;
      setData(j.cities || []);
    })();
    return () => { active = false; };
  }, [country, q]);

  const selected = useMemo(() => (data || []).find(c => c === value) || null, [data, value]);

  return (
    <div className="relative">
      <button type="button"
        disabled={!country}
        onClick={() => setOpen(v => !v)}
        className="input w-full text-left disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {selected || placeholder}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow">
          <div className="p-2">
            <input
              className="input w-full"
              placeholder="Search city…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-auto">
            {data.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => { onChange?.(c); setOpen(false); }}
                className="w-full px-3 py-2 text-left hover:bg-slate-50"
              >
                {c}
              </button>
            ))}
            {data.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}
