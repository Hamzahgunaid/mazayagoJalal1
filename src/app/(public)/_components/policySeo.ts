import type { Metadata } from "next";
import { POLICY_LAST_UPDATED_ISO, SITE_NAME, SITE_URL } from "./policyData";

type PolicySeoInput = {
  title: string;
  description: string;
  path: string;
};

type PolicyJsonLdInput = PolicySeoInput & {
  lastUpdated?: string;
  supportEmail?: string;
};

export function buildPolicyMetadata({ title, description, path }: PolicySeoInput): Metadata {
  const pageUrl = `${SITE_URL}${path}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: pageUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url: pageUrl,
      siteName: SITE_NAME,
      type: "website",
      locale: "ar",
    },
  };
}

export function buildPolicyJsonLd({
  title,
  description,
  path,
  lastUpdated = POLICY_LAST_UPDATED_ISO,
  supportEmail,
}: PolicyJsonLdInput) {
  const pageUrl = `${SITE_URL}${path}`;
  const organization: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  };

  if (supportEmail) {
    organization.contactPoint = {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: supportEmail,
    };
  }

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title} | ${SITE_NAME}`,
    url: pageUrl,
    description,
    inLanguage: "ar",
    dateModified: lastUpdated,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return [organization, webPage];
}
