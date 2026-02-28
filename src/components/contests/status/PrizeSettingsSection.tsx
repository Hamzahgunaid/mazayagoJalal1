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

export default function PrizeSettingsSection({
  slug,
  prizes,
  maxWinners,
}: {
  slug: string;
  prizes: PrizeSummary[];
  maxWinners?: number | null;
}) {
  const t = useTranslations('OfferStatus');
  const configured = prizes.length;
  const tiers = prizes.filter((p) => Boolean((p.name || '').trim())).length;

  return (
    <section id="contest-prizes-overview" className="rounded-3xl border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">{t('winners.prizeSettings.title')}</p>
          <p className="text-sm text-muted">{t('winners.prizeSettings.subtitle')}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="badge badge-muted">{t('winners.prizeSettings.configured', { count: configured })}</span>
            <span className="badge badge-muted">{t('winners.prizeSettings.tiers', { count: tiers })}</span>
            <span className="badge badge-muted">
              {t('winners.prizeSettings.maxWinners', { count: typeof maxWinners === 'number' ? maxWinners : 0 })}
            </span>
          </div>
        </div>

        <Link
          href={`/offers/${slug}/manage?tab=prizes`}
          className="btn btn-secondary h-9 px-4 text-[11px] font-semibold uppercase tracking-wide"
        >
          {t('winners.prizeSettings.manage')}
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {prizes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
            {t('winners.prizeSettings.empty')}
          </p>
        ) : (
          prizes.map((prize, index) => (
            <div key={`${prize.id || prize.name || index}`} className="rounded-2xl border border-border bg-surface-elevated/80 p-3 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-secondary">{prize.name || t('winners.prizeUnnamed')}</p>
                <span className="badge badge-muted">{t('winners.prizeSettings.quantity', { count: prize.quantity ?? 1 })}</span>
              </div>
              {!!prize.amount && (
                <p className="mt-1 text-xs text-muted">
                  {t('winners.prizeSettings.amount', {
                    amount: prize.amount,
                    currency: prize.currency || '',
                  })}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
