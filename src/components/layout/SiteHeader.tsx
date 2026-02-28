import Link from "next/link";
import Image from "next/image";
import UserMenu from "@/components/nav/UserMenu";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";
import { getMessages, getRequestLocale } from "@/i18n/config";

type HeaderMessages = {
  brand?: {
    name?: string;
    tagline?: string;
  };
  nav?: {
    discover?: string;
    create?: string;
    dashboard?: string;
    about?: string;
  };
  mobileCta?: string;
};

export default async function SiteHeader() {
  const locale = getRequestLocale();
  const messages = await getMessages(locale);
  const headerMessages = (messages.Header ?? {}) as HeaderMessages;
  const isArabic = locale === "ar";
  const brandName = headerMessages.brand?.name ?? "MazayaGo";
  const brandTagline = headerMessages.brand?.tagline ?? "";
  const navLinks = [
    { href: "/offers", label: headerMessages.nav?.discover ?? "Discover", active: true },
    { href: "/offers/new", label: headerMessages.nav?.create ?? "Create offer" },
    { href: "/me", label: headerMessages.nav?.dashboard ?? "Dashboard" },
    { href: "/about", label: headerMessages.nav?.about ?? "About" },
  ];
  const mobileCta = headerMessages.mobileCta ?? "Create";
  const logoAlt = isArabic ? "شعار مزايا جو" : "MazayaGo logo";
  const sectionDir = isArabic ? "rtl" : "ltr";

  return (
    <header dir={sectionDir} className="sticky top-0 z-40 w-full border-b border-[rgba(230,237,242,0.6)] bg-[rgba(255,255,255,0.95)] backdrop-blur-[20px]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-3 text-text">
          <span className="flex h-10 w-10 items-center justify-center rounded bg-bg ring-1 ring-border">
            <Image
              src="/assets/defaults/mazayago-full-badge-64.svg"
              alt={logoAlt}
              width={40}
              height={40}
              className="h-8 w-8 object-contain"
              priority
            />
          </span>
          <div>
            <div className="text-base font-extrabold tracking-tight">{brandName}</div>
            <div className={`text-[10px] font-medium text-muted ${isArabic ? "tracking-[0.08em]" : "uppercase tracking-[0.2em]"}`}>{brandTagline}</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 rounded-full text-sm font-medium text-muted hover:bg-primary-weak hover:text-text transition-all duration-150"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href="/offers/new"
            className="inline-flex md:hidden items-center gap-2 px-5 py-2 rounded-full border-0 text-sm font-semibold text-white bg-accent hover:bg-accent-hover transition-all duration-button cursor-pointer shadow-[0_10px_30px_rgba(26,35,50,0.06)] hover:shadow hover:-translate-y-0.5"
          >
            {mobileCta}
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
