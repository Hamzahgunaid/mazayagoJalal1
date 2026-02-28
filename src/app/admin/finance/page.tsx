
import { pool } from "@/lib/db";
import { currentUser, isPlatformAdmin } from "@/lib/session";
export const dynamic = "force-dynamic";

export default async function FinancePage(){
  const user = await currentUser();
  const ok = await isPlatformAdmin(user?.id);
  if(!ok) return <div/>;

  const [rewards, vouchers, wallet, voucherDaily, budget] = await Promise.all([
    pool.query(`SELECT status, COUNT(*) AS cnt FROM public.reward_grants GROUP BY status`),
    pool.query(`SELECT status, COUNT(*) AS cnt FROM public.vouchers GROUP BY status`),
    pool.query(`SELECT COUNT(*) AS accounts, COALESCE(SUM(balance_cents),0) AS total_balance_cents FROM public.wallet_accounts`),
    pool.query(`SELECT * FROM public.voucher_usage_daily_v`),
    pool.query(`SELECT * FROM public.budget_guardrails_v ORDER BY usage_ratio DESC`),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Finance & Incentives</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-slate-600">Reward Grants</div>
          <ul className="mt-2 text-sm">
            {rewards.rows.map((r:any,i:number)=>(<li key={i}>{r.status}: <b>{r.cnt}</b></li>))}
          </ul>
        </div>
        <div className="card">
          <div className="text-sm text-slate-600">Vouchers</div>
          <ul className="mt-2 text-sm">
            {vouchers.rows.map((r:any,i:number)=>(<li key={i}>{r.status}: <b>{r.cnt}</b></li>))}
          </ul>
        </div>
        <div className="card">
          <div className="text-sm text-slate-600">Wallets</div>
          <div className="mt-2 text-sm">Accounts: <b>{wallet.rows[0]?.accounts}</b></div>
          <div className="text-sm">Total balance: <b>{((wallet.rows[0]?.total_balance_cents||0)/100).toLocaleString()} USD</b></div>
        </div>
      </div>

      <div className="card overflow-auto">
        <div className="font-medium mb-2">Voucher usage (last 30 days)</div>
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-slate-600">
            <th className="px-2 py-1">Day</th>
            <th className="px-2 py-1">Redemptions</th>
          </tr></thead>
          <tbody>
            {voucherDaily.rows.map((d:any,i:number)=>(
              <tr key={i} className="border-t">
                <td className="px-2 py-1">{new Date(d.day).toLocaleDateString()}</td>
                <td className="px-2 py-1">{d.redemptions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-auto">
        <div className="font-medium mb-2">Budget guardrails (this month)</div>
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-slate-600">
            <th className="px-2 py-1">Service</th>
            <th className="px-2 py-1">Cap</th>
            <th className="px-2 py-1">Spent</th>
            <th className="px-2 py-1">Usage</th>
          </tr></thead>
          <tbody>
            {budget.rows.map((b:any,i:number)=>(
              <tr key={i} className="border-t">
                <td className="px-2 py-1">{b.display_name}</td>
                <td className="px-2 py-1">{(b.monthly_cap_cents/100).toLocaleString()} USD</td>
                <td className="px-2 py-1">{(b.month_spent_cents/100).toLocaleString()} USD</td>
                <td className="px-2 py-1">{Math.round((b.usage_ratio||0)*100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
