import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocBody } from "@/components/doc-body";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function loadPost(slug: string) {
  const content = await getSiteContent();
  const post = content.blogPosts.find((p) => p.slug === slug) || null;
  return { content, post };
}

function fmtDate(value: string) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { content, post } = await loadPost((await params).slug);
  if (!post) return { title: `Not found | ${content.brandName}` };
  return {
    title: `${post.title} | ${content.brandName}`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: post.coverImageUrl
      ? { title: post.title, description: post.excerpt, images: [post.coverImageUrl], type: "article" }
      : undefined,
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { content, post } = await loadPost((await params).slug);
  if (!post) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gottsmerch.com";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${siteUrl}/blog/${post.slug}` },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt || undefined,
    dateModified: post.publishedAt || undefined,
    image: post.coverImageUrl || undefined,
    url: `${siteUrl}/blog/${post.slug}`,
    author: { "@type": "Organization", name: content.brandName },
    publisher: { "@type": "Organization", name: content.brandName },
  };

  return (
    <section className="gm-doc-page">
      <div className="gm-container">
        <nav aria-label="Breadcrumb" className="gm-breadcrumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/blog">Blog</Link>
          <span aria-hidden="true">/</span>
          <span>{post.title}</span>
        </nav>

        <div className="gm-section-heading">
          <p className="gm-eyebrow">{content.blogEyebrow}</p>
          <h1>{post.title}</h1>
          {post.publishedAt ? <p className="gm-doc__updated">{fmtDate(post.publishedAt)}</p> : null}
        </div>

        {post.coverImageUrl ? (
          <div className="gm-doc__cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- blog post cover photo */}
            <img alt="" src={post.coverImageUrl} />
          </div>
        ) : null}

        <div className="gm-doc__body">
          <DocBody body={post.body} brandName={content.brandName} inquiryEmail={content.inquiryEmail} />
        </div>

        <div className="gm-blog-cta">
          <p>Ready to put this into action?</p>
          <Link className="gm-btn gm-btn--primary" href="/#quote">
            Get a Quote
          </Link>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        type="application/ld+json"
      />
    </section>
  );
}
