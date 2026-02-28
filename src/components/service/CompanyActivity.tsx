
export default function CompanyActivity({ d30, d365, rscore }:{ d30:number; d365:number; rscore:number|null }){
  return (
    <div className="card p-4 space-y-2">
      <div className="font-medium">Transparency</div>
      <dl className="text-sm grid grid-cols-2 gap-2">
        <dt>30 days</dt><dd>{d30}</dd>
        <dt>365 days</dt><dd>{d365}</dd>
        <dt>R-Score</dt><dd>{rscore ?? "–"}</dd>
      </dl>
      <div className="text-xs text-slate-500">R-Score uses Bayesian prior + time-decay.</div>
    </div>
  );
}
