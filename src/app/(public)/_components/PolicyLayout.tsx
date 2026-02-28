import { ReactNode } from "react";
import { PolicyChips } from "./PolicyChips";
import { PolicyTOC, PolicyTOCItem } from "./PolicyTOC";

type PolicyLayoutProps = {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  lastUpdatedLabel: string;
  toc: PolicyTOCItem[];
  children: ReactNode;
  currentPath?: string;
  footerNote?: string;
  badges?: string[];
  jsonLd?: object | object[];
  tocTitle?: string;
};

export default function PolicyLayout({
  title,
  subtitle,
  lastUpdated,
  lastUpdatedLabel,
  toc,
  children,
  currentPath,
  footerNote,
  badges,
  jsonLd,
  tocTitle,
}: PolicyLayoutProps) {
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : null;

  return (
    <main className="container-narrow space-y-8 py-10" dir="rtl">
      <header className="relative overflow-hidden rounded-[28px] border border-border bg-surface px-6 py-7 shadow-card md:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-40 w-40 rounded-full bg-secondary/10 blur-2xl" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-muted">
              {lastUpdatedLabel}: {lastUpdated}
            </span>
            {badges?.map((badge) => (
              <span key={badge} className="badge badge-reward">
                {badge}
              </span>
            ))}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-text md:text-4xl">{title}</h1>
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          </div>
          <PolicyChips currentPath={currentPath} />
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="lg:sticky lg:top-24 lg:w-72">
          <PolicyTOC items={toc} title={tocTitle} />
        </aside>
        <article className="flex-1 space-y-6">{children}</article>
      </div>

      {footerNote ? (
        <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-xs text-muted">
          {footerNote}
        </div>
      ) : null}

      {jsonLdText ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdText }}
        />
      ) : null}
    </main>
  );
}
