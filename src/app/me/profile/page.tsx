import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";
import SectionCard from "@/components/me/SectionCard";
import ProfileSettingsForm from "@/components/me/ProfileSettingsForm";
import BusinessesManager from "@/components/me/BusinessesManager";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

type ProfileMeta = {
  location_city?: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  private_profile: boolean | null;
  status: string | null;
  meta_json: ProfileMeta | null;
};

type BusinessRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  website_url: string | null;
  phone: string | null;
  social_json: any;
  meta_json: any;
  created_at: string | null;
};

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const [profileRes, businessesRes] = await Promise.all([
    pool.query<ProfileRow>(
      `SELECT id, email, phone, full_name, display_name, avatar_url, country,
              private_profile, status, meta_json
         FROM public.users
        WHERE id=$1`,
      [user.id]
    ),
    pool.query<BusinessRow>(
      `SELECT id, name, avatar_url, logo_url, website_url, phone, social_json, meta_json, created_at
         FROM public.businesses
        WHERE owner_user_id=$1
        ORDER BY created_at DESC`,
      [user.id]
    ),
  ]);

  const profile = profileRes.rows[0];
  if (!profile) redirect("/sign-in");
  const businesses = businessesRes.rows || [];

  const t = await getTranslations("ProfilePage");
  const statusKey = (profile.status || "active").toLowerCase();
  const statusLabel =
    statusKey === "active"
      ? t("status.active")
      : statusKey === "paused"
      ? t("status.paused")
      : statusKey === "suspended"
      ? t("status.suspended")
      : t("status.unknown");
  const badgeClass = badgeTone(statusKey);

  return (
    <div className="space-y-6">
      <SectionCard
        title={t("sections.profileSettings")}
        actions={
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
            {statusLabel}
          </span>
        }
      >
        <ProfileSettingsForm profile={profile} />
      </SectionCard>

      <SectionCard title={t("sections.businesses")}>
        <BusinessesManager initialBusinesses={businesses} />
      </SectionCard>
    </div>
  );
}

function badgeTone(status: string) {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "PAUSED":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "SUSPENDED":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
}
