'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import FieldHelp from '@/components/ui/FieldHelp';

type CandidateEntry = {
  id: string;
  title: string;
  owner: string;
  status: string;
};

type WinnerSummary = {
  id: string;
  name: string;
};

type Notice = { kind: 'success' | 'error' | 'info'; text: string };

type WinnersSelectionProps = {
  contestId: string;
  contestStatus?: string | null;
  entriesTotal?: number;
  candidates: CandidateEntry[];
  winners: WinnerSummary[];
  selectionMode?: string | null;
  eligibleCount?: number | null;
  onEnsureSeedCommit?: (seedCommit: string) => Promise<boolean>;
  onPublishWinners?: (seedReveal: string, externalEntropy: string | null) => Promise<void> | void;
  publishingWinners?: boolean;
  drawError?: string | null;
  maxWinners?: number | null;
  isLocked?: boolean;
  seedCommit?: string | null;
  seedReveal?: string | null;
  externalEntropy?: string | null;
  proofUrl?: string;
  predictionPublishBlocked?: boolean;
  prizeLinkingSection?: ReactNode;
  publishNotice?: string | null;
};

const STATUS_TONE: Record<string, string> = {
  VALIDATED: 'badge badge-success',
  CORRECT: 'badge badge-success',
  PENDING: 'badge border-warning/30 bg-warning/10 text-warning',
  IN_REVIEW: 'badge border-warning/30 bg-warning/10 text-warning',
  NEEDS_REVIEW: 'badge border-warning/30 bg-warning/10 text-warning',
  SUBMITTED: 'badge badge-muted',
};

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');
}

export default function WinnersSelection({
  contestId,
  contestStatus,
  entriesTotal = 0,
  candidates,
  winners,
  selectionMode,
  eligibleCount,
  onEnsureSeedCommit,
  onPublishWinners,
  publishingWinners,
  drawError,
  maxWinners,
  isLocked,
  seedCommit,
  seedReveal,
  externalEntropy,
  proofUrl,
  predictionPublishBlocked,
  prizeLinkingSection,
  publishNotice,
}: WinnersSelectionProps) {
  const t = useTranslations('OfferStatus');
  const tSelection = useTranslations('OfferManage.selectionOptions');
  const [localSeedReveal, setLocalSeedReveal] = useState('');
  const [localEntropy, setLocalEntropy] = useState(externalEntropy || '');
  const [entropyEditable, setEntropyEditable] = useState(false);
  const [showProofReveal, setShowProofReveal] = useState(false);
  const [showInputReveal, setShowInputReveal] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resolvedSeedCommit, setResolvedSeedCommit] = useState(seedCommit || '');
  const [showTransparency, setShowTransparency] = useState(false);

  const normalizedSelection = (selectionMode || '').toUpperCase();
  const isEveryCode = normalizedSelection === 'EVERY_CODE';
  const randomnessRequired = normalizedSelection.includes('RANDOM');
  const hasWebCrypto = typeof globalThis !== 'undefined' && Boolean(globalThis.crypto?.subtle);
  const canManualEditReveal = !hasWebCrypto && randomnessRequired && !isLocked;

  const eligibleTotal = typeof eligibleCount === 'number' ? eligibleCount : candidates.length;
  const take = isEveryCode
    ? Math.max(eligibleTotal, 0)
    : typeof maxWinners === 'number' && maxWinners > 0
      ? maxWinners
      : 1;

  useEffect(() => {
    if (externalEntropy) setLocalEntropy(externalEntropy);
  }, [externalEntropy]);

  useEffect(() => {
    if (publishNotice) setNotice({ kind: 'info', text: publishNotice });
  }, [publishNotice]);

  useEffect(() => {
    if (!contestId || typeof window === 'undefined') return;

    const init = async () => {
      if (seedReveal) {
        setLocalSeedReveal(seedReveal);
        return;
      }

      let reveal = localStorage.getItem(`rv.seed_reveal.${contestId}`) || '';
      if (!reveal && hasWebCrypto) {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        reveal = base64url(bytes);
        localStorage.setItem(`rv.seed_reveal.${contestId}`, reveal);
      }
      setLocalSeedReveal(reveal);

      const entropy = localStorage.getItem(`rv.external_entropy.${contestId}`) || '';
      if (!externalEntropy && entropy) setLocalEntropy(entropy);

      if (!randomnessRequired || !hasWebCrypto || !reveal || resolvedSeedCommit) return;
      const commit = await sha256Hex(reveal);
      setResolvedSeedCommit(commit);
      if (onEnsureSeedCommit) {
        const ok = await onEnsureSeedCommit(commit);
        if (ok) setNotice({ kind: 'success', text: t('toasts.seedSetupSuccess') });
      }
    };

    init().catch(() => setNotice({ kind: 'error', text: t('errors.cryptoUnsupported') }));
  }, [contestId, seedReveal, hasWebCrypto, randomnessRequired, resolvedSeedCommit, onEnsureSeedCommit, externalEntropy, t]);

  useEffect(() => {
    if (seedCommit) setResolvedSeedCommit(seedCommit);
  }, [seedCommit]);

  useEffect(() => {
    if (drawError) setNotice({ kind: 'error', text: drawError });
  }, [drawError]);

  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      VALIDATED: t('statusLabels.validated'),
      CORRECT: t('statusLabels.correct'),
      PENDING: t('statusLabels.pending'),
      IN_REVIEW: t('statusLabels.inReview'),
      NEEDS_REVIEW: t('statusLabels.needsReview'),
      SUBMITTED: t('statusLabels.submitted'),
    }),
    [t],
  );

  const selectionLabel = useMemo(() => {
    const labels: Record<string, string> = {
      RANDOM_FROM_CORRECT: tSelection('randomFromCorrect'),
      TOP_SCORE: tSelection('topScore'),
      FASTEST_TIME: tSelection('fastestTime'),
      EVERY_CODE: tSelection('everyCode'),
      MOST_CODES: tSelection('mostCodes'),
    };
    return labels[normalizedSelection] || normalizedSelection || '-';
  }, [normalizedSelection, tSelection]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ kind: 'success', text: t('winners.transparency.copied') });
    } catch {
      setNotice({ kind: 'error', text: t('errors.copyFailed') });
    }
  };

  const publishBlocked = Boolean(isLocked || predictionPublishBlocked || !onPublishWinners);
  const seedReady = Boolean(resolvedSeedCommit && localSeedReveal);
  const summaryRows = [
    { key: 'status', value: contestStatus || '-' },
    { key: 'entriesTotal', value: entriesTotal },
    { key: 'eligibleCandidates', value: eligibleTotal },
    { key: 'publishedWinners', value: winners.length },
    { key: 'selectionMethod', value: selectionLabel },
    { key: 'take', value: take },
    { key: 'locked', value: isLocked ? t('winners.summary.yes') : t('winners.summary.no') },
    {
      key: 'seedReady',
      value:
        resolvedSeedCommit && localSeedReveal
          ? t('winners.summary.yes')
          : `${t('winners.summary.no')} (${t('winners.transparency.seedCommit')}: ${resolvedSeedCommit ? t('winners.summary.yes') : t('winners.summary.no')}, ${t('winners.transparency.seedReveal')}: ${localSeedReveal ? t('winners.summary.yes') : t('winners.summary.no')})`,
    },
  ] as const;

  const handlePublish = async () => {
    if (!onPublishWinners) return;
    if (!localSeedReveal && randomnessRequired) {
      setNotice({ kind: 'error', text: t('errors.seedCommitMissing') });
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`rv.seed_reveal.${contestId}`, localSeedReveal);
      localStorage.setItem(`rv.external_entropy.${contestId}`, localEntropy || '');
    }
    try {
      await onPublishWinners(localSeedReveal, localEntropy || null);
      setNotice({ kind: 'success', text: t('toasts.winnersPublishedSuccess') });
      setShowConfirm(false);
    } catch {
      // parent surfaces drawError
    }
  };

  return (
    <section className="space-y-4 rounded-[28px] border border-border bg-surface/90 p-6 shadow-card">
      <div aria-live="polite" className="sr-only">{notice?.text || ''}</div>
      {notice && (
        <div className={`rounded-xl border px-3 py-2 text-xs ${notice.kind === 'success' ? 'border-success bg-success-weak text-[#4D8A1F]' : notice.kind === 'info' ? 'border-primary/30 bg-primary/5 text-primary' : 'border-danger bg-[rgba(214,76,76,0.08)] text-danger'}`}>
          {notice.text}
        </div>
      )}

      <article className="rounded-2xl border border-border bg-surface p-4 space-y-3" id="contest-publish-winners">
        <h3 className="text-sm font-semibold text-secondary">{t('winners.publishWinners')}</h3>
        <div className="grid gap-2 text-xs md:grid-cols-2">
          {summaryRows.map((row) => (
            <div key={row.key} className="badge badge-muted flex h-auto items-start gap-1 whitespace-normal text-left">
              <span>{t(`winners.summary.${row.key}` as any)}: {row.value}</span>
              {row.key === 'selectionMethod' && <FieldHelp label={t('winners.summary.selectionMethod')} content={t('winners.help.selectionMethod')} />}
              {row.key === 'take' && <FieldHelp label={t('winners.summary.take')} content={t('winners.help.take')} />}
              {row.key === 'locked' && <FieldHelp label={t('winners.summary.locked')} content={t('winners.help.locked')} />}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary h-9 px-4 text-xs"
            disabled={publishBlocked || publishingWinners || !seedReady}
            onClick={() => setShowConfirm(true)}
          >
            {t('winners.publish.confirmCta')}
          </button>
        </div>
        {predictionPublishBlocked && <p className="text-xs text-accent-hover">{t('errors.predictionNeedsOfficialResult')}</p>}
      </article>

      <article className="rounded-3xl border border-border bg-surface-elevated/80 p-5 shadow-soft">
        <p className="text-sm font-semibold text-secondary">{t('winners.candidatesTitle')}</p>
        <div className="mt-4 space-y-3">
          {candidates.map((entry) => {
            const tone = STATUS_TONE[entry.status] || 'badge badge-muted';
            const statusLabel = statusLabels[entry.status] || entry.status;
            return (
              <div key={entry.id} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
                <p className="text-sm font-semibold text-secondary">{entry.title}</p>
                <p className="text-xs text-muted">{entry.owner}</p>
                <span className={tone}>{statusLabel}</span>
              </div>
            );
          })}
        </div>
      </article>

      {prizeLinkingSection}

      <article className="rounded-3xl border border-border bg-surface p-4 shadow-soft" id="contest-draw-transparency">
        <button type="button" className="flex w-full items-center justify-between" onClick={() => setShowTransparency((v) => !v)}>
          <h3 className="text-sm font-semibold text-secondary">{t('winners.transparency.title')}</h3>
          <span className="text-xs text-muted">{showTransparency ? t('winners.transparency.hide') : t('winners.transparency.show')}</span>
        </button>
        {showTransparency && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 text-xs">
              <div className="rounded-xl bg-bg p-3 break-all">
                <strong>{t('winners.transparency.seedCommit')}</strong>
                <div className="mt-1">{isEveryCode ? t('winners.seedNotRequired') : resolvedSeedCommit || t('errors.seedCommitMissing')}</div>
              </div>
              <div className="rounded-xl bg-bg p-3 break-all">
                <strong>{t('winners.transparency.seedReveal')}</strong>
                <div className="mt-1">
                  {isLocked && seedReveal
                    ? showProofReveal
                      ? seedReveal
                      : '••••••••'
                    : t('winners.transparency.notPublished')}
                </div>
                {isLocked && seedReveal && (
                  <button type="button" className="mt-1 text-primary underline" onClick={() => setShowProofReveal((v) => !v)}>
                    {showProofReveal ? t('winners.transparency.hide') : t('winners.transparency.show')}
                  </button>
                )}
              </div>
              <div className="rounded-xl bg-bg p-3">
                <strong>{t('winners.transparency.externalEntropy')}</strong>
                <div className="mt-2 flex gap-2">
                  <input className="w-full rounded-lg border px-2 py-1 text-xs" value={localEntropy} onChange={(e) => setLocalEntropy(e.target.value)} readOnly={!entropyEditable} />
                  <button type="button" className="btn h-7 px-2 text-[11px]" onClick={() => setEntropyEditable((v) => !v)}>{entropyEditable ? t('winners.transparency.hide') : t('winners.transparency.editEntropy')}</button>
                </div>
              </div>
              <div className="rounded-xl bg-bg p-3">
                <a href={proofUrl || `/api/contests/${contestId}/proof`} className="text-primary underline" target="_blank" rel="noreferrer">
                  {t('winners.proofLink')}
                </a>
              </div>
            </div>

            {!isEveryCode && (
              <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] items-end">
                <label className="text-xs text-muted">
                  {t('winners.transparency.seedReveal')}
                  <div className="mt-1">
                    <input
                      type={showInputReveal ? 'text' : 'password'}
                      value={localSeedReveal}
                      onChange={(e) => setLocalSeedReveal(e.target.value)}
                      readOnly={!canManualEditReveal}
                      className="w-full rounded-lg border px-2 py-1 text-xs"
                    />
                  </div>
                </label>
                <button type="button" className="btn h-8 px-3 text-[11px]" onClick={() => setShowInputReveal((v) => !v)}>{showInputReveal ? t('winners.transparency.hide') : t('winners.transparency.show')}</button>
                <button type="button" className="btn h-8 px-3 text-[11px]" onClick={() => copyText(localSeedReveal)}>{t('winners.transparency.copy')}</button>
              </div>
            )}
          </div>
        )}
      </article>

      {showConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="publish-confirm-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h4 id="publish-confirm-title" className="text-lg font-semibold">{t('winners.publish.confirmTitle')}</h4>
            <p className="text-sm text-muted">{t('winners.publish.confirmBody')}</p>
            <div className="rounded-xl bg-bg p-3 text-xs space-y-1">
              {summaryRows.map((row) => (
                <div key={`confirm-${row.key}`}>{t(`winners.summary.${row.key}` as any)}: {row.value}</div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setShowConfirm(false)}>{t('actions.cancel')}</button>
              <button className="btn btn-primary" onClick={handlePublish} disabled={publishingWinners}>{t('winners.publish.confirmCta')}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
