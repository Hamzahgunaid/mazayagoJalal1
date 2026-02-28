'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

type PrizeSummary = {
  id?: string | null;
  name?: string | null;
  amount?: number | null;
  currency?: string | null;
  quantity?: number | null;
};

export default function PrizeSummarySection({ slug, prizes, maxWinners }: { slug: string; prizes: PrizeSummary[]; maxWinners?: number | null }) {
  const t = useTranslations('OfferStatus');
  const configured = prizes.length;
  const tiers = prizes.length;

  return (
    <section id="contest-prizes-overview" className="rounded-3xl border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-secondary">{t('prizes.summaryTitle')}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="badge badge-muted">{t('prizes.configured', { count: configured })}</span>
            <span className="badge badge-muted">{t('prizes.tiers', { count: tiers })}</span>
            <span className="badge badge-muted">{t('prizes.maxWinners', { count: typeof maxWinners === 'number' ? maxWinners : 0 })}</span>
          </div>
          {configured === 0 && <p className="text-xs text-muted">{t('prizes.noneHint')}</p>}
        </div>

        <Link href={`/offers/${slug}/manage?tab=prizes`} className="btn btn-secondary h-9 px-4 text-[11px] font-semibold uppercase tracking-wide">
          {t('prizes.manageButton')}
        </Link>
      </div>

      {configured > 0 && (
        <div className="mt-4 space-y-2">
          {prizes.map((prize, index) => (
            <div key={`${prize.id || prize.name || index}`} className="rounded-2xl border border-border bg-surface-elevated/80 p-3 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-secondary">{prize.name || t('winners.prizeUnnamed')}</p>
                <span className="badge badge-muted">{t('winners.prizeQuantity', { count: prize.quantity ?? 1 })}</span>
              </div>
              {!!prize.amount && (
                <p className="mt-1 text-xs text-muted">
                  {prize.amount} {prize.currency || ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
