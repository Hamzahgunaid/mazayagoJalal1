"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type RequestType = "MESSENGER" | "WEBSITE" | "BOTH";

type DataDeletionFormValues = {
  request_type: RequestType;
  email: string;
  messenger_mt: string;
  psid: string;
  page: string;
  contest_url: string;
  notes: string;
  website: string;
};

type DataDeletionFormProps = {
  supportEmail: string;
};

export function DataDeletionForm({ supportEmail }: DataDeletionFormProps) {
  const t = useTranslations("PoliciesDeletion.form");
  const [form, setForm] = useState<DataDeletionFormValues>({
    request_type: "MESSENGER",
    email: "",
    messenger_mt: "",
    psid: "",
    page: "",
    contest_url: "",
    notes: "",
    website: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const requestTypeLabels: Record<RequestType, string> = {
    MESSENGER: t("requestTypes.messenger"),
    WEBSITE: t("requestTypes.website"),
    BOTH: t("requestTypes.both"),
  };
  const requestTypeOptions = [
    { value: "MESSENGER" as const, label: requestTypeLabels.MESSENGER },
    { value: "WEBSITE" as const, label: requestTypeLabels.WEBSITE },
    { value: "BOTH" as const, label: requestTypeLabels.BOTH },
  ];

  const hasLocator = Boolean(
    form.messenger_mt.trim() || form.psid.trim() || form.contest_url.trim() || form.page.trim(),
  );

  const emailTemplate = useMemo(
    () =>
      buildEmailTemplate(form, requestId, requestTypeLabels, {
        greeting: t("emailTemplate.greeting"),
        requestLine: t("emailTemplate.requestLine"),
        closing: t("emailTemplate.closing"),
        labels: {
          requestType: t("emailTemplate.labels.requestType"),
          email: t("emailTemplate.labels.email"),
          messengerMt: t("emailTemplate.labels.messengerMt"),
          psid: t("emailTemplate.labels.psid"),
          page: t("emailTemplate.labels.page"),
          contestUrl: t("emailTemplate.labels.contestUrl"),
          notes: t("emailTemplate.labels.notes"),
          reference: t("emailTemplate.labels.reference"),
        },
      }),
    [form, requestId, requestTypeLabels, t],
  );
  const emailSubject = t("emailTemplate.subject");
  const mailtoHref = useMemo(() => {
    return `mailto:${supportEmail}?subject=${encodeURIComponent(
      emailSubject,
    )}&body=${encodeURIComponent(
      emailTemplate,
    )}`;
  }, [supportEmail, emailTemplate, emailSubject]);

  function updateField<K extends keyof DataDeletionFormValues>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("idle");
    setCopied(false);

    if (!hasLocator) {
      setError(t("errors.missingLocator"));
      setStatus("error");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/data-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        request_id?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(t("errors.submitFailed"));
        setStatus("error");
        return;
      }

      setRequestId(payload.request_id ?? null);
      setStatus("success");
    } catch (err) {
      setError(t("errors.submitFailedTryLater"));
      setStatus("error");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(emailTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="card-strong space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-text">{t("title")}</h3>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>

      <form action="/api/data-deletion" method="post" onSubmit={handleSubmit} className="space-y-4">
        <div
          aria-hidden="true"
          style={{ position: "absolute", left: "-10000px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}
        >
          <label className="text-xs">
            <span>Website</span>
            <input
              type="text"
              name="website"
              autoComplete="off"
              tabIndex={-1}
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-text">{t("requestTypeLabel")}</span>
            <select
              className="select"
              name="request_type"
              value={form.request_type}
              onChange={(event) => updateField("request_type", event.target.value)}
            >
              {requestTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-text">{t("emailLabel")}</span>
            <input
              className="input"
              name="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-text">{t("messengerMtLabel")}</span>
            <input
              className="input"
              name="messenger_mt"
              placeholder={t("messengerMtPlaceholder")}
              maxLength={160}
              value={form.messenger_mt}
              onChange={(event) => updateField("messenger_mt", event.target.value)}
            />
            <span className="form-hint">{t("messengerMtHint")}</span>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-text">{t("psidLabel")}</span>
            <input
              className="input"
              name="psid"
              placeholder={t("psidPlaceholder")}
              maxLength={160}
              value={form.psid}
              onChange={(event) => updateField("psid", event.target.value)}
            />
            <span className="form-hint">{t("psidHint")}</span>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-text">{t("pageLabel")}</span>
            <input
              className="input"
              name="page"
              placeholder={t("pagePlaceholder")}
              maxLength={200}
              value={form.page}
              onChange={(event) => updateField("page", event.target.value)}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-text">{t("contestUrlLabel")}</span>
            <input
              className="input"
              name="contest_url"
              type="url"
              placeholder={t("contestUrlPlaceholder")}
              maxLength={600}
              value={form.contest_url}
              onChange={(event) => updateField("contest_url", event.target.value)}
            />
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-text">{t("notesLabel")}</span>
          <textarea
            className="textarea"
            name="notes"
            maxLength={2000}
            placeholder={t("notesPlaceholder")}
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </label>

        {error ? <div className="form-error">{error}</div> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={status === "submitting"}>
            {status === "submitting" ? t("submitting") : t("submit")}
          </button>
          <span className="text-xs text-muted">{t("responseTime")}</span>
        </div>
      </form>

      {status === "success" ? (
        <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {t("success.message")}
          <span className="mx-2 font-mono text-text">
            {requestId ?? t("success.fallback")}
          </span>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-border bg-surface-elevated px-4 py-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-text">{t("emailTemplate.title")}</div>
          <p className="text-xs text-muted">{t("emailTemplate.subtitle")}</p>
        </div>
        <textarea className="textarea text-xs" readOnly value={emailTemplate} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-secondary" onClick={handleCopy}>
            {copied ? t("emailTemplate.copied") : t("emailTemplate.copy")}
          </button>
          <a href={mailtoHref} className="btn btn-ghost">
            {t("emailTemplate.open")}
          </a>
        </div>
      </div>
    </div>
  );
}

function buildEmailTemplate(
  values: DataDeletionFormValues,
  requestId: string | null,
  requestTypeLabels: Record<RequestType, string>,
  template: {
    greeting: string;
    requestLine: string;
    closing: string;
    labels: {
      requestType: string;
      email: string;
      messengerMt: string;
      psid: string;
      page: string;
      contestUrl: string;
      notes: string;
      reference: string;
    };
  },
) {
  const lines = [
    template.greeting,
    template.requestLine,
    "",
    `${template.labels.requestType}: ${requestTypeLabels[values.request_type]}`,
    values.email ? `${template.labels.email}: ${values.email}` : "",
    values.messenger_mt ? `${template.labels.messengerMt}: ${values.messenger_mt}` : "",
    values.psid ? `${template.labels.psid}: ${values.psid}` : "",
    values.page ? `${template.labels.page}: ${values.page}` : "",
    values.contest_url ? `${template.labels.contestUrl}: ${values.contest_url}` : "",
    values.notes ? `${template.labels.notes}: ${values.notes}` : "",
    requestId ? `${template.labels.reference}: ${requestId}` : "",
    "",
    template.closing,
  ].filter(Boolean);

  return lines.join("\n");
}
