'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

type JudgeInfo = {
  id: string;
  label: string;
  role?: string | null;
  fullName?: string | null;
  displayName?: string | null;
};

const formatJudgeRole = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized === 'OWNER_JUDGE') {
    return null;
  }
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
};

export default function JudgesPanel({ slug, judges }: { slug: string; judges: JudgeInfo[] }) {
  const t = useTranslations('OfferStatus');

  return (
    <section className="space-y-6 rounded-[28px] border border-border bg-surface/90 p-6 shadow-card" id="contest-judges-panel">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/80">{t('progress.eyebrow')}</p>
        <h2 className="text-2xl font-semibold text-secondary">{t('progress.judgesTitle')}</h2>
      </div>

      <article className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-secondary">{t('progress.judgesTitle')}</p>
          </div>
          <Link
            href={`/offers/${slug}/manage?tab=judges`}
            className="chip h-8 px-3 text-[11px] font-semibold uppercase tracking-wide text-secondary hover:border-primary/40"
          >
            {t('progress.manageJudges')}
          </Link>
        </header>

        <div className="mt-5 space-y-3">
          {judges.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
              {t('progress.noJudges')}
            </p>
          )}
          {judges.map((judge) => {
            const name = judge.fullName || judge.displayName || judge.label;
            const roleLabel = formatJudgeRole(judge.role);
            return (
              <div
                key={judge.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-elevated px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-secondary">{name}</p>
                  {roleLabel && <p className="text-xs uppercase tracking-wide text-muted">{roleLabel}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
