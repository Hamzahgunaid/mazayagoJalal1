"use client";

type LiveAnimationPreset = "ROULETTE" | "SLOT" | "CARD_FLIP";

type Props = {
  visible: boolean;
  liveDrawSpinning: boolean;
  liveCountdown: number | null;
  liveAnimationPreset: LiveAnimationPreset;
  liveWheelAngle: number;
  liveWheelNames: string[];
  liveDrawDisplayType: "WINNER" | "ALTERNATE";
  liveDrawDisplayName: string;
  liveReelPool: string[];
  revealedWinnerCards: any[];
  getWinnerAvatar: (winner: any) => string;
  busy: boolean;
  drawId: string;
  onPublish: () => Promise<void>;
};

export default function LiveDrawStage({
  visible,
  liveDrawSpinning,
  liveCountdown,
  liveAnimationPreset,
  liveWheelAngle,
  liveWheelNames,
  liveDrawDisplayType,
  liveDrawDisplayName,
  liveReelPool,
  revealedWinnerCards,
  getWinnerAvatar,
  busy,
  drawId,
  onPublish,
}: Props) {
  if (!visible) return null;

  return (
    <section id="facebook-live-draw-step" className="live-future-shell space-y-5 rounded-3xl border border-fuchsia-300/40 bg-[#07031a] p-4 text-white shadow-[0_0_80px_rgba(168,85,247,0.35)] sm:p-6">
      <div className="live-future-bg" aria-hidden="true" />
      <div className="relative z-10 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-wide">Step 7 — Live Winner Reveal</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${liveDrawSpinning ? "bg-amber-400/20 text-amber-200" : "bg-emerald-400/20 text-emerald-200"}`}>
            {liveDrawSpinning ? "Running animation..." : "Reveal completed"}
          </span>
        </div>
        <p className="text-xs text-fuchsia-100/80">تجربة سحب مباشرة بتصميم عصري، مع إظهار الفائزين وصورهم بشكل احترافي.</p>

        <div className={`live-preview-stage preset-${liveAnimationPreset.toLowerCase().replace("_", "-")} rounded-3xl border border-white/10 bg-white/[0.03] p-3 sm:p-5`}>
          <div className={`live-countdown ${liveCountdown ? "live-countdown-show" : ""}`}>{liveCountdown ?? ""}</div>

          <div className="live-preview-roulette rounded-2xl border border-fuchsia-300/30 bg-slate-950/90 p-3 text-white">
            <div className="mx-auto flex w-full max-w-[260px] items-center justify-center">
              <div className="relative h-56 w-56">
                <div className="live-wheel-pointer" />
                <div className={`live-wheel ${liveDrawSpinning ? "live-wheel-spinning" : ""}`} style={{ transform: `rotate(${liveWheelAngle}deg)` }}>
                  {liveWheelNames.map((name, idx) => {
                    const angle = (360 / Math.max(1, liveWheelNames.length)) * idx;
                    return (
                      <div key={`${name}-${idx}`} className="live-wheel-label" style={{ transform: `rotate(${angle}deg)` }}>
                        <span style={{ transform: `translateY(-84px) rotate(${-angle}deg)` }}>{name}</span>
                      </div>
                    );
                  })}
                  <div className="live-wheel-center">{liveDrawDisplayType === "WINNER" ? "🏆" : "⭐"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="live-preview-slot rounded-2xl border border-fuchsia-300/30 bg-slate-950/90 p-3 text-white">
            <div className="slot-machine-frame">
              <div className="slot-machine-payline" />
              <div className="slot-machine-grid">
                {[0, 1, 2].map((col) => (
                  <div key={col} className="slot-reel-window">
                    <div className={`slot-reel-track ${liveDrawSpinning ? "slot-reel-track-spinning" : ""}`}>
                      {[...liveReelPool, ...liveReelPool].map((name, idx) => (
                        <div key={`${col}-${name}-${idx}`} className={`slot-cell ${name === liveDrawDisplayName ? "slot-cell-active" : ""}`}>{name}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="live-preview-card rounded-2xl border border-fuchsia-300/30 bg-slate-950/90 p-3 text-white">
            <div className="card-stage">
              <div className={`winner-card ${liveDrawSpinning ? "winner-card-flip" : ""}`}>
                <div className="winner-card-face winner-card-front">Winner</div>
                <div className="winner-card-face winner-card-back">{liveDrawDisplayName || "Winner"}</div>
              </div>
            </div>
          </div>
        </div>

        {revealedWinnerCards.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {revealedWinnerCards.map((winner: any, idx: number) => {
              const avatar = getWinnerAvatar(winner);
              return (
                <article key={`${winner.id || winner.display_name}-${idx}`} className="rounded-2xl border border-fuchsia-300/30 bg-gradient-to-br from-fuchsia-500/15 to-indigo-500/10 p-4 backdrop-blur">
                  <div className="mb-3 flex items-center gap-3">
                    {avatar ? (
                      <img src={avatar} alt={String(winner.display_name || "Winner")} className="h-14 w-14 rounded-full border-2 border-fuchsia-300/70 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-fuchsia-300/70 bg-slate-800 text-xl">👤</div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200/80">Winner #{idx + 1}</p>
                      <p className="text-lg font-bold text-white">{String(winner.display_name || "Participant")}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-fuchsia-100/80">جارِ تحضير بطاقة الفائز...</p>
        )}

        <button
          className="w-full rounded-2xl bg-lime-500 px-4 py-3 text-xl font-bold text-white transition hover:bg-lime-400 disabled:opacity-60"
          disabled={!drawId || busy}
          onClick={() => void onPublish()}
        >
          {busy ? "Publishing..." : "Publish"}
        </button>
      </div>

      <style jsx>{`
        .live-countdown { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 110px; font-weight: 800; color: #fff; text-shadow: 0 0 20px rgba(56,189,248,.95); pointer-events: none; z-index: 20; }
        .live-countdown-show { display: flex; animation: countdown-pop 0.8s ease; }
        .live-future-shell { position: relative; overflow: hidden; }
        .live-future-bg { position: absolute; inset: -20%; background: radial-gradient(circle at 20% 20%, rgba(168,85,247,.32), transparent 42%), radial-gradient(circle at 80% 10%, rgba(59,130,246,.2), transparent 45%), radial-gradient(circle at 50% 90%, rgba(244,63,94,.18), transparent 40%); filter: blur(18px); animation: aura-drift 9s ease-in-out infinite alternate; }
        .live-preview-stage { position: relative; min-height: 220px; }
        .live-preview-roulette,.live-preview-slot,.live-preview-card { display: none; }
        .preset-roulette .live-preview-roulette,.preset-slot .live-preview-slot,.preset-card-flip .live-preview-card { display: block; }
        .live-wheel { position: relative; height: 100%; width: 100%; border-radius: 9999px; background: conic-gradient(from 0deg,#22d3ee,#6366f1,#a855f7,#f43f5e,#f59e0b,#22d3ee); border: 3px solid rgba(255,255,255,.3); box-shadow: 0 0 24px rgba(99,102,241,.5); transition: transform 400ms ease-out; }
        .live-wheel-spinning { animation: wheel-spin 1.5s linear infinite; }
        .live-wheel-pointer { position: absolute; left: 50%; top: -4px; transform: translateX(-50%); z-index: 3; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 16px solid #f8fafc; filter: drop-shadow(0 0 6px rgba(248,250,252,.7)); }
        .live-wheel-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; text-shadow: 0 0 6px rgba(15,23,42,.95); }
        .live-wheel-center { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); height: 56px; width: 56px; border-radius: 9999px; background: rgba(15,23,42,.88); border: 2px solid rgba(255,255,255,.35); display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 0 15px rgba(15,23,42,.8); }
        .slot-machine-frame { position: relative; border-radius: 16px; border: 1px solid rgba(129,140,248,.45); background: radial-gradient(circle at 50% 0%, rgba(99,102,241,.35), rgba(15,23,42,.92)); padding: 12px; overflow: hidden; }
        .slot-machine-payline { position: absolute; left: 6px; right: 6px; top: 50%; transform: translateY(-50%); height: 4px; background: linear-gradient(90deg, transparent, rgba(250,204,21,.85), transparent); box-shadow: 0 0 20px rgba(250,204,21,.75); }
        .slot-machine-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; }
        .slot-reel-window { height: 168px; border-radius: 10px; border: 1px solid rgba(148,163,184,.35); background: rgba(2,6,23,.88); overflow: hidden; position: relative; }
        .slot-reel-track { display: flex; flex-direction: column; }
        .slot-reel-track-spinning { animation: reel-scroll 0.7s linear infinite; }
        .slot-cell { height: 40px; display: flex; align-items: center; justify-content: center; padding: 0 6px; font-size: 11px; font-weight: 700; border-bottom: 1px solid rgba(71,85,105,.35); text-transform: uppercase; letter-spacing: .02em; }
        .slot-cell-active { background: rgba(251,191,36,.3); color: #fde68a; }
        .card-stage { display: flex; justify-content: center; perspective: 1000px; }
        .winner-card { position: relative; width: min(100%, 340px); height: 180px; transform-style: preserve-3d; transition: transform .8s ease; }
        .winner-card-flip { transform: rotateY(180deg); }
        .winner-card-face { position: absolute; inset: 0; border-radius: 18px; border: 1px solid rgba(165,180,252,.45); display: flex; align-items: center; justify-content: center; backface-visibility: hidden; font-weight: 800; letter-spacing: .03em; text-transform: uppercase; }
        .winner-card-front { background: linear-gradient(120deg, rgba(79,70,229,.35), rgba(15,23,42,.95)); color: #c7d2fe; }
        .winner-card-back { transform: rotateY(180deg); background: linear-gradient(120deg, #2dd4bf, #22d3ee); color: #0f172a; }
        @keyframes aura-drift { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(-3%,2%,0) scale(1.06); } }
        @keyframes wheel-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes reel-scroll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes countdown-pop { from { transform: scale(.35); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </section>
  );
}
