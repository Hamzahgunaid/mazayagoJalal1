'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type PrizeItem = { id: string; title?: string; name?: string };
type WinnerItem = {
  id: string;
  entry_id?: string;
  code?: string | null;
  user_display?: string | null;
  prize_id?: string | null;
  published_at?: string | null;
};

export default function WinnerPrizeLinkingSection({
  contestId,
  hasPublishedWinners,
  prizes,
  winners,
  onRefreshWinners,
}: {
  contestId: string;
  hasPublishedWinners: boolean;
  prizes: PrizeItem[];
  winners: WinnerItem[];
  onRefreshWinners: () => Promise<void>;
}) {
  const t = useTranslations('OfferStatus');
  const [selectedPrizeId, setSelectedPrizeId] = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);
  const [savingWinnerId, setSavingWinnerId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const publishedWinners = useMemo(() => winners.filter((winner) => Boolean(winner.published_at)), [winners]);
  const unassignedCount = useMemo(
    () => publishedWinners.filter((winner) => !winner.prize_id).length,
    [publishedWinners],
  );

  const prizeLabel = (prizeId: string | null | undefined) => {
    if (!prizeId) return t('winners.prizeNotLinked');
    const found = prizes.find((item) => item.id === prizeId);
    return found?.title || found?.name || t('winners.prizeUnnamed');
  };

  const linkWinnerPrize = async (winnerId: string, prizeId: string | null) => {
    setSavingWinnerId(winnerId);
    try {
      const response = await fetch(`/api/owner/contests/${contestId}/winners/${winnerId}/prize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prizeId }),
      });
      if (!response.ok) throw new Error('link');
      await onRefreshWinners();
      setMessage(t('toasts.prizeUpdatedSuccess'));
    } finally {
      setSavingWinnerId(null);
    }
  };

  const bulkAssign = async () => {
    if (!selectedPrizeId) return;
    setBulkLoading(true);
    try {
      const response = await fetch(`/api/owner/contests/${contestId}/winners/assign-prize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prizeId: selectedPrizeId, onlyUnassigned }),
      });
      if (!response.ok) throw new Error('bulk');
      await onRefreshWinners();
      setMessage(t('prizes.bulkAssignSuccess'));
    } finally {
      setBulkLoading(false);
    }
  };

  if (!hasPublishedWinners && winners.length === 0) return null;

  return (
    <article className="rounded-3xl border border-border bg-surface p-5 shadow-soft" id="contest-prize-linking">
      <h3 className="text-sm font-semibold text-secondary">{t('prizes.linkSectionTitle')}</h3>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="badge badge-muted">{t('winners.publishedWinnersCount', { count: publishedWinners.length })}</span>
        <span className="badge badge-muted">{t('prizes.unassignedCount', { count: unassignedCount })}</span>
      </div>
      {message && <p className="mt-2 text-xs text-primary">{message}</p>}

      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto] items-end">
        <label className="text-xs text-muted">
          {t('prizes.bulkAssignTitle')}
          <select className="select mt-1 h-9 w-full rounded-xl px-3 text-xs text-secondary" value={selectedPrizeId} onChange={(event) => setSelectedPrizeId(event.target.value)}>
            <option value="">{t('winners.noPrize')}</option>
            {prizes.map((prize) => (
              <option key={prize.id} value={prize.id}>{prize.title || prize.name || t('winners.prizeUnnamed')}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={onlyUnassigned} onChange={(event) => setOnlyUnassigned(event.target.checked)} />
          {t('prizes.onlyUnassigned')}
        </label>
        <button type="button" className="btn btn-primary h-9 px-3 text-xs" disabled={!selectedPrizeId || bulkLoading} onClick={bulkAssign}>
          {t('prizes.bulkAssignButton')}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {publishedWinners.map((winner) => (
          <WinnerRow
            key={winner.id}
            winner={winner}
            prizes={prizes}
            saving={savingWinnerId === winner.id}
            prizeLabel={prizeLabel(winner.prize_id)}
            onSave={linkWinnerPrize}
          />
        ))}
      </div>
    </article>
  );
}

function WinnerRow({ winner, prizes, saving, prizeLabel, onSave }: { winner: WinnerItem; prizes: PrizeItem[]; saving: boolean; prizeLabel: string; onSave: (winnerId: string, prizeId: string | null) => Promise<void>; }) {
  const t = useTranslations('OfferStatus');
  const [value, setValue] = useState(winner.prize_id || '');

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated/80 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-secondary">{winner.user_display || t('winners.fallbackName')}</p>
        <span className="badge badge-muted">{prizeLabel}</span>
      </div>
      {winner.code && <p className="text-muted">{winner.code}</p>}
      <div className="mt-2 flex gap-2">
        <select className="select h-8 rounded-xl px-2 text-xs" value={value} onChange={(event) => setValue(event.target.value)}>
          <option value="">{t('winners.noPrize')}</option>
          {prizes.map((prize) => (
            <option key={prize.id} value={prize.id}>{prize.title || prize.name || t('winners.prizeUnnamed')}</option>
          ))}
        </select>
        <button className="btn btn-primary h-8 px-3 text-[11px]" onClick={() => onSave(winner.id, value || null)} disabled={saving || value === (winner.prize_id || '')}>
          {t('winners.saveLink')}
        </button>
      </div>
    </div>
  );
}
