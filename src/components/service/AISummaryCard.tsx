
export default function AISummaryCard({ text }:{ text:string | null }){
  if(!text) return null;
  return (
    <div className="card p-4 bg-gradient-to-br from-slate-50 to-white border">
      <div className="text-xs uppercase tracking-wide text-slate-500">AI summary</div>
      <p className="text-sm text-slate-800 mt-1">{text}</p>
    </div>
  );
}
