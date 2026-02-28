// src/components/services/ServiceTabs.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RafflesIcon, RiddlesIcon, PredictionsIcon } from '@/components/home/icons';

type Tab = 'sweepstakes' | 'contests' | 'predictions';

export default function ServiceTabs() {
  const [active, setActive] = useState<Tab>('sweepstakes');
  const t = useTranslations('ServicesPage.serviceDetails');

  const tabs: { id: Tab; icon: typeof RafflesIcon; color: string }[] = [
    { id: 'sweepstakes', icon: RafflesIcon, color: '#14C3BF' },
    { id: 'contests', icon: RiddlesIcon, color: '#F89437' },
    { id: 'predictions', icon: PredictionsIcon, color: '#77C738' },
  ];

  const detailKeys = ['entry', 'codeType', 'conditions', 'transparency'];
  const stepKeys = ['s1', 's2', 's3', 's4', 's5'];

  return (
    <div>
      {/* Tab buttons */}
      <div className="mb-8 flex flex-wrap justify-center gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-5 py-3 text-sm font-bold transition-all duration-200 ${
                isActive
                  ? 'border-transparent bg-secondary text-white shadow-card'
                  : 'border-border bg-surface text-muted hover:border-primary/30 hover:text-text'
              }`}
            >
              <Icon size={28} color={isActive ? 'white' : tab.color} />
              {t(`${tab.id}.title`)}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      {tabs.map((tab) => {
        if (active !== tab.id) return null;
        return (
          <div key={tab.id} className="card overflow-hidden">
            {/* Header */}
            <div
              className="p-6 sm:p-8"
              style={{ background: `linear-gradient(135deg, ${tab.color}08, ${tab.color}04)` }}
            >
              <div className="mb-3 flex flex-wrap gap-4 text-xs">
                <div className="rounded-lg bg-surface/80 px-3 py-2 shadow-soft">
                  <span className="font-bold text-muted">{t('labels.offers')}</span>
                  <span className="ms-2 font-bold text-text">{t(`${tab.id}.meta.offers`)}</span>
                </div>
                <div className="rounded-lg bg-surface/80 px-3 py-2 shadow-soft">
                  <span className="font-bold text-muted">{t('labels.bestFor')}</span>
                  <span className="ms-2 font-bold text-text">{t(`${tab.id}.meta.bestFor`)}</span>
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-text">{t(`${tab.id}.title`)}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{t(`${tab.id}.desc`)}</p>
            </div>

            {/* Details grid */}
            <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
              {detailKeys.map((dk) => (
                <div key={dk}>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-text">
                    <span>{t(`${tab.id}.details.${dk}.icon`)}</span>
                    {t(`${tab.id}.details.${dk}.title`)}
                  </h4>
                  <ul className="space-y-2">
                    {['a', 'b', 'c', 'd'].map((opt) => {
                      try {
                        const text = t(`${tab.id}.details.${dk}.${opt}`);
                        if (!text) return null;
                        return (
                          <li key={opt} className="flex items-start gap-2 text-sm text-muted">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tab.color }} />
                            {text}
                          </li>
                        );
                      } catch {
                        return null;
                      }
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {/* Steps */}
            <div className="border-t border-border p-6 sm:p-8">
              <h4 className="mb-4 text-sm font-bold text-text">{t('stepsTitle')}</h4>
              <div className="flex flex-wrap gap-3">
                {stepKeys.map((sk, i) => (
                  <div key={sk} className="flex items-center gap-2 rounded-xl bg-background px-3 py-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: tab.color }}
                    >
                      {['١', '٢', '٣', '٤', '٥'][i]}
                    </span>
                    <span className="text-xs font-medium text-text">{t(`${tab.id}.steps.${sk}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
