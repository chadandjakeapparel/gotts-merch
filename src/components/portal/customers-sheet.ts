import type { CustomerInput } from "@/lib/portal/customers";
import type { SalesRep } from "@/lib/portal/types";
import { parseDelimited } from "./sheet";

export const CUSTOMER_TEMPLATE_HEADERS = [
  "Type", "Company Name", "First Name", "Last Name", "Billing Address", "Shipping Address",
  "Email", "Phone", "Point of Contact", "Sales Rep", "Subscribed", "Notes",
];

/** Sample rows shipped in the downloadable template, showing both customer types. */
export const CUSTOMER_TEMPLATE_EXAMPLE_ROWS = [
  ["Company", "Acme Paving", "", "", "123 Main St, Springfield, IL 62701", "", "info@acmepaving.com", "555-123-4567", "Jordan Lee", "Jake Gottsegen", "Yes", ""],
  ["Individual", "", "Taylor", "Reed", "", "45 Oak Ave, Springfield, IL 62701", "taylor.reed@example.com; taylor@work.com", "555-987-6543", "", "House Account", "No", ""],
];

function truthy(value: string) {
  return /^(y|yes|true|1)$/i.test(value.trim());
}

/**
 * Reads Type, Company name, First/Last name, Billing/Shipping address, Email,
 * Phone, Point of contact, Sales rep, Subscribed and Notes columns; a header
 * row may reorder them. Multiple emails can be separated by "; " or ",".
 * A sales rep name is matched case-insensitively against existing reps --
 * add them first (via "Manage sales reps") if a row's rep doesn't match.
 */
export function parseCustomerSheet(text: string, salesReps: SalesRep[]): { rows: CustomerInput[]; errors: string[] } {
  const grid = parseDelimited(text);
  if (!grid.length) return { rows: [], errors: ["Nothing to import yet. Paste rows or choose a file."] };
  let cols = { type: 0, company: 1, first: 2, last: 3, billing: 4, shipping: 5, email: 6, phone: 7, contact: 8, rep: 9, subscribed: 10, notes: 11 };
  const h = grid[0].map((c) => c.toLowerCase());
  const header = h.some((c) => /company|first\s*name|last\s*name|billing|shipping|^email|phone|contact|sales\s*rep|subscribe|^notes?$|^type$/.test(c));
  if (header) {
    const find = (re: RegExp, fallback: number) => {
      const i = h.findIndex((c) => re.test(c));
      return i >= 0 ? i : fallback;
    };
    cols = {
      type: find(/type|kind|company or individual/, 0),
      company: find(/company/, 1),
      first: find(/first/, 2),
      last: find(/last/, 3),
      billing: find(/bill/, 4),
      shipping: find(/ship/, 5),
      email: find(/email/, 6),
      phone: find(/phone/, 7),
      contact: find(/contact/, 8),
      rep: find(/rep/, 9),
      subscribed: find(/subscribe/, 10),
      notes: find(/notes?/, 11),
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
      billingAddress: cells[cols.billing] || "",
      shippingAddress: cells[cols.shipping] || "",
      emails: (cells[cols.email] || "").split(/[;,]/).map((e) => e.trim()).filter(Boolean),
      phone: cells[cols.phone] || "",
      pointOfContact: cells[cols.contact] || "",
      salesRepId: repName ? repByName.get(repName.toLowerCase()) ?? null : null,
      subscribed: truthy(cells[cols.subscribed] || ""),
      notes: cells[cols.notes] || "",
    });
  });
  return { rows, errors };
}
