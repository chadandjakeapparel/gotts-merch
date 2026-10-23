import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://gottsmerch.com";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/portal", "/jobs", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
