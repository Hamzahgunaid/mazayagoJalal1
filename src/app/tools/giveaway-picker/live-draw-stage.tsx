"use client";

import { useEffect, useRef } from "react";

type LiveAnimationPreset = "ROULETTE" | "SLOT" | "CARD_FLIP";
type LivePhase = "IDLE" | "COUNTDOWN" | "SPIN" | "REVEAL" | "CONFIRM" | "DONE";

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
  liveSlotStoppedCols: Set<number>;
  liveStagePhase: LivePhase;
  livePhaseProgress: number;
  liveCurrentWinnerIndex: number;
  revealedWinnerCards: any[];
  getWinnerAvatar: (winner: any) => string;
  busy: boolean;
  drawId: string;
  onPublish: () => Promise<void>;
};

/* ── Particle burst on Card Flip reveal (pure CSS, no library) ─────────── */
function spawnWinnerParticles(container: HTMLElement, color: string): void {
  const count = 18;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    const angle = (360 / count) * i;
    const dist = 60 + Math.random() * 60;
    const size = 4 + Math.random() * 6;
    el.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:${size}px; height:${size}px; border-radius:50%;
      background:${color}; pointer-events:none;
      animation: particle-burst 0.7s ease-out forwards;
      --tx:${Math.cos((angle * Math.PI) / 180) * dist}px;
      --ty:${Math.sin((angle * Math.PI) / 180) * dist}px;
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 750);
  }
}

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
  liveSlotStoppedCols,
  liveStagePhase,
  livePhaseProgress,
  liveCurrentWinnerIndex,
  revealedWinnerCards,
  getWinnerAvatar,
  busy,
  drawId,
  onPublish,
}: Props) {
  const cardStageRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef<LivePhase>("IDLE");

  /* Trigger particle burst when Card Flip enters REVEAL phase */
  useEffect(() => {
    if (
      liveAnimationPreset === "CARD_FLIP" &&
      liveStagePhase === "REVEAL" &&
      prevPhaseRef.current !== "REVEAL" &&
      cardStageRef.current
    ) {
      spawnWinnerParticles(
        cardStageRef.current,
        liveDrawDisplayType === "WINNER" ? "#2dd4bf" : "#fbbf24",
      );
    }
    prevPhaseRef.current = liveStagePhase;
  }, [liveStagePhase, liveAnimationPreset, liveDrawDisplayType]);

  if (!visible) return null;

  return (
    <section
      id="facebook-live-draw-step"
      className="live-future-shell space-y-5 rounded-3xl border border-fuchsia-300/40 bg-[#07031a] p-4 text-white shadow-[0_0_80px_rgba(168,85,247,0.35)] sm:p-6"
    >
      <div className="live-future-bg" aria-hidden="true" />
      <div className="relative z-10 space-y-5">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-wide">Step 7 — Live Winner Reveal</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              liveDrawSpinning
                ? "bg-amber-400/20 text-amber-200"
                : "bg-emerald-400/20 text-emerald-200"
            }`}
          >
            {liveDrawSpinning ? "Running animation..." : "Reveal completed"}
          </span>
        </div>
        <p className="text-xs text-fuchsia-100/80">
          تجربة سحب مباشرة بتصميم عصري، مع إظهار الفائزين وصورهم بشكل احترافي.
        </p>

        {/* ── ARIA live region for screen readers ────────────────────── */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {liveStagePhase === "COUNTDOWN" && `Starting in ${liveCountdown ?? 0} seconds`}
          {liveStagePhase === "SPIN" && "Drawing winner, please wait..."}
          {liveStagePhase === "REVEAL" && `Winner revealed: ${liveDrawDisplayName}`}
          {liveStagePhase === "DONE" &&
            `Draw complete. ${revealedWinnerCards.length} winner(s) selected.`}
        </div>

        {/* ── Animation stage ────────────────────────────────────────── */}
        <div
          className={`live-preview-stage preset-${liveAnimationPreset
            .toLowerCase()
            .replace("_", "-")} rounded-3xl border border-white/10 bg-white/[0.03] p-3 sm:p-5`}
        >
          {/* Countdown overlay */}
          <div
            role="timer"
            aria-label={liveCountdown ? `Starting in ${liveCountdown} seconds` : undefined}
            className={`live-countdown ${liveCountdown ? "live-countdown-show" : ""}`}
          >
            {liveCountdown ?? ""}
          </div>

          {/* ── ROULETTE preset ────────────────────────────────────── */}
          <div className="live-preview-roulette rounded-2xl border border-fuchsia-300/30 bg-slate-950/90 p-3 text-white">
            <div className="mx-auto flex w-full max-w-[260px] items-center justify-center">
              <div className="relative h-56 w-56">
                <div className="live-wheel-pointer" />
                <div
                  className="live-wheel"
                  style={{ transform: `rotate(${liveWheelAngle}deg)` }}
                >
                  {liveWheelNames.map((name, idx) => {
                    const angle = (360 / Math.max(1, liveWheelNames.length)) * idx;
                    return (
                      <div
                        key={`${name}-${idx}`}
                        className="live-wheel-label"
                        style={{ transform: `rotate(${angle}deg)` }}
                      >
                        <span style={{ transform: `translateY(-84px) rotate(${-angle}deg)` }}>
                          {name}
                        </span>
                      </div>
                    );
                  })}
                  <div className="live-wheel-center">
                    {liveDrawDisplayType === "WINNER" ? "\u{1F3C6}" : "\u2B50"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SLOT preset with staggered column stops ────────────── */}
          <div className="live-preview-slot rounded-2xl border border-fuchsia-300/30 bg-slate-950/90 p-3 text-white">
            <div className="slot-machine-frame">
              <div className="slot-machine-payline" />
              <div className="slot-machine-grid">
                {[0, 1, 2].map((col) => {
                  const isStopped = liveSlotStoppedCols.has(col);
                  const isSpinning = liveDrawSpinning && !isStopped;
                  return (
                    <div key={col} className="slot-reel-window">
                      <div
                        className={`slot-reel-track ${isSpinning ? "slot-reel-track-spinning" : ""} ${isStopped ? "slot-reel-stopped" : ""}`}
                      >
                        {[...liveReelPool, ...liveReelPool].map((name, idx) => (
                          <div
                            key={`${col}-${name}-${idx}`}
                            className={`slot-cell ${name === liveDrawDisplayName ? "slot-cell-active" : ""}`}
                          >
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── CARD FLIP preset with particle burst container ─────── */}
          <div className="live-preview-card rounded-2xl border border-fuchsia-300/30 bg-slate-950/90 p-3 text-white">
            <div className="card-stage" ref={cardStageRef}>
              <div
                className={`winner-card ${
                  liveStagePhase === "REVEAL" || liveStagePhase === "CONFIRM" || liveStagePhase === "DONE"
                    ? "winner-card-flip"
                    : ""
                }`}
              >
                <div className="winner-card-face winner-card-front">Winner</div>
                <div className="winner-card-face winner-card-back">
                  {liveDrawDisplayName || "Winner"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Phase progress bar ─────────────────────────────────────── */}
        {liveStagePhase !== "IDLE" && (
          <div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 transition-all duration-700 ease-out"
                style={{ width: `${livePhaseProgress}%` }}
              />
            </div>
            <p className="mt-1 text-center text-xs tracking-widest uppercase text-fuchsia-200/70">
              {liveStagePhase === "COUNTDOWN" && "Get ready..."}
              {liveStagePhase === "SPIN" &&
                `Selecting winner ${liveCurrentWinnerIndex + 1}...`}
              {liveStagePhase === "REVEAL" && "And the winner is..."}
              {liveStagePhase === "CONFIRM" && "Confirmed!"}
              {liveStagePhase === "DONE" &&
                `${revealedWinnerCards.length} winner(s) selected`}
            </p>
          </div>
        )}

        {/* ── Winner cards ───────────────────────────────────────────── */}
        {revealedWinnerCards.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {revealedWinnerCards.map((winner: any, idx: number) => {
              const avatar = getWinnerAvatar(winner);
              return (
                <article
                  key={`${winner.id || winner.display_name}-${idx}`}
                  aria-label={`Winner ${idx + 1}: ${winner.display_name || "Participant"}`}
                  className="winner-card-entry rounded-2xl border border-fuchsia-300/30 bg-gradient-to-br from-fuchsia-500/15 to-indigo-500/10 p-4 backdrop-blur"
                >
                  <div className="mb-3 flex items-center gap-3">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={String(winner.display_name || "Winner")}
                        className="h-14 w-14 rounded-full border-2 border-fuchsia-300/70 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-fuchsia-300/70 bg-slate-800 text-xl">
                        {"\u{1F464}"}
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200/80">
                        Winner #{idx + 1}
                      </p>
                      <p className="text-lg font-bold text-white">
                        {String(winner.display_name || "Participant")}
                      </p>
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
        /* ── Countdown overlay ────────────────────────────────────────── */
        .live-countdown { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 110px; font-weight: 800; color: #fff; text-shadow: 0 0 20px rgba(56,189,248,.95); pointer-events: none; z-index: 20; }
        .live-countdown-show { display: flex; animation: countdown-pop 0.8s ease; }

        /* ── Aura background ──────────────────────────────────────────── */
        .live-future-shell { position: relative; overflow: hidden; }
        .live-future-bg { position: absolute; inset: -20%; background: radial-gradient(circle at 20% 20%, rgba(168,85,247,.32), transparent 42%), radial-gradient(circle at 80% 10%, rgba(59,130,246,.2), transparent 45%), radial-gradient(circle at 50% 90%, rgba(244,63,94,.18), transparent 40%); filter: blur(18px); animation: aura-drift 9s ease-in-out infinite alternate; }

        /* ── Animation stage container ────────────────────────────────── */
        .live-preview-stage { position: relative; min-height: 220px; }
        .live-preview-roulette,.live-preview-slot,.live-preview-card { display: none; }
        .preset-roulette .live-preview-roulette,.preset-slot .live-preview-slot,.preset-card-flip .live-preview-card { display: block; }

        /* ── Roulette wheel ───────────────────────────────────────────── */
        .live-wheel { position: relative; height: 100%; width: 100%; border-radius: 9999px; background: conic-gradient(from 0deg,#22d3ee,#6366f1,#a855f7,#f43f5e,#f59e0b,#22d3ee); border: 3px solid rgba(255,255,255,.3); box-shadow: 0 0 24px rgba(99,102,241,.5); transition: transform 120ms ease-out; }
        .live-wheel-pointer { position: absolute; left: 50%; top: -4px; transform: translateX(-50%); z-index: 3; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 16px solid #f8fafc; filter: drop-shadow(0 0 6px rgba(248,250,252,.7)); }
        .live-wheel-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; text-shadow: 0 0 6px rgba(15,23,42,.95); }
        .live-wheel-center { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); height: 56px; width: 56px; border-radius: 9999px; background: rgba(15,23,42,.88); border: 2px solid rgba(255,255,255,.35); display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 0 15px rgba(15,23,42,.8); }

        /* ── Slot machine ─────────────────────────────────────────────── */
        .slot-machine-frame { position: relative; border-radius: 16px; border: 1px solid rgba(129,140,248,.45); background: radial-gradient(circle at 50% 0%, rgba(99,102,241,.35), rgba(15,23,42,.92)); padding: 12px; overflow: hidden; }
        .slot-machine-payline { position: absolute; left: 6px; right: 6px; top: 50%; transform: translateY(-50%); height: 4px; background: linear-gradient(90deg, transparent, rgba(250,204,21,.85), transparent); box-shadow: 0 0 20px rgba(250,204,21,.75); z-index: 2; }
        .slot-machine-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; }
        .slot-reel-window { height: 168px; border-radius: 10px; border: 1px solid rgba(148,163,184,.35); background: rgba(2,6,23,.88); overflow: hidden; position: relative; }
        .slot-reel-track { display: flex; flex-direction: column; transition: transform 0.3s ease-out; }
        .slot-reel-track-spinning { animation: reel-scroll 0.7s linear infinite; }
        .slot-reel-stopped { animation: none; }
        .slot-cell { height: 40px; display: flex; align-items: center; justify-content: center; padding: 0 6px; font-size: 11px; font-weight: 700; border-bottom: 1px solid rgba(71,85,105,.35); text-transform: uppercase; letter-spacing: .02em; }
        .slot-cell-active { background: rgba(251,191,36,.3); color: #fde68a; }

        /* ── Card flip ────────────────────────────────────────────────── */
        .card-stage { display: flex; justify-content: center; perspective: 1000px; position: relative; }
        .winner-card { position: relative; width: min(100%, 340px); height: 180px; transform-style: preserve-3d; transition: transform .8s ease; }
        .winner-card-flip { transform: rotateY(180deg); }
        .winner-card-face { position: absolute; inset: 0; border-radius: 18px; border: 1px solid rgba(165,180,252,.45); display: flex; align-items: center; justify-content: center; backface-visibility: hidden; font-weight: 800; letter-spacing: .03em; text-transform: uppercase; }
        .winner-card-front { background: linear-gradient(120deg, rgba(79,70,229,.35), rgba(15,23,42,.95)); color: #c7d2fe; }
        .winner-card-back { transform: rotateY(180deg); background: linear-gradient(120deg, #2dd4bf, #22d3ee); color: #0f172a; }

        /* ── Winner card entry animation ──────────────────────────────── */
        .winner-card-entry { animation: card-entry 0.5s ease-out; }

        /* ── Keyframes ────────────────────────────────────────────────── */
        @keyframes aura-drift { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(-3%,2%,0) scale(1.06); } }
        @keyframes reel-scroll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes countdown-pop { from { transform: scale(.35); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes card-entry { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes particle-burst {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
