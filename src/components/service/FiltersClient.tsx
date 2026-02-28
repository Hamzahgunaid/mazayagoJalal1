"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function FiltersClient(){
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(sp.get("q")||"");
  const [stars, setStars] = useState(sp.get("stars")||"");
  const [origin, setOrigin] = useState(sp.get("origin")||"");
  const [sort, setSort] = useState(sp.get("sort")||"recent");

  function apply(){
    const p = new URLSearchParams(sp.toString());
    q ? p.set("q", q) : p.delete("q");
    stars ? p.set("stars", stars) : p.delete("stars");
    origin ? p.set("origin", origin) : p.delete("origin");
    p.set("sort", sort);
    router.push(pathname + "?" + p.toString());
  }

  return (
    <div className="card p-3 flex flex-wrap gap-2 items-end">
      <label className="flex flex-col">
        <span className="text-xs">Search</span>
        <input value={q} onChange={e=>setQ(e.target.value)} className="input h-9" placeholder="Find reviews..." />
      </label>
      <label className="flex flex-col">
        <span className="text-xs">Stars</span>
        <select value={stars} onChange={e=>setStars(e.target.value)} className="input h-9">
          <option value="">All</option>
          <option value="5">5★</option><option value="4">4★</option>
          <option value="3">3★</option><option value="2">2★</option><option value="1">1★</option>
        </select>
      </label>
      <label className="flex flex-col">
        <span className="text-xs">Origin</span>
        <select value={origin} onChange={e=>setOrigin(e.target.value)} className="input h-9">
          <option value="">All</option>
          <option value="qr">QR</option>
          <option value="invite">Invite</option>
          <option value="organic">Organic</option>
        </select>
      </label>
      <label className="flex flex-col">
        <span className="text-xs">Sort</span>
        <select value={sort} onChange={e=>setSort(e.target.value)} className="input h-9">
          <option value="recent">Most recent</option>
          <option value="highest">Highest</option>
          <option value="lowest">Lowest</option>
          <option value="helpful">Most helpful</option>
        </select>
      </label>
      <button onClick={apply} className="btn btn-primary h-9">Apply</button>
    </div>
  );
}
