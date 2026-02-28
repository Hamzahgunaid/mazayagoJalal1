import { notFound } from "next/navigation";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function GiveawayPublicView({ params }: { params: { public_view_slug: string } }) {
  const drawQ = await pool.query(`select * from public.giveaway_draws where public_view_slug=$1 and status='PUBLISHED' limit 1`, [params.public_view_slug]);
  if (!drawQ.rowCount) return notFound();
  const draw = drawQ.rows[0];

  const [winners, assets] = await Promise.all([
    pool.query(
      `select w.rank, w.winner_type, e.display_name, e.comment_url
       from public.giveaway_winners w
       join public.giveaway_entries e on e.id=w.entry_id
       where w.draw_id=$1
       order by w.rank asc`,
      [draw.id],
    ),
    pool.query(`select * from public.giveaway_publish_assets where draw_id=$1 limit 1`, [draw.id]),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">{draw.title}</h1>
      <p className="text-sm">Locked at: {draw.locked_at ? new Date(draw.locked_at).toLocaleString() : "-"}</p>
      <p className="text-sm">Fairness code: {draw.draw_code || "-"}</p>

      {draw.show_logo && draw.logo_url ? <img src={draw.logo_url} alt="logo" className="h-20 object-contain" /> : null}
      {draw.show_contest_image && draw.contest_image_url ? <img src={draw.contest_image_url} alt="contest" className="w-full rounded" /> : null}

      <section>
        <h2 className="font-semibold">Winners</h2>
        <ul className="list-disc pl-5 text-sm">
          {winners.rows.map((w: { rank: number; winner_type: string; display_name: string | null; comment_url: string | null }) => (
            <li key={`${w.rank}-${w.winner_type}`}>
              {w.rank}. {w.winner_type}: {w.display_name || "Anonymous"} {w.comment_url ? <a className="text-blue-600 underline" href={w.comment_url}>comment</a> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="text-sm space-y-1">
        {assets.rows[0]?.video_url ? <p><a className="text-blue-600 underline" href={assets.rows[0].video_url}>Video</a></p> : null}
      </section>
    </main>
  );
}
