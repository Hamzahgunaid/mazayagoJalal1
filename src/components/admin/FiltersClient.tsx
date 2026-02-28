
"use client";
import { useMemo, useState } from "react";

export type Filters = {
  country?: string;
  city?: string;
  category_slug?: string;
  channel?: "qr"|"invite"|"organic"|"";
  from?: string;
  to?: string;
};

export default function FiltersClient({ initial, onApply }:{ initial?: Partial<Filters>; onApply:(f:Filters)=>void }){
  const [f,setF] = useState<Filters>({ ...initial } as Filters);

  function update<K extends keyof Filters>(k:K, v:any){ setF(prev => ({ ...prev, [k]: v })); }
  function apply(){ onApply(f); }

  return (
    <div className="card grid md:grid-cols-3 gap-3">
      <input placeholder="Country (2-letter)" value={f.country||""} onChange={e=>update("country", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
      <input placeholder="City" value={f.city||""} onChange={e=>update("city", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
      <input placeholder="Category slug" value={f.category_slug||""} onChange={e=>update("category_slug", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
      <select value={f.channel||""} onChange={e=>update("channel", e.target.value as any)} className="h-9 rounded-md border border-slate-300 px-2">
        <option value="">Any channel</option>
        <option value="qr">QR</option>
        <option value="invite">Invite</option>
        <option value="organic">Organic</option>
      </select>
      <input type="date" value={f.from||""} onChange={e=>update("from", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
      <input type="date" value={f.to||""} onChange={e=>update("to", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
      <div className="md:col-span-3">
        <button onClick={apply} className="btn btn-primary">Apply Filters</button>
      </div>
    </div>
  );
}
