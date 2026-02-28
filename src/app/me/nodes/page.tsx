import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import SectionCard from "@/components/me/SectionCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyNodes(){
  const user = await currentUser();
  const { rows } = await pool.query(`
    SELECT sn.id, sn.name, sn.city, sn.country, sn.geo_lat, sn.geo_lng, s.display_name
    FROM public.service_nodes sn
    JOIN public.services s ON s.id = sn.service_id
    WHERE s.owner_user_id=$1
    ORDER BY sn.created_at DESC
  `, [user?.id]);

  return (
    <SectionCard title="My nodes">
      <div className="grid gap-3">
        {rows.map((n:any)=>(
          <div key={n.id} className="flex items-center justify-between border rounded-xl p-3">
            <div>
              <div className="font-medium">{n.name} — <span className="text-slate-500">{n.display_name}</span></div>
              <div className="text-xs text-slate-500">{n.city||""} {n.country||""} | {n.geo_lat?.toFixed?.(4) ?? ""} {n.geo_lng?.toFixed?.(4) ?? ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/me/location?node=${n.id}`} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm">Set location</Link>
              <Link href={`/me/qr/${n.id}`} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm">QR</Link>
<Link className="btn btn-outline" href={`/me/nfc/${n.id}`}>NFC Card</Link>
<Link className="btn" href={`/me/qr/${n.id}`}>QR Poster</Link>


            </div>
          </div>
        ))}
        {!rows.length && <div className="text-slate-500 text-sm">You have no nodes.</div>}
      </div>
    </SectionCard>
  );
}
