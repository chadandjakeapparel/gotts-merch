import type { Metadata } from "next";
import Link from "next/link";
import {
  BagIcon,
  BeanieIcon,
  CupIcon,
  GiftIcon,
  PenIcon,
  ShirtIcon,
  VestIcon,
} from "@/components/icons";
import { InquiryForm } from "@/components/inquiry-form";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { getSiteContent } from "@/lib/content";
import { getQuoteSection } from "@/lib/portal/quote-section";

export const dynamic = "force-dynamic";

const HERO_CARDS = [
  { label: "Flight Crew Apparel", Icon: ShirtIcon },
  { label: "VIP Client Gifting", Icon: GiftIcon },
  { label: "Hi-Vis Safety Wear", Icon: VestIcon },
  { label: "Tarmac Outerwear", Icon: BeanieIcon },
];

const CHARTER_ITEMS = [
  {
    key: "crew-apparel",
    title: "Flight Crew Apparel",
    Icon: ShirtIcon,
    description: "Embroidered polos, blazers and outerwear for pilots and cabin crew, built for a tight turnaround.",
    items: ["Pilot & crew polos", "Blazers & outerwear", "Embroidered wings & insignia"],
  },
  {
    key: "vip-gifting",
    title: "VIP Client Gifting",
    Icon: GiftIcon,
    description: "Welcome-aboard gifts and client appreciation pieces that match the level of service you provide.",
    items: ["Leather passport & luggage tags", "Travel kits & amenity sets", "Branded gift boxes"],
  },
  {
    key: "drinkware",
    title: "Premium Drinkware",
    Icon: CupIcon,
    description: "Tumblers, flutes and flasks for the cabin, the lounge, or a client's desk.",
    items: ["Insulated tumblers", "Glassware & flasks", "Cabin-ready gift sets"],
  },
  {
    key: "travel-accessories",
    title: "Travel Accessories",
    Icon: BagIcon,
    description: "Leather portfolios, headset bags and garment bags built for frequent flyers.",
    items: ["Leather portfolios", "Headset & garment bags", "Luggage tags"],
  },
];

const GROUND_OPS_ITEMS = [
  {
    key: "hi-vis",
    title: "Hi-Vis Safety Apparel",
    Icon: VestIcon,
    description: "High-visibility vests sized and stocked for ground crews working the flight line.",
    items: ["Hi-vis safety vests", "Reflective striping", "Fast reorders for turnover"],
  },
  {
    key: "outerwear",
    title: "Tarmac Outerwear & Beanies",
    Icon: BeanieIcon,
    description: "Insulated jackets and beanies in high-visibility colors for crews working outdoors, any season.",
    items: ["Insulated hi-vis jackets", "Beanies & knit caps", "Embroidered crew names"],
  },
  {
    key: "office-uniforms",
    title: "Office Uniforms & Polos",
    Icon: ShirtIcon,
    description: "Polos and button-downs for dispatch, operations and in-office staff.",
    items: ["Embroidered polos", "Button-downs & outerwear", "Department-specific colors"],
  },
  {
    key: "promo-products",
    title: "Promotional Products",
    Icon: PenIcon,
    description: "Everyday branded basics for trade shows, employee events and client meetings.",
    items: ["Pens, notebooks & bags", "Tech accessories", "Trade show giveaways"],
  },
];

const DIFFERENTIATORS = [
  {
    title: "One partner for both sides of the business",
    description:
      "From cabin crew blazers to tarmac safety vests, we produce every tier of your aviation brand under one account.",
  },
  {
    title: "Hi-vis gear built for the flight line",
    description:
      "Safety vests, insulated jackets and beanies in high-visibility colors and fabrics, stocked for ground crews working any shift.",
  },
  {
    title: "White-glove finishing for client-facing gear",
    description: "VIP gifting and crew apparel finished to the standard your passengers expect — no shortcuts.",
  },
  {
    title: "Scales with your fleet",
    description:
      "Whether you're outfitting three jets or three hundred ground crew, we handle specialty runs and large recurring orders alike.",
  },
];

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Tell us your fleet & team",
    description: "Share your aircraft count, crew size and ground team headcount so we can scope the right order.",
  },
  {
    number: "02",
    title: "Choose your gear",
    description: "Pick from flight crew apparel, VIP gifting, hi-vis workwear or office apparel -- mix across departments.",
  },
  {
    number: "03",
    title: "We produce to spec",
    description: "Embroidery, screen printing and premium finishing, matched to your brand guidelines.",
  },
  {
    number: "04",
    title: "Delivered to your base or office",
    description: "Ship to a single FBO, split across multiple bases, or deliver straight to your office.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Can you outfit both our flight crew and our ground operations team?",
    answer:
      "Yes -- that's exactly what we do. We produce premium apparel and gifting for charter and flight crew alongside hi-vis safety apparel and uniforms for ground operations and office staff, all from one account.",
  },
  {
    question: "Do you carry high-visibility safety apparel for tarmac crews?",
    answer:
      "Yes, including safety vests, insulated jackets and beanies in high-visibility colors, sized for crews working outdoors in any season.",
  },
  {
    question: "Can you match our existing uniform program or brand guidelines?",
    answer:
      "Yes. Send us your brand colors, logo files and any existing uniform specs, and we'll match them across every department you order for.",
  },
  {
    question: "What's a typical order size?",
    answer:
      "We work with charter operators outfitting a handful of crew members up to large aviation companies ordering for hundreds of ground staff -- there's no order too small or too large.",
  },
  {
    question: "Can you handle VIP client gifting for charter passengers?",
    answer:
      "Yes -- welcome-aboard kits, leather travel accessories and branded amenity sets are some of our most requested items for charter and management companies.",
  },
  {
    question: "How do you handle multiple delivery locations, like different FBOs or bases?",
    answer:
      "We can ship a single consolidated order or split shipments across multiple bases or offices -- just tell us the breakdown when you request a quote.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `Custom Apparel & Promotional Products for Aviation | ${content.brandName}`,
    description:
      "Premium apparel and VIP client gifting for private jet charter and management companies, plus hi-vis safety wear, uniforms and promotional products for aviation ground operations and office teams.",
    alternates: { canonical: "/aviation" },
  };
}

export default async function AviationPage() {
  const content = await getSiteContent();
  const quoteSection = await getQuoteSection();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gottsmerch.com";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Aviation", item: `${siteUrl}/aviation` },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
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
        <section className="gm-hero">
          <div className="gm-container">
            <nav aria-label="Breadcrumb" className="gm-breadcrumbs">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <span>Aviation</span>
            </nav>
            <div className="gm-hero__inner">
              <div className="gm-hero__copy">
                <p className="gm-eyebrow">Aviation Industry</p>
                <h1>Custom merch for every side of aviation</h1>
                <p className="gm-hero__lead">
                  We outfit private jet charter and management companies with premium crew apparel and client
                  gifting, and equip ground operations and corporate aviation teams with hi-vis workwear,
                  uniforms and promotional products — all from one account.
                </p>
                <div className="gm-hero__actions">
                  <a className="gm-btn gm-btn--primary" href="#quote">
                    Get a Quote
                  </a>
                  <a className="gm-btn gm-btn--ghost" href="#charter">
                    See what we offer
                  </a>
                </div>
                <div className="gm-hero__served">
                  <span>Trusted for</span>
                  <div className="gm-pill-row">
                    {["Charter operators", "Charter management", "FBOs & ground ops", "Corporate aviation teams"].map(
                      (type) => (
                        <span className="gm-pill" key={type}>
                          {type}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
              <div aria-hidden="true" className="gm-hero__visual">
                {HERO_CARDS.map(({ label, Icon }) => (
                  <div className="gm-hero__card" key={label}>
                    <Icon />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="gm-products" id="charter">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">Private Jet Charter & Management</p>
              <h2>Premium apparel &amp; gifting for charter brands</h2>
              <p>
                High-ticket, client-facing pieces for charter operators and management companies — crew apparel
                and VIP gifting finished to the standard your passengers expect.
              </p>
            </div>
            <div className="gm-products__grid">
              {CHARTER_ITEMS.map((item) => (
                <article className="gm-product-card" key={item.key}>
                  <div className="gm-product-card__icon">
                    <item.Icon />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <ul>
                    {item.items.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="gm-aviation-fleet">
          <div className="gm-container">
            {/* eslint-disable-next-line @next/next/no-img-element -- static page asset, not admin-managed content */}
            <img
              alt="Illustrated lineup of private jets we outfit crews for, including the Gulfstream G550, Dassault Falcon 7X, Praetor 300, Cirrus SF50 Vision Jet, Bombardier Global 5500, Challenger 350 and Cessna Citation 3J3+"
              src="/aviation-jet-fleet.webp"
            />
            <p>From the Gulfstream G550 to the Cessna Citation — we know your fleet.</p>
          </div>
        </section>

        <section className="gm-products gm-products--alt" id="ground-ops">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">Ground Operations & Corporate Teams</p>
              <h2>Hi-vis workwear, uniforms &amp; promo products</h2>
              <p>
                Durable, high-visibility gear for crews on the flight line, plus uniforms and promotional
                products for dispatch, operations and office staff.
              </p>
            </div>
            <div className="gm-products__grid">
              {GROUND_OPS_ITEMS.map((item) => (
                <article className="gm-product-card" key={item.key}>
                  <div className="gm-product-card__icon">
                    <item.Icon />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <ul>
                    {item.items.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="gm-why" id="why-us">
          <div className="gm-container">
            <div className="gm-section-heading gm-section-heading--light">
              <p className="gm-eyebrow">Why aviation teams choose us</p>
              <h2>One call for the cabin and the flight line.</h2>
            </div>
            <div className="gm-why__grid">
              {DIFFERENTIATORS.map((item) => (
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
              <p className="gm-eyebrow">How it works</p>
              <h2>From first call to delivery</h2>
            </div>
            <div className="gm-process__grid">
              {PROCESS_STEPS.map((step) => (
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
              <p className="gm-eyebrow">Frequently asked</p>
              <h2>Aviation apparel &amp; promo products, answered</h2>
            </div>
            <div className="gm-faq__list">
              {FAQ_ITEMS.map((item) => (
                <details className="gm-faq__item" key={item.question}>
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
              <h2>Get a quote for your team</h2>
              <p>
                Tell us about your fleet, your crew, and your ground operations — flight crew apparel, VIP
                gifting, hi-vis workwear, office uniforms, anything else — and we&rsquo;ll put together a quote
                built around your business.
              </p>
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

        <section className="gm-related-section">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">Keep exploring</p>
              <h2>More promotional products</h2>
              <p>
                Everything above is produced in-house alongside our full promotional product line — browse the
                categories below for even more ways to brand your business.
              </p>
            </div>
            <div className="gm-pill-row">
              {content.productCategories.map((category) => (
                <Link className="gm-pill gm-pill--link" href={`/products/${category.key}`} key={category.key}>
                  {category.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
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
