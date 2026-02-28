import Link from "next/link";
import UserMenuClient from "@/components/nav/UserMenuClient";
import { currentUser, isPlatformAdmin } from "@/lib/session";
import { getMessages, getRequestLocale } from "@/i18n/config";

type UserMenuMessages = {
  signIn?: string;
  signUp?: string;
  accountFallback?: string;
  menu?: {
    home?: string;
    offers?: string;
    profile?: string;
    admin?: string;
  };
  signOut?: string;
  signingOut?: string;
};

export default async function UserMenu() {
  const locale = getRequestLocale();
  const [user, messages] = await Promise.all([currentUser(), getMessages(locale)]);
  const isAdmin = user ? await isPlatformAdmin(user.id) : false;
  const userMenuMessages = (messages.UserMenu ?? {}) as UserMenuMessages;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/sign-in" className="btn btn-ghost">
          {userMenuMessages.signIn ?? "Sign in"}
        </Link>
        <Link href="/sign-up" className="btn btn-primary">
          {userMenuMessages.signUp ?? "Create account"}
        </Link>
      </div>
    );
  }

  return (
    <UserMenuClient
      avatarUrl={(user as any).avatar_url || ""}
      displayName={
        user.full_name ||
        (user as any).display_name ||
        user.email ||
        (user as any).phone ||
        userMenuMessages.accountFallback ||
        "Account"
      }
      items={[
        { href: "/offers", label: userMenuMessages.menu?.home ?? "Home", icon: "home" },
        { href: "/offers", label: userMenuMessages.menu?.offers ?? "Offers", icon: "offers" },
        { href: "/me", label: userMenuMessages.menu?.profile ?? "Profile", icon: "user" },
        ...(isAdmin
          ? [{ href: "/admin", label: userMenuMessages.menu?.admin ?? "Admin Console", icon: "shield" as const }]
          : []),
      ]}
      signOutLabel={userMenuMessages.signOut ?? "Sign out"}
      signingOutLabel={userMenuMessages.signingOut ?? "Signing out..."}
    />
  );
}
