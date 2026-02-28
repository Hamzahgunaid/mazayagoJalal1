import { redirect } from "next/navigation";
import { currentUser, isPlatformAdmin } from "@/lib/session";
import AdminConsole from "@/components/admin/AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const ok = await isPlatformAdmin(user.id);
  if (!ok) {
    redirect("/sign-in");
  }

  return <AdminConsole adminName={user.display_name || user.full_name || user.email || "Admin"} />;
}
