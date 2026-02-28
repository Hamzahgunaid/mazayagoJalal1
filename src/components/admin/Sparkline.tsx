export function Sparkline({ data, width=180, height=40 }:{ data:number[]; width?:number; height?:number }) {
  const pad = 2;
  const xs = data.length ? data : [0];
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const range = max - min || 1;
  const step = (width - pad*2) / (xs.length - 1 || 1);

  const pts = xs.map((v,i)=>{
    const x = pad + i*step;
    const y = height - pad - ((v - min) / range) * (height - pad*2);
    return [x,y];
  });

  const d = pts.map((p,i)=> (i===0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`)).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.9" />
    </svg>
  );
}
