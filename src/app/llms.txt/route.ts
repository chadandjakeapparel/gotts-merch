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
    ...content.productCategories.map(
      (category) => `- [${category.title}](${siteUrl}/products/${category.key}): ${category.description}`,
    ),
    `- [Charity Golf Tournaments](${siteUrl}/charity-golf-tournaments): custom golf balls, apparel, gift bags, giveaways and towels for charity and corporate golf tournaments`,
    `- [Brands](${siteUrl}/brands): manufacturer and supplier brands ${content.brandName} carries`,
    `- [Custom Designer](${siteUrl}/custom-designer): a free tool for customers to design their own apparel online and save a link to it`,
    `- [Get to Know Us](${siteUrl}/get-to-know-us): company policies and information`,
    ...content.documents.map((doc) => `  - [${doc.title}](${siteUrl}/get-to-know-us/${doc.slug}): ${doc.description}`),
    `- [Blog](${siteUrl}/blog): guides on quantities, timelines and what to order`,
    ...content.blogPosts
      .filter((post) => post.slug)
      .map((post) => `  - [${post.title}](${siteUrl}/blog/${post.slug}): ${post.excerpt}`),
    "",
    "## Contact",
    "",
    `Quote requests: ${content.inquiryEmail}`,
  ];

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
