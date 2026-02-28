"use client";
import { useState } from "react";

export default function FlagButtonClient({ reviewId }:{ reviewId:string }){
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function submit(){
    const r = await fetch(`/api/reviews/${reviewId}/flag`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ reason })
    });
    if(r.ok){ setOpen(false); setReason(""); alert("Reported. Thank you."); }
  }

  return (
    <div className="relative inline-block">
      <button onClick={()=>setOpen(v=>!v)} className="text-xs text-red-600 hover:underline">Report</button>
      {open && (
        <div className="absolute z-10 mt-2 w-56 p-3 rounded border bg-white shadow">
          <textarea value={reason} onChange={e=>setReason(e.target.value)} className="input h-24" placeholder="Reason..." />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={()=>setOpen(false)} className="btn">Cancel</button>
            <button onClick={submit} className="btn btn-primary">Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
