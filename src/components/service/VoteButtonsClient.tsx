"use client";

import { useState, useTransition } from "react";

export default function VoteButtonsClient({
  reviewId,
  helpful,
  notHelpful,
}: {
  reviewId: string;
  helpful: number;
  notHelpful: number;
}) {
  const [h, setH] = useState<number>(helpful || 0);
  const [nh, setNH] = useState<number>(notHelpful || 0);
  const [mine, setMine] = useState<"helpful" | "not_helpful" | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string>("");

  async function send(kind: "helpful" | "not_helpful") {
    setMsg("");
    const prev = { h, nh, mine };
    // تفاؤلي (optimistic)
    if (mine === kind) {
      // إلغاء التصويت
      if (kind === "helpful") setH((x) => Math.max(0, x - 1));
      else setNH((x) => Math.max(0, x - 1));
      setMine(null);
    } else {
      // تبديل/تصويت جديد
      if (kind === "helpful") setH((x) => x + 1);
      else setNH((x) => x + 1);
      if (mine === "helpful") setH((x) => Math.max(0, x - 1));
      if (mine === "not_helpful") setNH((x) => Math.max(0, x - 1));
      setMine(kind);
    }

    startTransition(async () => {
      try {
        const r = await fetch(`/api/reviews/${reviewId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Failed");
        }
        const j = await r.json();
        setH(j.helpful_count ?? h);
        setNH(j.not_helpful_count ?? nh);
      } catch (e: any) {
        // تراجع عند الفشل
        setH(prev.h);
        setNH(prev.nh);
        setMine(prev.mine);
        setMsg(e?.message || "Something went wrong");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className={`px-2 h-7 rounded border text-xs ${
          mine === "helpful"
            ? "bg-emerald-600 text-white border-emerald-600"
            : "border-slate-300 hover:bg-slate-50"
        }`}
        onClick={() => send("helpful")}
        disabled={pending}
      >
        Helpful • {h}
      </button>

      <button
        className={`px-2 h-7 rounded border text-xs ${
          mine === "not_helpful"
            ? "bg-slate-700 text-white border-slate-700"
            : "border-slate-300 hover:bg-slate-50"
        }`}
        onClick={() => send("not_helpful")}
        disabled={pending}
      >
        Not helpful • {nh}
      </button>

      {!!msg && <span className="text-xs text-rose-600">{msg}</span>}
    </div>
  );
}
