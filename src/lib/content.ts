import { cache } from "react";
import { list, put } from "@vercel/blob";
import {
  defaultContent,
  type SiteContent,
  type ActivationStation,
  type BlogPost,
  type BrandPartner,
  type Differentiator,
  type DocumentItem,
  type FaqItem,
  type GalleryImage,
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

// For variable-length, admin-managed lists (add/remove rather than a fixed
// set of items): normalizes each saved item against a blank shape instead
// of a same-length defaults array, so entries can be added or removed
// without ever producing an incomplete item.
function normalizeArray<T extends Record<string, unknown>>(saved: unknown, blank: T): T[] {
  if (!Array.isArray(saved)) return [];
  return saved.map((item) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const next = { ...blank };
    for (const key of Object.keys(blank)) {
      if (typeof record[key] === typeof blank[key]) {
        (next as Record<string, unknown>)[key] = record[key];
      }
    }
    return next;
  });
}

// Memoized per-request — layout, page, and metadata each call this for the
// same render, and this avoids hitting Blob storage more than once per request.
export const getSiteContent = cache(async (): Promise<SiteContent> => {
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
      activationsStations: mergeArray<ActivationStation>(
        data.activationsStations,
        defaultContent.activationsStations,
      ),
      brandPartners: Array.isArray(data.brandPartners)
        ? normalizeArray<BrandPartner>(data.brandPartners, {
            name: "",
            description: "",
            logoUrl: "",
          })
        : defaultContent.brandPartners,
      faqItems: Array.isArray(data.faqItems)
        ? normalizeArray<FaqItem>(data.faqItems, { question: "", answer: "" })
        : defaultContent.faqItems,
      documents: Array.isArray(data.documents)
        ? normalizeArray<DocumentItem>(data.documents, { slug: "", title: "", description: "", body: "" })
        : defaultContent.documents,
      golfGallery: Array.isArray(data.golfGallery)
        ? normalizeArray<GalleryImage>(data.golfGallery, { url: "", caption: "" })
        : defaultContent.golfGallery,
      blogPosts: Array.isArray(data.blogPosts)
        ? normalizeArray<BlogPost>(data.blogPosts, {
            slug: "",
            title: "",
            excerpt: "",
            coverImageUrl: "",
            publishedAt: "",
            body: "",
          })
        : defaultContent.blogPosts,
    };
  } catch {
    return defaultContent;
  }
});

export async function saveSiteContent(content: SiteContent): Promise<void> {
  await put(CONTENT_PATHNAME, JSON.stringify(content, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
