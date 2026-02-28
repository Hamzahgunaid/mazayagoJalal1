// src/lib/url.ts
export function safeUrl(u?: string | null): string | null {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return s; // بروتوكولات أخرى
  return `https://${s}`;
}

export function whatsappHref(val?: string | null): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s; // رابط wa.me جاهز
  const num = s.replace(/\D/g, "");
  if (!num) return null;
  return `https://wa.me/${num}`;
}

export function isNonEmpty(x: any): x is string {
  return typeof x === "string" && x.trim() !== "";
}

export function isLikelyEmail(x?: string | null): boolean {
  if (!x) return false;
  const s = x.trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
