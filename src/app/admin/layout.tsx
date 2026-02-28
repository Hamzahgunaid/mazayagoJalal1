import Link from "next/link";
import { ReactNode } from "react";
import { currentUser, isPlatformAdmin } from "@/lib/session";
import CommandPalette from "@/components/admin/CommandPalette";
import CommandButton from "@/components/admin/CommandButton";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Console" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/geo", label: "Geo" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/mapping", label: "Mapping" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/security", label: "Security" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  const ok = await isPlatformAdmin(user?.id);
  if (!user || !ok) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-slate-600">You need platform_admin role to view this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ direction: "ltr" }} data-admin-shell>
      <div className="mx-auto w-full max-w-[1500px] px-4 py-4 md:grid md:grid-cols-[250px,1fr] md:gap-6">
        <details className="mb-3 md:hidden group">
          <summary className="list-none">
            <button className="btn w-full" type="button">Open admin menu</button>
          </summary>
          <div className="fixed inset-0 z-40 bg-black/40" />
          <div className="fixed left-0 top-0 z-50 h-full w-80 overflow-auto rounded-r-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium">Admin</div>
              <span className="text-xs text-slate-500">Use menu button to close</span>
            </div>
            <NavList />
            <div className="mt-4"><CommandButton /></div>
          </div>
        </details>

        <aside className="hidden md:block md:sticky md:top-4 md:self-start md:h-[calc(100vh-2rem)] md:overflow-auto">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 font-semibold">Admin</div>
            <NavList />
            <div className="mt-6"><CommandButton /></div>
          </div>
        </aside>

        <main className="min-w-0">
          <CommandPalette />
          {children}
        </main>
      </div>
    </div>
  );
}

function NavList() {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 ring-1 ring-transparent hover:ring-slate-200"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
