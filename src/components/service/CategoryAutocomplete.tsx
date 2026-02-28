"use client";

import { useEffect, useMemo, useState } from "react";

type Item = { id:string; slug:string; name_en:string; name_ar?:string; icon_key?:string };

export default function CategoryAutocomplete({
  value,
  onChange,
}:{
  value: string[];            // slugs
  onChange: (slugs:string[])=>void;
}){
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(()=>{
    let alive = true;
    async function run(){
      setLoading(true);
      const r = await fetch(`/api/categories/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if(!alive) return;
      setItems(j.items||[]);
      setLoading(false);
    }
    run();
    return ()=>{ alive=false; }
  },[q]);

  const remaining = useMemo(()=> items.filter(i=>!value.includes(i.slug)), [items, value]);

  function add(slug:string){
    if(!value.includes(slug)) onChange([...value, slug]);
    setQ("");
  }
  function remove(slug:string){
    onChange(value.filter(s=>s!==slug));
  }

  return (
    <div>
      <div className="text-sm mb-1">Categories</div>

      {/* selected tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((slug)=>(
          <span key={slug} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
            {slug}
            <button onClick={()=>remove(slug)} className="hover:text-rose-700">✕</button>
          </span>
        ))}
      </div>

      <input
        className="input"
        placeholder="Search categories…"
        value={q}
        onChange={(e)=>setQ(e.target.value)}
      />

      {/* results */}
      {q && (
        <div className="mt-2 border rounded-md bg-white max-h-56 overflow-auto">
          {loading && <div className="p-2 text-sm text-slate-500">Loading…</div>}
          {!loading && remaining.length===0 && <div className="p-2 text-sm text-slate-500">No matches</div>}
          {!loading && remaining.map(i=>(
            <button key={i.id} onClick={()=>add(i.slug)} className="w-full text-left px-3 py-2 hover:bg-slate-50">
              <div className="text-sm">{i.name_en} <span className="text-xs text-slate-500">({i.slug})</span></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
