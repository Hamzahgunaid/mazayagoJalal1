import Link from "next/link";
import SectionCard from "@/components/me/SectionCard";
import { currentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

type ContestRow = {
  id: string;
  slug: string | null;
  title: string | null;
  status: string | null;
  type: string | null;
  prize_summary: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
};

export default async function MyOffersPage() {
  const user = await currentUser();
  if (!user?.id) redirect("/sign-in");

  const { rows } = await pool.query(
    `SELECT id, slug, title, status, type, prize_summary, starts_at, ends_at, created_at
       FROM public.contests
      WHERE created_by_user_id = $1
      ORDER BY created_at DESC
      LIMIT 200`,
    [user.id]
  );

  const contests = rows as ContestRow[];
  const now = Date.now();
  const live = contests.filter((c) => c.status === "ACTIVE" && (!c.ends_at || new Date(c.ends_at).getTime() > now)).length;
  const drafts = contests.filter((c) => ["DRAFT", "PAUSED"].includes(String(c.status))).length;
  const ended = contests.filter((c) => c.status === "ENDED").length;

  const stats = [
    { label: "Total", value: contests.length },
    { label: "Live", value: live },
    { label: "Drafts", value: drafts },
    { label: "Ended", value: ended },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">Offers workspace</p>
            <h1 className="text-2xl font-semibold md:text-3xl">My interactive campaigns</h1>
            <p className="text-sm text-white/70">
              Launch and manage contests, referral programs, and activations for your brand community.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/offers/new"
              className="inline-flex items-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:-translate-y-0.5"
            >
              Create offer
            </Link>
            <Link
              href="/me/offers"
              className="inline-flex items-center rounded-2xl border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Owner console
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <SectionCard
        title="Launch a new experience"
        actions={
          <Link href="/offers/new" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Start new
          </Link>
        }
      >
        <p className="text-sm text-slate-600">
          Use custom prize pools, receipt uploads, QR treasure hunts, referrals, or riddles. The owner console will guide
          you through the required steps.
        </p>
      </SectionCard>

      <SectionCard title="My offers">
        <div className="space-y-3">
          {contests.map((contest) => {
            const manageHref = contest.slug ? `/offers/${contest.slug}/manage` : null;
            const status = contest.status || "DRAFT";
            return (
              <div key={contest.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{contest.title || "Untitled offer"}</div>
                    <div className="text-xs text-slate-500">
                      {contest.type || "Experience"} - {formatDateRange(contest.starts_at, contest.ends_at)}
                    </div>
                    {contest.prize_summary && (
                      <div className="mt-1 text-xs text-slate-500">Prize: {contest.prize_summary}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(status)}`}>
                      {status}
                    </span>
                    {manageHref && (
                      <Link
                        href={manageHref}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Manage
                      </Link>
                    )}
                    {contest.slug && (
                      <Link
                        href={`/offers/${contest.slug}`}
                        className="rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!contests.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              You have not launched any offers yet. Use "Create offer" to publish your first campaign.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function formatDateRange(start?: string | null, end?: string | null) {
  const startLabel = start ? formatDate(start) : "No start";
  const endLabel = end ? formatDate(end) : "No end";
  return `${startLabel} - ${endLabel}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700";
    case "ENDED":
      return "bg-slate-100 text-slate-600";
    case "PAUSED":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-50 text-slate-600";
  }
}
