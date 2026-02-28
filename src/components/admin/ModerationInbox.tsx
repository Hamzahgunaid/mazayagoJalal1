"use client";
import useSWR from "swr";

const fetcher = (u:string)=>fetch(u).then(r=>r.json());

export default function ModerationInbox({ initialItems }:{ initialItems:any[] }){
  const { data, mutate } = useSWR("/api/admin/reviews/pending", fetcher, { fallbackData: initialItems });

  async function act(id:string, action:"approve"|"reject"){
    const reason = action==="reject" ? prompt("Rejection reason? (optional)") || "" : "";
    const res = await fetch(`/api/reviews/${id}/${action}`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ reason })});
    if(res.ok){ mutate(); } else { alert("Action failed"); }
  }

  async function flag(id:string){
    const suggestion = "Spam, Offensive, Fake Receipt, Off-topic, Conflict of interest";
    const reason = prompt(`Flag reason?
Suggestions: ${suggestion}`) || "";
    const res = await fetch(`/api/reviews/${id}/flag`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ reason })});
    if(res.ok){ mutate(); } else { alert("Flag failed"); }
  }

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {(data||[]).map((r:any)=>(
        <div key={r.id} className="card">
          <div className="flex items-center justify-between">
            <div className="font-semibold" dir="auto">{r.title || r.body || "Review"}</div>
            <div className="text-xs text-slate-500">{new Date(r.submitted_at).toLocaleString()}</div>
          </div>
          <div className="text-sm text-slate-600 mt-1">{r.service_name} • {r.node_name}</div>
          <div className="text-xs text-slate-500 mt-1">By {r.user_name || r.user_email}</div>

          <div className="mt-2 flex flex-wrap gap-2">
            {r.suspicious_device_burst && <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">⚠ Device burst</span>}
            {r.suspicious_user_burst   && <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">⚠ User burst</span>}
            {r.suspicious_ocr_low      && <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">⚠ Low OCR</span>}
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={()=>act(r.id,"approve")} className="btn btn-primary">Approve</button>
            <button onClick={()=>act(r.id,"reject")} className="btn btn-outline">Reject</button>
            <button onClick={()=>flag(r.id)} className="btn btn-outline">Flag</button>
          </div>
        </div>
      ))}
      {(!data || data.length===0) && <div className="text-slate-500">All clear. No pending reviews.</div>}
    </div>
  );
}
