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

export type SiteContent = {
  brandName: string;
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
  whyEyebrow: string;
  whyTitle: string;
  differentiators: Differentiator[];
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
