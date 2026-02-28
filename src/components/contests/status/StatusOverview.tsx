'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

type OverviewMetric = {
  label: string;
  value: string;
  helper?: string;
  onClick?: () => void;
};

type OverviewLink = {
  label: string;
  href: string;
};

type StatusOverviewProps = {
  contest: {
    title: string;
    slug: string;
    statusLabel: string;
    stageHint: string;
  };
  metrics: OverviewMetric[];
  quickLinks?: OverviewLink[];
  note?: string;
};
export default function StatusOverview({ contest, metrics, quickLinks, note }: StatusOverviewProps) {
  const t = useTranslations('OfferStatus');
  const showMeta = Boolean(note) || (quickLinks && quickLinks.length > 0);
  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-6 shadow-card">
        <div className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-white/90 to-primary-weak/30" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/80">
                {t('overview.eyebrow')}
              </p>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold text-secondary">{contest.title}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-live">{contest.statusLabel}</span>
                <span className="badge badge-muted">{contest.stageHint}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm font-semibold sm:flex-row">
              <Link href={`/offers/${contest.slug}`} className="btn btn-primary h-10 px-5">
                {t('overview.viewPublic')}
              </Link>
              <Link href={`/offers/${contest.slug}/manage?tab=basics`} className="btn btn-secondary h-10 px-5">
                {t('overview.openManager')}
              </Link>
           </div>
          </div>

          {metrics.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => {
                const content = (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-secondary">{metric.value}</p>
                    {metric.helper && <p className="mt-1 text-xs text-muted">{metric.helper}</p>}
                  </>
                );
                const cardClass = [
                  'group relative overflow-hidden rounded-2xl border border-border bg-surface/90 p-4 text-left shadow-soft transition duration-fast ease-soft',
                  metric.onClick
                    ? 'cursor-pointer hover:-translate-y-1 hover:border-primary/40 hover:bg-primary-weak/30 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2'
                    : '',
                ].join(' ');
                return metric.onClick ? (
                  <button key={metric.label} type="button" onClick={metric.onClick} className={cardClass}>
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" />
                    <div className="relative">{content}</div>
                  </button>
                ) : (
                  <div key={metric.label} className={cardClass}>
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
                    <div className="relative">{content}</div>
                  </div>
                );
              })}
            </div>
          )}
          {showMeta && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-surface-elevated/80 px-4 py-3 text-xs text-muted shadow-soft">
              {note && <p className="flex-1 min-w-[220px]">{note}</p>}
              {quickLinks && quickLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="chip h-8 px-3 text-[11px] font-semibold uppercase tracking-wide text-secondary hover:border-primary/40"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

    </section>
  );
}
