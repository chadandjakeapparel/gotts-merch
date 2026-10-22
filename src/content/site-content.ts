export type ProductCategory = {
  key: string;
  title: string;
  description: string;
  items: string[];
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
  quoteEyebrow: string;
  quoteTitle: string;
  quoteBody: string;
  quoteNote: string;
  footerTagline: string;
  venueTypes: string[];
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
    },
    {
      key: "retail",
      title: "Pens & retail merch",
      description:
        "Everyday branded basics, plus a retail line guests can buy on their way out.",
      items: ["Pens", "Tees & hats", "Tote bags", "Register-ready merch"],
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
  quoteEyebrow: "Start a quote",
  quoteTitle: "Tell us what you need on the line.",
  quoteBody:
    "Share your venue and the products you're picturing — from a single apron order to a full multi-location rollout. We'll follow up with pricing and material recommendations.",
  quoteNote:
    "Replace this space with an approved customer quote once one is available.",
  footerTagline: "Promotional products for restaurants, hotels, bars, and cafés.",
  venueTypes: [
    "Restaurants & bars",
    "Hotels & resorts",
    "Cafés & coffee shops",
    "Catering & events",
    "Country clubs",
    "Ghost kitchens",
  ],
};
