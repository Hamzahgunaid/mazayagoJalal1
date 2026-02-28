import { getExternalContestFeed } from '@/lib/server/externalContestPostsRepo';

export const dynamic = 'force-dynamic';

export default async function ExternalContestsFeedPage() {
  const items = await getExternalContestFeed();

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-gradient-to-br from-white to-secondary/40 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-text">مسابقات خارجية</h1>
        <p className="mt-2 text-sm text-muted">أحدث المسابقات المنشورة من فيسبوك وإنستغرام.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const chips = item.card_how_to_enter?.chips || [];
          const visibleChips = chips.slice(0, 3);
          return (
            <article key={item.id} className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm transition hover:shadow-md">
              {item.source_media_cover_url ? (
                <img src={item.source_media_cover_url} alt={item.card_title} className="h-44 w-full object-cover" />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-secondary text-sm text-muted">لا توجد صورة غلاف</div>
              )}
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-secondary px-2 py-1 text-text">
                    {item.review_badge === 'REVIEWED' ? 'مراجع' : 'غير مراجع'}
                  </span>
                  {item.winners_status === 'WINNERS_PUBLISHED' && (
                    <span className="rounded-full bg-success/20 px-2 py-1 text-success">🏁 تم إعلان الفائزين</span>
                  )}
                </div>
                <h2 className="line-clamp-2 text-lg font-semibold text-text">{item.card_title}</h2>
                <p className="line-clamp-1 text-sm text-muted">{item.card_prize}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {visibleChips.map((chip) => (
                    <span key={chip} className="rounded-full border border-border bg-white px-2 py-1 text-muted">
                      {chip}
                    </span>
                  ))}
                  {chips.length > 3 && <span className="rounded-full bg-secondary px-2 py-1">+{chips.length - 3}</span>}
                </div>
                <a
                  className="block w-full rounded-xl bg-primary px-3 py-2 text-center text-sm font-medium text-white"
                  href={item.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  فتح المنشور
                </a>
                {item.source_account_url ? (
                  <a className="text-sm text-primary underline" href={item.source_account_url} target="_blank" rel="noreferrer">
                    {item.source_account_name || 'account'}
                  </a>
                ) : (
                  <p className="text-sm text-muted">{item.source_account_name || '-'}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
