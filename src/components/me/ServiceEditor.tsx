"use client";
import { useState } from "react";
import AvatarUploader from "@/components/ui/AvatarUploader";

export default function ServiceEditor({ initial }:{ initial:{ display_name:string; avatar_url?:string } }){
  const [name, setName] = useState(initial.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url || "");
  const [msg, setMsg] = useState("");

  return (
    <form onSubmit={async (e)=>{
      e.preventDefault();
      setMsg("");
      const r = await fetch("/api/me/service/update", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ display_name: name, avatar_url: avatarUrl || null })
      });
      const j = await r.json().catch(()=>({}));
      if(r.ok){ setMsg("Saved"); } else { setMsg(j.error || "Failed"); }
    }} className="card grid gap-3">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Service name</span>
          <input value={name} onChange={e=>setName(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Avatar</span>
          <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
        </div>
      </div>
      <div>
        <button className="btn btn-primary">Save</button>
        {msg && <span className="text-sm ml-2">{msg}</span>}
      </div>
    </form>
  );
}
