import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Poster({ params }:{ params:{ id:string } }){
  const u = await currentUser();
  if(!u) return <div>Sign in required</div>;
  const { rows } = await pool.query(`
    SELECT sn.id, sn.name, s.display_name, s.owner_user_id
    FROM public.service_nodes sn JOIN public.services s ON s.id=sn.service_id
    WHERE sn.id=$1
  `, [params.id]);
  const node = rows[0];
  if(!node || node.owner_user_id !== u?.id) return <div>Not found</div>;

  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${base}/r?node=${encodeURIComponent(node.id)}`;
  const img = `https://chart.googleapis.com/chart?cht=qr&chs=500x500&chld=H|0&chl=${encodeURIComponent(url)}`;

  return (
    <html>
      <head>
        <title>QR Poster</title>
        <style>{`
          @media print { .no-print{ display:none } body{ margin:0 } }
          body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Tajawal, sans-serif; }
          .page{ width: 794px; height: 1123px; padding: 40px; margin: 0 auto; box-sizing: border-box; }
          .card{ border:1px solid #e5e7eb; border-radius: 16px; padding: 32px; display:flex; gap:24px; align-items:center; }
          .logo{ width:64px; height:64px; border-radius:16px; background:#111827; color:#fff; display:grid; place-items:center; font-weight:700; font-size:24px; }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="card">
            <div className="logo">R</div>
            <div>
              <div style={{fontSize:24, fontWeight:700}}>{node.display_name}</div>
              <div style={{color:"#6b7280"}}>{node.name}</div>
            </div>
          </div>
          <div style={{marginTop:24, display:"grid", placeItems:"center"}}>
            <img src={img} style={{width:400, height:400, background:"#fff", padding:8, borderRadius:12, border:"1px solid #e5e7eb"}} />
            <div style={{marginTop:12, fontSize:12, color:"#6b7280", wordBreak:"break-all"}}>{url}</div>
          </div>
          <div className="no-print" style={{marginTop:24, display:"flex", justifyContent:"center"}}>
            <button onClick="window.print()" style="padding:10px 16px; border-radius:10px; background:#111827; color:#fff;">Print</button>
          </div>
        </div>
      </body>
    </html>
  );
}
