import { pool } from "@/lib/db";
import { currentUser } from "@/lib/session";
import InviteManagerForm from "@/components/me/InviteManagerForm";
import NodeEditor from "@/components/me/NodeEditor";
export const dynamic = "force-dynamic";

async function nodeData(id: string){
  const { rows } = await pool.query(
    `SELECT sn.*, s.display_name AS service_name
       FROM public.service_nodes sn
       JOIN public.services s ON s.id = sn.service_id
      WHERE sn.id = $1`, [id]
  );
  return rows[0] || null;
}

async function managers(serviceId: string){
  const { rows } = await pool.query(
    `SELECT sm.id, u.full_name, u.email, sm.role, sm.status
       FROM public.service_members sm
       JOIN public.users u ON u.id = sm.user_id
      WHERE sm.service_id = $1
      ORDER BY sm.created_at DESC`,
    [serviceId]
  );
  return rows;
}

export default async function NodePage({ params }:{ params:{ id: string } }){
  const user = await currentUser();
  if(!user) return <div className="container mx-auto p-6">Please sign in.</div>;

  const node = await nodeData(params.id);
  if(!node) return <div className="card">Node not found</div>;

  const mgrs = await managers(node.service_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-14 rounded bg-slate-200 overflow-hidden">
          {node.avatar_url ? <img src={node.avatar_url} alt="" className="w-full h-full object-cover" /> : null}
        </div>
        <div>
          <div className="text-xl font-semibold">{node.name}</div>
          <div className="text-slate-500 text-sm">{node.city}, {node.country} — {node.service_name}</div>
        </div>
      </div>

      <NodeEditor id={node.id} initial={{ name: node.name, address: node.address, city: node.city, country: node.country, geo_lat: node.geo_lat, geo_lng: node.geo_lng, avatar_url: node.avatar_url }} />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-medium mb-2">Managers</div>
          <ul className="text-sm">
            {mgrs.map((m:any)=>(
              <li key={m.id} className="border-t py-2 flex justify-between">
                <span>{m.full_name || m.email} <span className="text-slate-500">({m.role})</span></span>
                <span className="text-slate-500">{m.status}</span>
              </li>
            ))}
            {mgrs.length===0 && <li className="text-slate-500">No managers yet.</li>}
          </ul>
        </div>

        <div className="card">
          <div className="font-medium mb-2">Invite / Add Manager by Email</div>
          <InviteManagerForm serviceId={node.service_id} />
        </div>
      </div>
    </div>
  );
}
