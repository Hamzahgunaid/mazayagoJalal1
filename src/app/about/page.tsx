import type { CSSProperties } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const heroVars = {
  "--hero-glow": "rgba(26,193,185,0.35)",
  "--hero-accent": "rgba(237,137,55,0.28)",
  "--hero-grid": "rgba(255,255,255,0.08)",
} as CSSProperties;

const introAccents = ["rgba(26,193,185,0.18)", "rgba(237,137,55,0.2)", "rgba(16,47,77,0.16)"];
const valueAccents = [
  "rgba(26,193,185,0.2)",
  "rgba(49,130,206,0.2)",
  "rgba(16,185,129,0.18)",
  "rgba(237,137,55,0.2)",
];

export default async function AboutPage() {
  const t = await getTranslations("AboutPage");

  const getArray = <T,>(key: string, fallback: T[] = []) =>
    t.has(key) ? (t.raw(key) as T[]) : fallback;

  const introCards = getArray<{ title: string; body: string; note: string }>("intro.cards");
  const valueItems = getArray<{ title: string; description: string }>("values.items");
  const platformPoints = getArray<string>("platform.points");
  const platformMetrics = getArray<{ label: string; value: string }>("platform.panel.metrics");
  const approachSteps = getArray<{ title: string; description: string }>("approach.steps");
  const trustPoints = getArray<string>("trust.points");
  const ctaHighlights = getArray<string>("cta.highlights");

  return (
    <div className="space-y-20 pb-20 text-start">
      <section
        className="relative overflow-hidden rounded-[32px] border border-primary bg-secondary text-white shadow-card-strong"
        style={heroVars}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 20%, var(--hero-glow), transparent 45%), radial-gradient(circle at 85% 12%, var(--hero-accent), transparent 42%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--hero-grid) 1px, transparent 1px), linear-gradient(180deg, var(--hero-grid) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden="true"
        />
        <div className="absolute -top-24 left-10 h-56 w-56 rounded-full bg-primary/30 blur-3xl motion-safe:animate-pulse-soft" aria-hidden="true" />
        <div className="absolute -bottom-24 right-6 h-64 w-64 rounded-full bg-accent/20 blur-3xl motion-safe:animate-pulse-soft" aria-hidden="true" />

        <div className="relative z-10 grid gap-10 px-6 py-12 sm:px-10 lg:px-12 lg:py-16">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary-weak px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-primary-weak">
              {t("hero.badge")}
            </div>
            <h1 className="text-3xl font-bold leading-tight drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] sm:text-4xl lg:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="max-w-2xl text-sm text-primary-weak sm:text-base">{t("hero.subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/offers/new" className="btn btn-reward h-11 px-6">
                {t("hero.cta.primary")}
              </Link>
              <Link
                href="/contact"
                className="btn h-11 px-6 border-primary bg-primary-weak text-white hover:bg-primary-weak hover:text-white"
              >
                {t("hero.cta.secondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {introCards.map((card, index) => (
          <div
            key={card.title}
            className="card-strong relative overflow-hidden"
          >
            <div
              className="absolute right-6 top-6 h-16 w-16 rounded-full opacity-70"
              style={{
                backgroundImage: `radial-gradient(circle, ${introAccents[index] ?? introAccents[0]}, transparent 60%)`,
              }}
              aria-hidden="true"
            />
            <div className="relative space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                {t("intro.eyebrow")}
              </div>
              <h2 className="text-xl font-semibold text-text">{card.title}</h2>
              <p className="text-sm text-muted">{card.body}</p>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-secondary">
                {card.note}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-text">{t("values.title")}</h2>
          <p className="text-sm text-muted">{t("values.subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {valueItems.map((item, index) => (
            <div
              key={item.title}
              className="card group flex h-full flex-col transition hover:-translate-y-1 hover:shadow-strong"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: valueAccents[index] ?? valueAccents[0] }}
                />
                <div className="text-lg font-semibold text-text">{item.title}</div>
              </div>
              <p className="mt-3 text-sm text-muted flex-1">{item.description}</p>
              <div className="mt-4 h-1 w-12 rounded-full bg-primary/60 transition-all group-hover:w-16" />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-text">{t("platform.title")}</h2>
          <p className="text-sm text-muted">{t("platform.subtitle")}</p>
          <ul className="space-y-3 text-sm text-muted">
            {platformPoints.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <span className="chip">{t("platform.chips.organizers")}</span>
            <span className="chip">{t("platform.chips.participants")}</span>
            <span className="chip">{t("platform.chips.teams")}</span>
          </div>
        </div>
        <div className="card-strong space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            {t("platform.panel.label")}
            <span className="badge badge-success">{t("platform.panel.status")}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {platformMetrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-border bg-surface-elevated px-4 py-3">
                <div className="text-xs text-muted">{metric.label}</div>
                <div className="mt-2 text-sm font-semibold text-text">{metric.value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted">
            {t("platform.panel.note")}
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-text">{t("approach.title")}</h2>
            <p className="text-sm text-muted">{t("approach.subtitle")}</p>
          </div>
          <Link href="/offers" className="btn btn-primary h-10 px-4">
            {t("approach.cta")}
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {approachSteps.map((step, index) => (
            <div key={step.title} className="card flex h-full flex-col transition hover:-translate-y-1 hover:shadow-strong">
              <div className="flex items-center gap-3">
                <span className="badge">{`0${index + 1}`}</span>
                <h3 className="text-lg font-semibold text-text">{step.title}</h3>
              </div>
              <p className="mt-3 text-sm text-muted flex-1">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-t border-border/60 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-text">{t("trust.title")}</h2>
          <p className="text-sm text-muted">{t("trust.subtitle")}</p>
          <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            {t("trust.callout")}
          </div>
        </div>
        <div className="card space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            {t("trust.panelLabel")}
          </div>
          <ul className="space-y-2 text-sm text-muted">
            {trustPoints.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface px-6 py-10 shadow-card">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-text">{t("cta.title")}</h2>
            <p className="text-sm text-muted">{t("cta.subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/offers/new" className="btn btn-primary h-11 px-6">
                {t("cta.primary")}
              </Link>
              <Link href="/contact" className="btn btn-secondary h-11 px-6">
                {t("cta.secondary")}
              </Link>
              <Link
                href="/offers"
                className="btn h-11 px-6 border border-border bg-background text-text hover:bg-surface-elevated"
              >
                {t("cta.tertiary")}
              </Link>
            </div>
            <p className="text-xs text-muted">{t("cta.note")}</p>
          </div>
          <div className="rounded-3xl border border-border bg-background p-6">
            <div className="text-sm font-semibold text-text">{t("cta.panelTitle")}</div>
            <p className="mt-2 text-sm text-muted">{t("cta.panelBody")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ctaHighlights.map((item) => (
                <div key={item} className="rounded-2xl bg-surface-elevated px-3 py-2 text-sm text-muted">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
