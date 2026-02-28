"use client";

import { useRef, useState } from "react";

export default function AvatarUploader({ value, onChange }:{ value?:string; onChange:(url:string)=>void }){
  const [url, setUrl] = useState<string | undefined>(value);
  const [busy, setBusy] = useState(false);
  const inp = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3">
      <div className="size-14 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300">
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="flex items-center gap-2">
        <input ref={inp} type="file" accept="image/*" className="hidden" onChange={async (e)=>{
          const f = e.target.files?.[0];
          if(!f) return;
          setBusy(true);
          try {
            const fd = new FormData();
            fd.append("file", f);
            const r = await fetch("/api/upload", { method:"POST", body: fd });
            const j = await r.json().catch(()=>({}));
            if (!r.ok) throw new Error(j?.error || "Upload failed");

            let finalUrl: string | null = null;
            if (j?.signedUrl) {
              const put = await fetch(j.signedUrl, {
                method: "PUT",
                headers: { "Content-Type": j.contentType || f.type || "application/octet-stream" },
                body: f,
              });
              if (!put.ok) throw new Error("Upload failed");
              finalUrl = j.publicUrl || j.url || null;
            } else {
              finalUrl = j.url || j.publicUrl || null;
            }

            if (!finalUrl) throw new Error("Upload failed");
            setUrl(finalUrl);
            onChange(finalUrl);
          } catch (err: any) {
            alert(err?.message || "Upload failed");
          } finally {
            setBusy(false);
          }
        }} />
        <button type="button" className="btn btn-outline" onClick={()=>inp.current?.click()} disabled={busy}>
          {busy ? "Uploading..." : (url ? "Change" : "Upload")}
        </button>
        {url && (
          <button type="button" className="btn" onClick={()=>{ setUrl(undefined); onChange(""); }}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
