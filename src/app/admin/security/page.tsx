import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";
export const dynamic = "force-dynamic";

export default async function SecurityPage(){
  const user = await currentUser();
  const ok = await isPlatformAdmin(user?.id);
  if(!ok) return <div/>;

  const [sessions, audit] = await Promise.all([
    pool.query(`
      SELECT us.user_id, u.email, u.full_name, us.token, us.expires_at, us.created_at, us.user_agent, us.ip
      FROM public.user_sessions us
      JOIN public.users u ON u.id = us.user_id
      WHERE us.expires_at > now()
      ORDER BY us.created_at DESC
      LIMIT 100
    `),
    pool.query(`SELECT user_id, action, target_type, target_id, created_at FROM public.audit_log ORDER BY created_at DESC LIMIT 100`),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Security</h1>

      <div className="card">
        <div className="font-medium mb-2">Active Sessions</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-slate-600">
              <th className="px-2 py-1">User</th><th className="px-2 py-1">Token</th><th className="px-2 py-1">Created</th><th className="px-2 py-1">Expires</th><th></th>
            </tr></thead>
            <tbody>
              {sessions.rows.map((s:any,i:number)=>(
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{s.full_name || s.email}</td>
                  <td className="px-2 py-1 text-xs">{s.token}</td>
                  <td className="px-2 py-1">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="px-2 py-1">{new Date(s.expires_at).toLocaleString()}</td>
                  <td className="px-2 py-1">
                    <form action={`/api/admin/sessions/${s.token}/terminate`} method="post">
                      <button className="btn btn-outline">Terminate</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="mt-3 flex gap-2 items-center" action="/api/admin/sessions/terminate-all" method="post">
          <input name="user_id" placeholder="User ID (UUID)" className="h-9 rounded-md border border-slate-300 px-2" />
          <button className="btn btn-danger">Terminate All (user)</button>
          <div className="text-xs text-slate-500">* Posts to /api/admin/sessions/terminate-all</div>
        </form>
      </div>

      <div className="card">
        <div className="font-medium mb-2">Audit Log</div>
        <ul className="text-sm max-h-80 overflow-auto">
          {audit.rows.map((a:any,i:number)=>(
            <li key={i} className="border-t py-1">
              <span className="text-slate-700">{a.action}</span>
              <span className="text-slate-500"> on {a.target_type} {a.target_id}</span>
              <span className="text-slate-400"> — {new Date(a.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
