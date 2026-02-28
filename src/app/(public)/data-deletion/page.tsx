import { getTranslations } from "next-intl/server";
import PolicyLayout from "../_components/PolicyLayout";
import { PolicySection } from "../_components/PolicySection";
import { PolicyCallout } from "../_components/PolicyCallout";
import { DataDeletionForm } from "../_components/DataDeletionForm";
import { buildPolicyJsonLd, buildPolicyMetadata } from "../_components/policySeo";

const PAGE_PATH = "/data-deletion";

export async function generateMetadata() {
  const t = await getTranslations("PoliciesDeletion");
  return buildPolicyMetadata({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
  });
}

export default async function DataDeletionPage() {
  const t = await getTranslations("PoliciesDeletion");
  const tCommon = await getTranslations("PoliciesCommon");
  const supportEmail = process.env.SUPPORT_EMAIL || "support@mazayago.com";
  const jsonLd = buildPolicyJsonLd({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
    supportEmail,
  });

  const toc = [
    { id: "overview", label: t("toc.overview") },
    { id: "covered", label: t("toc.covered") },
    { id: "identifiers", label: t("toc.identifiers") },
    { id: "verification", label: t("toc.verification") },
    { id: "form", label: t("toc.form") },
    { id: "timeline", label: t("toc.timeline") },
    { id: "outcomes", label: t("toc.outcomes") },
    { id: "limitations", label: t("toc.limitations") },
    { id: "contact", label: t("toc.contact") },
  ];

  const overviewParagraphs = t.raw("overview.paragraphs") as string[];
  const coveredItems = t.raw("covered.items") as string[];
  const identifiersParagraphs = t.raw("identifiers.paragraphs") as string[];
  const identifiersItems = t.raw("identifiers.items") as string[];
  const verificationParagraphs = t.raw("verification.paragraphs") as string[];
  const timelineParagraphs = t.raw("timeline.paragraphs") as string[];
  const outcomesParagraphs = t.raw("outcomes.paragraphs") as string[];
  const limitationsItems = t.raw("limitations.items") as string[];
  const contactParagraphs = t.raw("contact.paragraphs") as string[];

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
      <PolicySection id="overview" title={t("overview.title")}>
        {overviewParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <PolicyCallout title={t("overview.calloutTitle")} variant="info">
          <p>{t("overview.calloutBody")}</p>
        </PolicyCallout>
      </PolicySection>

      <PolicySection id="covered" title={t("covered.title")}>
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {coveredItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection id="identifiers" title={t("identifiers.title")}>
        {identifiersParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {identifiersItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        <PolicyCallout title={t("identifiers.noteTitle")} variant="neutral">
          <p>{t("identifiers.noteBody")}</p>
        </PolicyCallout>
      </PolicySection>

      <PolicySection id="verification" title={t("verification.title")}>
        {verificationParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="form" title={t("requestForm.title")}>
        <DataDeletionForm supportEmail={supportEmail} />
      </PolicySection>

      <PolicySection id="timeline" title={t("timeline.title")}>
        {timelineParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="outcomes" title={t("outcomes.title")}>
        {outcomesParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="limitations" title={t("limitations.title")}>
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {limitationsItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection id="contact" title={t("contact.title")}>
        {contactParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a className="btn btn-secondary" href={`mailto:${supportEmail}`}>
            {t("contact.cta")}
          </a>
          <span className="text-sm text-muted">{supportEmail}</span>
        </div>
      </PolicySection>
    </PolicyLayout>
  );
}
