
import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import SectionCard from "@/components/me/SectionCard";

export const dynamic = "force-dynamic";

export default async function SettingsPage(){
  const user = await currentUser();
  const { rows } = await pool.query(`SELECT private_profile, display_name FROM public.users WHERE id=$1`, [user?.id]);
  const s = rows[0] || {};
  return (
    <SectionCard title="Settings">
      <form method="post" action="/api/me/profile" className="grid md:grid-cols-2 gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="private_profile" defaultChecked={!!s.private_profile} className="size-4"/>
          <span className="text-sm">Private profile</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Display name (public)</span>
          <input name="display_name" defaultValue={s.display_name || ""} className="h-10 rounded-lg border px-3"/>
        </label>
        <div className="col-span-full">
          <button className="px-4 h-10 rounded-lg bg-slate-900 text-white">Save</button>
        </div>
      </form>
    </SectionCard>
  );
}
