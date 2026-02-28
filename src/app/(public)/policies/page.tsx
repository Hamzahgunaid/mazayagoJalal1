import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PolicyLayout from "../_components/PolicyLayout";
import { PolicySection } from "../_components/PolicySection";
import { PolicyCallout } from "../_components/PolicyCallout";
import { POLICY_LINKS, SITE_URL } from "../_components/policyData";
import { buildPolicyJsonLd, buildPolicyMetadata } from "../_components/policySeo";

const PAGE_PATH = "/policies";

export async function generateMetadata() {
  const t = await getTranslations("PoliciesHub");
  return buildPolicyMetadata({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
  });
}

export default async function PoliciesHubPage() {
  const t = await getTranslations("PoliciesHub");
  const tCommon = await getTranslations("PoliciesCommon");
  const tLinks = await getTranslations("PoliciesLinks");
  const supportEmail = process.env.SUPPORT_EMAIL || "support@mazayago.com";
  const jsonLd = buildPolicyJsonLd({
    title: t("title"),
    description: t("description"),
    path: PAGE_PATH,
    supportEmail,
  });

  const toc = [
    { id: "overview", label: t("toc.overview") },
    { id: "links", label: t("toc.links") },
    { id: "meta", label: t("toc.meta") },
    { id: "support", label: t("toc.support") },
  ];

  const overviewParagraphs = t.raw("overview.paragraphs") as string[];
  const metaParagraphs = t.raw("meta.paragraphs") as string[];
  const supportParagraphs = t.raw("support.paragraphs") as string[];

  const policyCards = POLICY_LINKS.filter((link) => link.key !== "hub").map((link) => ({
    ...link,
    title: tLinks(`${link.key}.title`),
    description: tLinks(`${link.key}.description`),
  }));

  return (
    <PolicyLayout
      title={t("title")}
      subtitle={t("subtitle")}
      lastUpdated={tCommon("lastUpdatedDate")}
      lastUpdatedLabel={tCommon("lastUpdatedLabel")}
      toc={toc}
      tocTitle={tCommon("tocTitle")}
      currentPath={PAGE_PATH}
      badges={[t("badges.public"), t("badges.compliance")]}
      footerNote={t("footerNote")}
      jsonLd={jsonLd}
    >
      <PolicySection id="overview" title={t("overview.title")}>
        {overviewParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <PolicyCallout title={t("overview.calloutTitle")} variant="neutral">
          <p>{t("overview.calloutBody")}</p>
        </PolicyCallout>
      </PolicySection>

      <PolicySection id="links" title={t("links.title")}>
        <div className="grid gap-4 md:grid-cols-2">
          {policyCards.map((policy, index) => (
            <Link
              key={policy.href}
              href={policy.href}
              className="group card flex h-full flex-col justify-between gap-4 transition hover:-translate-y-1 hover:shadow-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-text">{policy.title}</div>
                  <p className="mt-2 text-sm text-muted">{policy.description}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="text-lg font-semibold">{index + 1}</span>
                </span>
              </div>
              <div className="text-sm font-semibold text-secondary">
                {t("links.cta")}
                <span className="ms-2 inline-block transition group-hover:translate-x-1">{">"}</span>
              </div>
            </Link>
          ))}
        </div>
      </PolicySection>

      <PolicySection id="meta" title={t("meta.title")}>
        {metaParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <ul className="list-disc space-y-2 pr-5 text-sm text-muted">
          {policyCards.map((policy) => (
            <li key={policy.href}>
              <span className="font-medium text-text">{policy.title}:</span>{" "}
              <a className="text-secondary hover:underline" href={`${SITE_URL}${policy.href}`}>
                {SITE_URL}
                {policy.href}
              </a>
            </li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection id="support" title={t("support.title")}>
        {supportParagraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a className="btn btn-primary" href={`mailto:${supportEmail}`}>
            {t("support.cta")}
          </a>
          <span className="text-sm text-muted">{supportEmail}</span>
        </div>
      </PolicySection>
    </PolicyLayout>
  );
}
