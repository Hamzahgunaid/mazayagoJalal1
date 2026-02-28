import { getTranslations } from "next-intl/server";
import PolicyLayout from "../_components/PolicyLayout";
import { PolicySection } from "../_components/PolicySection";
import { PolicyCallout } from "../_components/PolicyCallout";
import { buildPolicyJsonLd, buildPolicyMetadata } from "../_components/policySeo";

const PAGE_PATH = "/contact";

export async function generateMetadata() {
  const t = await getTranslations("PoliciesContact");
  return buildPolicyMetadata({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
  });
}

export default async function ContactPage() {
  const t = await getTranslations("PoliciesContact");
  const tCommon = await getTranslations("PoliciesCommon");
  const supportEmail = process.env.SUPPORT_EMAIL || "support@mazayago.com";
  const jsonLd = buildPolicyJsonLd({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
    supportEmail,
  });

  const toc = [
    { id: "channels", label: t("toc.channels") },
    { id: "hours", label: t("toc.hours") },
    { id: "response", label: t("toc.response") },
    { id: "compliance", label: t("toc.compliance") },
    { id: "business", label: t("toc.business") },
  ];

  const channelsParagraphs = t.raw("channels.paragraphs") as string[];
  const hoursParagraphs = t.raw("hours.paragraphs") as string[];
  const responseParagraphs = t.raw("response.paragraphs") as string[];
  const complianceParagraphs = t.raw("compliance.paragraphs") as string[];
  const businessParagraphs = t.raw("business.paragraphs") as string[];

  return (
    <PolicyLayout
      title={t("title")}
      subtitle={t("subtitle")}
      lastUpdated={tCommon("lastUpdatedDate")}
      lastUpdatedLabel={tCommon("lastUpdatedLabel")}
      toc={toc}
      tocTitle={tCommon("tocTitle")}
      currentPath={PAGE_PATH}
      badges={[t("badges.primary")]}
      footerNote={t("footerNote")}
      jsonLd={jsonLd}
    >
      <PolicySection id="channels" title={t("channels.title")}>
        {channelsParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a className="btn btn-primary" href={`mailto:${supportEmail}`}>
            {t("channels.cta")}
          </a>
          <span className="text-sm text-muted">{supportEmail}</span>
        </div>
        <PolicyCallout title={t("channels.calloutTitle")} variant="neutral">
          <p>{t("channels.calloutBody")}</p>
        </PolicyCallout>
      </PolicySection>

      <PolicySection id="hours" title={t("hours.title")}>
        {hoursParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="response" title={t("response.title")}>
        {responseParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="compliance" title={t("compliance.title")}>
        {complianceParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a className="btn btn-secondary" href="/policies">
            {t("compliance.cta")}
          </a>
        </div>
      </PolicySection>

      <PolicySection id="business" title={t("business.title")}>
        {businessParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>
    </PolicyLayout>
  );
}
