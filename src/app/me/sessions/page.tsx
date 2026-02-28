import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import SectionCard from "@/components/me/SectionCard";

export const dynamic = "force-dynamic";

export default async function SessionsPage(){
  const user = await currentUser();
  const { rows } = await pool.query(`SELECT id, token, user_agent, ip, expires_at, created_at FROM public.user_sessions WHERE user_id=$1 ORDER BY created_at DESC`, [user?.id]);
  return (
    <SectionCard title="Sessions">
      <form method="post" action="/api/me/sessions/end-all" className="mb-3">
        <button className="px-3 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm">Sign out from all devices</button>
      </form>
      <div className="grid gap-2">
        {rows.map((s:any)=>(
          <form key={s.id} method="post" action="/api/me/sessions/end" className="flex items-center justify-between border rounded-xl p-2">
            <div className="text-sm">{s.user_agent?.slice(0,60) || "—"} • {s.ip || ""}</div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-500">Expires {new Date(s.expires_at).toLocaleString()}</div>
              <input type="hidden" name="session_id" value={s.id}/>
              <button className="px-3 h-8 rounded-lg bg-slate-900 text-white text-xs">End</button>
            </div>
          </form>
        ))}
      </div>
    </SectionCard>
  );
}
