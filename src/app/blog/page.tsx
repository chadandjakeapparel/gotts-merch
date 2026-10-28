import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `${content.blogTitle} | ${content.brandName}`,
    description: content.blogLead.replaceAll("{{brandName}}", content.brandName),
    alternates: { canonical: "/blog" },
  };
}

function fmtDate(value: string) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function BlogIndexPage() {
  const content = await getSiteContent();
  const lead = content.blogLead.replaceAll("{{brandName}}", content.brandName);
  const posts = [...content.blogPosts]
    .filter((post) => post.slug && post.title && post.published)
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

  return (
    <section className="gm-doc-page">
      <div className="gm-container">
        <div className="gm-section-heading">
          <p className="gm-eyebrow">{content.blogEyebrow}</p>
          <h1>{content.blogTitle}</h1>
          <p className="gm-brands__lead">{lead}</p>
        </div>

        {posts.length ? (
          <div className="gm-doc-grid">
            {posts.map((post) => (
              <Link className="gm-doc-card gm-blog-card" href={`/blog/${post.slug}`} key={post.slug}>
                {post.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- blog index thumbnail
                  <img alt="" src={post.coverImageUrl} />
                ) : null}
                <span className="gm-blog-card__meta">{fmtDate(post.publishedAt)}</span>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="gm-blog-empty">
            <h2>Check back for updates!</h2>
            <p>We&rsquo;re working on our first post. In the meantime, browse our products or request a quote.</p>
          </div>
        )}
      </div>
    </section>
  );
}
