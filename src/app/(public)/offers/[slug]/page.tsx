import type { Metadata } from 'next';
import OfferDetailClient from './OfferDetailClient';
import { notFound } from 'next/navigation';
import { getPublicOfferBySlug } from '@/lib/server/publicOffers';
import type { PublicOffer } from '@/types/offers';

const FALLBACK_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://www.mazayago.com';
const DEFAULT_OG_IMAGE_PATH = '/assets/defaults/MazayaGo_header_320w_palette.png';

const ensureAbsoluteUrl = (url?: string | null, baseUrl: string = FALLBACK_BASE_URL) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const pickGalleryImage = (contest?: PublicOffer | null) => {
  if (!contest) return null;
  const urls: string[] = [];
  const push = (value?: string | null) => {
    if (!value) return;
    const trimmed = value.trim();
    if (trimmed) urls.push(trimmed);
  };
  push((contest as any).cover_url || null);
  if (contest.branding_theme && typeof contest.branding_theme === 'object') {
    push((contest.branding_theme as any)?.cover_url || null);
  }
  push(contest.rules_json?.cover_url || null);
  if (Array.isArray(contest.media)) {
    contest.media.forEach((item: any) => push(typeof item?.url === 'string' ? item.url : null));
  }
  if (Array.isArray(contest?.rules_json?.gallery_urls)) {
    contest.rules_json.gallery_urls.forEach((value: any) =>
      push(typeof value === 'string' ? value : String(value ?? '').trim()),
    );
  }
  return urls[0] || null;
};

const formatDeadlineAden = (date?: string | null) => {
  if (!date) return null;
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('ar', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Aden',
    }).format(dt);
  } catch {
    return dt.toLocaleString('ar');
  }
};

const buildDescription = (contest?: PublicOffer | null) => {
  const parts: string[] = [];
  if (contest?.prize_summary) {
    parts.push(`الجائزة: ${contest.prize_summary}`);
  }
  const deadline = formatDeadlineAden(contest?.ends_at);
  if (deadline) {
    parts.push(`ينتهي: ${deadline}`);
  }
  parts.push('انضم عبر منصة مزايا جو (MazayaGo) الآن.');
  return parts.join(' • ');
};

const getBaseUrl = () => FALLBACK_BASE_URL;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const baseUrl = getBaseUrl();
  const { slug } = params;
  const contest = await getPublicOfferBySlug(slug);
  const offerUrl = `${baseUrl}/offers/${slug}`;
  const primaryImage = pickGalleryImage(contest);
  const ogImage =
    ensureAbsoluteUrl(primaryImage, baseUrl) || ensureAbsoluteUrl(DEFAULT_OG_IMAGE_PATH, baseUrl);
  const title = contest?.title || 'تحدي على منصة مزايا جو (MazayaGo)';
  const description = buildDescription(contest) || 'شارك في أحدث التحديات على منصة مزايا جو (MazayaGo).';

  return {
    title,
    description,
    alternates: { canonical: offerUrl },
    openGraph: {
      title,
      description,
      url: offerUrl,
      type: 'website',
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function OfferDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const baseUrl = getBaseUrl();
  const offer = await getPublicOfferBySlug(params.slug);

  if (!offer) {
    notFound();
  }

  return (
    <OfferDetailClient
      slug={params.slug}
      searchParams={searchParams}
      shareBaseUrl={baseUrl}
      initialOffer={offer}
    />
  );
}
