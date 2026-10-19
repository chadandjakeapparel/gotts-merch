export const BRAND_NAME = "Gotts Merch";
export const TAGLINE = "We've Gotts you covered.";

// Swap this for a real inbox at the gottsmerch.com domain before launch.
export const INQUIRY_EMAIL = "hello@gottsmerch.com";

export type ProductCategory = {
  key: string;
  title: string;
  description: string;
  items: string[];
};

export const productCategories: ProductCategory[] = [
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
    items: ["Hot cups", "Cold cups", "Coffee cup sleeves", "Stirrers", "To-go bags"],
  },
  {
    key: "retail",
    title: "Pens & retail merch",
    description:
      "Everyday branded basics, plus a retail line guests can buy on their way out.",
    items: ["Pens", "Tees & hats", "Tote bags", "Register-ready merch"],
  },
];

export type Differentiator = {
  title: string;
  description: string;
};

export const differentiators: Differentiator[] = [
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
];

export type ProcessStep = {
  number: string;
  title: string;
  description: string;
};

export const processSteps: ProcessStep[] = [
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
];

export const venueTypes = [
  "Restaurants & bars",
  "Hotels & resorts",
  "Cafés & coffee shops",
  "Catering & events",
  "Country clubs",
  "Ghost kitchens",
];
