import type { CustomerInput } from "@/lib/portal/customers";
import type { Address, SalesRep } from "@/lib/portal/types";
import { parseDelimited } from "./sheet";

export const CUSTOMER_TEMPLATE_HEADERS = [
  "Type", "Company Name", "First Name", "Last Name",
  "Billing Name", "Billing Address 1", "Billing Address 2", "Billing City", "Billing State", "Billing Zip", "Billing Country",
  "Shipping Name", "Shipping Address 1", "Shipping Address 2", "Shipping City", "Shipping State", "Shipping Zip", "Shipping Country",
  "Email", "Phone", "Point of Contact", "Sales Rep", "Subscribed", "Notes",
];

/** Sample rows shipped in the downloadable template, showing both customer types. */
export const CUSTOMER_TEMPLATE_EXAMPLE_ROWS = [
  [
    "Company", "Acme Paving", "", "",
    "Acme Paving", "123 Main St", "Suite 200", "Springfield", "IL", "62701", "US",
    "Acme Paving Warehouse", "400 Industrial Pkwy", "", "Springfield", "IL", "62704", "US",
    "info@acmepaving.com", "555-123-4567", "Jordan Lee", "Jake Gottsegen", "Yes", "",
  ],
  [
    "Individual", "", "Taylor", "Reed",
    "Taylor Reed", "45 Oak Ave", "", "Springfield", "IL", "62701", "US",
    "", "", "", "", "", "", "",
    "taylor.reed@example.com; taylor@work.com", "555-987-6543", "", "House Account", "No", "",
  ],
];

function truthy(value: string) {
  return /^(y|yes|true|1)$/i.test(value.trim());
}

function addressFrom(cells: string[], c: { name: number; line1: number; line2: number; city: number; state: number; zip: number; country: number }): Address {
  return {
    name: cells[c.name] || "",
    line1: cells[c.line1] || "",
    line2: cells[c.line2] || "",
    city: cells[c.city] || "",
    state: cells[c.state] || "",
    zip: cells[c.zip] || "",
    country: cells[c.country] || "US",
  };
}

/**
 * Reads Type, Company/First/Last name, a billing address, a shipping
 * address, Email, Phone, Point of contact, Sales rep, Subscribed and Notes
 * columns; a header row may reorder them. Multiple emails can be separated
 * by "; " or ",". A sales rep name is matched case-insensitively against
 * existing reps -- add them first (via "Manage sales reps") if a row's rep
 * doesn't match.
 */
export function parseCustomerSheet(text: string, salesReps: SalesRep[]): { rows: CustomerInput[]; errors: string[] } {
  const grid = parseDelimited(text);
  if (!grid.length) return { rows: [], errors: ["Nothing to import yet. Paste rows or choose a file."] };
  let cols = {
    type: 0, company: 1, first: 2, last: 3,
    bName: 4, bLine1: 5, bLine2: 6, bCity: 7, bState: 8, bZip: 9, bCountry: 10,
    sName: 11, sLine1: 12, sLine2: 13, sCity: 14, sState: 15, sZip: 16, sCountry: 17,
    email: 18, phone: 19, contact: 20, rep: 21, subscribed: 22, notes: 23,
  };
  const h = grid[0].map((c) => c.toLowerCase());
  const header = h.some((c) => /company|first\s*name|last\s*name|billing|shipping|^email|phone|contact|sales\s*rep|subscribe|^notes?$|^type$/.test(c));
  if (header) {
    const find = (re: RegExp, fallback: number) => {
      const i = h.findIndex((c) => re.test(c));
      return i >= 0 ? i : fallback;
    };
    cols = {
      type: find(/^type$|kind|company or individual/, 0),
      company: find(/^company(\s*name)?$/, 1),
      first: find(/first/, 2),
      last: find(/last/, 3),
      bName: find(/bill.*name/, 4),
      bLine1: find(/bill.*(address\s*1|line\s*1|address$)/, 5),
      bLine2: find(/bill.*(address\s*2|line\s*2)/, 6),
      bCity: find(/bill.*city/, 7),
      bState: find(/bill.*state/, 8),
      bZip: find(/bill.*zip/, 9),
      bCountry: find(/bill.*country/, 10),
      sName: find(/ship.*name/, 11),
      sLine1: find(/ship.*(address\s*1|line\s*1|address$)/, 12),
      sLine2: find(/ship.*(address\s*2|line\s*2)/, 13),
      sCity: find(/ship.*city/, 14),
      sState: find(/ship.*state/, 15),
      sZip: find(/ship.*zip/, 16),
      sCountry: find(/ship.*country/, 17),
      email: find(/email/, 18),
      phone: find(/phone/, 19),
      contact: find(/contact/, 20),
      rep: find(/rep/, 21),
      subscribed: find(/subscribe/, 22),
      notes: find(/notes?/, 23),
    };
    grid.shift();
  }
  const repByName = new Map(salesReps.map((r) => [r.name.toLowerCase(), r.id]));
  const rows: CustomerInput[] = [];
  const errors: string[] = [];
  grid.forEach((cells, i) => {
    const n = i + 1 + (header ? 1 : 0);
    const kind = /individual/i.test(cells[cols.type] || "") ? "individual" : "company";
    const companyName = cells[cols.company] || "";
    const firstName = cells[cols.first] || "";
    const lastName = cells[cols.last] || "";
    const named = kind === "company" ? companyName.trim() : `${firstName.trim()}${lastName.trim()}`;
    if (!named) {
      errors.push(`Row ${n}: needs a ${kind === "company" ? "company name" : "first or last name"}.`);
      return;
    }
    const repName = (cells[cols.rep] || "").trim();
    rows.push({
      kind,
      companyName,
      firstName,
      lastName,
      billingAddress: addressFrom(cells, { name: cols.bName, line1: cols.bLine1, line2: cols.bLine2, city: cols.bCity, state: cols.bState, zip: cols.bZip, country: cols.bCountry }),
      shippingAddress: addressFrom(cells, { name: cols.sName, line1: cols.sLine1, line2: cols.sLine2, city: cols.sCity, state: cols.sState, zip: cols.sZip, country: cols.sCountry }),
      emails: (cells[cols.email] || "").split(/[;,]/).map((e) => e.trim()).filter(Boolean),
      phone: cells[cols.phone] || "",
      pointOfContact: cells[cols.contact] || "",
      salesRepId: repName ? repByName.get(repName.toLowerCase()) ?? null : null,
      subscribed: truthy(cells[cols.subscribed] || ""),
      inventoryHeld: false,
      notes: cells[cols.notes] || "",
    });
  });
  return { rows, errors };
}
