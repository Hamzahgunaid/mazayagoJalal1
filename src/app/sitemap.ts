import type { MetadataRoute } from "next";
import { POLICY_LAST_UPDATED_ISO, SITE_URL } from "./(public)/_components/policyData";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = POLICY_LAST_UPDATED_ISO;
  const policyPaths = [
    "/policies",
    "/privacy",
    "/terms",
    "/data-deletion",
    "/cookie-policy",
    "/contact",
  ];

  return policyPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "/policies" ? 0.7 : 0.6,
  }));
}
