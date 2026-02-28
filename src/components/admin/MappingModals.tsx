
"use client";
import { useState } from "react";

function Modal({ open, onClose, title, children }:{ open:boolean; onClose:()=>void; title:string; children:any }){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-8" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl p-4" onClick={e=>e.stopPropagation()}>
        <div className="text-lg font-semibold mb-3">{title}</div>
        {children}
        <div className="text-right mt-3">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function MappingModals(){
  const [open,setOpen] = useState<null|("svc"|"node"|"exclude")>(null);
  const [serviceId,setServiceId] = useState("");
  const [nodeId,setNodeId] = useState("");
  const [slug,setSlug] = useState("");

  async function submit(path:string, body:any){
    const r = await fetch(path, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    if(!r.ok){ alert("Failed"); return; }
    setOpen(null);
    location.reload();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-primary" onClick={()=>setOpen("svc")}>Link Service → Category</button>
      <button className="btn btn-primary" onClick={()=>setOpen("node")}>Link Node → Category</button>
      <button className="btn btn-outline" onClick={()=>setOpen("exclude")}>Exclude Category from Node</button>

      <Modal open={open==="svc"} onClose={()=>setOpen(null)} title="Link Service to Category">
        <div className="grid gap-2">
          <input placeholder="Service ID (UUID)" value={serviceId} onChange={e=>setServiceId(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
          <input placeholder="Category slug" value={slug} onChange={e=>setSlug(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
          <button className="btn btn-primary" onClick={()=>submit("/api/admin/mapping/service", { service_id: serviceId, category_slug: slug })}>Link</button>
        </div>
      </Modal>

      <Modal open={open==="node"} onClose={()=>setOpen(null)} title="Link Node to Category">
        <div className="grid gap-2">
          <input placeholder="Node ID (UUID)" value={nodeId} onChange={e=>setNodeId(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
          <input placeholder="Category slug" value={slug} onChange={e=>setSlug(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
          <button className="btn btn-primary" onClick={()=>submit("/api/admin/mapping/node", { node_id: nodeId, category_slug: slug })}>Link</button>
        </div>
      </Modal>

      <Modal open={open==="exclude"} onClose={()=>setOpen(null)} title="Exclude Category from Node">
        <div className="grid gap-2">
          <input placeholder="Node ID (UUID)" value={nodeId} onChange={e=>setNodeId(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
          <input placeholder="Category slug" value={slug} onChange={e=>setSlug(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2" />
          <button className="btn btn-outline" onClick={()=>submit("/api/admin/mapping/exclude", { node_id: nodeId, category_slug: slug })}>Exclude</button>
        </div>
      </Modal>
    </div>
  );
}
