
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";
export const dynamic = "force-dynamic";

export default async function CategoriesPage(){
  const user = await currentUser();
  const ok = await isPlatformAdmin(user?.id);
  if(!ok) return <div/>;

  const { rows } = await pool.query(`SELECT id, slug, name_en, name_ar, icon_set, icon_key, parent_id, active FROM public.categories ORDER BY COALESCE(parent_id::text,'') ASC, slug ASC`);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Categories</h1>
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((c:any)=>(
          <div key={c.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{c.name_en}</div>
                <div className="text-xs text-slate-500">{c.slug}</div>
              </div>
              <form action={`/api/admin/categories/${c.id}/toggle-active`} method="post">
                <button className={`px-3 py-1 rounded-md text-sm border ${c.active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-700 border-slate-300'}`}>
                  {c.active ? 'Active' : 'Inactive'}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
