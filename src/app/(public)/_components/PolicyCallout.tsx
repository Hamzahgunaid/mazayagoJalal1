import { ReactNode } from "react";

type PolicyCalloutVariant = "info" | "success" | "warning" | "neutral";

type PolicyCalloutProps = {
  title?: string;
  variant?: PolicyCalloutVariant;
  children: ReactNode;
  dir?: "rtl" | "ltr";
  lang?: string;
};

const variants: Record<PolicyCalloutVariant, string> = {
  info: "border-primary/30 bg-primary/10 text-secondary",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  neutral: "border-border bg-surface-elevated text-text",
};

export function PolicyCallout({
  title,
  variant = "info",
  children,
  dir,
  lang,
}: PolicyCalloutProps) {
  return (
    <aside
      role="note"
      dir={dir}
      lang={lang}
      className={`rounded-2xl border px-4 py-3 text-sm shadow-soft ${variants[variant]}`}
    >
      {title ? <div className="mb-2 text-sm font-semibold">{title}</div> : null}
      <div className="space-y-2 leading-relaxed">{children}</div>
    </aside>
  );
}
