import Link from "next/link";

export type PolicyTOCItem = {
  id: string;
  label: string;
};

type PolicyTOCProps = {
  title?: string;
  items: PolicyTOCItem[];
};

export function PolicyTOC({ title = "جدول المحتويات", items }: PolicyTOCProps) {
  return (
    <nav aria-label={title} className="card space-y-3">
      <div className="text-sm font-semibold text-text">{title}</div>
      <ol className="space-y-2 text-sm text-muted">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`#${item.id}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-primary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
