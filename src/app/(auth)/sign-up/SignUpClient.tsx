"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const socialProviders = [
  { id: "google", labelKey: "providers.google" },
  { id: "facebook", labelKey: "providers.facebook" },
] as const;

type SignUpClientProps = {
  initialError?: string;
};

export default function SignUpClient({ initialError }: SignUpClientProps) {
  const t = useTranslations("Auth.signUp");
  const searchParams = useSearchParams();
  const [agree, setAgree] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(initialError || "");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const nextParam = searchParams.get("next") || "";

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  const resolveError = (data: any, fallback: string) => {
    const errorMap: Record<string, string> = {
      invalid_input: t("errors.invalidInput"),
      missing_fields: t("errors.missingFields"),
      invalid_code: t("errors.invalidCode"),
      code_expired: t("errors.codeExpired"),
      code_used: t("errors.codeUsed"),
      rate_limited: t("errors.rateLimited"),
      phone_not_supported: t("errors.phoneNotSupported"),
    };
    if (data?.error && errorMap[data.error]) return errorMap[data.error];
    if (data?.message) return data.message;
    return fallback;
  };

  function guardAgreement() {
    if (agree) return true;
    setError(t("errors.agreement"));
    return false;
  }

  function onProvider(provider: (typeof socialProviders)[number]) {
    if (!guardAgreement()) return;
    setStatus("");
    setError("");
    setLoadingProvider(provider.id);
    const nextQuery = nextParam ? `?next=${encodeURIComponent(nextParam)}` : "";
    window.location.href = `/api/auth/oauth/${provider.id}${nextQuery}`;
  }

  async function requestCode() {
    if (!guardAgreement()) return;
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError(t("errors.enterEmail"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t("errors.invalidEmail"));
      return;
    }
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), accepted_terms_privacy: agree }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(resolveError(data, t("errors.sendFailed")));
        return;
      }
      setSent(true);
      setStatus(t("status.sent"));
    } catch (err: any) {
      setError(err?.message || t("errors.networkSend"));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!guardAgreement()) return;
    if (code.trim().length !== 6) {
      setError(t("errors.codeLength"));
      return;
    }
    setLoading(true);
    setError("");
    setStatus(t("status.verifying"));
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          code: code.trim(),
          accepted_terms_privacy: agree,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(resolveError(data, t("errors.verifyFailed")));
        setStatus("");
        return;
      }
      setStatus(t("status.success"));
      if (nextParam) {
        try {
          const parsed = new URL(nextParam, window.location.origin);
          if (parsed.origin === window.location.origin) {
            window.location.href = `${parsed.pathname}${parsed.search}${parsed.hash}`;
            return;
          }
        } catch {}
      }
      window.location.href = "/";
    } catch (err: any) {
      setError(err?.message || t("errors.networkVerify"));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  const canSend = identifier.trim().length > 3 && !loading;
  const canVerify = code.trim().length === 6 && !loading;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-indigo-300">MazayaGo</p>
          <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">{t("heading")}</h1>
          <p className="text-lg text-slate-300">
            {t("subheading")}
          </p>
        </section>

        <section>
          <div className="rounded-3xl bg-white/95 p-8 text-slate-900 shadow-2xl shadow-indigo-500/20 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">{t("cardLabel")}</p>
            <h2 className="mt-2 text-2xl font-semibold">{t("cardTitle")}</h2>

            <div className="mt-6 grid gap-3">
              {socialProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => onProvider(provider)}
                  disabled={!!loadingProvider || !agree}
                  className="inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex items-center gap-2">{t(provider.labelKey)}</span>
                  {loadingProvider === provider.id && <span className="text-xs text-slate-500">...</span>}
                </button>
              ))}
            </div>

            <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              {t("or")}
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-inner">
              <div>
                <label className="text-sm font-medium text-slate-600">{t("emailLabel")}</label>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {sent && (
                <div>
                  <label className="text-sm font-medium text-slate-600">{t("codeLabel")}</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-lg font-semibold tracking-[0.4em] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder={t("codePlaceholder")}
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                {!sent ? (
                  <button
                    onClick={requestCode}
                    disabled={!canSend || !agree}
                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {loading ? t("sending") : t("sendCode")}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={verifyCode}
                      disabled={!canVerify || !agree}
                      className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {loading ? t("verifying") : t("verify")}
                    </button>
                    <button
                      onClick={requestCode}
                      disabled={loading || !agree}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-slate-300"
                    >
                      {t("resend")}
                    </button>
                  </>
                )}
              </div>
            </div>

            <label className="mt-6 flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                required
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                أوافق على{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  الشروط
                </Link>{" "}
                و{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  سياسة الخصوصية
                </Link>
              </span>
            </label>

            {(status || error) && (
              <p className={`mt-4 text-sm ${error ? "text-rose-600" : "text-emerald-600"}`} aria-live="polite">
                {error || status}
              </p>
            )}

            <p className="mt-8 text-center text-sm text-slate-500">
              {t("footerPrompt")}{" "}
              <Link
                href={nextParam ? `/sign-in?next=${encodeURIComponent(nextParam)}` : "/sign-in"}
                className="font-semibold text-indigo-600"
              >
                {t("footerAction")}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
