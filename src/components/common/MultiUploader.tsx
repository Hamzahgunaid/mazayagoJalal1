"use client";

import { useRef, useState } from "react";

export default function MultiUploader({
  value,
  onChange
}:{ value: string[]; onChange:(urls:string[])=>void }){
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null){
    if(!files || files.length===0) return;
    const fd = new FormData();
    Array.from(files).forEach(f=>fd.append("files", f));
    setBusy(true);
    const r = await fetch("/api/upload/multi", { method:"POST", body: fd });
    const j = await r.json();
    setBusy(false);
    if(r.ok && j.urls){ onChange([...(value||[]), ...j.urls]); }
    else alert(j.error || "Upload failed");
  }

  function remove(u:string){
    onChange(value.filter(x=>x!==u));
  }

  return (
    <div>
      <div className="text-sm mb-1">Gallery</div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-2">
        {value.map(u=>(
          <div key={u} className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="w-full h-24 object-cover rounded" />
            <button
              type="button"
              onClick={()=>remove(u)}
              className="absolute top-1 right-1 text-xs bg-white/90 hover:bg-white px-2 py-0.5 rounded-md shadow hidden group-hover:block"
            >Remove</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn" onClick={()=>ref.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : "Add images"}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" multiple onChange={(e)=>upload(e.target.files)} />
    </div>
  );
}
