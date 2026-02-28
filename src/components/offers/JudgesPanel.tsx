'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { ContestReferee } from '@/types/offers';

type JudgeReferee = ContestReferee & {
  full_name?: string | null;
  display_name?: string | null;
  user?: {
    name?: string | null;
    full_name?: string | null;
    display_name?: string | null;
  } | null;
};

const formatRoleText = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
};

export default function JudgesPanel({ referees }: { referees: JudgeReferee[] }) {
  const t = useTranslations('OfferDetail.judgesPanel');
  const roleLabels = useMemo(
    () => ({
      JUDGE: t('roles.judge'),
      REVIEWER: t('roles.reviewer'),
      MODERATOR: t('roles.moderator'),
      LEAD_JUDGE: t('roles.lead'),
      PLATFORM_JUDGE: t('roles.platform'),
      OWNER_JUDGE: t('roles.owner'),
    }),
    [t],
  );

  const items = useMemo(() => {
    const list = Array.isArray(referees) ? referees : [];
    return list.map((ref, index) => {
      const name =
        ref.display_name ||
        ref.full_name ||
        ref.user?.display_name ||
        ref.user?.full_name ||
        ref.user?.name ||
        t('memberFallback', { index: index + 1 });
      const normalizedRole = ref.role?.trim().toUpperCase().replace(/[\s-]+/g, '_') || '';
      const roleLabel =
        normalizedRole
          ? roleLabels[normalizedRole as keyof typeof roleLabels] ||
            t('roles.custom', { role: formatRoleText(normalizedRole) })
          : null;
      return {
        id: ref.user_id || `judge-${index}`,
        name,
        roleLabel,
        initials: getInitials(name),
      };
    });
  }, [referees, roleLabels, t]);

  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            {t('eyebrow')}
          </p>
          <h2 className="text-lg font-semibold text-text">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted">{t('subtitle')}</p>
        </div>
        <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          {t('count', { count: items.length })}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-bg px-4 py-3 text-sm text-muted">
          {t('empty')}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {items.map((judge) => (
            <div
              key={judge.id}
              className="rounded-2xl border border-border bg-bg/80 p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-muted shadow-sm ring-1 ring-border">
                    {judge.initials || '-'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{judge.name}</p>
                    {judge.roleLabel && (
                      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted">
                        {judge.roleLabel}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
