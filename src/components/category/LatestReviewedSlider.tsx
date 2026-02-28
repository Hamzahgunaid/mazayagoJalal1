type Item = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  submitted_at: string;
  slug: string;
  display_name: string;
  city: string | null;
  country: string | null;
};

export default function LatestReviewedSlider({ items }: { items: Item[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Latest reviews in this category</h2>
      <div className="overflow-x-auto">
        <div className="flex gap-3 min-w-full">
          {items.map((r) => (
            <a
              key={r.id}
              href={`/s/${r.slug}`}
              className="min-w-[280px] max-w-[320px] card p-3 hover:shadow transition"
              title={r.display_name}
            >
              <div className="text-xs text-slate-500">{new Date(r.submitted_at).toLocaleString()}</div>
              <div className="mt-1 text-sm font-medium" dir="auto">
                {r.title || (r.body ? r.body.slice(0, 80) : "—")}
              </div>
              <div className="mt-2 text-xs text-slate-600">
                ⭐ {r.rating} • {r.display_name}
              </div>
              <div className="text-xs text-slate-500">
                {[r.city, r.country].filter(Boolean).join(" • ")}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
