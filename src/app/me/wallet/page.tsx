import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import SectionCard from "@/components/me/SectionCard";

export const dynamic = "force-dynamic";

export default async function WalletPage(){
  const user = await currentUser();

  const [{ rows:acct }, { rows:ledger }] = await Promise.all([
    pool.query(
      `SELECT wa.id AS wallet_id, wa.currency, wa.balance_cents
       FROM public.wallet_accounts wa
       WHERE wa.user_id=$1`,
      [user?.id]
    ),
    pool.query(
      `SELECT
         wl.id AS ledger_id,
         wl.type,
         wl.reference_type,
         wl.reference_id,
         wl.amount_cents,
         wl.created_at AS occurred_at
       FROM public.wallet_ledger wl
       JOIN public.wallet_accounts wa ON wa.id = wl.wallet_id
       WHERE wa.user_id=$1
       ORDER BY wl.created_at DESC
       LIMIT 50`,
      [user?.id]
    ),
  ]);

  const wallet = acct[0];

  return (
    <div className="space-y-4">
      <SectionCard title="Balance">
        <div className="text-2xl font-semibold">
          {wallet?.balance_cents ? (wallet.balance_cents/100).toFixed(2) : "0.00"} {wallet?.currency || "USD"}
        </div>
      </SectionCard>

      <SectionCard title="Recent activity">
        <div className="grid gap-2 text-sm">
          {ledger.map((l:any)=>(
            <div key={l.ledger_id} className="flex items-center justify-between border rounded-xl p-2">
              <div>{l.type}</div>
              <div className="font-mono">{(l.amount_cents/100).toFixed(2)}</div>
              <div className="text-xs text-slate-500">{new Date(l.occurred_at).toLocaleString()}</div>
            </div>
          ))}
          {!ledger.length && <div className="text-slate-500">No movements.</div>}
        </div>
      </SectionCard>
    </div>
  );
}
