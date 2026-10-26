import { db } from "./db";
import { PortalError } from "./http";

export type QuoteSection = {
  eyebrow: string;
  title: string;
  body: string;
  note: string;
  venueTypes: string[];
  quantities: string[];
  productOptions: string[];
};

type Row = Record<string, unknown>;

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function toQuoteSection(r: Row): QuoteSection {
  return {
    eyebrow: String(r.eyebrow ?? ""),
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    note: String(r.note ?? ""),
    venueTypes: toStringArray(r.venue_types),
    quantities: toStringArray(r.quantities),
    productOptions: toStringArray(r.product_options),
  };
}

const BLANK_SECTION: QuoteSection = {
  eyebrow: "",
  title: "",
  body: "",
  note: "",
  venueTypes: [],
  quantities: [],
  productOptions: [],
};

/**
 * For the public homepage: the Get a Quote section's copy and every option
 * list. The homepage otherwise has no database dependency, so a DB hiccup
 * degrades to a blank quote section rather than taking the whole page down.
 */
export async function getQuoteSection(): Promise<QuoteSection> {
  try {
    const sql = await db();
    const [row] = await sql`select * from quote_section where id = 1`;
    return row ? toQuoteSection(row) : BLANK_SECTION;
  } catch (error) {
    console.error("[quote-section]", error);
    return BLANK_SECTION;
  }
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export type QuoteSectionInput = {
  eyebrow: string;
  title: string;
  body: string;
  note: string;
  venueTypes: unknown;
  quantities: unknown;
  productOptions: unknown;
};

/** For /portal/quote (staff-only): replaces the whole section. */
export async function updateQuoteSection(input: QuoteSectionInput): Promise<void> {
  const eyebrow = input.eyebrow.trim().slice(0, 120);
  const title = input.title.trim().slice(0, 200);
  const body = input.body.trim().slice(0, 1000);
  const note = input.note.trim().slice(0, 300);
  if (!title) throw new PortalError("Give the section a title.");

  const sql = await db();
  await sql`
    update quote_section set
      eyebrow = ${eyebrow},
      title = ${title},
      body = ${body},
      note = ${note},
      venue_types = ${sql.json(cleanList(input.venueTypes, 40, 80))},
      quantities = ${sql.json(cleanList(input.quantities, 40, 40))},
      product_options = ${sql.json(cleanList(input.productOptions, 40, 200))},
      updated_at = now()
    where id = 1`;
}
