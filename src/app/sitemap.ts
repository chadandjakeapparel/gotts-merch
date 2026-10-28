import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://gottsmerch.com";
  const content = await getSiteContent();
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...content.productCategories.map((category) => ({
      url: `${base}/products/${category.key}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${base}/charity-golf-tournaments`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/brands`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/custom-designer`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/get-to-know-us`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...content.documents.map((doc) => ({
      url: `${base}/get-to-know-us/${doc.slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...content.blogPosts
      .filter((post) => post.slug && post.published)
      .map((post) => ({
        url: `${base}/blog/${post.slug}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
  ];
}
