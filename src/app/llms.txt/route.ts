import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

// A plain-text brand summary for AI crawlers and answer engines, following
// the llms.txt convention (https://llmstxt.org) — built from the same
// content admins edit, so it never drifts from what's on the page.
export async function GET() {
  const content = await getSiteContent();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gottsmerch.com";

  const lines = [
    `# ${content.brandName}`,
    "",
    `> ${content.heroLead}`,
    "",
    "## What we do",
    "",
    ...content.productCategories.map(
      (category) => `- **${category.title}**: ${category.description}`,
    ),
    "",
    "## Who we serve",
    "",
    `${content.brandName} works exclusively with hospitality businesses: ${content.venueTypes.join(", ")}.`,
    "",
    "## On-site merch production",
    "",
    content.activationsLead,
    "",
    ...content.activationsStations.map(
      (station) => `- **${station.title}**: ${station.description}`,
    ),
    "",
    "## Pages",
    "",
    `- [Homepage](${siteUrl}/): products, on-site activations, process, FAQ, and quote request`,
    `- [Brands](${siteUrl}/brands): manufacturer and supplier brands ${content.brandName} carries`,
    "",
    "## Contact",
    "",
    `Quote requests: ${content.inquiryEmail}`,
  ];

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
