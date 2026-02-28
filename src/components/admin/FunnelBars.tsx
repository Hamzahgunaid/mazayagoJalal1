export function FunnelBars({ values, labels }:{ values:number[]; labels:string[] }){
  const max = Math.max(...values, 1);
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {values.map((v, i)=>{
        const h = Math.max(6, Math.round((v / max) * 120));
        return (
          <div key={i} className="flex items-end gap-3">
            <div className="w-10 rounded bg-slate-900" style={{ height: h }} title={`${labels[i]}: ${v}`}></div>
            <div>
              <div className="text-sm font-medium">{labels[i]}</div>
              <div className="text-xs text-slate-600">{v.toLocaleString()}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
