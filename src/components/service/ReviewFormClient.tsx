
"use client";
import { useState } from "react";

export default function ReviewFormClient({ serviceId, nodes }:{ serviceId:string; nodes:{id:string; name:string}[] }){
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e:any){
    e.preventDefault();
    setLoading(true); setMsg(null);

    const form = new FormData(e.currentTarget);
    const payload:any = {};
    form.forEach((v,k)=>payload[k]=v);
    const r = await fetch("/api/reviews", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(payload) });
    if(r.ok){
      const url = new URL(window.location.href);
      const parts = url.pathname.split("/");
      window.location.href = `/s/${parts[2]}?submitted=1`;
    }else{
      const j = await r.json().catch(()=>({error:"Failed"}));
      setMsg(j.error || "Failed");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4 card p-4">
      {msg && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{msg}</div>}
      <input type="hidden" name="service_id" value={serviceId} />
      <label className="flex flex-col gap-1">
        <span className="text-sm">Choose branch (optional)</span>
        <select name="service_node_id" className="h-10 rounded-md border border-slate-300 px-2">
          <option value="">Auto</option>
          {nodes.map(n=>(<option key={n.id} value={n.id}>{n.name}</option>))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Rating</span>
        <select required name="rating" className="h-10 rounded-md border border-slate-300 px-2">
          {[5,4,3,2,1].map(s=>(<option key={s} value={s}>{s}★</option>))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Title (optional)</span>
        <input name="title" className="h-10 rounded-md border border-slate-300 px-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Your review</span>
        <textarea required name="body" rows={5} className="rounded-md border border-slate-300 px-2 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Visited on (optional)</span>
        <input type="date" name="visit_date" className="h-10 rounded-md border border-slate-300 px-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Verification token (optional)</span>
        <input name="session_token" placeholder="Paste QR/Invite token" className="h-10 rounded-md border border-slate-300 px-2" />
      </label>
      <button disabled={loading} className="btn btn-primary">{loading ? "Submitting..." : "Submit review"}</button>
    </form>
  );
}
