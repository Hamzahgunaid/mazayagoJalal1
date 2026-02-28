'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {useTransition} from 'react';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('LocaleSwitcher');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const updateLocale = (nextLocale: string) => {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-muted">
      <span className="hidden md:inline">{t('label')}</span>
      <div className="flex rounded-full border border-border bg-surface p-0.5 text-[11px] shadow-sm">
        {['en', 'ar'].map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              className={`px-2.5 py-1 rounded-full transition duration-fast ease-soft ${
                active ? 'bg-primary text-white shadow-card' : 'text-text hover:bg-primary-weak'
              }`}
              onClick={() => updateLocale(code)}
              disabled={isPending || active}
            >
              {code === 'en' ? t('english') : t('arabic')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
