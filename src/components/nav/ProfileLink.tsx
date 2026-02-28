import Link from "next/link";
import { currentUser } from "@/lib/session";

export default async function ProfileLink() {
  const user = await currentUser();
  if (!user) return null;
  return (
    <Link
      href="/me"
      className="inline-flex h-9 items-center rounded-xl border border-slate-300 px-3 text-sm
                 bg-white hover:bg-slate-50 text-slate-800
                 dark:bg-slate-900 dark:border-white/10 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      Profile
    </Link>
  );
}
