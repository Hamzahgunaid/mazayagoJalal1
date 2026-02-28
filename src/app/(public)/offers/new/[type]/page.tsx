'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createContest } from '@/lib/api_contests';

type ContestType =
  | 'RIDDLE'
  | 'QR_CODE'
  | 'LEADERBOARD'
  | 'TREASURE_HUNT'
  | 'UGC'
  | 'REFERRAL'
  | 'PREDICTION'
  | 'SURVEY'
  | 'RAFFLE';

type Selection =
  | 'RANDOM_FROM_CORRECT'
  | 'EVERY_CODE'
  | 'TOP_SCORE'
  | 'FASTEST_TIME'
  | 'MOST_CODES';

const DEFAULT_SELECTION: Record<ContestType, Selection> = {
  RIDDLE: 'RANDOM_FROM_CORRECT',
  QR_CODE: 'EVERY_CODE',
  LEADERBOARD: 'TOP_SCORE',
  TREASURE_HUNT: 'FASTEST_TIME',
  UGC: 'RANDOM_FROM_CORRECT',
  REFERRAL: 'MOST_CODES',
  PREDICTION: 'RANDOM_FROM_CORRECT',
  SURVEY: 'RANDOM_FROM_CORRECT',
  RAFFLE: 'EVERY_CODE',
};

const SELECTION_OPTIONS_BY_TYPE: Record<ContestType | 'DEFAULT', Selection[]> = {
  RIDDLE: ['RANDOM_FROM_CORRECT', 'FASTEST_TIME'],
  QR_CODE: ['EVERY_CODE', 'FASTEST_TIME', 'MOST_CODES'],
  LEADERBOARD: ['TOP_SCORE', 'FASTEST_TIME'],
  TREASURE_HUNT: ['FASTEST_TIME', 'RANDOM_FROM_CORRECT'],
  UGC: ['RANDOM_FROM_CORRECT', 'TOP_SCORE'],
  REFERRAL: ['MOST_CODES', 'RANDOM_FROM_CORRECT'],
  PREDICTION: ['RANDOM_FROM_CORRECT', 'TOP_SCORE'],
  SURVEY: ['RANDOM_FROM_CORRECT'],
  RAFFLE: ['EVERY_CODE', 'RANDOM_FROM_CORRECT', 'MOST_CODES'],
  DEFAULT: ['RANDOM_FROM_CORRECT'],
};

const SELECTION_LABEL_KEYS: Record<Selection, string> = {
  RANDOM_FROM_CORRECT: 'randomFromCorrect',
  EVERY_CODE: 'everyCode',
  TOP_SCORE: 'topScore',
  FASTEST_TIME: 'fastestTime',
  MOST_CODES: 'mostCodes',
};

const SELECTION_CARD_COPY: Record<Selection, { titleKey: string; noteKey: string }> = {
  RANDOM_FROM_CORRECT: { titleKey: 'selection.cards.RANDOM_FROM_CORRECT.title', noteKey: 'selection.cards.RANDOM_FROM_CORRECT.note' },
  EVERY_CODE: { titleKey: 'selection.cards.EVERY_CODE.title', noteKey: 'selection.cards.EVERY_CODE.note' },
  TOP_SCORE: { titleKey: 'selection.cards.TOP_SCORE.title', noteKey: 'selection.cards.TOP_SCORE.note' },
  FASTEST_TIME: { titleKey: 'selection.cards.FASTEST_TIME.title', noteKey: 'selection.cards.FASTEST_TIME.note' },
  MOST_CODES: { titleKey: 'selection.cards.MOST_CODES.title', noteKey: 'selection.cards.MOST_CODES.note' },
};

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function fallbackSlug(base?: string) {
  const suffix = Math.random().toString(36).slice(2, 6);
  return [base && base.length ? base : 'offer', suffix].join('-');
}

export default function NewOfferForm({ params }: { params: { type: ContestType } }) {
  const router = useRouter();
  const type = params.type as ContestType;

  const t = useTranslations('OfferNewType');
  const tOffer = useTranslations('OfferNew');
  const tSelection = useTranslations('OfferManage.selectionOptions');

  const friendly = useMemo(
    () => tOffer(`list.items.${type}.title` as any, { defaultValue: type }),
    [type, tOffer],
  );

  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION[type] ?? 'RANDOM_FROM_CORRECT');
  const selectionOptions = useMemo(() => {
    const key = (type || 'DEFAULT') as ContestType | 'DEFAULT';
    return SELECTION_OPTIONS_BY_TYPE[key] || SELECTION_OPTIONS_BY_TYPE.DEFAULT;
  }, [type]);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now.toISOString().slice(0, 16);
  });
  const [endsAt, setEndsAt] = useState(() => {
    const d = addDays(new Date(), 7);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [maxWinners, setMaxWinners] = useState<number | ''>('');
  const [perUserLimit, setPerUserLimit] = useState<number | ''>(1);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mountedAnimation, setMountedAnimation] = useState(false);

  useEffect(() => {
    let frame: number;
    frame = requestAnimationFrame(() => setMountedAnimation(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!title.trim()) {
      setSlug('');
      return;
    }
    const base = slugify(title);
    if (base) {
      setSlug((prev) => {
        if (!prev) return base;
        if (prev === base) return prev;
        if (prev.startsWith(`${base}-`)) return prev;
        return base;
      });
      return;
    }
    setSlug((prev) => (prev && prev.startsWith('offer-') ? prev : fallbackSlug()));
  }, [title]);

  useEffect(() => {
    setSelection(DEFAULT_SELECTION[type] ?? 'RANDOM_FROM_CORRECT');
  }, [type]);

  const selectionLabel = (value: Selection) => tSelection(SELECTION_LABEL_KEYS[value]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setMessage(null);

    if (!title.trim()) return setMessage(t('messages.titleRequired'));
    if (!slug.trim()) return setMessage(t('messages.slugRequired'));

    const starts_at = startsAt ? new Date(startsAt).toISOString() : null;
    const ends_at = endsAt ? new Date(endsAt).toISOString() : null;

    let attemptSlug = slug;
    const payloadBase: any = {
      title,
      description: description || null,
      type,
      selection,
      starts_at,
      ends_at,
      max_winners: maxWinners === '' ? null : Number(maxWinners),
      per_user_limit: perUserLimit === '' ? null : Number(perUserLimit),
      visibility,
      status: 'ACTIVE',
      branding_theme: { primary: '#4f46e5' },
      rules_json: {},
      eligibility_json: {},
      geo_restrictions: {},
    };

    try {
      setSubmitting(true);
      let res: any = null;
      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts) {
        res = await createContest({ ...payloadBase, slug: attemptSlug });
        if (!res?.error) break;

        const errMsg = String(res.error || '').toLowerCase();
        if (!errMsg.includes('slug') && !errMsg.includes('duplicate')) {
          throw new Error(res.error);
        }

        attempt++;
        attemptSlug = `${slug}-${attempt + 1}`;
      }

      if (res?.error) {
        throw new Error(res.error);
      }

      router.push(`/offers/${res?.contest?.slug || attemptSlug}/manage`);
    } catch (err: any) {
      setMessage(err?.message || t('messages.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  const cardBaseClass =
    'rounded-3xl border border-border/70 bg-white p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur';
  const transitionBase = 'transition-all duration-500 ease-out';
  const appearClass = mountedAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4';
  const labelClass = 'text-sm font-semibold text-muted mb-2';
  const inputClass =
    'w-full rounded-2xl border border-border bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:ring-2 focus:ring-primary-weak focus:outline-none transition';
  const textAreaClass = `${inputClass} min-h-[120px]`;
  const tipKeys: string[] = ['aside.tips.first', 'aside.tips.second', 'aside.tips.third'];

  return (
    <main className="space-y-10 pb-16">
      <header
        className={`rounded-3xl bg-gradient-to-r from-primary via-primary-hover to-secondary p-8 text-white shadow-[0_30px_65px_rgba(79,70,229,0.4)] ${transitionBase} ${
          mountedAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.4em] text-primary-weak">{t('hero.label')}</p>
          <h1 className="text-3xl font-bold md:text-4xl">{t('hero.title', { type: friendly })}</h1>
          <p className="mt-2 max-w-xl text-sm text-primary-weak">{t('hero.description')}</p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <input type="hidden" value={slug} readOnly />
        <section className="space-y-6 lg:col-span-2">
          <div className={`${cardBaseClass} ${transitionBase} ${appearClass}`} style={{ transitionDelay: '80ms' }}>
            <div className="flex items-start gap-4">
              <div>
                <h2 className="text-xl font-semibold text-text">{t('form.basics.title')}</h2>
                <p className="mt-1 text-sm text-muted">{t('form.basics.description')}</p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <div className={labelClass}>{t('form.fields.title.label')}</div>
                <input
                  className={inputClass}
                  placeholder={t('form.fields.title.placeholder')}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <div className="hidden" aria-hidden="true">
                <span className="sr-only">
                  {t('form.fields.slug.preview', { slug: slug || t('form.fields.slug.pending') })}
                </span>
              </div>
            </div>
            <label className="block">
              <div className={labelClass}>{t('form.fields.description.label')}</div>
              <textarea
                className={textAreaClass}
                placeholder={t('form.fields.description.placeholder')}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <div className="mt-6 rounded-2xl border border-border p-4">
              <div className="text-sm font-semibold text-text">{t('selection.title')}</div>
              <p className="text-xs text-muted">{t('selection.description')}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {selectionOptions.map((option) => {
                  const active = selection === option;
                  const copy = SELECTION_CARD_COPY[option];
                  return (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setSelection(option)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        active
                          ? 'border-secondary bg-secondary text-white shadow shadow-[0_12px_28px_rgba(26,35,50,0.08)]'
                          : 'border-border bg-white text-muted hover:border-primary'
                      }`}
                    >
                      <div className="font-semibold">
                        {copy ? t(copy.titleKey) : selectionLabel(option)}
                      </div>
                      <div className="text-xs text-muted">
                        {copy ? t(copy.noteKey) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={`${cardBaseClass} ${transitionBase} ${appearClass}`} style={{ transitionDelay: '140ms' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-text">{t('schedule.title')}</h2>
                <p className="mt-1 text-sm text-muted">{t('schedule.description')}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <div className={labelClass}>{t('schedule.startsAt')}</div>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </label>
              <label className="block">
                <div className={labelClass}>{t('schedule.endsAt')}</div>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <div className={labelClass}>{t('schedule.maxWinners')}</div>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={maxWinners}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMaxWinners(value === '' ? '' : Number(value));
                  }}
                />
              </label>
              <label className="block">
                <div className={labelClass}>{t('schedule.perUserLimit')}</div>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={perUserLimit}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPerUserLimit(value === '' ? '' : Number(value));
                  }}
                />
              </label>
              <label className="hidden">
                <div className={labelClass}>{t('schedule.visibility')}</div>
                <select
                  className={inputClass}
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
                >
                  <option value="public">{t('schedule.visibilityPublic')}</option>
                  <option value="private">{t('schedule.visibilityPrivate')}</option>
                </select>
              </label>
            </div>
          </div>

          <div
            className={`flex flex-wrap items-center gap-3 ${transitionBase} ${appearClass}`}
            style={{ transitionDelay: '180ms' }}
          >
            <button
              className="rv-btn-primary px-6 py-3 text-base shadow shadow-[0_10px_30px_rgba(26,35,50,0.06)] transition hover:shadow-[0_12px_28px_rgba(26,35,50,0.08)] disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? t('buttons.creating') : t('buttons.create')}
            </button>
            <button
              type="button"
              className="rv-btn px-6 py-3 text-base shadow-sm transition hover:shadow-strong disabled:opacity-60"
              onClick={() => router.back()}
              disabled={submitting}
            >
              {t('buttons.cancel')}
            </button>
            {message && (
              <div className="rounded-2xl border border-danger bg-[rgba(214,76,76,0.08)] px-4 py-2 text-sm text-danger shadow-sm">
                {message}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className={`${cardBaseClass} ${transitionBase} ${appearClass}`} style={{ transitionDelay: '220ms' }}>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">{t('aside.overview')}</div>
            <div className="mt-3 text-2xl font-semibold text-text">{friendly}</div>
            <div className="mt-4 rounded-2xl border border-primary bg-primary-weak/80 px-4 py-3 text-sm text-primary-hover shadow-inner">
              {t('aside.selectionLabel', { mode: selectionLabel(selection) })}
            </div>
          </div>

          <div className={`${cardBaseClass} ${transitionBase} ${appearClass}`} style={{ transitionDelay: '260ms' }}>
            <h3 className="text-base font-semibold text-text">{t('aside.tipsTitle')}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {tipKeys.map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-weak0" />
                  <span>{t(key as any)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </form>
    </main>
  );
}
