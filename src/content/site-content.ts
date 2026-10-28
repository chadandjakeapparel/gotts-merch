export type ProductCategory = {
  key: string;
  title: string;
  description: string;
  items: string[];
  // Shown behind the title on the homepage hero's top category tiles. Leave
  // blank to keep the plain colored tile with its icon.
  imageUrl: string;
  // A longer paragraph shown on this category's own page at /products/<key>,
  // in addition to the short description used everywhere else.
  longBody: string;
};

export type Differentiator = {
  title: string;
  description: string;
};

export type ProcessStep = {
  number: string;
  title: string;
  description: string;
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
};

export type ActivationStation = {
  title: string;
  description: string;
};

export type BrandPartner = {
  name: string;
  description: string;
  logoUrl: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type GalleryImage = {
  url: string;
  // Optional, shown only in the enlarged lightbox view -- e.g. the event
  // name or a short note on what's pictured.
  caption: string;
};

export type DocumentItem = {
  /** The URL path segment, e.g. "privacy-policy" for /get-to-know-us/privacy-policy. */
  slug: string;
  title: string;
  /** Shown on the Get to Know Us card linking to this document. */
  description: string;
  /**
   * The document's text. A blank line starts a new paragraph; "## " starts
   * a heading; a block whose every line starts with "- " becomes a bullet
   * list; "[text](url)" becomes a link. {{brandName}} and {{inquiryEmail}}
   * are replaced with the site's current values.
   */
  body: string;
};

export type BlogPost = {
  /** The URL path segment, e.g. "golf-tournament-swag-budget" for /blog/<slug>. */
  slug: string;
  title: string;
  // Shown on the blog index card and used as the page's meta description.
  excerpt: string;
  // Shown at the top of the post and on its index card. Leave blank to skip it.
  coverImageUrl: string;
  /** "YYYY-MM-DD". Drives display order (newest first) on the blog index. */
  publishedAt: string;
  // Same format as DocumentItem.body: blank line = new paragraph, "## " =
  // heading, lines starting with "- " = a bullet list, "[text](url)" = a
  // link. {{brandName}} and {{inquiryEmail}} are replaced with the site's
  // current values.
  body: string;
  // Drafts never appear on the public blog (index, post URL, sitemap, or
  // llms.txt) until flipped on.
  published: boolean;
};

export type SiteContent = {
  brandName: string;
  // Leave blank to use the default recreated wordmark/G mark.
  logoUrl: string;
  // Leave blank to use the default "G" mark favicon.
  faviconUrl: string;
  tagline: string;
  inquiryEmail: string;
  shopUrl: string;
  // Shown as the headline/description when this link is shared (texts,
  // Slack, social media) — not the same as the on-page hero text.
  metaTitle: string;
  metaDescription: string;
  // Leave blank to use the default — the link preview then falls back to
  // whatever the sharing platform (texts, Slack, social media) shows on its own.
  ogImageUrl: string;
  heroEyebrow: string;
  heroLead: string;
  productsEyebrow: string;
  productsTitle: string;
  productCategories: ProductCategory[];
  activationsEyebrow: string;
  activationsTitle: string;
  activationsLead: string;
  activationsStat: string;
  activationsStations: ActivationStation[];
  activationsProcessEyebrow: string;
  activationsProcessTitle: string;
  activationsProcessItems: string[];
  activationsCtaTitle: string;
  activationsCtaBody: string;
  whyEyebrow: string;
  whyTitle: string;
  differentiators: Differentiator[];
  brandsEyebrow: string;
  brandsTitle: string;
  brandsLead: string;
  brandPartners: BrandPartner[];
  aboutEyebrow: string;
  aboutTitle: string;
  aboutHistory: string;
  teamMembers: TeamMember[];
  retailEyebrow: string;
  retailTitle: string;
  retailBody: string;
  retailListItems: string[];
  processEyebrow: string;
  processTitle: string;
  processSteps: ProcessStep[];
  faqEyebrow: string;
  faqTitle: string;
  faqItems: FaqItem[];
  footerTagline: string;
  venueTypes: string[];
  getToKnowUsEyebrow: string;
  getToKnowUsTitle: string;
  getToKnowUsLead: string;
  documents: DocumentItem[];
  // Past-event / product photos shown in the gallery on the Charity Golf
  // Tournaments landing page.
  golfGallery: GalleryImage[];
  blogEyebrow: string;
  blogTitle: string;
  blogLead: string;
  blogPosts: BlogPost[];
};

export const defaultContent: SiteContent = {
  brandName: "Gotts Merch",
  logoUrl: "",
  faviconUrl: "",
  tagline: "We've Gotts you covered.",
  // Swap this for a real inbox at the gottsmerch.com domain before launch.
  inquiryEmail: "hello@gottsmerch.com",
  shopUrl: "https://shopnow.gottsmerch.com",
  metaTitle: "Gotts Merch — Promotional Products for Hospitality",
  metaDescription:
    "We've Gotts you covered. Apparel, print, drinkware, and retail merch made for restaurants, hotels, bars, and cafés.",
  ogImageUrl: "",
  heroEyebrow: "Promotional products for restaurants, bars & hotels",
  heroLead:
    "Apparel, printed paper goods, drinkware, and retail merch — sourced and produced for hospitality, and nothing else. Commercial-grade materials, fast turns on seasonal menus, and one team that understands what a busy shift does to a product.",
  productsEyebrow: "What we print & sew",
  productsTitle: "One partner for everything a guest touches.",
  productCategories: [
    {
      key: "apparel",
      title: "Front-of-house apparel",
      description:
        "Branded gear built to survive a shift — and a commercial laundry cycle.",
      items: ["Polos", "Aprons", "Chef coats", "Rain jackets"],
      imageUrl: "",
      longBody:
        "Corporate apparel and custom staff uniforms for restaurants, hotels, bars and cafés, made to actually hold up: fabric weights chosen for a full shift on your feet, color and logo placement that survive repeated commercial laundering, and embroidery or print that doesn't crack or fade after the first wash. We size-run your whole team, keep reorders consistent season to season, and handle everything from a single location's polos to a multi-property uniform rollout.",
    },
    {
      key: "print",
      title: "Menus, print & tabletop",
      description:
        "The small paper goods guests actually pick up and remember.",
      items: [
        "Menu jackets",
        "Coasters",
        "Napkins",
        "Restroom linen napkins",
        "Matchboxes",
        "Stickers",
      ],
      imageUrl: "",
      longBody:
        "Promotional products and printed tabletop pieces guests actually handle: menu jackets and inserts that get reprinted fast when a seasonal menu changes, coasters and napkins that carry your logo without looking like an afterthought, and the small branded touches — matchboxes, stickers, restroom linen napkins — that make a space feel finished. Quick turns matter most here, so pricing and proofing are built around how often menus actually change.",
    },
    {
      key: "drinkware",
      title: "Drinkware & to-go",
      description:
        "Hot, cold, and everything a to-go order needs to look like yours.",
      items: [
        "Hot cups",
        "Cold cups",
        "Coffee cup sleeves",
        "Stirrers",
        "To-go bags",
      ],
      imageUrl: "",
      longBody:
        "Branded drinkware and to-go packaging for restaurants, cafés and bars — hot cups, cold cups, cup sleeves, stirrers and to-go bags that carry your logo out the door and into a guest's hands (and their social feed). Ordered at the volumes a real kitchen or bar goes through, with consistent color matching order to order so a reorder six months later still looks like it came from the same run.",
    },
    {
      key: "retail",
      title: "Pens & retail merch",
      description:
        "Everyday branded basics, plus a retail line guests can buy on their way out.",
      items: ["Pens", "Tees & hats", "Tote bags", "Register-ready merch"],
      imageUrl: "",
      longBody:
        "Everyday branded merch and a guest-facing retail line in one order: pens and basics for day-to-day use, plus tees, hats, tote bags and other register-ready pieces guests will actually buy on their way out. A small rack near the host stand or register turns loyal regulars into walking advertising and adds a revenue line that didn't exist before — packaged and priced to sell, not just to give away.",
    },
  ],
  activationsEyebrow: "Live, on-site merch production",
  activationsTitle: "Watch the merch get made — right at your event.",
  activationsLead:
    "From a grand opening to a staff kickoff, our on-site production stations turn branded merch into part of the event. Guests and staff watch their gear get made in real time, then walk away with it that same day.",
  activationsStat: "250+ live events produced",
  activationsStations: [
    {
      title: "Live heat press",
      description:
        "A staffed DTF heat-press station that applies full-color designs to apparel on the spot.",
    },
    {
      title: "Hat bar",
      description: "Guests pick a style and watch their cap get customized in minutes.",
    },
    {
      title: "Embroidery",
      description:
        "On-site embroidery for a cleaner, more premium finish on apparel and accessories.",
    },
    {
      title: "UV DTF for hard goods",
      description:
        "Full-color branding applied live to cups, bottles, and other hard-surface items.",
    },
    {
      title: "Laser engraving",
      description:
        "Precision engraving for a lasting, upscale touch on wood, metal, and leather goods.",
    },
  ],
  activationsProcessEyebrow: "How we run it",
  activationsProcessTitle: "End-to-end, so all you do is show up.",
  activationsProcessItems: [
    "Blank sourcing",
    "Artwork and file prep",
    "On-floor crew for the full event",
    "Throughput planning for guest volume",
    "Travel and logistics handled",
    "Clean, finished-piece handoff",
  ],
  activationsCtaTitle: "Have an event on the calendar?",
  activationsCtaBody:
    "Tell us the date, the venue, and the crowd size — we'll help you scope the right stations for it.",
  whyEyebrow: "Why hospitality teams work with us",
  whyTitle: "We've Gotts you covered. That's the point.",
  differentiators: [
    {
      title: "Built for commercial use",
      description:
        "Materials chosen for heat, spills, and repeated commercial laundering — not just a nice photo.",
    },
    {
      title: "Fast turns on seasonal menus",
      description:
        "Menu jackets, inserts, and table print reprinted quickly when the menu or the season changes.",
    },
    {
      title: "Low minimums, multi-location friendly",
      description:
        "Order for a single location or coordinate consistent branding across a growing group.",
    },
    {
      title: "In-house design support",
      description:
        "Logo placement, embroidery digitizing, and print proofs handled before anything goes to production.",
    },
  ],
  brandsEyebrow: "Who we print for",
  brandsTitle: "Brands we're proud to work with.",
  brandsLead:
    "Replace this section with the real supplier and manufacturer brands Gotts Merch carries — add, remove, and reorder entries below as your catalog changes.",
  brandPartners: [
    {
      name: "Brand One",
      description: "Replace with a short line about this brand and what you offer from it.",
      logoUrl: "",
    },
    {
      name: "Brand Two",
      description: "Replace with a short line about this brand and what you offer from it.",
      logoUrl: "",
    },
    {
      name: "Brand Three",
      description: "Replace with a short line about this brand and what you offer from it.",
      logoUrl: "",
    },
    {
      name: "Brand Four",
      description: "Replace with a short line about this brand and what you offer from it.",
      logoUrl: "",
    },
    {
      name: "Brand Five",
      description: "Replace with a short line about this brand and what you offer from it.",
      logoUrl: "",
    },
    {
      name: "Brand Six",
      description: "Replace with a short line about this brand and what you offer from it.",
      logoUrl: "",
    },
  ],
  aboutEyebrow: "Our story",
  aboutTitle: "Built by people who know the back of house.",
  aboutHistory:
    "Replace this paragraph with the real story of Gotts Merch — when the business got started, what problem it set out to solve for restaurants and hotels, and what's changed (or stayed the same) since.",
  teamMembers: [
    {
      name: "Team Member One",
      role: "Co-Founder",
      bio: "Replace with a short bio — background, role at Gotts Merch, and what they focus on day to day.",
      photoUrl: "",
    },
    {
      name: "Team Member Two",
      role: "Co-Founder",
      bio: "Replace with a short bio — background, role at Gotts Merch, and what they focus on day to day.",
      photoUrl: "",
    },
  ],
  retailEyebrow: "Turn merch into a revenue line",
  retailTitle: "Give guests something to buy on the way out.",
  retailBody:
    "A small retail rack near the host stand or register — tees, hats, tote bags, and branded basics — turns loyal regulars into walking advertising, and adds a line of revenue that didn't exist before.",
  retailListItems: [
    "Tees & hats",
    "Tote bags",
    "Register-ready packaging",
    "Reorder-friendly minimums",
  ],
  processEyebrow: "How it works",
  processTitle: "From first sketch to a stocked back-of-house.",
  processSteps: [
    {
      number: "01",
      title: "Tell us about your venue",
      description:
        "Share your brand, venue type, and the products you're picturing — from a single item to a full rollout.",
    },
    {
      number: "02",
      title: "Get product & material recommendations",
      description:
        "We match materials and price points to how the piece will actually be used in service.",
    },
    {
      number: "03",
      title: "Approve a proof",
      description:
        "Review logo placement, colors, and print before anything goes into production.",
    },
    {
      number: "04",
      title: "Production & delivery",
      description:
        "Order to a single address or coordinate delivery across multiple locations.",
    },
  ],
  faqEyebrow: "Common questions",
  faqTitle: "Frequently asked questions.",
  faqItems: [
    {
      question: "What does Gotts Merch do?",
      answer:
        "Apparel, printed paper goods, drinkware, and retail merch — sourced and produced for hospitality, and nothing else. Commercial-grade materials, fast turns on seasonal menus, and one team that understands what a busy shift does to a product.",
    },
    {
      question: "What types of hospitality businesses do you work with?",
      answer:
        "We work with restaurants & bars, hotels & resorts, cafés & coffee shops, catering & events, country clubs, and ghost kitchens.",
    },
    {
      question: "What products can I order?",
      answer:
        "Front-of-house apparel, menus, print & tabletop, drinkware & to-go, and pens & retail merch — see the full breakdown above.",
    },
    {
      question: "Do you offer on-site merch production for events?",
      answer:
        "Yes — our on-site production stations turn branded merch into part of the event. Guests and staff watch their gear get made in real time, then walk away with it that same day. Stations include live heat press, hat bar, embroidery, UV DTF for hard goods, and laser engraving.",
    },
    {
      question: "How does the ordering process work?",
      answer:
        "Tell us about your venue, get product and material recommendations, approve a proof, then we handle production and delivery.",
    },
    {
      question: "How do I get a quote?",
      answer:
        "Share your venue and the products you're picturing — from a single apron order to a full multi-location rollout. We'll follow up with pricing and material recommendations.",
    },
  ],
  footerTagline: "Promotional products for restaurants, hotels, bars, and cafés.",
  venueTypes: [
    "Restaurants & bars",
    "Hotels & resorts",
    "Cafés & coffee shops",
    "Catering & events",
    "Country clubs",
    "Ghost kitchens",
  ],
  getToKnowUsEyebrow: "Get to Know Us",
  getToKnowUsTitle: "Policies & company information.",
  getToKnowUsLead:
    "Everything about how {{brandName}} operates, protects your information and works with you — in one place.",
  documents: [
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      description: "What information we collect and how we use it.",
      body: `This policy explains what information {{brandName}} collects, how we use it, and the choices you have. It covers our website and our client portal.

## Information we collect

We collect information in a few ways:

- Information you give us directly, such as your name, company, email address, phone number and shipping/billing address, when you request a quote, place an order, or use the client portal.
- Information created while you use the client portal, such as order history, inventory records, invoices and conversations with our team.
- Basic technical information collected automatically when you visit our website, such as your browser type and pages viewed.

## How we use it

We use this information to:

- Prepare quotes, fulfill orders, and manage inventory on your behalf.
- Operate and secure the client portal, including your login.
- Respond to your questions and provide customer support.
- Send you information about your orders, invoices or account.
- Improve our website and services.

## Sharing your information

We don't sell your personal information. We share it only with service providers who help us run our business (such as payment processing, hosting, or shipping carriers), when required by law, or with your consent — for example, if you ask us to connect your account with another platform you use, such as QuickBooks.

## Data security

We use reasonable technical and organizational measures to protect the information we hold, including encrypted connections, access controls on the client portal, and rate-limiting against repeated login attempts. No system is perfectly secure, and we can't guarantee absolute security.

## Your choices

You can ask us to access, correct, or delete the personal information we hold about you by contacting us below. We'll respond to reasonable requests, though some information may need to be kept for legal, accounting or order-fulfillment reasons.

## Children's privacy

Our website and portal are intended for business use and are not directed to children.

## Changes to this policy

We may update this policy from time to time. If we make material changes, we'll update the date at the top of this page.

## Contact us

Questions about this policy? Email us at {{inquiryEmail}}.`,
    },
    {
      slug: "terms-of-service",
      title: "Terms of Service",
      description: "The terms that govern using our website and services.",
      body: `These terms govern your use of the {{brandName}} website and your relationship with us as a customer. Logging in to our client portal is also governed by our [User Agreement](/get-to-know-us/user-agreement).

## Quotes and orders

Quotes we provide are estimates and aren't final until we confirm your order. Prices, artwork, quantities and production timelines are subject to change until that confirmation. Payment terms will be provided with your order confirmation or invoice.

## Artwork and intellectual property

You're responsible for making sure any logos, artwork or designs you provide to us are ones you have the rights to use. You grant us a license to use that artwork solely to produce your order. All content on our website — including our own branding, photography and design — belongs to {{brandName}} or our licensors.

## Acceptable use

You agree not to use our website or services for any unlawful purpose, to misrepresent your identity, or to attempt to disrupt or gain unauthorized access to our systems.

## Disclaimers

Our website and services are provided "as is." We aim for accuracy but don't guarantee the website will always be available, error-free, or perfectly represent finished products (colors and materials can vary slightly from what's shown on screen).

## Limitation of liability

To the extent permitted by law, {{brandName}} isn't liable for indirect, incidental or consequential damages arising from your use of our website or services. Our total liability for any claim is limited to the amount you paid for the order giving rise to the claim.

## Governing law

These terms are governed by the laws of the state in which {{brandName}} is based, without regard to conflict-of-law rules.

## Changes to these terms

We may update these terms from time to time. Continued use of our website after a change means you accept the updated terms.

## Contact us

Questions about these terms? Email us at {{inquiryEmail}}.`,
    },
    {
      slug: "user-agreement",
      title: "User Agreement",
      description: "The terms that govern logging in to the client portal.",
      body: `This agreement covers logging in to and using the {{brandName}} client portal — the account where you can view inventory, orders, invoices and jobs we manage for you. It works alongside our [Terms of Service](/get-to-know-us/terms-of-service) and [Privacy Policy](/get-to-know-us/privacy-policy).

## Your account

We create your portal login and send you a temporary password, which you'll be asked to change on first sign-in. You're responsible for keeping your login credentials confidential and for all activity under your account. Tell us right away if you believe your account has been compromised.

## What you can see and do

Your account shows information tied to your company: inventory on hand, order history, and — where we enable it — jobs and invoices. We decide what's visible to each account and may change that over time.

## Acceptable use

Use the portal only for your own business purposes. Don't share your login with anyone outside your organization, attempt to access another company's data, or use the portal in a way that could disrupt or harm it.

## Suspension and termination

We may suspend or close portal access if we reasonably believe these terms have been violated, or if our business relationship ends. You can ask us to close your account at any time.

## Changes to this agreement

We may update this agreement from time to time. Continued use of the portal after a change means you accept the update.

## Contact us

Questions about your account? Email us at {{inquiryEmail}}.`,
    },
    {
      slug: "ai-supplemental-terms",
      title: "AI Supplemental Terms",
      description: "Additional terms covering AI-assisted features.",
      body: `These terms supplement our [Terms of Service](/get-to-know-us/terms-of-service) and [Privacy Policy](/get-to-know-us/privacy-policy) and apply when {{brandName}} uses artificial intelligence tools to help run our website, client portal, or internal operations.

## How we may use AI

We may use AI-assisted tools behind the scenes — for example, to help draft or organize content, answer routine questions, or support our team in managing orders, inventory and customer records. AI tools work alongside our team; they don't replace human judgment on anything that affects your order, account, or legal rights.

## No fully-automated decisions

We don't use AI to make final decisions about your order, pricing, or account status without a person able to review the outcome. If you believe an AI-assisted process produced an incorrect result, contact us and we'll have a person look into it.

## Data used with AI tools

Where we use third-party AI tools, we share only the information needed for that tool to do its job, and we don't knowingly allow our customers' data to be used to train a third party's general-purpose AI models. Our [Privacy Policy](/get-to-know-us/privacy-policy) describes how we handle your information more broadly.

## Changes to these terms

As we adopt new AI-assisted features, we'll update this page to reflect them.

## Contact us

Questions about how we use AI? Email us at {{inquiryEmail}}.`,
    },
    {
      slug: "corporate-governance",
      title: "Corporate Governance",
      description: "How our company is organized and run.",
      body: `{{brandName}} is a privately held company. We're in the process of publishing more detail about our company structure and policies here — check back soon.

## Contact us

If you need governance information sooner, email us at {{inquiryEmail}}.`,
    },
    {
      slug: "press",
      title: "Press",
      description: "Company facts and media contact information.",
      body: `{{brandName}} provides promotional products for restaurants, hotels, bars, and cafés.

## Media inquiries

For interviews, logos, product photography or other press assets, email us at {{inquiryEmail}} and we'll get back to you.`,
    },
  ],
  golfGallery: [],
  blogEyebrow: "Blog",
  blogTitle: "Guides for planning your next order.",
  blogLead:
    "Practical answers on quantities, timelines and what to pick — from the team at {{brandName}}.",
  blogPosts: [
    {
      slug: "how-many-golf-balls-charity-tournament",
      title: "How Many Promotional Golf Balls Should You Order for a Charity Tournament?",
      excerpt:
        "A simple formula for sizing your golf ball order -- gift bags, hole sponsors, and prizes -- so you don't over-buy or run short.",
      coverImageUrl: "",
      publishedAt: "2026-10-28",
      published: false,
      body: `If you're planning merch for a charity golf tournament, golf balls are usually the single biggest line item in the budget -- and the easiest one to either over-order or run short on. Here's a simple way to size your order before you request a quote.

## Start with the gift bag

Most tournaments put one sleeve (3 balls) per golfer in the welcome gift bag. For a field of 144 golfers (a typical 4-person scramble with 36 foursomes), that's 48 dozen, or 576 balls, just for the gift bags.

- 1 sleeve (3 balls) per golfer for the gift bag
- Round up to the nearest dozen when you order, since most printers run in dozens

## Add hole sponsors

If hole sponsors want their own branded balls at their tee box, plan for 1 dozen per sponsored hole. An 18-hole course with 10-12 sponsored holes adds another 10-12 dozen to the order.

## Add prizes

Closest-to-pin, longest-drive, and hole-in-one contests typically use higher-end balls than the gift bag sleeves. Budget 1-2 dozen premium balls for these, separate from the bulk order.

## Putting it together

For a standard 144-golfer tournament with 10 sponsored holes, a realistic order looks like:

- 48 dozen standard balls for gift bags
- 10 dozen branded balls for hole sponsors
- 1-2 dozen premium balls for contest prizes

## Picking a brand

We print and stamp balls from Titleist, Callaway, TaylorMade, Bridgestone, Srixon and most major manufacturers, so your budget -- not the brand -- usually drives the decision. [Get a quote](/charity-golf-tournaments#quote) with your headcount and we'll put together options at a few price points.

{{brandName}} works with charity and corporate golf tournaments on the full gift bag line-up -- golf balls, apparel, bags, towels and giveaways -- from a single quote.`,
    },
    {
      slug: "embroidery-vs-screen-printing",
      title: "Embroidery vs. Screen Printing: Which Is Right for Your Order?",
      excerpt:
        "The real differences in cost, durability, and look -- and how to pick the right method for your next apparel order.",
      coverImageUrl: "",
      publishedAt: "2026-10-28",
      published: false,
      body: `Embroidery and screen printing are the two most common ways to brand apparel, and the right choice depends on what you're printing, how many you need, and how the garment will be used.

## Embroidery

Embroidery stitches your logo directly into the fabric with thread. It holds up to years of washing and wear, which makes it the default choice for uniforms, polos, jackets, and anything that goes through a commercial laundry cycle.

- Best for: polos, jackets, hats, vests
- Durability: very high -- doesn't crack, fade, or peel
- Cost: higher per-unit cost, with a setup fee per design
- Limitations: not ideal for large, highly detailed, or photo-realistic designs

## Screen printing

Screen printing applies ink directly to the fabric through a stencil. It's the better choice for large graphics, multiple colors across a big print area, or soft, lightweight apparel like t-shirts.

- Best for: t-shirts, tote bags, large back prints
- Durability: good, though prints can fade or crack over many years of heavy washing
- Cost: lower per-unit cost at higher quantities, with per-color setup fees
- Limitations: less practical for very small quantities or extremely small, detailed logos

## A quick way to decide

- Going on a polo, jacket, or anything that gets washed weekly? Choose embroidery.
- Need a big, colorful design on a t-shirt or tote bag? Choose screen printing.
- Ordering under a dozen pieces? Embroidery's setup fee is usually a smaller share of the total cost.
- Ordering in bulk with a simple 1-2 color logo? Screen printing is usually the better value.

Not sure which fits your order? [Send us your logo and quantity](/#quote) and we'll recommend the method that balances cost, durability, and look for what you're printing.

{{brandName}} offers both embroidery and screen printing in-house, so you're never stuck choosing based on what one vendor happens to offer.`,
    },
  ],
};
