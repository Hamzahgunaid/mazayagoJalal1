
"use client";
import { useState } from "react";

export default function ReviewsFeedClient({ items }:{ items: any[] }){
  const [rows, setRows] = useState(items);

  async function vote(id:string, kind:'helpful'|'not_helpful'){
    const r = await fetch(`/api/reviews/${id}/vote`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ kind }) });
    if(r.ok){
      const j = await r.json();
      setRows(rows.map(x => x.id===id ? { ...x, helpful_count:j.helpful_count, not_helpful_count:j.not_helpful_count } : x));
    }
  }

  async function flag(id:string){
    const reason = prompt("Reason (optional)") || "";
    const r = await fetch(`/api/reviews/${id}/flag`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ reason }) });
    if(r.ok) alert("Thanks for reporting.");
  }

  async function reply(id:string){
    const body = prompt("Write a reply") || "";
    if(!body.trim()) return;
    const r = await fetch(`/api/reviews/${id}/reply`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ body }) });
    if(r.ok) alert("Reply submitted.");
  }

  return (
    <div className="space-y-3">
      {rows.map((r:any)=>(
        <article key={r.id} className="card p-4">
          <div className="flex items-center gap-2">
            <div className="font-semibold">{r.rating}★</div>
            {r.is_qr && <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">Verified via QR</span>}
            {r.session_origin==='invite' && <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">Invite</span>}
          </div>
          {r.title && <h3 className="mt-2 font-medium" dir="auto">{r.title}</h3>}
          <p className="text-sm text-slate-700" dir="auto">{r.body}</p>
          <div className="text-xs text-slate-500 mt-2">{new Date(r.submitted_at).toLocaleString()}</div>
          <div className="flex items-center gap-3 mt-3 text-sm">
            <button className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200" onClick={()=>vote(r.id,'helpful')}>Helpful ({r.helpful_count||0})</button>
            <button className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200" onClick={()=>vote(r.id,'not_helpful')}>Not helpful ({r.not_helpful_count||0})</button>
            <button className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100" onClick={()=>flag(r.id)}>Report</button>
            <button className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100" onClick={()=>reply(r.id)}>Reply</button>
          </div>
        </article>
      ))}
    </div>
  );
}
