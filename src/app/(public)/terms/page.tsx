import { getTranslations } from "next-intl/server";
import PolicyLayout from "../_components/PolicyLayout";
import { PolicySection } from "../_components/PolicySection";
import { buildPolicyJsonLd, buildPolicyMetadata } from "../_components/policySeo";

const PAGE_PATH = "/terms";

export async function generateMetadata() {
  const t = await getTranslations("PoliciesTerms");
  return buildPolicyMetadata({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
  });
}

export default async function TermsPage() {
  const t = await getTranslations("PoliciesTerms");
  const tCommon = await getTranslations("PoliciesCommon");
  const supportEmail = process.env.SUPPORT_EMAIL || "support@mazayago.com";
  const jsonLd = buildPolicyJsonLd({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
    supportEmail,
  });

  const toc = [
    { id: "acceptance", label: t("toc.acceptance") },
    { id: "eligibility", label: t("toc.eligibility") },
    { id: "account", label: t("toc.account") },
    { id: "acceptable", label: t("toc.acceptable") },
    { id: "contests", label: t("toc.contests") },
    { id: "prizes", label: t("toc.prizes") },
    { id: "ip", label: t("toc.ip") },
    { id: "thirdparty", label: t("toc.thirdparty") },
    { id: "liability", label: t("toc.liability") },
    { id: "termination", label: t("toc.termination") },
    { id: "changes", label: t("toc.changes") },
    { id: "contact", label: t("toc.contact") },
  ];

  const acceptanceParagraphs = t.raw("acceptance.paragraphs") as string[];
  const eligibilityItems = t.raw("eligibility.items") as string[];
  const accountParagraphs = t.raw("account.paragraphs") as string[];
  const acceptableItems = t.raw("acceptable.items") as string[];
  const contestsParagraphs = t.raw("contests.paragraphs") as string[];
  const prizesItems = t.raw("prizes.items") as string[];
  const ipParagraphs = t.raw("ip.paragraphs") as string[];
  const thirdpartyParagraphs = t.raw("thirdparty.paragraphs") as string[];
  const liabilityParagraphs = t.raw("liability.paragraphs") as string[];
  const terminationParagraphs = t.raw("termination.paragraphs") as string[];
  const changesParagraphs = t.raw("changes.paragraphs") as string[];
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
      <PolicySection id="acceptance" title={t("acceptance.title")}>
        {acceptanceParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="eligibility" title={t("eligibility.title")}>
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {eligibilityItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection id="account" title={t("account.title")}>
        {accountParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="acceptable" title={t("acceptable.title")}>
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {acceptableItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection id="contests" title={t("contests.title")}>
        {contestsParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="prizes" title={t("prizes.title")}>
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {prizesItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection id="ip" title={t("ip.title")}>
        {ipParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="thirdparty" title={t("thirdparty.title")}>
        {thirdpartyParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="liability" title={t("liability.title")}>
        {liabilityParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="termination" title={t("termination.title")}>
        {terminationParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </PolicySection>

      <PolicySection id="changes" title={t("changes.title")}>
        {changesParagraphs.map((text, index) => (
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
