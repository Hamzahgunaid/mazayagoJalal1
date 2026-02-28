// src/components/home/ModeToggle.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useTranslations } from 'next-intl';

type Mode = 'audience' | 'business';

const ModeContext = createContext<{ mode: Mode; setMode: (m: Mode) => void }>({
  mode: 'audience',
  setMode: () => {},
});

export function useMode() {
  return useContext(ModeContext);
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('audience');
  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export default function ModeToggle() {
  const { mode, setMode } = useMode();
  const t = useTranslations('HomePage.toggle');

  return (
    <div className="sticky top-[57px] z-30 flex justify-center py-3 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="inline-flex rounded-full bg-surface border border-border p-1 shadow-soft">
        <button
          onClick={() => setMode('audience')}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
            mode === 'audience'
              ? 'bg-primary text-white shadow-soft'
              : 'text-muted hover:text-text'
          }`}
        >
          {t('audience')}
        </button>
        <button
          onClick={() => setMode('business')}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
            mode === 'business'
              ? 'bg-accent text-white shadow-soft'
              : 'text-muted hover:text-text'
          }`}
        >
          {t('business')}
        </button>
      </div>
    </div>
  );
}
