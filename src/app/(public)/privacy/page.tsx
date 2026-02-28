import { getTranslations } from "next-intl/server";
import PolicyLayout from "../_components/PolicyLayout";
import { PolicySection } from "../_components/PolicySection";
import { PolicyCallout } from "../_components/PolicyCallout";
import { buildPolicyJsonLd, buildPolicyMetadata } from "../_components/policySeo";

const PAGE_PATH = "/privacy";

export async function generateMetadata() {
  const t = await getTranslations("PoliciesPrivacy");
  return buildPolicyMetadata({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
  });
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("PoliciesPrivacy");
  const tCommon = await getTranslations("PoliciesCommon");
  const supportEmail = process.env.SUPPORT_EMAIL || "support@mazayago.com";
  const jsonLd = buildPolicyJsonLd({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
    supportEmail,
  });

  const toc = [
    { id: "scope", label: t("toc.scope") },
    { id: "collection", label: t("toc.collection") },
    { id: "sources", label: t("toc.sources") },
    { id: "usage", label: t("toc.usage") },
    { id: "sharing", label: t("toc.sharing") },
    { id: "integrations", label: t("toc.integrations") },
    { id: "retention", label: t("toc.retention") },
    { id: "rights", label: t("toc.rights") },
    { id: "security", label: t("toc.security") },
    { id: "children", label: t("toc.children") },
    { id: "updates", label: t("toc.updates") },
  ];

  const scopeParagraphs = t.raw("scope.paragraphs") as string[];
  const collectionParagraphs = t.raw("collection.paragraphs") as string[];
  const collectionItems = t.raw("collection.items") as string[];
  const sourcesParagraphs = t.raw("sources.paragraphs") as string[];
  const usageItems = t.raw("usage.items") as string[];
  const sharingParagraphs = t.raw("sharing.paragraphs") as string[];
  const sharingItems = t.raw("sharing.items") as string[];
  const integrationsParagraphs = t.raw("integrations.paragraphs") as string[];
  const retentionParagraphs = t.raw("retention.paragraphs") as string[];
  const retentionItems = t.raw("retention.items") as string[];
  const rightsParagraphs = t.raw("rights.paragraphs") as string[];
  const rightsItems = t.raw("rights.items") as string[];
  const securityItems = t.raw("security.items") as string[];
  const childrenParagraphs = t.raw("children.paragraphs") as string[];
  const updatesParagraphs = t.raw("updates.paragraphs") as string[];

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
      <PolicySection id="scope" title={t("scope.title")}>
        {scopeParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="collection" title={t("collection.title")}>
        {collectionParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {collectionItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection id="sources" title={t("sources.title")}>
        {sourcesParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="usage" title={t("usage.title")}>
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {usageItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection id="sharing" title={t("sharing.title")}>
        {sharingParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {sharingItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        <PolicyCallout title={t("sharing.noteTitle")} variant="info">
          <p>{t("sharing.note")}</p>
        </PolicyCallout>
      </PolicySection>

      <PolicySection id="integrations" title={t("integrations.title")}>
        {integrationsParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="retention" title={t("retention.title")}>
        {retentionParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {retentionItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        <p>{t("retention.note")}</p>
      </PolicySection>

      <PolicySection id="rights" title={t("rights.title")}>
        {rightsParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {rightsItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a className="btn btn-primary" href="/data-deletion">
            {t("rights.cta")}
          </a>
        </div>
      </PolicySection>

      <PolicySection id="security" title={t("security.title")}>
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {securityItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection id="children" title={t("children.title")}>
        {childrenParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="updates" title={t("updates.title")}>
        {updatesParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a className="btn btn-secondary" href={`mailto:${supportEmail}`}>
            {t("updates.cta")}
          </a>
          <span className="text-sm text-muted">{supportEmail}</span>
        </div>
      </PolicySection>
    </PolicyLayout>
  );
}
