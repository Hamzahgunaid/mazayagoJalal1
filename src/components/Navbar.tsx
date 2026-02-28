import Link from "next/link";
import { currentUser, isPlatformAdmin } from "@/lib/session";

export async function Navbar() {
  const user = await currentUser();
  const isAdmin = await isPlatformAdmin(user?.id || null);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-[var(--rv-bg)] text-white">
      <div className="mx-auto max-w-7xl p-4 flex items-center gap-6">
       <div className="flex items-center gap-3">
         
          <span className="font-semibold text-white"></span>
        </div>

        <nav className="ml-auto flex items-center gap-3 text-sm">
          <Link href="/categories" className="px-3 py-1 rounded-md hover:bg-white/10">Categories</Link>
          {isAdmin && <Link href="/admin" className="px-3 py-1 rounded-md hover:bg-white/10">Admin</Link>}
          {!user ? (
            <>
              <Link href="/sign-in" className="px-3 py-1 rounded-md hover:bg-white/10">Sign in</Link>
              <Link href="/sign-up" className="px-3 py-1 rounded-md hover:bg-white/10">Sign up</Link>
            </>
          ) : (
            <form action="/api/auth/sign-out" method="post">
              <button className="px-3 py-1 rounded-md hover:bg-white/10">Sign out</button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
