
"use client";
export default function StarsDistribution({ buckets }:{ buckets: {stars:number; count:number}[] }){
  const max = Math.max(1, ...buckets.map(b=>b.count));
  return (
    <div className="space-y-1">
      {buckets.map(b=>{
        const pct = (b.count/max)*100;
        return (
          <div key={b.stars} className="flex items-center gap-2 text-sm">
            <span className="w-6">{b.stars}★</span>
            <div className="flex-1 h-2 bg-slate-200 rounded">
              <div className="h-2 bg-amber-400 rounded" style={{width:`${pct}%`}}/>
            </div>
            <span className="w-12 text-right text-xs text-slate-600">{b.count}</span>
          </div>
        );
      })}
    </div>
  );
}
