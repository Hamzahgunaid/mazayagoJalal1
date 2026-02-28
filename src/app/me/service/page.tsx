import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import SectionCard from "@/components/me/SectionCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyService(){
  const user = await currentUser();
  const { rows: services } = await pool.query(`SELECT * FROM public.services WHERE owner_user_id=$1 ORDER BY created_at DESC`, [user?.id]);

  return (
    <div className="space-y-4">
      <SectionCard title="Create a new service">
        <form action="/api/me/services" method="post" className="grid md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Display name</span>
            <input name="display_name" required className="h-10 rounded-lg border px-3"/>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Group</span>
            <input name="group" placeholder="business" className="h-10 rounded-lg border px-3"/>
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm">Slug (optional)</span>
            <input name="slug" className="h-10 rounded-lg border px-3"/>
          </label>
          <div className="md:col-span-2">
            <button className="px-4 h-10 rounded-lg bg-slate-900 text-white">Create</button>
          </div>
        </form>
        <div className="text-xs text-slate-500 mt-2">You can create multiple services.</div>
      </SectionCard>

      <SectionCard title="My services">
        <div className="grid gap-3">
          {services.map((s:any)=>(
            <div key={s.id} className="flex items-center justify-between border rounded-xl p-3">
              <div className="flex items-center gap-3">
                <img src={s.avatar_url || "/service-placeholder.png"} className="w-12 h-12 rounded-lg object-cover border" alt=""/>
                <div>
                  <div className="font-medium">{s.display_name}</div>
                  <div className="text-xs text-slate-500">{s.slug || s.id}</div>
                </div>
              </div>
              <Link href="/me/nodes" className="text-sm px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">Manage nodes</Link>
            </div>
          ))}
          {!services.length && <div className="text-slate-500 text-sm">No services yet.</div>}
        </div>
      </SectionCard>
    </div>
  );
}
