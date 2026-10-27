import type { Metadata } from "next";
import Link from "next/link";
import {
  BagIcon,
  FlagIcon,
  GiftIcon,
  GolfBallIcon,
  ShirtIcon,
  TowelIcon,
} from "@/components/icons";
import { InquiryForm } from "@/components/inquiry-form";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { getSiteContent } from "@/lib/content";
import { getQuoteSection } from "@/lib/portal/quote-section";

export const dynamic = "force-dynamic";

const HERO_CARDS = [
  { label: "Custom Golf Balls", Icon: GolfBallIcon },
  { label: "Custom Apparel", Icon: ShirtIcon },
  { label: "Gift Bags", Icon: BagIcon },
  { label: "Towels & Extras", Icon: TowelIcon },
];

const INCLUDED = [
  {
    key: "golf-balls",
    title: "Custom Golf Balls",
    Icon: GolfBallIcon,
    description:
      "Branded golf balls from every major manufacturer, stamped with your tournament logo or sponsor marks.",
    items: ["Titleist, Callaway, TaylorMade, Bridgestone & more", "Logo, sponsor & hole-sponsor printing", "Sleeves of 3 or boxed dozens"],
  },
  {
    key: "apparel",
    title: "Custom Apparel",
    Icon: ShirtIcon,
    description: "Polos, quarter-zips, vests and jackets for players, volunteers, staff and your title sponsor.",
    items: ["Performance polos & quarter-zips", "Jackets & vests", "Embroidered or screen printed"],
  },
  {
    key: "bags",
    title: "Cinch & Tote Bags",
    Icon: BagIcon,
    description: "Branded cinch sacks or totes to carry every giveaway from the cart to the car.",
    items: ["Cinch bags & drawstring packs", "Totes for check-in gifts", "Your logo front and center"],
  },
  {
    key: "giveaways",
    title: "Promotional Giveaways",
    Icon: GiftIcon,
    description: "The small extras that fill out every gift bag, branded to match your tournament.",
    items: ["Tees, ball markers & divot tools", "Koozies & coolers", "Hats, visors & sunscreen"],
  },
  {
    key: "towels",
    title: "Golf Towels",
    Icon: TowelIcon,
    description: "Embroidered cart and tour towels for gift bags, carts and clubhouse recognition.",
    items: ["Cart & tour towels", "Embroidered logos", "Bulk pricing by the foursome"],
  },
  {
    key: "extras",
    title: "Tournament Extras",
    Icon: FlagIcon,
    description: "Hole sponsor signage, scorecards and prize packages — tell us what's on your list.",
    items: ["Hole sponsor signs", "Scorecards & tee packets", "Hole-in-one & prize packages"],
  },
];

const DIFFERENTIATORS = [
  {
    title: "One partner, every item",
    description:
      "Golf balls, apparel, bags and giveaways from a single quote and a single delivery — no juggling five vendors before your event.",
  },
  {
    title: "All major golf ball brands",
    description:
      "We print and stamp balls from Titleist, Callaway, TaylorMade, Bridgestone, Srixon and more, matched to your budget.",
  },
  {
    title: "Gift bags, assembled",
    description:
      "Send us your giveaways and we'll pack, sort and label gift bags by foursome, ready to hand out at check-in.",
  },
  {
    title: "Built around your tee time",
    description:
      "We work backward from your event date, with rush production when a timeline gets tight.",
  },
];

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Share your date & headcount",
    description: "Tell us your tournament date, number of golfers and budget. We'll map out what fits.",
  },
  {
    number: "02",
    title: "Pick your swag",
    description: "Choose your ball brand, apparel, bags and giveaways — we'll mock up your logo before you commit.",
  },
  {
    number: "03",
    title: "We produce & assemble",
    description: "Printing, embroidery and gift-bag assembly happen under one roof, so nothing falls through the cracks.",
  },
  {
    number: "04",
    title: "Delivered, ready to hand out",
    description: "Gift bags and signage arrive at the course, sorted and ready for check-in.",
  },
];

const FAQ_ITEMS = [
  {
    question: "How far in advance should we order for our tournament?",
    answer:
      "Most tournaments order 4-6 weeks out, but we regularly turn around rush orders in 1-2 weeks depending on the item mix and quantity. Reach out with your date and we'll tell you what's possible.",
  },
  {
    question: "Can you brand golf balls from any brand?",
    answer:
      "Yes — we print and stamp balls from Titleist, Callaway, TaylorMade, Bridgestone, Srixon and most major manufacturers, in sleeves of 3 or boxed dozens.",
  },
  {
    question: "Do you assemble the gift bags for us?",
    answer:
      "Yes. Send everything to us (or let us produce it) and we'll pack, sort and label gift bags by foursome so they're ready to hand out at check-in.",
  },
  {
    question: "Is there a minimum order?",
    answer:
      "Minimums vary by item — ball printing and embroidery both carry brand minimums — but we work with tournaments of every size, from a single sponsored foursome to a full field of 144 players.",
  },
  {
    question: "Can you ship directly to the golf course or clubhouse?",
    answer:
      "Yes, we can ship straight to the course, your office, or split a shipment between sponsors and the event. Just let us know the delivery details when you request a quote.",
  },
  {
    question: "We run this tournament every year — can you keep our artwork on file?",
    answer:
      "Absolutely. We keep your logo, color specs and past orders on file, so reordering for next year's tournament is as simple as sending us the new date and headcount.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `Custom Golf Tournament Merch & Gift Bags | ${content.brandName}`,
    description:
      "Custom golf balls, apparel, cinch bags, giveaways and towels for charity and corporate golf tournaments — one partner, one delivery, every item branded.",
    alternates: { canonical: "/charity-golf-tournaments" },
  };
}

export default async function CharityGolfTournamentsPage() {
  const content = await getSiteContent();
  const quoteSection = await getQuoteSection();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gottsmerch.com";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Charity Golf Tournaments", item: `${siteUrl}/charity-golf-tournaments` },
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
              <span>Charity Golf Tournaments</span>
            </nav>
            <div className="gm-hero__inner">
              <div className="gm-hero__copy">
                <p className="gm-eyebrow">Charity Golf Tournaments</p>
                <h1>Custom merch that makes your tournament unforgettable</h1>
                <p className="gm-hero__lead">
                  From the first tee to the 19th hole, we outfit charity and corporate golf tournaments with
                  custom golf balls, apparel, gift bags and giveaways — all branded, all assembled, and
                  delivered ready for your shotgun start.
                </p>
                <div className="gm-hero__actions">
                  <a className="gm-btn gm-btn--primary" href="#quote">
                    Get a Quote
                  </a>
                  <a className="gm-btn gm-btn--ghost" href="#included">
                    See what&rsquo;s included
                  </a>
                </div>
                <div className="gm-hero__served">
                  <span>Trusted for</span>
                  <div className="gm-pill-row">
                    {["Golf outings", "Pro-am events", "Corporate scrambles", "Charity fundraisers"].map((type) => (
                      <span className="gm-pill" key={type}>
                        {type}
                      </span>
                    ))}
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

        <section className="gm-products" id="included">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">What&rsquo;s included</p>
              <h2>Everything your tournament gift bag needs</h2>
              <p>
                We handle the full line-up of tournament merch under one roof — order it all from a single
                point of contact, with one delivery to the course.
              </p>
            </div>
            <div className="gm-products__grid gm-golf-grid">
              {INCLUDED.map((item) => (
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
              <p className="gm-eyebrow">Why golf tournament directors choose us</p>
              <h2>One call before your event. Not five.</h2>
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
              <h2>From first call to check-in table</h2>
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
              <h2>Golf tournament merch, answered</h2>
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
              <h2>Get a quote for your tournament</h2>
              <p>
                Tell us your tournament date, headcount and what&rsquo;s on your wish list — golf balls,
                apparel, gift bags, towels, anything else — and we&rsquo;ll put together a quote built around
                your tee time.
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

        <section className="gm-golf-related">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">Keep exploring</p>
              <h2>More promotional products</h2>
              <p>
                Everything above is produced in-house alongside our full promotional product line — browse
                the categories below for even more ways to brand your event.
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
