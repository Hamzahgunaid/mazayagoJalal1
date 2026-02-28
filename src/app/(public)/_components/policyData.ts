export const SITE_URL = "https://www.mazayago.com";
export const SITE_NAME = "MazayaGo";

export const POLICY_LAST_UPDATED = "10-08-2025";
export const POLICY_LAST_UPDATED_ISO = "2025-08-10";

export type PolicyLinkKey = "hub" | "privacy" | "terms" | "deletion" | "cookies" | "contact";

export type PolicyLink = {
  href: string;
  key: PolicyLinkKey;
};

export const POLICY_LINKS: PolicyLink[] = [
  { href: "/policies", key: "hub" },
  { href: "/privacy", key: "privacy" },
  { href: "/terms", key: "terms" },
  { href: "/data-deletion", key: "deletion" },
  { href: "/cookie-policy", key: "cookies" },
  { href: "/contact", key: "contact" },
];
