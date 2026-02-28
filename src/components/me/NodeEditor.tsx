"use client";
import { useState } from "react";
import AvatarUploader from "@/components/ui/AvatarUploader";

export default function NodeEditor({ id, initial }:{ id:string; initial:{ name:string; address?:string; city?:string; country?:string; geo_lat?:number; geo_lng?:number; avatar_url?:string } }){
  const [form, setForm] = useState<any>({
    name: initial.name || "",
    address: initial.address || "",
    city: initial.city || "",
    country: initial.country || "",
    geo_lat: initial.geo_lat ?? "",
    geo_lng: initial.geo_lng ?? "",
  });
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url || "");
  const [msg, setMsg] = useState("");

  function upd(k:string, v:any){ setForm((f:any)=>({ ...f, [k]: v })); }

  return (
    <form onSubmit={async (e)=>{
      e.preventDefault();
      setMsg("");
      const r = await fetch(`/api/me/node/${id}/update`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ ...form, avatar_url: avatarUrl || null })
      });
      const j = await r.json().catch(()=>({}));
      if(r.ok){ setMsg("Saved"); } else { setMsg(j.error || "Failed"); }
    }} className="card grid md:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Node name</span>
        <input value={form.name} onChange={e=>upd("name", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Avatar</span>
        <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Address</span>
        <input value={form.address} onChange={e=>upd("address", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">City</span>
          <input value={form.city} onChange={e=>upd("city", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Country (2-letter)</span>
          <input value={form.country} onChange={e=>upd("country", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Latitude</span>
          <input value={form.geo_lat} onChange={e=>upd("geo_lat", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Longitude</span>
          <input value={form.geo_lng} onChange={e=>upd("geo_lng", e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
        </label>
      </div>
      <div className="md:col-span-2">
        <button className="btn btn-primary">Save</button>
        {msg && <span className="text-sm ml-2">{msg}</span>}
      </div>
    </form>
  );
}
