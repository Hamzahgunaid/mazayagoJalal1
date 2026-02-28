"use client";

export default function SavedViewsClient({ views }:{ views:{id:string; name:string; query_json:any; created_at:string;}[] }){
  return (
    <div className="card">
      <div className="font-medium mb-2">Saved Views</div>
      <ul className="text-sm list-disc pl-5">
        {views.map(v => (
          <li key={v.id}>
            {v.name} <span className="text-slate-400">({new Date(v.created_at).toLocaleString()})</span>
          </li>
        ))}
        {views.length===0 && <li className="text-slate-500">No saved views yet.</li>}
      </ul>
    </div>
  );
}
