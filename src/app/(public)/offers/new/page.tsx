'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type ContestType =
  | "RIDDLE"
  | "QR_CODE"
  | "LEADERBOARD"
  | "TREASURE_HUNT"
  | "UGC"
  | "REFERRAL"
  | "PREDICTION"
  | "SURVEY"
  | "RAFFLE";

const TYPES: Array<{ type: ContestType; hue: string }> = [
  { type: "RAFFLE", hue: "from-secondary to-primary-hover" },
  { type: "RIDDLE", hue: "from-primary-hover to-primary-hover" },
  { type: "QR_CODE", hue: "from-primary to-primary-hover" },
  { type: "LEADERBOARD", hue: "from-success to-primary" },
  { type: "TREASURE_HUNT", hue: "from-accent to-accent-hover" },
  { type: "UGC", hue: "from-danger to-danger" },
  { type: "REFERRAL", hue: "from-accent to-accent-hover" },
  { type: "PREDICTION", hue: "from-primary-hover to-primary-hover" }
  // { type: "SURVEY", hue: "from-lime-500 to-green-500" },
];
const HIDDEN_TYPES = new Set<ContestType>(["TREASURE_HUNT", "UGC", "REFERRAL", "SURVEY"]);
const VISIBLE_TYPES = TYPES.filter((card) => !HIDDEN_TYPES.has(card.type));

export default function NewOfferLanding() {
  const t = useTranslations("OfferNew");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let frame: number;
    frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="space-y-10 pb-16">
      <header
        className={`rounded-3xl bg-gradient-to-r from-secondary via-primary-hover to-secondary p-8 text-white shadow-[0_30px_65px_rgba(30,41,59,0.35)] transition-all duration-500 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.4em] text-primary-weak">{t("hero.label")}</p>
          <h1 className="text-3xl font-bold md:text-4xl">{t("hero.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm text-primary-weak">{t("hero.description")}</p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text">{t("list.title")}</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {VISIBLE_TYPES.map((card, index) => (
            <Link
              key={card.type}
              href={`/offers/new/${card.type}`}
              className={`group relative overflow-hidden rounded-2xl border border-border/80 bg-white p-6 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
              }`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.hue} opacity-0 transition-opacity duration-200 group-hover:opacity-20`}
              />
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] transition-opacity duration-200 group-hover:bg-white/40" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">{card.type}</div>
                  <h3 className="text-xl font-semibold text-text">{t(`list.items.${card.type}.title`)}</h3>
                  <p className="text-sm leading-relaxed text-muted">{t(`list.items.${card.type}.desc`)}</p>
                  <p className="text-xs font-medium uppercase tracking-widest text-primary-hover/90">
                    {t(`list.items.${card.type}.note`)}
                  </p>
                </div>
                <div className="mt-6 text-sm font-semibold text-primary-hover transition-transform duration-200 group-hover:translate-x-1">
                  {t("list.cta")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

