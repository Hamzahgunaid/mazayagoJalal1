import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import LocationPicker from "@/components/me/LocationPicker";

export const dynamic = "force-dynamic";

export default async function LocationPage({ searchParams }:{ searchParams:{ node?:string } }){
  const u = await currentUser();
  if(!u) return <div className="text-slate-500">Sign in required.</div>;
  const id = searchParams?.node;
  if(!id) return <div className="text-slate-500">Missing node.</div>;

  const { rows } = await pool.query(`
    SELECT sn.id, sn.name, sn.geo_lat, sn.geo_lng, s.display_name, s.owner_user_id
    FROM public.service_nodes sn JOIN public.services s ON s.id=sn.service_id
    WHERE sn.id=$1
  `, [id]);
  const node = rows[0];
  if(!node || node.owner_user_id !== u?.id) return <div className="text-slate-500">Not found.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Set location — {node.display_name} / {node.name}</h1>
      <LocationPicker nodeId={node.id} lat={node.geo_lat} lng={node.geo_lng} />
    </div>
  );
}
