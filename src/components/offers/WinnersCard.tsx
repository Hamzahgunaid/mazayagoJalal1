'use client';

import { useMemo, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Winner = {
  id?: string;
  user_id?: string;
  entry_id?: string | null;
  published_at?: string | null;
  prize_name?: string | null;
  user_display_name?: string | null;
  user_avatar_url?: string | null;
};

export default function WinnersCard({ winners, slug }: { winners: Winner[]; slug: string }) {
  const t = useTranslations('OfferDetail.winners');
  const locale = useLocale();
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );
  const formatDate = useCallback(
    (value?: string | null) => {
      if (!value) return '';
      const d = new Date(value);
      return Number.isNaN(+d) ? '' : dateFormatter.format(d);
    },
    [dateFormatter],
  );
  const displayWinnerName = useCallback(
    (winner: Winner) => {
      const maybe = (winner.user_display_name || '').trim();
      return maybe || t('defaultName');
    },
    [t],
  );

  const sorted = useMemo(
    () =>
      [...(winners || [])].sort((a, b) => {
        const da = a.published_at ? +new Date(a.published_at) : 0;
        const db = b.published_at ? +new Date(b.published_at) : 0;
        return db - da;
      }),
    [winners],
  );

  const spotlight = sorted[0];
  const remaining = sorted.slice(1, 4);

  return (
    <div className="rounded-3xl border border-border bg-gradient-to-br from-white to-bg/40 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted">{t('label')}</p>
          <h3 className="text-lg font-semibold text-text">{t('headline')}</h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-weak px-3 py-1 text-xs font-semibold text-accent-hover">
          🏆 {t('countBadge', { count: sorted.length || 0 })}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-muted">
          {t('empty')}
        </div>
      ) : (
        <>
          {spotlight && (
            <div className="mt-5 rounded-2xl border border-border bg-white p-4 shadow-inner">
              <p className="text-xs uppercase tracking-[0.3em] text-[#4D8A1F]">{t('spotlight')}</p>
              <div className="mt-2 flex items-center gap-3">
                {spotlight.user_avatar_url ? (
                  <img
                    src={spotlight.user_avatar_url}
                    alt={displayWinnerName(spotlight)}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-hover text-white grid place-items-center text-lg font-semibold">
                    {displayWinnerName(spotlight).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-base font-semibold text-text truncate">
                    {displayWinnerName(spotlight)}
                  </div>
                  <p className="text-xs text-muted">{formatDate(spotlight.published_at)}</p>
                  {spotlight.prize_name && (
                    <p className="text-xs text-muted">{t('prizeLabel', { prize: spotlight.prize_name })}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {remaining.length > 0 && (
            <ul className="mt-4 space-y-3">
              {remaining.map((w, i) => (
                <li
                  key={w.id || w.entry_id || i}
                  className="flex items-center justify-between rounded-2xl border border-border bg-white/70 px-3 py-2 text-sm text-muted"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {w.user_avatar_url ? (
                      <img
                        src={w.user_avatar_url}
                        alt={displayWinnerName(w)}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-white"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-weak text-muted grid place-items-center text-xs font-semibold">
                        {displayWinnerName(w).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="truncate block">{displayWinnerName(w)}</span>
                      {w.prize_name && (
                        <span className="text-xs text-muted block">
                          {t('prizeLabel', { prize: w.prize_name })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted">{formatDate(w.published_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <a
        href={`/offers/${slug}/winner`}
        className="mt-5 inline-flex items-center text-sm font-semibold text-primary-hover hover:text-primary-hover"
      >
        {t('cta')}
      </a>
    </div>
  );
}
