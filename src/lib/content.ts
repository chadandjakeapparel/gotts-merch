import { list, put } from "@vercel/blob";
import {
  defaultContent,
  type SiteContent,
  type Differentiator,
  type ProcessStep,
  type ProductCategory,
  type TeamMember,
} from "@/content/site-content";

const CONTENT_PATHNAME = "site-content.json";

// Backfills any field missing from an older saved shape (e.g. a
// teamMember saved before `photoUrl` existed) using the matching default
// item by index, so a partial/outdated save never breaks validation.
function mergeArray<T>(saved: unknown, defaults: T[]): T[] {
  if (!Array.isArray(saved)) return defaults;
  return defaults.map((defaultItem, index) => ({
    ...defaultItem,
    ...(saved[index] && typeof saved[index] === "object" ? saved[index] : {}),
  }));
}

export async function getSiteContent(): Promise<SiteContent> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return defaultContent;

  try {
    const { blobs } = await list({ prefix: CONTENT_PATHNAME, limit: 1 });
    const blob = blobs.find((entry) => entry.pathname === CONTENT_PATHNAME);
    if (!blob) return defaultContent;

    const response = await fetch(blob.url, { cache: "no-store" });
    if (!response.ok) return defaultContent;

    const data = (await response.json()) as Partial<SiteContent>;
    return {
      ...defaultContent,
      ...data,
      productCategories: mergeArray<ProductCategory>(
        data.productCategories,
        defaultContent.productCategories,
      ),
      differentiators: mergeArray<Differentiator>(
        data.differentiators,
        defaultContent.differentiators,
      ),
      processSteps: mergeArray<ProcessStep>(data.processSteps, defaultContent.processSteps),
      teamMembers: mergeArray<TeamMember>(data.teamMembers, defaultContent.teamMembers),
    };
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
