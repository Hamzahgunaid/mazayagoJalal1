"use client";

import { useState, useCallback, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import EditableAvatar from "@/components/me/EditableAvatar";
import CountrySelect from "@/components/common/CountrySelect";
import CitySelect from "@/components/common/CitySelect";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type ProfileMeta = {
  location_city?: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  private_profile: boolean | null;
  status: string | null;
  meta_json?: ProfileMeta | null;
};

type Props = {
  profile: Profile;
};

export default function ProfileSettingsForm({ profile }: Props) {
  const router = useRouter();
  const t = useTranslations("ProfilePage.settings");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [country, setCountry] = useState<string | undefined>(profile.country ?? undefined);
  const [city, setCity] = useState<string | undefined>(profile.meta_json?.location_city ?? undefined);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAvatarUrl(profile.avatar_url ?? "");
  }, [profile.avatar_url]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/me/profile", { method: "POST", body: data });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || t("messages.saveFailed"));
      }
      setMessage({ type: "success", text: t("messages.saveSuccess") });
      router.refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || t("messages.genericError") });
    } finally {
      setSaving(false);
    }
  }, [router, t]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" id="profile_avatar_input" name="avatar_url" value={avatarUrl} readOnly />

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <EditableAvatar
          initialUrl={avatarUrl}
          targetInputId="profile_avatar_input"
          size={112}
          onChange={(val) => {
            setAvatarUrl(val);
            setMessage({ type: "success", text: t("photo.updated") });
          }}
        />
        <div className="text-sm text-slate-500">
          <p className="font-semibold text-slate-800">{t("photo.title")}</p>
          <p>{t("photo.helper")}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("fields.fullName.label")}>
          <input
            name="full_name"
            defaultValue={profile.full_name ?? ""}
            className="h-11 w-full rounded-xl border border-slate-200 px-3"
            placeholder={t("fields.fullName.placeholder")}
          />
        </Field>
        <Field label={t("fields.displayName.label")} helper={t("fields.displayName.helper")}>
          <input
            name="display_name"
            defaultValue={profile.display_name ?? profile.full_name ?? ""}
            className="h-11 w-full rounded-xl border border-slate-200 px-3"
            placeholder={t("fields.displayName.placeholder")}
          />
        </Field>
        <Field label={t("fields.phone.label")}>
          <input
            name="phone"
            defaultValue={profile.phone ?? ""}
            className="h-11 w-full rounded-xl border border-slate-200 px-3"
            placeholder={t("fields.phone.placeholder")}
          />
        </Field>
        <Field label={t("fields.country.label")}>
          <CountrySelect
            value={country}
            onChange={(code) => {
              setCountry(code);
              if (city) setCity(undefined);
            }}
            placeholder={t("fields.country.placeholder")}
          />
          <input type="hidden" name="country" value={country || ""} />
        </Field>
        <Field label={t("fields.city.label")}>
          <CitySelect
            country={country}
            value={city}
            onChange={(val) => setCity(val)}
            placeholder={t("fields.city.placeholder")}
          />
          <input type="hidden" name="location_city" value={city || ""} />
        </Field>
        <div className="md:col-span-2">
          <Field label={t("fields.email.label")} helper={t("fields.email.helper")}>
            <input
              value={profile.email ?? t("fields.email.notSet")}
              readOnly
              disabled
              className="h-11 w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-slate-500"
            />
          </Field>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {saving ? t("actions.saving") : t("actions.save")}
        </button>
      </div>
    </form>
  );
}

function Field({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
      {helper && <span className="text-xs text-slate-400">{helper}</span>}
    </label>
  );
}
