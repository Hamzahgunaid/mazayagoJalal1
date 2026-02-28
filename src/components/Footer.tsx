import Link from "next/link";
import Image from "next/image";
import { getMessages, getRequestLocale } from "@/i18n/config";

type FooterMessages = {
  brandName?: string;
  tagline?: string;
  ctaTitle?: string;
  ctaButton?: string;
  nav?: {
    offers?: string;
    launch?: string;
    dashboard?: string;
    about?: string;
  };
  policies?: {
    hub?: string;
    privacy?: string;
    terms?: string;
    deletion?: string;
    cookies?: string;
    contact?: string;
    label?: string;
  };
  legal?: string;
};

export async function Footer() {
  const locale = getRequestLocale();
  const messages = await getMessages(locale);
  const footerMessages = (messages.Footer ?? {}) as FooterMessages;
  const year = new Date().getFullYear();
  const isArabic = locale === "ar";

  const navLinks = [
    { href: "/offers", label: footerMessages.nav?.offers ?? "Offers" },
    { href: "/offers/new", label: footerMessages.nav?.launch ?? "Launch" },
    { href: "/me", label: footerMessages.nav?.dashboard ?? "Dashboard" },
    { href: "/about", label: footerMessages.nav?.about ?? "About" },
  ];

  const legalTemplate = footerMessages.legal ?? "© {year} MazayaGo. All rights reserved.";
  const legalText = legalTemplate.replace("{year}", year.toString());
  const brandName = footerMessages.brandName ?? "MazayaGo";
  const tagline = footerMessages.tagline ?? "Interactive offers & rewards studio";
  const ctaTitle = footerMessages.ctaTitle ?? "Ready to launch your next campaign?";
  const ctaButton = footerMessages.ctaButton ?? "Start campaign";
  const policyLabel = footerMessages.policies?.label ?? (isArabic ? "السياسات" : "Policies");
  const logoAlt = isArabic ? "شعار مزايا جو" : "MazayaGo logo";
  const sectionDir = isArabic ? "rtl" : "ltr";

  const policyLinks = [
    { href: "/policies", label: footerMessages.policies?.hub ?? (isArabic ? "مركز السياسات" : "Policies hub") },
    { href: "/privacy", label: footerMessages.policies?.privacy ?? (isArabic ? "الخصوصية" : "Privacy") },
    { href: "/terms", label: footerMessages.policies?.terms ?? (isArabic ? "الشروط" : "Terms") },
    { href: "/data-deletion", label: footerMessages.policies?.deletion ?? (isArabic ? "حذف البيانات" : "Data deletion") },
    { href: "/cookie-policy", label: footerMessages.policies?.cookies ?? (isArabic ? "الكوكيز" : "Cookies") },
    { href: "/contact", label: footerMessages.policies?.contact ?? (isArabic ? "التواصل" : "Contact") },
  ];

  return (
    <footer dir={sectionDir} className="mt-16 text-text">
      <div className="bg-secondary px-6 py-10 text-center">
        <h3 className="text-2xl font-extrabold text-white">{ctaTitle}</h3>
        <Link
          href="/offers/new"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full border-0 text-sm font-semibold text-white bg-accent hover:bg-accent-hover transition-all duration-button cursor-pointer shadow-[0_10px_30px_rgba(26,35,50,0.06)] hover:shadow hover:-translate-y-0.5"
        >
          {ctaButton}
        </Link>
      </div>

      <div className="bg-white px-6 py-10 border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded bg-bg ring-1 ring-border">
              <Image
                src="/assets/defaults/mazayago-full-badge-64.svg"
                alt={logoAlt}
                width={48}
                height={48}
                className="h-10 w-10 object-contain"
                priority
              />
            </span>
            <div>
              <div className="text-base font-extrabold tracking-tight">{brandName}</div>
              <p className="text-xs text-muted">{tagline}</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-3">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="px-4 py-2 rounded-full text-sm font-medium text-muted hover:bg-primary-weak hover:text-text transition-all duration-150">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-border bg-white px-6 py-5 md:flex-row md:items-center md:gap-0">
        <p className="text-xs text-muted">{legalText}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-text">{policyLabel}</span>
          {policyLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted hover:text-text transition-all duration-150">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
