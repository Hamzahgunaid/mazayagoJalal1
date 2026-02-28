import { ReactNode } from "react";

type PolicySectionProps = {
  id: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

export function PolicySection({ id, title, eyebrow, children }: PolicySectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="card space-y-3">
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <div className="space-y-3 text-sm leading-relaxed text-muted">{children}</div>
      </div>
    </section>
  );
}
