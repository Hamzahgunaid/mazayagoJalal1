import Link from "next/link";
import { ReactNode } from "react";
import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import { redirect } from "next/navigation";
import AccountNav from "@/components/me/AccountNav";

export const dynamic = "force-dynamic";

type NavItemConfig = {
  href: string;
  label: string;
  hidden?: boolean;
};

const navItems: NavItemConfig[] = [
  { href: "/me", label: "Overview" },
  { href: "/me/profile", label: "Profile", hidden: true },
  { href: "/me/service", label: "Services", hidden: true },
  { href: "/me/nodes", label: "Nodes", hidden: true },
  { href: "/me/reviews", label: "Reviews", hidden: true },
  { href: "/me/wallet", label: "Wallet", hidden: true },
  { href: "/me/offers", label: "Offers" , hidden: true},
  { href: "/me/sessions", label: "Sessions", hidden: true },
  { href: "/me/settings", label: "Settings", hidden: true },
  { href: "/me/nfc", label: "NFC & QR", hidden: true },
  { href: "/me/location", label: "Location", hidden: true },
  { href: "/me/qr", label: "QR", hidden: true },
];

type AccountProfile = {
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  country?: string | null;
};

export default async function MeLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user?.id) redirect("/sign-in");

  const { rows } = await pool.query(
    `SELECT full_name, display_name, email, phone, avatar_url, country
       FROM public.users
      WHERE id=$1`,
    [user.id]
  );
  const profile = (rows[0] as AccountProfile) || {};
  const visibleNavItems = navItems.filter((item) => !item.hidden);

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-6 md:px-6">
      <div className="md:hidden space-y-4 mb-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <MobileProfileHeader profile={profile} />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/me/profile"
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit profile
            </Link>
            <Link
              href="/offers/new"
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            >
              Launch offer
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <AccountNav items={visibleNavItems} variant="mobile" />
        </div>
      </div>

      <div className="md:grid md:grid-cols-[260px,1fr] md:gap-6">
        <aside className="hidden md:block md:sticky md:top-24 md:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <AccountSidebar profile={profile} items={visibleNavItems} />
          </div>
        </aside>
        <main className="min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  );
}

function AccountSidebar({ profile, items }: { profile: AccountProfile; items: NavItemConfig[] }) {
  const avatar = profile.avatar_url
    ? encodeURI(profile.avatar_url.trim())
    : "/assets/defaults/avatar-r.svg";
  const name = profile.full_name || profile.display_name || "Account";
  const meta = profile.email || profile.phone || "No contact info";
  const country = profile.country ? ` - ${profile.country}` : "";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <img
          src={avatar}
          alt=""
          className="h-14 w-14 rounded-2xl border border-slate-100 object-cover"
        />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Signed in as</p>
          <p className="text-base font-semibold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">
            {meta}
            {country}
          </p>
        </div>
      </div>

      <AccountNav items={items} />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/me/profile"
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Edit profile
        </Link>
        <Link
          href="/offers/new"
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
        >
          Launch offer
        </Link>
      </div>
    </div>
  );
}

function MobileProfileHeader({ profile }: { profile: AccountProfile }) {
  const avatar = profile.avatar_url
    ? encodeURI(profile.avatar_url.trim())
    : "/assets/defaults/avatar-r.svg";
  const name = profile.full_name || profile.display_name || "Account";
  const meta = profile.email || profile.phone || "No contact info";
  const country = profile.country ? ` - ${profile.country}` : "";

  return (
    <div className="flex items-center gap-3">
      <img
        src={avatar}
        alt=""
        className="h-16 w-16 rounded-2xl border border-slate-100 object-cover shadow-sm"
      />
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Signed in as</p>
        <p className="text-lg font-semibold text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">
          {meta}
          {country}
        </p>
      </div>
    </div>
  );
}
