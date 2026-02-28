"use client";

import { useEffect, useState } from "react";
import AvatarUploader from "@/components/me/AvatarUploader";
import { useTranslations } from "next-intl";

type Props = {
  initialUrl?: string | null;
  targetInputId: string;
  size?: number;
  onChange?: (url: string) => void;
};

const PLACEHOLDER_AVATAR = "/assets/defaults/avatar-r.svg";

export default function EditableAvatar({ initialUrl, targetInputId, size = 80, onChange }: Props) {
  const t = useTranslations("ProfilePage.avatar");
  const [url, setUrl] = useState(initialUrl || PLACEHOLDER_AVATAR);
  const [errored, setErrored] = useState(false);
  const dimension = `${size}px`;

  useEffect(() => {
    setUrl(initialUrl || PLACEHOLDER_AVATAR);
    setErrored(false);
  }, [initialUrl]);

  return (
    <AvatarUploader
      targetInputId={targetInputId}
      onUploaded={(val) => {
        setUrl(val);
        setErrored(false);
        onChange?.(val);
      }}
      renderTrigger={({ openPicker, busy }) => (
        <button
          type="button"
          onClick={openPicker}
          className="group relative inline-flex"
          aria-label={t("ariaLabel")}
        >
          <img
            src={errored ? PLACEHOLDER_AVATAR : url || PLACEHOLDER_AVATAR}
            alt={t("alt")}
            className="rounded-2xl border border-slate-200 object-cover shadow-sm transition group-hover:brightness-90"
            style={{ width: dimension, height: dimension }}
            onError={() => setErrored(true)}
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 text-xs font-semibold uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100">
            {busy ? t("uploading") : t("change")}
          </span>
        </button>
      )}
      autoUpload
    />
  );
}
