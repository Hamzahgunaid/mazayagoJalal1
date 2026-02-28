import { getTranslations } from "next-intl/server";
import PolicyLayout from "../_components/PolicyLayout";
import { PolicySection } from "../_components/PolicySection";
import { buildPolicyJsonLd, buildPolicyMetadata } from "../_components/policySeo";

const PAGE_PATH = "/cookie-policy";

export async function generateMetadata() {
  const t = await getTranslations("PoliciesCookies");
  return buildPolicyMetadata({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
  });
}

export default async function CookiePolicyPage() {
  const t = await getTranslations("PoliciesCookies");
  const tCommon = await getTranslations("PoliciesCommon");
  const supportEmail = process.env.SUPPORT_EMAIL || "support@mazayago.com";
  const jsonLd = buildPolicyJsonLd({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
    supportEmail,
  });

  const toc = [
    { id: "what", label: t("toc.what") },
    { id: "categories", label: t("toc.categories") },
    { id: "duration", label: t("toc.duration") },
    { id: "management", label: t("toc.management") },
    { id: "thirdparty", label: t("toc.thirdparty") },
    { id: "updates", label: t("toc.updates") },
    { id: "contact", label: t("toc.contact") },
  ];

  const whatParagraphs = t.raw("what.paragraphs") as string[];
  const categoriesItems = t.raw("categories.items") as string[];
  const durationParagraphs = t.raw("duration.paragraphs") as string[];
  const managementParagraphs = t.raw("management.paragraphs") as string[];
  const thirdpartyParagraphs = t.raw("thirdparty.paragraphs") as string[];
  const updatesParagraphs = t.raw("updates.paragraphs") as string[];
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
      <PolicySection id="what" title={t("what.title")}>
        {whatParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="categories" title={t("categories.title")}>
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {categoriesItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection id="duration" title={t("duration.title")}>
        {durationParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="management" title={t("management.title")}>
        {managementParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="thirdparty" title={t("thirdparty.title")}>
        {thirdpartyParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="updates" title={t("updates.title")}>
        {updatesParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
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
