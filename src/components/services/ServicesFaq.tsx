// src/components/services/ServicesFaq.tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ServicesFaq() {
  const t = useTranslations('ServicesPage.faq');
  const [open, setOpen] = useState<number | null>(null);

  const keys = ['purchase', 'winners', 'qr', 'dm', 'reviews', 'committee', 'partner', 'start'];

  return (
    <div className="space-y-3">
      {keys.map((key, i) => (
        <div
          key={key}
          className="card overflow-hidden"
        >
          <button
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <h4 className="text-sm font-bold text-text">{t(`${key}.q`)}</h4>
            <ChevronDown
              size={18}
              className={`shrink-0 text-muted transition-transform duration-200 ${
                open === i ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              open === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <p className="px-5 pb-4 text-sm text-muted leading-relaxed">
              {t(`${key}.a`)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
