import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import SectionCard from "@/components/me/SectionCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OwnerReviews(){
  const u = await currentUser();
  if(!u) return <div className="text-slate-500">Sign in required.</div>;
  const { rows } = await pool.query(`
    SELECT r.id, r.title, r.body, r.rating, r.submitted_at, sn.name AS node_name, s.display_name AS service_name,
           rr.id AS reply_id, rr.body AS reply_body, rr.created_at AS reply_created_at
    FROM public.reviews r
    JOIN public.service_nodes sn ON sn.id = r.service_node_id
    JOIN public.services s ON s.id = sn.service_id
    LEFT JOIN public.review_replies rr ON rr.review_id = r.id
    WHERE s.owner_user_id=$1 AND r.status='approved'
    ORDER BY r.submitted_at DESC
    LIMIT 50
  `, [u.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Reviews on my services</h1>
        <Link href="/me/service" className="text-sm text-slate-600 hover:underline">Manage services</Link>
      </div>
      <SectionCard title="Latest">
        <div className="grid gap-4">
          {rows.map((rv:any)=>(
            <div key={rv.id} className="border rounded-2xl p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="font-medium">{rv.service_name} — <span className="text-slate-500">{rv.node_name}</span></div>
                <div className="text-xs text-slate-500">{new Date(rv.submitted_at).toLocaleString()}</div>
              </div>
              <div className="mt-2 text-sm" dir="auto">{rv.title || rv.body}</div>
              <div className="mt-2 text-xs text-amber-600">Rating: {rv.rating ?? "-"}</div>

              {rv.reply_id ? (
                <div className="mt-3 rounded-lg bg-slate-50 border p-3">
                  <div className="text-xs text-slate-500 mb-1">Your reply:</div>
                  <div className="text-sm" dir="auto">{rv.reply_body}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{new Date(rv.reply_created_at).toLocaleString()}</div>
                </div>
              ) : (
                <form method="post" action="/api/me/reviews/reply" className="mt-3 grid gap-2">
                  <input type="hidden" name="review_id" value={rv.id} />
                  <textarea name="reply_body" rows={3} placeholder="Write an official reply…" className="rounded-lg border px-3 py-2" required />
                  <div className="flex gap-2">
                    <button className="px-3 h-9 rounded-lg bg-slate-900 text-white text-sm">Post reply</button>
                    <span className="text-xs text-slate-500">One official reply per review (you can edit later).</span>
                  </div>
                </form>
              )}
            </div>
          ))}
          {!rows.length && <div className="text-slate-500 text-sm">No reviews yet.</div>}
        </div>
      </SectionCard>
    </div>
  );
}
