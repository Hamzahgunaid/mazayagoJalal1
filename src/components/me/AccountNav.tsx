"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type AccountNavProps = {
  items: NavItem[];
  variant?: "sidebar" | "mobile";
};

export default function AccountNav({ items, variant = "sidebar" }: AccountNavProps) {
  const pathname = usePathname() || "/";
  const isMobile = variant === "mobile";

  return (
    <nav
      className={
        isMobile
          ? "flex gap-2 overflow-x-auto pb-1"
          : "flex flex-col gap-1.5"
      }
    >
      {items.map((item) => {
        const normalizedHref = item.href.replace(/\/$/, "");
        const isRoot = normalizedHref === "/me";
        const isActive =
          pathname === normalizedHref ||
          (!isRoot && pathname.startsWith(`${normalizedHref}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isMobile
                ? `whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow"
                      : "border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  }`
                : `rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
