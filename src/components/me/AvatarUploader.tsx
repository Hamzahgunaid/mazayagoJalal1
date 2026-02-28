"use client";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

type TriggerRenderArgs = {
  openPicker: () => void;
  busy: boolean;
  message: string;
};

type AvatarUploaderProps = {
  onUploaded?: (url: string) => void;
  targetInputId?: string;
  renderTrigger?: (args: TriggerRenderArgs) => ReactNode;
  autoUpload?: boolean;
};

export default function AvatarUploader({
  onUploaded,
  targetInputId,
  renderTrigger,
  autoUpload = false,
}: AvatarUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function upload() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Upload failed");

      let finalUrl: string | null = null;
      const fileToSend = fileRef.current?.files?.[0] || null;

      if (j?.signedUrl && fileToSend) {
        const ct = j.contentType || fileToSend.type || "application/octet-stream";
        const uploadRes = await fetch(j.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": ct },
          body: fileToSend,
        });
        if (!uploadRes.ok) {
          throw new Error("Upload failed");
        }
        finalUrl = j.publicUrl || j.url || null;
      } else {
        finalUrl = j.url || j.publicUrl || null;
      }

      if (!finalUrl) {
        throw new Error("Upload failed");
      }

      onUploaded?.(finalUrl);
      if (targetInputId) {
        const el = document.getElementById(targetInputId) as HTMLInputElement | null;
        if (el) el.value = finalUrl;
      }
      setMsg("Uploaded");
    } catch (e: any) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  function handleChange() {
    if (autoUpload || renderTrigger) {
      void upload();
    }
  }

  const openPicker = () => fileRef.current?.click();
  const inputClass = renderTrigger ? "sr-only" : "text-sm";

  return (
    <div className={renderTrigger ? "inline-flex items-center gap-2" : "flex items-center gap-3"}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={inputClass}
        onChange={handleChange}
      />
      {renderTrigger ? (
        renderTrigger({ openPicker, busy, message: msg })
      ) : (
        <>
          <button
            type="button"
            onClick={upload}
            disabled={busy}
            className="px-3 h-9 rounded-lg bg-slate-900 text-white"
          >
            {busy ? "Uploading..." : "Upload"}
          </button>
          {msg && <span className="text-xs text-slate-500">{msg}</span>}
        </>
      )}
    </div>
  );
}
