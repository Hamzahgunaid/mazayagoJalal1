"use client";

import { useState } from "react";
import CountrySelect from "@/components/common/CountrySelect";
import CitySelect from "@/components/common/CitySelect";

export default function NodeLocationFields({
  onChange,
  defaultCountry,
  defaultCity,
}: {
  onChange?: (v: { country?: string|null; city?: string|null }) => void;
  defaultCountry?: string | null;
  defaultCity?: string | null;
}) {
  const [country, setCountry] = useState<string | null>(defaultCountry ?? null);
  const [city, setCity]       = useState<string | null>(defaultCity ?? null);

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm text-slate-600 mb-1">Country</label>
        <CountrySelect
          value={country ?? undefined}
          onChange={(c) => { setCountry(c); onChange?.({ country: c, city }); }}
        />
        <input type="hidden" name="node_country" value={country || ""} />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">City</label>
        <CitySelect
          country={country}
          value={city ?? undefined}
          onChange={(c) => { setCity(c); onChange?.({ country, city: c }); }}
        />
        <input type="hidden" name="node_city" value={city || ""} />
      </div>
    </div>
  );
}
