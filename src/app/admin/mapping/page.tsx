
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";
import MappingModals from "@/components/admin/MappingModals";
export const dynamic = "force-dynamic";

export default async function MappingPage(){
  const user = await currentUser();
  const ok = await isPlatformAdmin(user?.id);
  if(!ok) return <div/>;

  const [svcCats, nodeCats] = await Promise.all([
    pool.query(`SELECT sc.service_id, s.display_name, c.slug FROM public.service_categories sc JOIN public.services s ON s.id=sc.service_id JOIN public.categories c ON c.id=sc.category_id ORDER BY s.display_name LIMIT 100`),
    pool.query(`SELECT snc.service_node_id, sn.name, c.slug FROM public.service_node_categories snc JOIN public.service_nodes sn ON sn.id=snc.service_node_id JOIN public.categories c ON c.id=snc.category_id ORDER BY sn.name LIMIT 100`),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Category Mapping</h1>
      <MappingModals />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-medium mb-2">Service → Categories</div>
          <ul className="text-sm list-disc pl-5">
            {svcCats.rows.map((r:any,i:number)=>(<li key={i}>{r.display_name} — {r.slug}</li>))}
          </ul>
        </div>
        <div className="card">
          <div className="font-medium mb-2">Node → Categories</div>
          <ul className="text-sm list-disc pl-5">
            {nodeCats.rows.map((r:any,i:number)=>(<li key={i}>{r.name} — {r.slug}</li>))}
          </ul>
        </div>
      </div>
    </div>
  );
}
