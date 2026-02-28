
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";
import GeoMap from "@/components/admin/GeoMap";
export const dynamic = "force-dynamic";

export default async function GeoPage() {
  const user = await currentUser();
  const ok = await isPlatformAdmin(user?.id);
  if(!ok) return <div/>;

  const { rows: nodes } = await pool.query(`SELECT id, name, city, country, geo_lat, geo_lng, reviews_d30 FROM public.admin_nodes_geo_v LIMIT 1000`);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Geo Activity</h1>
      <GeoMap nodes={nodes as any} />
      <div className="text-xs text-slate-500">Tip: install react-leaflet & leaflet: <code>npm i react-leaflet leaflet</code></div>
    </div>
  );
}
