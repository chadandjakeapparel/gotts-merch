import type { BlogPost } from "@/content/site-content";
import { getSiteContent, saveSiteContent } from "@/lib/content";
import { handle, readJson, text } from "@/lib/portal/http";

function toBlogPost(value: unknown): BlogPost {
  const b = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    slug: text(b.slug, 200),
    title: text(b.title, 200),
    excerpt: text(b.excerpt, 500),
    coverImageUrl: text(b.coverImageUrl, 500),
    publishedAt: text(b.publishedAt, 20),
    body: text(b.body, 20000),
    published: Boolean(b.published),
  };
}

export async function GET(request: Request) {
  return handle(request, { staff: true, area: "blog" }, async () => {
    const content = await getSiteContent();
    return {
      blogEyebrow: content.blogEyebrow,
      blogTitle: content.blogTitle,
      blogLead: content.blogLead,
      blogPosts: content.blogPosts,
    };
  });
}

/** Merges into a freshly-read copy of the site content, so this never clobbers unrelated sections someone else saved in the meantime. */
export async function PATCH(request: Request) {
  return handle(request, { staff: true, area: "blog" }, async () => {
    const body = await readJson(request);
    const blogPosts = Array.isArray(body.blogPosts) ? body.blogPosts.map(toBlogPost) : [];
    const current = await getSiteContent();
    await saveSiteContent({
      ...current,
      blogEyebrow: text(body.blogEyebrow, 200),
      blogTitle: text(body.blogTitle, 200),
      blogLead: text(body.blogLead, 1000),
      blogPosts,
    });
    return {};
  });
}
