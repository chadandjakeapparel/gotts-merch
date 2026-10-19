import { list, put } from "@vercel/blob";
import { defaultContent, type SiteContent } from "@/content/site-content";

const CONTENT_PATHNAME = "site-content.json";

export async function getSiteContent(): Promise<SiteContent> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return defaultContent;

  try {
    const { blobs } = await list({ prefix: CONTENT_PATHNAME, limit: 1 });
    const blob = blobs.find((entry) => entry.pathname === CONTENT_PATHNAME);
    if (!blob) return defaultContent;

    const response = await fetch(blob.url, { cache: "no-store" });
    if (!response.ok) return defaultContent;

    const data = (await response.json()) as Partial<SiteContent>;
    return { ...defaultContent, ...data };
  } catch {
    return defaultContent;
  }
}

export async function saveSiteContent(content: SiteContent): Promise<void> {
  await put(CONTENT_PATHNAME, JSON.stringify(content, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
