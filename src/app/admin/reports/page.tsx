import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";
import SavedViewsClient from "@/components/admin/SavedViewsClient";
export const dynamic = "force-dynamic";

async function getSavedViews(userId: string) {
  const r = await pool.query(
    `SELECT id, name, query_json, created_at
       FROM public.admin_saved_views
      WHERE user_id=$1
      ORDER BY created_at DESC`,
    [userId]
  );
  return r.rows;
}

export default async function ReportsPage() {
  const user = await currentUser();
  const ok = await isPlatformAdmin(user?.id);
  if (!ok) return <div />;

  const [rep, rolling, views] = await Promise.all([
    pool.query(`SELECT * FROM public.platform_reputation_v`),
    pool.query(`SELECT * FROM public.admin_kpi_rolling_v`),
    getSavedViews(user!.id),
  ]);

  async function saveView(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "Saved View");
    const filters = {
      country: (String(formData.get("country") || "") || undefined) || undefined,
      city: (String(formData.get("city") || "") || undefined) || undefined,
      category_slug: (String(formData.get("category_slug") || "") || undefined) || undefined,
      channel: (String(formData.get("channel") || "") || undefined) as any,
      from: (String(formData.get("from") || "") || undefined) || undefined,
      to: (String(formData.get("to") || "") || undefined) || undefined,
    };
    await pool.query(
      `INSERT INTO public.admin_saved_views(user_id, name, query_json)
       VALUES ($1,$2,$3)`,
      [user!.id, name, filters]
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Reports & Saved Views</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-slate-600">Avg R-Score</div>
          <div className="text-2xl font-bold mt-1">{rep.rows[0]?.avg_r_score ?? 0}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-600">Flagged ratio (avg)</div>
          <div className="text-2xl font-bold mt-1">{Math.round(((rep.rows[0]?.avg_flagged_ratio ?? 0) as number) * 100)}%</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-600">Reviews (30d)</div>
          <div className="text-2xl font-bold mt-1">{rolling.rows[0]?.reviews_d30 ?? 0}</div>
        </div>
      </div>

      <form action={saveView}>
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 mb-2">Filters</div>
          <input type="hidden" name="name" value="Quick View" />
        </div>
        <div className="card grid md:grid-cols-3 gap-3">
          <input name="country" placeholder="Country (2-letter)" className="h-9 rounded-md border border-slate-300 px-2" />
          <input name="city" placeholder="City" className="h-9 rounded-md border border-slate-300 px-2" />
          <input name="category_slug" placeholder="Category slug" className="h-9 rounded-md border border-slate-300 px-2" />
          <select name="channel" className="h-9 rounded-md border border-slate-300 px-2">
            <option value="">Any channel</option>
            <option value="qr">QR</option>
            <option value="invite">Invite</option>
            <option value="organic">Organic</option>
          </select>
          <input name="from" type="date" className="h-9 rounded-md border border-slate-300 px-2" />
          <input name="to" type="date" className="h-9 rounded-md border border-slate-300 px-2" />
          <div className="md:col-span-3">
            <button className="btn btn-outline">Save as View</button>
          </div>
        </div>
      </form>

      <SavedViewsClient views={views} />
    </div>
  );
}
