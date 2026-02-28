'use client';

type MediaItem = {
  url: string;
  kind?: string | null;
};

export default function OfferGallery({
  media,
  emptyTitle = 'No media yet',
  emptySubtitle = 'The organizer has not added photos or videos for this offer.',
}: {
  media?: MediaItem[] | null;
  emptyTitle?: string;
  emptySubtitle?: string;
}) {
  const items = Array.isArray(media) ? media.filter((item) => !!item?.url) : [];

  return (
    <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {items.length > 0 ? (
        <div className="p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <div
                key={`${item.url}-${index}`}
                className="overflow-hidden rounded-xl border border-border bg-bg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.kind || 'Offer media'}
                  className="w-full object-cover transition hover:scale-[1.01] hover:shadow-md"
                  style={{ aspectRatio: '4 / 3' }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid place-items-center gap-2 px-6 py-10 text-center">
          <div className="text-sm font-semibold text-muted">{emptyTitle}</div>
          <p className="max-w-sm text-xs text-muted">{emptySubtitle}</p>
        </div>
      )}
    </section>
  );
}
