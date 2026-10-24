import { db } from "./db";
import { PortalError } from "./http";
import type { Customer, CustomerKind, SalesRep } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const str = (v: unknown) => (v == null ? "" : String(v));

function toCustomer(r: Row, emails: string[]): Customer {
  return {
    id: Number(r.id),
    kind: r.kind as CustomerKind,
    companyName: str(r.company_name),
    firstName: str(r.first_name),
    lastName: str(r.last_name),
    billingAddress: str(r.billing_address),
    shippingAddress: str(r.shipping_address),
    emails,
    phone: str(r.phone),
    pointOfContact: str(r.point_of_contact),
    salesRepId: r.sales_rep_id == null ? null : Number(r.sales_rep_id),
    subscribed: Boolean(r.subscribed),
    notes: str(r.notes),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

export async function listSalesReps(): Promise<SalesRep[]> {
  const sql = await db();
  const rows = await sql`select * from sales_reps order by lower(name)`;
  return rows.map((r) => ({ id: Number(r.id), name: str(r.name) }));
}

export async function createSalesRep(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new PortalError("Give the sales rep a name.");
  const sql = await db();
  try {
    const [row] = await sql`insert into sales_reps (name) values (${trimmed}) returning id`;
    return Number(row.id);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new PortalError(`${trimmed} is already a sales rep.`, 409);
    throw error;
  }
}

export async function renameSalesRep(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new PortalError("Give the sales rep a name.");
  const sql = await db();
  try {
    const rows = await sql`update sales_reps set name = ${trimmed} where id = ${id} returning id`;
    if (!rows.length) throw new PortalError("That sales rep no longer exists.", 404);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new PortalError(`${trimmed} is already a sales rep.`, 409);
    throw error;
  }
}

/** Unassigns this rep from any customers before removing them. */
export async function deleteSalesRep(id: number) {
  const sql = await db();
  await sql`delete from sales_reps where id = ${id}`;
}

export async function listCustomers(): Promise<Customer[]> {
  const sql = await db();
  const [customers, emails] = await Promise.all([
    sql`select * from customers order by updated_at desc`,
    sql`select * from customer_emails order by id`,
  ]);
  const byCustomer = new Map<number, string[]>();
  for (const r of emails) {
    const id = Number(r.customer_id);
    const email = str(r.email);
    if (!email) continue;
    byCustomer.set(id, [...(byCustomer.get(id) || []), email]);
  }
  return customers.map((r) => toCustomer(r, byCustomer.get(Number(r.id)) || []));
}

export type CustomerInput = {
  kind: CustomerKind;
  companyName: string;
  firstName: string;
  lastName: string;
  billingAddress: string;
  shippingAddress: string;
  emails: string[];
  phone: string;
  pointOfContact: string;
  salesRepId: number | null;
  subscribed: boolean;
  notes: string;
};

function requireName(input: CustomerInput) {
  const named = input.kind === "company" ? input.companyName.trim() : `${input.firstName.trim()}${input.lastName.trim()}`;
  if (!named) {
    throw new PortalError(
      input.kind === "company" ? "Give the company a name." : "Give the customer a first or last name.",
    );
  }
}

function uniqueEmails(emails: string[]) {
  return Array.from(new Set(emails.map((e) => e.trim()).filter(Boolean)));
}

function asFkError(error: unknown) {
  return (error as { code?: string }).code === "23503" ? new PortalError("Choose a valid sales rep.", 400) : error;
}

export async function createCustomer(input: CustomerInput): Promise<number> {
  requireName(input);
  const sql = await db();
  try {
    return await sql.begin(async (tx) => {
      const [row] = await tx`
        insert into customers (
          kind, company_name, first_name, last_name, billing_address, shipping_address,
          phone, point_of_contact, sales_rep_id, subscribed, notes
        ) values (
          ${input.kind}, ${input.companyName}, ${input.firstName}, ${input.lastName}, ${input.billingAddress},
          ${input.shippingAddress}, ${input.phone}, ${input.pointOfContact}, ${input.salesRepId}, ${input.subscribed},
          ${input.notes}
        ) returning id`;
      const id = Number(row.id);
      for (const email of uniqueEmails(input.emails)) {
        await tx`insert into customer_emails (customer_id, email) values (${id}, ${email})`;
      }
      return id;
    });
  } catch (error) {
    throw asFkError(error);
  }
}

export async function updateCustomer(id: number, input: CustomerInput) {
  requireName(input);
  const sql = await db();
  try {
    await sql.begin(async (tx) => {
      const rows = await tx`
        update customers set
          kind = ${input.kind}, company_name = ${input.companyName}, first_name = ${input.firstName},
          last_name = ${input.lastName}, billing_address = ${input.billingAddress},
          shipping_address = ${input.shippingAddress}, phone = ${input.phone},
          point_of_contact = ${input.pointOfContact}, sales_rep_id = ${input.salesRepId},
          subscribed = ${input.subscribed}, notes = ${input.notes}, updated_at = now()
        where id = ${id} returning id`;
      if (!rows.length) throw new PortalError("That customer no longer exists.", 404);
      await tx`delete from customer_emails where customer_id = ${id}`;
      for (const email of uniqueEmails(input.emails)) {
        await tx`insert into customer_emails (customer_id, email) values (${id}, ${email})`;
      }
    });
  } catch (error) {
    throw asFkError(error);
  }
}

export async function deleteCustomer(id: number) {
  const sql = await db();
  await sql`delete from customers where id = ${id}`;
}

/**
 * Upserts many rows at once, matching an existing customer by their first
 * email address (so re-importing an updated list doesn't create
 * duplicates); rows with no email, or no match, become new customers.
 */
export async function importCustomers(rows: CustomerInput[]) {
  if (!rows.length) throw new PortalError("There are no rows to import.");
  if (rows.length > 2000) throw new PortalError("Import up to 2,000 rows at a time.");
  rows.forEach(requireName);
  const sql = await db();
  let created = 0;
  let updated = 0;
  try {
    await sql.begin(async (tx) => {
      for (const rec of rows) {
        const emails = uniqueEmails(rec.emails);
        const primaryEmail = emails[0]?.toLowerCase();
        const match = primaryEmail
          ? await tx`select customer_id as id from customer_emails where lower(email) = ${primaryEmail} limit 1`
          : [];
        let id: number;
        if (match.length) {
          id = Number(match[0].id);
          await tx`
            update customers set
              kind = ${rec.kind}, company_name = ${rec.companyName}, first_name = ${rec.firstName},
              last_name = ${rec.lastName}, billing_address = ${rec.billingAddress},
              shipping_address = ${rec.shippingAddress}, phone = ${rec.phone},
              point_of_contact = ${rec.pointOfContact}, sales_rep_id = ${rec.salesRepId},
              subscribed = ${rec.subscribed}, notes = ${rec.notes}, updated_at = now()
            where id = ${id}`;
          updated++;
        } else {
          const [row] = await tx`
            insert into customers (
              kind, company_name, first_name, last_name, billing_address, shipping_address,
              phone, point_of_contact, sales_rep_id, subscribed, notes
            ) values (
              ${rec.kind}, ${rec.companyName}, ${rec.firstName}, ${rec.lastName}, ${rec.billingAddress},
              ${rec.shippingAddress}, ${rec.phone}, ${rec.pointOfContact}, ${rec.salesRepId}, ${rec.subscribed},
              ${rec.notes}
            ) returning id`;
          id = Number(row.id);
          created++;
        }
        const have = new Set(
          (await tx`select lower(email) as email from customer_emails where customer_id = ${id}`).map((r) => String(r.email)),
        );
        for (const email of emails) {
          if (!have.has(email.toLowerCase())) await tx`insert into customer_emails (customer_id, email) values (${id}, ${email})`;
        }
      }
    });
  } catch (error) {
    throw asFkError(error);
  }
  return { created, updated };
}
