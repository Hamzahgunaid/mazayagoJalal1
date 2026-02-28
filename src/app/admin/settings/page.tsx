import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";
export const dynamic = "force-dynamic";

export default async function SettingsPage(){
  const user = await currentUser();
  const ok = await isPlatformAdmin(user?.id);
  if(!ok) return <div/>;

  const defaults:any = { w_qr:1.0, w_inv:0.8, w_org:0.7, degradation_threshold:3.2, budget_warn_ratio:0.8 };
  const { rows } = await pool.query(`SELECT key, value FROM public.platform_settings`);
  const settings:any = {};
  rows.forEach((r:any)=>{ settings[r.key] = r.value; });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Platform Settings</h1>
      <form action="/api/admin/settings" method="post" className="card grid md:grid-cols-2 gap-3">
        <Setting label="Weight: QR"    name="w_qr"   value={settings.w_qr?.value ?? defaults.w_qr} />
        <Setting label="Weight: Invite" name="w_inv"  value={settings.w_inv?.value ?? defaults.w_inv} />
        <Setting label="Weight: Organic" name="w_org" value={settings.w_org?.value ?? defaults.w_org} />
        <Setting label="Degradation threshold" name="degradation_threshold" value={settings.degradation_threshold?.value ?? defaults.degradation_threshold} />
        <Setting label="Budget warn ratio" name="budget_warn_ratio" value={settings.budget_warn_ratio?.value ?? defaults.budget_warn_ratio} />
        <div className="col-span-full">
          <button className="btn btn-primary">Save</button>
          <div className="text-xs text-slate-500 mt-2">Stored as JSON; applying to scoring will be added later.</div>
        </div>
      </form>
    </div>
  );
}

function Setting({ label, name, value }:{ label:string; name:string; value:any }){
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-slate-600">{label}</span>
      <input name={name} defaultValue={value} className="h-9 rounded-md border border-slate-300 px-2" />
      <input type="hidden" name="__jsonkeys__" value={name} />
    </label>
  );
}
