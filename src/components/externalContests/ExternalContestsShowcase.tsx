'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

type FeedItem = {
  id: string;
  source_url: string;
  source_account_name: string | null;
  source_account_url: string | null;
  source_media_cover_url: string | null;
  card_title: string;
  card_prize: string;
  card_how_to_enter?: { chips?: string[] } | null;
  review_badge: 'UNREVIEWED' | 'REVIEWED';
  winners_status: 'WINNERS_UNKNOWN' | 'WINNERS_PUBLISHED';
};

type FeedResponse = { items?: FeedItem[] };

type ExternalContestsShowcaseProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  autoScrollMs?: number;
};

const DEFAULT_AUTO_SCROLL_MS = 1600;

export default function ExternalContestsShowcase({
  className = '',
  title,
  subtitle,
  ctaHref = '/contests/external',
  ctaLabel,
  autoScrollMs = DEFAULT_AUTO_SCROLL_MS,
}: ExternalContestsShowcaseProps) {
  const t = useTranslations('HomePage.externalContests');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch('/api/external-contest-posts/feed', { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as FeedResponse;
        if (!res.ok) {
          if (alive) setError(t('loadError'));
          return;
        }
        if (alive) setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (alive) setError(t('loadError'));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const hasItems = items.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);
  const resolvedTitle = title || t('title');
  const resolvedSubtitle = subtitle || t('subtitle');
  const resolvedCtaLabel = ctaLabel || t('cta');

  useEffect(() => {
    if (!hasItems) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, autoScrollMs);

    return () => clearInterval(interval);
  }, [autoScrollMs, hasItems, items.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !hasItems) return;

    const cards = Array.from(el.children) as HTMLElement[];
    const card = cards[activeIndex];
    if (!card) return;

    // Keep movement scoped to the horizontal rail only.
    // Using container scroll avoids page-level vertical jump/scroll hijacking.
    el.scrollTo({
      left: card.offsetLeft,
      behavior: 'smooth',
    });
  }, [activeIndex, hasItems]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-border bg-secondary/40" />
          ))}
        </div>
      );
    }

    if (error) {
      return <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-text">{error}</div>;
    }

    if (!hasItems) {
      return <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4 text-sm text-text">{t('empty')}</div>;
    }

    return (
      <div ref={trackRef} className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" dir="ltr">
        {items.map((item) => {
          const chips = item.card_how_to_enter?.chips || [];
          return (
            <article key={item.id} dir="auto" className="min-w-[290px] max-w-[290px] overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-md ring-1 ring-primary/5">
              {item.source_media_cover_url ? (
                <img src={item.source_media_cover_url} alt={item.card_title} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 text-xs text-text">{t('noCover')}</div>
              )}
              <div className="space-y-2 p-3">
                <div className="flex flex-wrap gap-1 text-[11px]">
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{item.review_badge === 'REVIEWED' ? t('reviewed') : t('unreviewed')}</span>
                  {item.winners_status === 'WINNERS_PUBLISHED' && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">🏁 تم إعلان الفائزين</span>}
                </div>
                <h3 className="line-clamp-2 text-sm font-extrabold text-text">{item.card_title}</h3>
                <p className="line-clamp-1 text-xs text-muted">{item.card_prize}</p>
                <div className="flex flex-wrap gap-1 text-[11px] text-muted">
                  {chips.slice(0, 2).map((chip) => (
                    <span key={chip} className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-primary">
                      {chip}
                    </span>
                  ))}
                  {chips.length > 2 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">+{chips.length - 2}</span>}
                </div>
                <a className="block rounded-lg bg-gradient-to-r from-primary to-primary-hover px-3 py-1.5 text-center text-xs font-bold text-white shadow-sm" href={item.source_url} target="_blank" rel="noreferrer">
                  {t('openPost')}
                </a>
              </div>
            </article>
          );
        })}
      </div>
    );
  }, [error, hasItems, items, loading]);

  return (
    <section className={`space-y-4 rounded-3xl border border-primary/20 bg-gradient-to-br from-white via-primary/5 to-accent/10 p-5 shadow-md ${className}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-text">{resolvedTitle}</h2>
          <p className="mt-1 text-sm text-text/80">{resolvedSubtitle}</p>
        </div>
        <Link href={ctaHref} className="shrink-0 rounded-xl border border-primary/30 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm">
          {resolvedCtaLabel}
        </Link>
      </div>

      {content}
    </section>
  );
}
