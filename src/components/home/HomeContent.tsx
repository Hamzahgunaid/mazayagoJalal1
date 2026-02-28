// src/components/home/HomeContent.tsx
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import ExternalContestsShowcase from '@/components/externalContests/ExternalContestsShowcase';
import { useMode } from './ModeToggle';
import {
  RafflesIcon, RiddlesIcon, PredictionsIcon,
  FairChanceIcon, EasyJoinIcon, RealPrizesIcon, GuaranteedFunIcon,
  TransparencyIcon, EasyLaunchIcon, RealDataIcon, ProfessionalIcon,
  RestaurantsIcon, SupermarketIcon, BrandsIcon, TvChannelsIcon, SportsStoresIcon, EducationalIcon,
  ShopperIcon, LuckHunterIcon, KnowledgeIcon, RiddleLoverIcon, SportsFanIcon, SeriesFollowerIcon,
  CheckIcon, CrossIcon,
  AudienceHeroGraphic, BusinessHeroGraphic,
} from './icons';

export default function HomeContent() {
  const { mode } = useMode();
  const t = useTranslations('HomePage');
  const isBiz = mode === 'business';
  const accent = isBiz ? 'accent' : 'primary';

  // Service data
  const services = [
    { icon: RafflesIcon, key: 'raffles' },
    { icon: RiddlesIcon, key: 'riddles' },
    { icon: PredictionsIcon, key: 'predictions' },
  ];

  // Why items
  const whyAudience = [
    { icon: FairChanceIcon, key: 'fairChance' },
    { icon: EasyJoinIcon, key: 'easyJoin' },
    { icon: RealPrizesIcon, key: 'realPrizes' },
    { icon: GuaranteedFunIcon, key: 'guaranteedFun' },
  ];
  const whyBusiness = [
    { icon: TransparencyIcon, key: 'transparency' },
    { icon: EasyLaunchIcon, key: 'easyLaunch' },
    { icon: RealDataIcon, key: 'realData' },
    { icon: ProfessionalIcon, key: 'professional' },
  ];
  const whyItems = isBiz ? whyBusiness : whyAudience;

  // Use cases
  const bizCases = [
    { icon: RestaurantsIcon, key: 'restaurants' },
    { icon: SupermarketIcon, key: 'supermarket' },
    { icon: BrandsIcon, key: 'brands' },
    { icon: TvChannelsIcon, key: 'tvChannels' },
    { icon: SportsStoresIcon, key: 'sportsStores' },
    { icon: EducationalIcon, key: 'educational' },
  ];
  const audienceCases = [
    { icon: ShopperIcon, key: 'shopper' },
    { icon: LuckHunterIcon, key: 'luckHunter' },
    { icon: KnowledgeIcon, key: 'knowledge' },
    { icon: RiddleLoverIcon, key: 'riddleLover' },
    { icon: SportsFanIcon, key: 'sportsFan' },
    { icon: SeriesFollowerIcon, key: 'seriesFollower' },
  ];
  const useCases = isBiz ? bizCases : audienceCases;

  // Comparison items (business only)
  const comparisonKeys = ['automated', 'results', 'analytics', 'engagement'];

  return (
    <div className="space-y-0">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-secondary text-white">
        {/* Background effects */}
        <div className="absolute -top-48 -end-48 h-[500px] w-[500px] rounded-full bg-primary/5" aria-hidden />
        <div className="absolute -bottom-36 -start-36 h-96 w-96 rounded-full bg-accent/4" aria-hidden />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold ${
              isBiz ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
            }`}>
              <span className="text-lg">✦</span>
              <span>{t(`hero.badge.${mode}`)}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              {t(`hero.title.${mode}.line1`)}{' '}
              <span className={isBiz ? 'text-accent' : 'text-primary'}>
                {t(`hero.title.${mode}.highlight`)}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-lg text-base text-white/70 sm:text-lg leading-relaxed">
              {t(`hero.subtitle.${mode}`)}
            </p>

            {/* Tagline */}
            <p className={`text-base font-bold ${isBiz ? 'text-accent' : 'text-primary'}`}>
              {t(`hero.tagline.${mode}`)}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href={isBiz ? '/offers/new' : '/offers'}
                className={`btn h-12 px-8 text-base font-bold rounded-xl border-transparent text-white shadow-soft ${
                  isBiz ? 'bg-accent hover:bg-accent-hover' : 'bg-primary hover:bg-primary-hover'
                }`}
              >
                {t(`hero.cta.${mode}`)}
              </Link>
              <Link
                href={isBiz ? '/services' : '#services'}
                className="btn h-12 px-8 text-base font-bold rounded-xl border border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                {t(`hero.ctaSecondary.${mode}`)}
              </Link>
            </div>
          </div>

          {/* Hero graphic */}
          <div className="relative hidden h-80 lg:block lg:h-96">
            {isBiz ? <BusinessHeroGraphic /> : <AudienceHeroGraphic />}
          </div>
        </div>
      </section>

      {/* ═══ EXTERNAL CONTESTS SHOWCASE (high visibility) ═══ */}
      <section className="bg-gradient-to-b from-surface via-primary/5 to-surface py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-5">
          <ExternalContestsShowcase ctaHref="/contests/external" autoScrollMs={1300} />
        </div>
      </section>

      {/* ═══ SERVICES ═══ */}
      <section id="services" className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('services.title')}</h2>
            <p className="mt-3 text-muted">{t('services.subtitle')}</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {services.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.key}
                  className="card group flex flex-col items-center text-center transition hover:-translate-y-1 hover:shadow-hover"
                >
                  <div className="mb-5">
                    <Icon size={80} color={isBiz ? '#F89437' : '#14C3BF'} />
                  </div>
                  <h3 className="text-lg font-bold text-text">{t(`services.${svc.key}.title`)}</h3>
                  <p className="mt-3 text-sm text-muted leading-relaxed">
                    {t(`services.${svc.key}.desc.${mode}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ TEMPLATES (Business only) ═══ */}
      {isBiz && (
        <section className="bg-background py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="mb-14 text-center">
              <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('templates.title')}</h2>
              <p className="mt-3 text-muted">{t('templates.subtitle')}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {['daily', 'riddle', 'prediction'].map((key) => (
                <div key={key} className="card space-y-4 transition hover:-translate-y-1 hover:shadow-hover">
                  <span className="badge badge-reward">{t(`templates.${key}.badge`)}</span>
                  <h3 className="text-lg font-bold text-text">{t(`templates.${key}.title`)}</h3>
                  <p className="text-sm text-muted leading-relaxed">{t(`templates.${key}.desc`)}</p>
                  <Link href="/offers/new" className="btn btn-accent h-10 px-4 text-sm">
                    {t('templates.cta')}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ WHY MAZAYAGO ═══ */}
      <section className={isBiz ? 'bg-surface py-20' : 'bg-background py-20'}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('why.title')}</h2>
            <p className="mt-3 text-muted">{t(`why.subtitle.${mode}`)}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="card flex flex-col items-center text-center transition hover:-translate-y-1 hover:shadow-hover">
                  <div className="mb-4"><Icon size={56} /></div>
                  <h4 className="text-base font-bold text-text">{t(`why.${mode}.${item.key}.title`)}</h4>
                  <p className="mt-2 text-sm text-muted">{t(`why.${mode}.${item.key}.desc`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ USE CASES ═══ */}
      <section className={isBiz ? 'bg-background py-20' : 'bg-surface py-20'}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t(`useCases.title.${mode}`)}</h2>
            <p className="mt-3 text-muted">{t(`useCases.subtitle.${mode}`)}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-start gap-4 rounded-2xl bg-surface border border-border p-5 transition hover:shadow-hover">
                  <div className="shrink-0 rounded-xl bg-background p-3">
                    <Icon size={48} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-text">{t(`useCases.${mode}.${item.key}.title`)}</h4>
                    <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                      isBiz ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                    }`}>
                      {t(`useCases.${mode}.${item.key}.service`)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON (Business only) ═══ */}
      {isBiz && (
        <section className="bg-surface py-20">
          <div className="mx-auto max-w-5xl px-5">
            <div className="mb-14 text-center">
              <h2 className="text-2xl font-extrabold text-text sm:text-3xl">{t('comparison.title')}</h2>
              <p className="mt-3 text-muted">{t('comparison.subtitle')}</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
              {/* MazayaGo column */}
              <div className="card border-2 border-primary">
                <h3 className="mb-6 text-center text-xl font-bold text-primary">{t('comparison.mazayago')}</h3>
                <div className="space-y-0">
                  {comparisonKeys.map((key, i) => (
                    <div key={key} className={`flex items-center gap-3 py-3 ${
                      i < comparisonKeys.length - 1 ? 'border-b border-border' : ''
                    }`}>
                      <CheckIcon size={22} />
                      <span className="text-sm font-medium text-text">{t(`comparison.items.${key}.mazaya`)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white">
                  VS
                </div>
              </div>

              {/* Traditional column */}
              <div className="card border-2 border-border opacity-80">
                <h3 className="mb-6 text-center text-xl font-bold text-muted">{t('comparison.traditional')}</h3>
                <div className="space-y-0">
                  {comparisonKeys.map((key, i) => (
                    <div key={key} className={`flex items-center gap-3 py-3 ${
                      i < comparisonKeys.length - 1 ? 'border-b border-border' : ''
                    }`}>
                      <CrossIcon size={22} />
                      <span className="text-sm font-medium text-muted">{t(`comparison.items.${key}.traditional`)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ FINAL CTA ═══ */}
      <section className={`py-20 text-center ${
        isBiz
          ? 'bg-gradient-to-br from-accent to-primary-hover'
          : 'bg-gradient-to-br from-primary to-success'
      }`}>
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {t(`finalCta.title.${mode}`)}
          </h2>
          <p className="mt-4 text-lg text-white/80 leading-relaxed">
            {t(`finalCta.subtitle.${mode}`)}
          </p>
          <Link
            href={isBiz ? '/offers/new' : '/offers'}
            className="mt-8 inline-flex items-center rounded-full bg-white px-10 py-4 text-lg font-bold shadow-card-strong transition hover:-translate-y-1 hover:shadow-hover"
            style={{ color: isBiz ? '#F89437' : '#14C3BF' }}
          >
            {t(`finalCta.cta.${mode}`)}
          </Link>
        </div>
      </section>

      {/* ═══ WHATSAPP BUTTON ═══ */}
      <a
        href="https://wa.me/967XXXXXXXXX"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 start-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-[0_4px_20px_rgba(37,211,102,0.4)] transition hover:scale-110"
        aria-label="WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 32 32" fill="white">
          <path d="M16 3C8.82 3 3 8.82 3 16C3 18.74 3.78 21.3 5.13 23.47L3.1 29.1L8.91 27.13C10.99 28.34 13.41 29 16 29C23.18 29 29 23.18 29 16C29 8.82 23.18 3 16 3ZM22.3 18.86C22.01 18.71 20.59 18.01 20.33 17.91C20.07 17.81 19.88 17.76 19.69 18.06C19.5 18.36 18.95 19.01 18.78 19.21C18.61 19.41 18.44 19.44 18.15 19.29C17.86 19.14 16.91 18.83 15.79 17.82C14.92 17.03 14.33 16.06 14.16 15.76C13.99 15.46 14.14 15.3 14.29 15.15C14.42 15.02 14.59 14.8 14.74 14.62C14.89 14.44 14.94 14.31 15.04 14.11C15.14 13.91 15.09 13.73 15.02 13.58C14.95 13.43 14.34 12 14.11 11.41C13.89 10.84 13.66 10.92 13.49 10.91C13.32 10.9 13.13 10.9 12.93 10.9C12.73 10.9 12.41 10.97 12.15 11.27C11.89 11.57 11.14 12.27 11.14 13.7C11.14 15.13 12.18 16.51 12.33 16.71C12.48 16.91 14.33 19.81 17.1 21.04C19.42 21.9 20.05 21.86 20.55 21.79C21.11 21.71 22.27 21.07 22.5 20.37C22.73 19.67 22.73 19.08 22.66 18.96C22.59 18.84 22.39 18.77 22.3 18.86Z" />
        </svg>
      </a>
    </div>
  );
}
