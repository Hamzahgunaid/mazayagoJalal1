import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { POLICY_LINKS } from "./policyData";

type PolicyChipsProps = {
  currentPath?: string;
  className?: string;
};

export async function PolicyChips({ currentPath, className }: PolicyChipsProps) {
  const t = await getTranslations("PoliciesLinks");
  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {POLICY_LINKS.map((link) => {
        const isActive = currentPath === link.href;
        const label = t(`${link.key}.short`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`chip text-xs font-semibold ${
              isActive ? "border-primary/40 bg-primary/10 text-secondary" : ""
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
