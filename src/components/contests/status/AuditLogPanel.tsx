'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type AuditLogEntry = {
  id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  message?: string | null;
  payload?: any;
  created_at?: string | null;
};

type AuditLogPanelProps = {
  logs: AuditLogEntry[];
};

export default function AuditLogPanel({ logs }: AuditLogPanelProps) {
  const t = useTranslations('OfferAudit');
  const locale = useLocale();
  const dateFormatter = useMemo(() => {
    const resolved = locale.startsWith('ar') ? 'ar' : 'en-US';
    return new Intl.DateTimeFormat(resolved, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [locale]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('table.timestamp')}</th>
              <th className="px-4 py-3">{t('table.action')}</th>
              <th className="px-4 py-3">{t('table.actor')}</th>
              <th className="px-4 py-3">{t('table.details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t('table.empty')}
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {formatDate(log.created_at, dateFormatter, t)}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">{log.action}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {log.actor_name || log.actor_id || t('table.system')}
                  {log.actor_id && (
                    <span className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-400">
                      {log.actor_id.slice(-6)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {log.message || summarizePayload(log.payload, t('table.noDetails'))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(
  value: string | null | undefined,
  formatter: Intl.DateTimeFormat,
  t: (key: string) => string,
) {
  if (!value) return t('table.unknownDate');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatter.format(date);
}

function summarizePayload(payload: any, emptyLabel: string) {
  if (!payload || typeof payload !== 'object') return emptyLabel;
  const json = JSON.stringify(payload);
  return json.length > 80 ? `${json.slice(0, 77)}...` : json;
}
