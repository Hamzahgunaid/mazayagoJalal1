// src/app/services/page.tsx — MazayaGo Services Page
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import ServiceTabs from '@/components/services/ServiceTabs';
import ServicesFaq from '@/components/services/ServicesFaq';
import {
  RafflesIcon, RiddlesIcon, PredictionsIcon,
} from '@/components/home/icons';

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
      <span className="h-0.5 w-5 rounded bg-primary" />
      {children}
    </div>
  );
}

export default function ServicesPage() {
  const t = useTranslations('ServicesPage');

  return (
    <div className="space-y-0">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-surface via-primary-weak to-accent-weak py-28">
        <div className="absolute -start-20 -top-20 h-64 w-64 rounded-full bg-primary/5" aria-hidden />
        <div className="absolute -bottom-20 -end-20 h-72 w-72 rounded-full bg-accent/5" aria-hidden />
        <div className="relative z-10 mx-auto max-w-4xl px-5 text-center">
          <SectionTag>{t('hero.tag')}</SectionTag>
          <h1 className="text-3xl font-extrabold text-text sm:text-4xl lg:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mt-4 text-base text-muted sm:text-lg leading-relaxed">
            {t('hero.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/offers/new" className="btn btn-accent h-12 px-8 text-base font-bold rounded-full">
              {t('hero.cta')}
            </Link>
            <Link href="#services" className="btn btn-secondary h-12 px-8 text-base font-bold rounded-full">
              {t('hero.ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ AUDIENCE (Section 2) ═══ */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <SectionTag>{t('audience.tag')}</SectionTag>
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('audience.title')}</h2>
            <p className="mt-3 text-muted">{t('audience.subtitle')}</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Service Partners */}
            <div className="card space-y-4 border-2 border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-weak">
                <span className="text-lg">🤝</span>
              </div>
              <h3 className="text-lg font-bold text-text">{t('audience.partner.title')}</h3>
              <p className="text-sm text-muted leading-relaxed">{t('audience.partner.desc')}</p>
              <ul className="space-y-2 text-sm text-muted">
                {['a', 'b', 'c'].map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {t(`audience.partner.${k}`)}
                  </li>
                ))}
              </ul>
            </div>
            {/* Campaign Providers */}
            <div className="card space-y-4 border-2 border-accent/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-weak">
                <span className="text-lg">🏪</span>
              </div>
              <h3 className="text-lg font-bold text-text">{t('audience.provider.title')}</h3>
              <p className="text-sm text-muted leading-relaxed">{t('audience.provider.desc')}</p>
              <ul className="space-y-2 text-sm text-muted">
                {['a', 'b', 'c'].map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {t(`audience.provider.${k}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS (Section 3) ═══ */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-4xl px-5">
          <div className="mb-14 text-center">
            <SectionTag>{t('howItWorks.tag')}</SectionTag>
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('howItWorks.title')}</h2>
            <p className="mt-3 text-muted">{t('howItWorks.subtitle')}</p>
          </div>
          <div className="space-y-0">
            {['s1', 's2', 's3', 's4', 's5', 's6'].map((key, i) => (
              <div key={key} className="relative flex gap-5">
                {/* Number + connector */}
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {['١', '٢', '٣', '٤', '٥', '٦'][i]}
                  </div>
                  {i < 5 && <div className="mt-1 h-full w-0.5 bg-border" />}
                </div>
                {/* Content */}
                <div className="pb-8">
                  <h4 className="text-base font-bold text-text">{t(`howItWorks.steps.${key}.title`)}</h4>
                  <p className="mt-1 text-sm text-muted">{t(`howItWorks.steps.${key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GOALS MAP (Section 4) ═══ */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <SectionTag>{t('goals.tag')}</SectionTag>
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('goals.title')}</h2>
            <p className="mt-3 text-muted">{t('goals.subtitle')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { key: 'sales', emoji: '📈', color: 'primary' },
              { key: 'followers', emoji: '📣', color: 'accent' },
              { key: 'buzz', emoji: '🔥', color: 'success' },
            ].map((goal) => (
              <div key={goal.key} className="card space-y-3 text-center transition hover:-translate-y-1 hover:shadow-hover">
                <span className="text-3xl">{goal.emoji}</span>
                <h3 className="text-base font-bold text-text">{t(`goals.${goal.key}.title`)}</h3>
                <p className="text-sm text-muted leading-relaxed">{t(`goals.${goal.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SERVICE DETAILS (Section 5) ═══ */}
      <section id="services" className="bg-background py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mb-14 text-center">
            <SectionTag>{t('serviceDetails.tag')}</SectionTag>
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('serviceDetails.title')}</h2>
            <p className="mt-3 text-muted">{t('serviceDetails.subtitle')}</p>
          </div>
          <ServiceTabs />
        </div>
      </section>

      {/* ═══ CHANNELS (Section 6) ═══ */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <SectionTag>{t('channels.tag')}</SectionTag>
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('channels.title')}</h2>
            <p className="mt-3 text-muted">{t('channels.subtitle')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {['comments', 'dm', 'page'].map((ch) => (
              <div key={ch} className="card space-y-3 text-center transition hover:-translate-y-1 hover:shadow-hover">
                <span className="text-3xl">{t(`channels.${ch}.icon`)}</span>
                <h4 className="text-base font-bold text-text">{t(`channels.${ch}.title`)}</h4>
                <p className="text-sm text-muted leading-relaxed">{t(`channels.${ch}.desc`)}</p>
              </div>
            ))}
          </div>
          {/* Privacy banner */}
          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-primary/20 bg-primary-weak p-5">
            <span className="text-2xl">🛡️</span>
            <p className="text-sm text-text leading-relaxed">{t('channels.privacy')}</p>
          </div>
          {/* Reviews subsection */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-text">{t('channels.reviews.title')}</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">{t('channels.reviews.desc')}</p>
          </div>
        </div>
      </section>

      {/* ═══ TRANSPARENCY (Section 7) ═══ */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <SectionTag>{t('transparency.tag')}</SectionTag>
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('transparency.title')}</h2>
            <p className="mt-3 text-muted">{t('transparency.subtitle')}</p>
          </div>
          {/* Pillars */}
          <div className="grid gap-6 md:grid-cols-3">
            {['rules', 'auto', 'announce'].map((p) => (
              <div key={p} className="card space-y-3 text-center transition hover:-translate-y-1 hover:shadow-hover">
                <span className="text-3xl">{t(`transparency.pillars.${p}.icon`)}</span>
                <h4 className="text-base font-bold text-text">{t(`transparency.pillars.${p}.title`)}</h4>
                <p className="text-sm text-muted">{t(`transparency.pillars.${p}.desc`)}</p>
              </div>
            ))}
          </div>
          {/* Optional features */}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {['committee', 'liveAnnounce'].map((opt) => (
              <div key={opt} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
                <span className="badge badge-muted shrink-0">{t('transparency.optional')}</span>
                <div>
                  <h4 className="text-sm font-bold text-text">{t(`transparency.opts.${opt}.title`)}</h4>
                  <p className="mt-1 text-sm text-muted">{t(`transparency.opts.${opt}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ USE CASES (Section 8) ═══ */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <SectionTag>{t('useCases.tag')}</SectionTag>
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('useCases.title')}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {['merchants', 'brands', 'events', 'partners'].map((uc) => (
              <div key={uc} className="card space-y-3">
                <span className="text-2xl">{t(`useCases.${uc}.icon`)}</span>
                <h4 className="text-base font-bold text-text">{t(`useCases.${uc}.title`)}</h4>
                <ul className="space-y-2 text-sm text-muted">
                  {['a', 'b', 'c'].map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <span className="mt-1.5 text-primary">←</span>
                      {t(`useCases.${uc}.${k}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ (Section 9) ═══ */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-3xl px-5">
          <div className="mb-14 text-center">
            <SectionTag>{t('faq.tag')}</SectionTag>
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('faq.title')}</h2>
          </div>
          <ServicesFaq />
        </div>
      </section>

      {/* ═══ FINAL CTA (Section 10) ═══ */}
      <section className="bg-gradient-to-br from-secondary to-[#2C3E50] py-20">
        <div className="mx-auto max-w-5xl px-5 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">{t('finalCta.title')}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {/* Partners */}
            <div className="rounded-2xl bg-white/10 p-6 text-start backdrop-blur-sm">
              <span className="badge badge-live mb-3">{t('finalCta.partner.label')}</span>
              <h3 className="text-base font-bold text-white">{t('finalCta.partner.title')}</h3>
              <p className="mt-2 text-sm text-white/60">{t('finalCta.partner.desc')}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/contact" className="btn btn-primary h-10 px-5 text-sm rounded-full">
                  {t('finalCta.partner.cta')}
                </Link>
              </div>
            </div>
            {/* Providers */}
            <div className="rounded-2xl bg-white/10 p-6 text-start backdrop-blur-sm">
              <span className="badge badge-reward mb-3">{t('finalCta.provider.label')}</span>
              <h3 className="text-base font-bold text-white">{t('finalCta.provider.title')}</h3>
              <p className="mt-2 text-sm text-white/60">{t('finalCta.provider.desc')}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/offers/new" className="btn btn-accent h-10 px-5 text-sm rounded-full">
                  {t('finalCta.provider.cta')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
