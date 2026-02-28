"use client";

import { useMemo, useState } from "react";
import EditableAvatar from "@/components/me/EditableAvatar";
import { useTranslations } from "next-intl";

type Business = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  website_url: string | null;
  phone: string | null;
  social_json?: any;
  meta_json?: any;
  created_at?: string | null;
};

type Props = {
  initialBusinesses: Business[];
};

type FormState = {
  name: string;
  website_url: string;
  phone: string;
  email: string;
  avatar_url: string;
  logo_url: string;
  whatsapp_link: string;
  instagram: string;
  facebook: string;
  x: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
  telegram: string;
  snapchat: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  website_url: "",
  phone: "",
  email: "",
  avatar_url: "",
  logo_url: "",
  whatsapp_link: "",
  instagram: "",
  facebook: "",
  x: "",
  tiktok: "",
  youtube: "",
  linkedin: "",
  telegram: "",
  snapchat: "",
};

const normalizeWhatsappLink = (value: string) => {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^wa\.me\//i.test(raw)) return `https://${raw}`;
  if (/^whatsapp\.com\//i.test(raw)) return `https://${raw}`;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return `https://wa.me/${digits}`;
};

export default function BusinessesManager({ initialBusinesses }: Props) {
  const t = useTranslations("ProfilePage.businesses");
  const [items, setItems] = useState<Business[]>(initialBusinesses || []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [baseSocial, setBaseSocial] = useState<Record<string, any>>({});
  const [baseMeta, setBaseMeta] = useState<Record<string, any>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const activeBusiness = useMemo(
    () => items.find((item) => item.id === activeId) || null,
    [items, activeId]
  );

  const resetForm = () => {
    setActiveId(null);
    setForm({ ...EMPTY_FORM });
    setBaseSocial({});
    setBaseMeta({});
    setFormOpen(false);
  };

  const openCreate = () => {
    setActiveId(null);
    setForm({ ...EMPTY_FORM });
    setBaseSocial({});
    setBaseMeta({});
    setFormOpen(true);
  };

  const setFromBusiness = (business: Business) => {
    const social = (business.social_json || {}) as Record<string, any>;
    const meta = (business.meta_json || {}) as Record<string, any>;
    const contacts = (meta.contacts || {}) as Record<string, any>;

    setActiveId(business.id);
    setBaseSocial(social);
    setBaseMeta(meta);
    setFormOpen(true);
    setForm({
      name: business.name || "",
      website_url: business.website_url || social.website || "",
      phone: business.phone || contacts.phone || "",
      email: social.email || contacts.email || meta.email || "",
      avatar_url: business.avatar_url || "",
      logo_url: business.logo_url || "",
      whatsapp_link: social.whatsapp_link || social.whatsapp_url || social.whatsapp || "",
      instagram: social.instagram || "",
      facebook: social.facebook || "",
      x: social.x || social.twitter || "",
      tiktok: social.tiktok || "",
      youtube: social.youtube || "",
      linkedin: social.linkedin || "",
      telegram: social.telegram || "",
      snapchat: social.snapchat || "",
    });
  };

  const mergeSocial = () => {
    const social = { ...(baseSocial || {}) };
    const setKey = (key: string, value: string) => {
      const trimmed = value.trim();
      if (trimmed) {
        social[key] = trimmed;
      } else {
        delete social[key];
      }
    };

    setKey("website", form.website_url);
    setKey("whatsapp_link", normalizeWhatsappLink(form.whatsapp_link));
    setKey("email", form.email);
    setKey("instagram", form.instagram);
    setKey("facebook", form.facebook);
    setKey("x", form.x);
    setKey("tiktok", form.tiktok);
    setKey("youtube", form.youtube);
    setKey("linkedin", form.linkedin);
    setKey("telegram", form.telegram);
    setKey("snapchat", form.snapchat);

    return social;
  };

  const mergeMeta = () => {
    const meta = { ...(baseMeta || {}) };
    const contacts = { ...(meta.contacts || {}) };
    if (form.phone.trim()) {
      contacts.phone = form.phone.trim();
    } else {
      delete contacts.phone;
    }
    if (Object.keys(contacts).length > 0) {
      meta.contacts = contacts;
    } else {
      delete meta.contacts;
    }
    return meta;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setNotice({ kind: "error", text: t("notices.nameRequired") });
      return;
    }

    setSaving(true);
    setNotice(null);

    const payload = {
      name: trimmedName,
      website_url: form.website_url.trim() || null,
      phone: form.phone.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      logo_url: form.logo_url || null,
      social_json: mergeSocial(),
      meta_json: mergeMeta(),
    };

    try {
      const res = await fetch(
        activeId ? `/api/me/businesses/${activeId}` : "/api/me/businesses",
        {
          method: activeId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || t("notices.saveFailed"));
      }

      const saved = data?.item || data?.business || null;
      if (saved?.id) {
        setItems((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === saved.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = { ...next[existingIndex], ...saved };
            return next;
          }
          return [saved, ...prev];
        });
        setFromBusiness(saved);
      }

      setNotice({ kind: "success", text: activeId ? t("notices.updated") : t("notices.created") });
    } catch (err: any) {
      setNotice({ kind: "error", text: err?.message || t("notices.genericError") });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (business: Business) => {
    if (!business.id) return;
    const confirmed = window.confirm(t("notices.confirmDelete"));
    if (!confirmed) return;
    setDeletingId(business.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/me/businesses/${business.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || t("notices.deleteFailed"));
      }
      setItems((prev) => prev.filter((item) => item.id !== business.id));
      if (activeId === business.id) {
        resetForm();
      }
      setNotice({ kind: "success", text: t("notices.deleted") });
    } catch (err: any) {
      setNotice({ kind: "error", text: err?.message || t("notices.genericError") });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("header.eyebrow")}</p>
          <p className="text-sm text-slate-600">{t("header.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("header.new")}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {items.map((business) => {
            const isActive = business.id === activeId;
            const avatar = business.avatar_url || "/assets/defaults/avatar-r.svg";
            return (
              <div
                key={business.id}
                className={`rounded-2xl border p-4 shadow-sm transition ${
                  isActive ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatar}
                      alt=""
                      className="h-12 w-12 rounded-2xl border border-slate-200 object-cover"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">{business.name || t("list.untitled")}</div>
                      <div className="text-xs text-slate-500">
                        {business.website_url || business.phone || t("list.noContact")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/businesses/${business.id}`}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      {t("list.open")}
                    </a>
                    <button
                      type="button"
                      onClick={() => setFromBusiness(business)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      {t("list.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(business)}
                      disabled={deletingId === business.id}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
                    >
                      {deletingId === business.id ? t("list.deleting") : t("list.delete")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {!items.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
              {t("list.empty")}
            </div>
          )}
        </div>

        {formOpen && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {activeBusiness ? t("form.editEyebrow") : t("form.createEyebrow")}
                </div>
                <div className="text-sm text-slate-600">
                  {activeBusiness ? t("form.editSubtitle") : t("form.createSubtitle")}
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                {t("form.close")}
              </button>
            </div>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="font-medium text-slate-700">{t("form.name.label")}</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3"
                placeholder={t("form.name.placeholder")}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                <span className="font-medium text-slate-700">{t("form.website.label")}</span>
                <input
                  value={form.website_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, website_url: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3"
                  placeholder={t("form.website.placeholder")}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                <span className="font-medium text-slate-700">{t("form.phone.label")}</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3"
                  placeholder={t("form.phone.placeholder")}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-600 sm:col-span-2">
                <span className="font-medium text-slate-700">{t("form.email.label")}</span>
                <input
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3"
                  placeholder={t("form.email.placeholder")}
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("form.avatar")}</div>
              <EditableAvatar
                initialUrl={form.avatar_url || undefined}
                size={96}
                onChange={(val) => setForm((prev) => ({ ...prev, avatar_url: val }))}
                targetInputId="business_avatar_url"
              />
              <input
                id="business_avatar_url"
                value={form.avatar_url}
                onChange={(e) => setForm((prev) => ({ ...prev, avatar_url: e.target.value }))}
                className="sr-only"
                readOnly
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("form.social.title")}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SocialField
                  label={t("form.social.whatsapp.label")}
                  value={form.whatsapp_link}
                  onChange={(val) => setForm((prev) => ({ ...prev, whatsapp_link: val }))}
                  placeholder={t("form.social.whatsapp.placeholder")}
                  helper={t("form.social.whatsapp.helper")}
                />
                <SocialField label={t("form.social.instagram")} value={form.instagram} onChange={(val) => setForm((prev) => ({ ...prev, instagram: val }))} />
                <SocialField label={t("form.social.facebook")} value={form.facebook} onChange={(val) => setForm((prev) => ({ ...prev, facebook: val }))} />
                <SocialField label={t("form.social.x")} value={form.x} onChange={(val) => setForm((prev) => ({ ...prev, x: val }))} />
                <SocialField label={t("form.social.tiktok")} value={form.tiktok} onChange={(val) => setForm((prev) => ({ ...prev, tiktok: val }))} />
                <SocialField label={t("form.social.youtube")} value={form.youtube} onChange={(val) => setForm((prev) => ({ ...prev, youtube: val }))} />
                <SocialField label={t("form.social.linkedin")} value={form.linkedin} onChange={(val) => setForm((prev) => ({ ...prev, linkedin: val }))} />
                <SocialField label={t("form.social.telegram")} value={form.telegram} onChange={(val) => setForm((prev) => ({ ...prev, telegram: val }))} />
                <SocialField label={t("form.social.snapchat")} value={form.snapchat} onChange={(val) => setForm((prev) => ({ ...prev, snapchat: val }))} />
              </div>
            </div>

            {notice && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  notice.kind === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {notice.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {saving ? t("form.actions.saving") : activeBusiness ? t("form.actions.save") : t("form.actions.create")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SocialField({
  label,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-600">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
        placeholder={placeholder || "https://"}
      />
      {helper && <span className="text-[11px] text-slate-400">{helper}</span>}
    </label>
  );
}
