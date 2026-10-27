import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon } from "@/components/icons";
import { InquiryForm } from "@/components/inquiry-form";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { categoryIcons } from "@/lib/category-icons";
import { getSiteContent } from "@/lib/content";
import { getQuoteSection } from "@/lib/portal/quote-section";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string }> };

async function loadCategory(key: string) {
  const content = await getSiteContent();
  const category = content.productCategories.find((c) => c.key === key) || null;
  return { content, category };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { content, category } = await loadCategory((await params).key);
  if (!category) return { title: `Not found | ${content.brandName}` };
  return {
    title: `${category.title} for Restaurants, Hotels & Bars | ${content.brandName}`,
    description: category.description,
    alternates: { canonical: `/products/${category.key}` },
  };
}

export default async function ProductCategoryPage({ params }: Params) {
  const { content, category } = await loadCategory((await params).key);
  if (!category) notFound();

  const quoteSection = await getQuoteSection();
  const Icon = categoryIcons[category.key as keyof typeof categoryIcons];
  const otherCategories = content.productCategories.filter((c) => c.key !== category.key);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gottsmerch.com";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Products", item: `${siteUrl}/#products` },
      { "@type": "ListItem", position: 3, name: category.title, item: `${siteUrl}/products/${category.key}` },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div id="top">
      <Nav
        brandName={content.brandName}
        logoUrl={content.logoUrl}
        productCategories={content.productCategories}
        shopUrl={content.shopUrl}
      />

      <main>
        <section className="gm-products gm-products--page">
          <div className="gm-container">
            <nav aria-label="Breadcrumb" className="gm-breadcrumbs">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/#products">Products</Link>
              <span aria-hidden="true">/</span>
              <span>{category.title}</span>
            </nav>

            <div className="gm-category-intro">
              <div className="gm-category-intro__body">
                <p className="gm-eyebrow">Promotional products</p>
                <h1>{category.title} for restaurants, hotels, bars &amp; cafés</h1>
                <p>{category.description}</p>
                <p>{category.longBody}</p>
                <div className="gm-hero__actions">
                  <a className="gm-btn gm-btn--primary" href="#quote">
                    Get a Quote
                  </a>
                  <Link className="gm-btn gm-btn--ghost" href="/brands">
                    See the brands we carry
                  </Link>
                </div>
              </div>
              <div className="gm-category-photo">
                {category.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- category page hero photo
                  <img alt={category.title} src={category.imageUrl} />
                ) : (
                  <div className="gm-category-photo--icon">
                    <Icon size={72} />
                  </div>
                )}
              </div>
            </div>

            <div className="gm-section-heading">
              <p className="gm-eyebrow">What&rsquo;s included</p>
              <h2>Popular {category.title.toLowerCase()} orders</h2>
            </div>
            <ul className="gm-retail__list">
              {category.items.map((item) => (
                <li key={item}>
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="gm-why" id="why-us">
          <div className="gm-container">
            <div className="gm-section-heading gm-section-heading--light">
              <p className="gm-eyebrow">{content.whyEyebrow}</p>
              <h2>{content.whyTitle}</h2>
            </div>
            <div className="gm-why__grid">
              {content.differentiators.map((item) => (
                <div className="gm-why__item" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="gm-process" id="process">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">{content.processEyebrow}</p>
              <h2>{content.processTitle}</h2>
            </div>
            <div className="gm-process__grid">
              {content.processSteps.map((step) => (
                <div className="gm-process__step" key={step.number}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="gm-faq" id="faq">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">{content.faqEyebrow}</p>
              <h2>{content.faqTitle}</h2>
            </div>
            <div className="gm-faq__list">
              {content.faqItems.map((item, index) => (
                <details className="gm-faq__item" key={index}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="gm-quote" id="quote">
          <div className="gm-container gm-quote__grid">
            <div className="gm-quote__intro">
              <p className="gm-eyebrow">{quoteSection.eyebrow}</p>
              <h2>{quoteSection.title}</h2>
              <p>{quoteSection.body}</p>
              <p className="gm-quote__note">{quoteSection.note}</p>
            </div>
            <InquiryForm
              inquiryEmail={content.inquiryEmail}
              productOptions={quoteSection.productOptions}
              quantities={quoteSection.quantities}
              venueTypes={quoteSection.venueTypes}
            />
          </div>
        </section>

        {otherCategories.length ? (
          <section className="gm-products gm-products--related">
            <div className="gm-container">
              <div className="gm-section-heading">
                <p className="gm-eyebrow">Keep exploring</p>
                <h2>More promotional products</h2>
              </div>
              <div className="gm-pill-row">
                {otherCategories.map((c) => (
                  <Link className="gm-pill gm-pill--link" href={`/products/${c.key}`} key={c.key}>
                    {c.title}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter content={content} />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        type="application/ld+json"
      />
    </div>
  );
}
