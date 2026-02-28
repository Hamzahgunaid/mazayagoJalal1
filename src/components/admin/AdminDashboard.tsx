"use client";
import { Sparkline } from "./Sparkline";
import ModerationInbox from "./ModerationInbox";
import { FunnelBars } from "./FunnelBars";

type DayRow = {
  day: string;
  total_reviews: number;
  approved_reviews: number;
  approval_rate_pct: number;
  flagged_count: number;
  qr_share: number;
  invite_share: number;
};

type Platform = { avg_r_score: number|null; avg_flagged_ratio: number|null };
type Rolling = { reviews_today:number; reviews_d7:number; reviews_d30:number; approval_ratio_all:number };
type Mix365 = { qr_share_365:number; invite_share_365:number };
type Timings = { avg_hours_to_approve:number|null; avg_hours_flags_open:number|null };
type Funnel = { qr_scans_d30:number; submitted_d30:number; approved_d30:number };

export default function AdminDashboard({ daily, latest, inbox, platform, rolling, mix365, timings, funnel }:{
  daily: DayRow[];
  latest: DayRow | null;
  inbox: any[];
  platform: Platform | null;
  rolling: Rolling | null;
  mix365: Mix365 | null;
  timings: Timings | null;
  funnel: Funnel | null;
}){
  const totals = {
    today: rolling?.reviews_today ?? latest?.total_reviews ?? 0,
    d7: rolling?.reviews_d7 ?? 0,
    d30: rolling?.reviews_d30 ?? 0,
    approvalRate: latest?.approval_rate_pct ?? 0,
    approvalAll: (rolling?.approval_ratio_all ?? 0) * 100,
    flagged: latest?.flagged_count ?? 0,
    qrShare30: (latest?.qr_share ?? 0) * 100,
    inviteShare30: (latest?.invite_share ?? 0) * 100,
    qrShare365: (mix365?.qr_share_365 ?? 0) * 100,
    inviteShare365: (mix365?.invite_share_365 ?? 0) * 100,
    avgRScore: platform?.avg_r_score ?? 0,
    flaggedRatio: (platform?.avg_flagged_ratio ?? 0) * 100,
    tta: timings?.avg_hours_to_approve ?? 0,
    flagsAge: timings?.avg_hours_flags_open ?? 0,
  };

  return (
    <div className="space-y-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPI title="Reviews (today)" value={totals.today} footer={<Sparkline data={daily.map(d=>d.total_reviews)} />} />
        <KPI title="Reviews (7d)" value={totals.d7} />
        <KPI title="Reviews (30d)" value={totals.d30} />
        <KPI title="Approval rate (today)" value={`${totals.approvalRate}%`} footer={<Sparkline data={daily.map(d=>d.approval_rate_pct)} />} />
        <KPI title="Avg R-Score" value={totals.avgRScore} />
        <KPI title="Flagged ratio (avg)" value={`${Math.round(totals.flaggedRatio)}%`} />
      </section>

      {/* Channels & Timings */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-slate-600">Channel Mix (30d)</div>
          <div className="mt-2 text-sm">QR: {Math.round(totals.qrShare30)}% • Invite: {Math.round(totals.inviteShare30)}%</div>
          <div className="mt-2"><Sparkline data={daily.map(d=>d.qr_share*100)} /></div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-600">Channel Mix (365d)</div>
          <div className="mt-2 text-sm">QR: {Math.round(totals.qrShare365)}% • Invite: {Math.round(totals.inviteShare365)}%</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-600">Moderation Timings</div>
          <div className="mt-2 text-sm">Avg time to approve: <b>{totals.tta}h</b></div>
          <div className="mt-1 text-sm">Avg flags open age: <b>{totals.flagsAge}h</b></div>
        </div>
      </section>

      {/* Funnel */}
      <section className="card">
        <div className="text-sm text-slate-600">Funnel (30d): QR → Submitted → Approved</div>
        <div className="mt-3">
          <FunnelBars values={[
            funnel?.qr_scans_d30 ?? 0,
            funnel?.submitted_d30 ?? 0,
            funnel?.approved_d30 ?? 0
          ]} labels={["QR scans","Submitted","Approved"]} />
        </div>
      </section>

      {/* Moderation Inbox */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Moderation Inbox</h2>
        </div>
        <ModerationInbox initialItems={inbox} />
      </section>
    </div>
  );
}

function KPI({ title, value, footer }:{ title:string; value:any; footer?:React.ReactNode }){
  return (
    <div className="card">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="mt-2">{footer}</div>
    </div>
  );
}
