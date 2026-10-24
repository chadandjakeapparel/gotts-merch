import type { TransactionSql } from "postgres";
import { db } from "./db";
import { PortalError } from "./http";
import type { Address, Customer, CustomerKind, SalesRep, ShippingAddress } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const str = (v: unknown) => (v == null ? "" : String(v));
const EMPTY_ADDRESS: Address = { name: "", line1: "", line2: "", city: "", state: "", zip: "", country: "US" };

function toAddress(r: Row, prefix: "billing"): Address {
  return {
    name: str(r[`${prefix}_name`]),
    line1: str(r[`${prefix}_line1`]),
    line2: str(r[`${prefix}_line2`]),
    city: str(r[`${prefix}_city`]),
    state: str(r[`${prefix}_state`]),
    zip: str(r[`${prefix}_zip`]),
    country: str(r[`${prefix}_country`]) || "US",
  };
}

function toShippingAddress(r: Row): ShippingAddress {
  return {
    id: Number(r.id),
    name: str(r.name),
    line1: str(r.line1),
    line2: str(r.line2),
    city: str(r.city),
    state: str(r.state),
    zip: str(r.zip),
    country: str(r.country) || "US",
    isPrimary: Boolean(r.is_primary),
  };
}

function toCustomer(r: Row, emails: string[], shippingAddresses: ShippingAddress[]): Customer {
  const primary = shippingAddresses.find((a) => a.isPrimary) || shippingAddresses[0] || null;
  return {
    id: Number(r.id),
    kind: r.kind as CustomerKind,
    companyName: str(r.company_name),
    firstName: str(r.first_name),
    lastName: str(r.last_name),
    billingAddress: toAddress(r, "billing"),
    shippingAddress: primary ? { ...primary } : EMPTY_ADDRESS,
    shippingAddresses,
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
  const [customers, emails, shippingAddresses] = await Promise.all([
    sql`select * from customers order by updated_at desc`,
    sql`select * from customer_emails order by id`,
    sql`select * from customer_shipping_addresses order by is_primary desc, created_at asc`,
  ]);
  const emailsByCustomer = new Map<number, string[]>();
  for (const r of emails) {
    const id = Number(r.customer_id);
    const email = str(r.email);
    if (!email) continue;
    emailsByCustomer.set(id, [...(emailsByCustomer.get(id) || []), email]);
  }
  const addressesByCustomer = new Map<number, ShippingAddress[]>();
  for (const r of shippingAddresses) {
    const id = Number(r.customer_id);
    addressesByCustomer.set(id, [...(addressesByCustomer.get(id) || []), toShippingAddress(r)]);
  }
  return customers.map((r) =>
    toCustomer(r, emailsByCustomer.get(Number(r.id)) || [], addressesByCustomer.get(Number(r.id)) || []),
  );
}

export type CustomerInput = {
  kind: CustomerKind;
  companyName: string;
  firstName: string;
  lastName: string;
  billingAddress: Address;
  /** The primary shipping address; other addresses are managed separately. */
  shippingAddress: Address;
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

/** Saves this customer's primary shipping address, creating the row if, somehow, none exists yet. */
async function savePrimaryShippingAddress(tx: TransactionSql, customerId: number, address: Address) {
  const rows = await tx`
    update customer_shipping_addresses set
      name = ${address.name}, line1 = ${address.line1}, line2 = ${address.line2}, city = ${address.city},
      state = ${address.state}, zip = ${address.zip}, country = ${address.country}, updated_at = now()
    where customer_id = ${customerId} and is_primary returning id`;
  if (!rows.length) {
    await tx`
      insert into customer_shipping_addresses (customer_id, name, line1, line2, city, state, zip, country, is_primary)
      values (${customerId}, ${address.name}, ${address.line1}, ${address.line2}, ${address.city}, ${address.state}, ${address.zip}, ${address.country}, true)`;
  }
}

export async function createCustomer(input: CustomerInput): Promise<number> {
  requireName(input);
  const sql = await db();
  const bill = input.billingAddress;
  const ship = input.shippingAddress;
  try {
    return await sql.begin(async (tx) => {
      const [row] = await tx`
        insert into customers (
          kind, company_name, first_name, last_name,
          billing_name, billing_line1, billing_line2, billing_city, billing_state, billing_zip, billing_country,
          phone, point_of_contact, sales_rep_id, subscribed, notes
        ) values (
          ${input.kind}, ${input.companyName}, ${input.firstName}, ${input.lastName},
          ${bill.name}, ${bill.line1}, ${bill.line2}, ${bill.city}, ${bill.state}, ${bill.zip}, ${bill.country},
          ${input.phone}, ${input.pointOfContact}, ${input.salesRepId}, ${input.subscribed}, ${input.notes}
        ) returning id`;
      const id = Number(row.id);
      await tx`
        insert into customer_shipping_addresses (customer_id, name, line1, line2, city, state, zip, country, is_primary)
        values (${id}, ${ship.name}, ${ship.line1}, ${ship.line2}, ${ship.city}, ${ship.state}, ${ship.zip}, ${ship.country}, true)`;
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
  const bill = input.billingAddress;
  try {
    await sql.begin(async (tx) => {
      const rows = await tx`
        update customers set
          kind = ${input.kind}, company_name = ${input.companyName}, first_name = ${input.firstName},
          last_name = ${input.lastName},
          billing_name = ${bill.name}, billing_line1 = ${bill.line1}, billing_line2 = ${bill.line2},
          billing_city = ${bill.city}, billing_state = ${bill.state}, billing_zip = ${bill.zip},
          billing_country = ${bill.country},
          phone = ${input.phone}, point_of_contact = ${input.pointOfContact}, sales_rep_id = ${input.salesRepId},
          subscribed = ${input.subscribed}, notes = ${input.notes}, updated_at = now()
        where id = ${id} returning id`;
      if (!rows.length) throw new PortalError("That customer no longer exists.", 404);
      await savePrimaryShippingAddress(tx, id, input.shippingAddress);
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
 * duplicates); rows with no email, or no match, become new customers. Each
 * row's shipping address becomes (or replaces) that customer's primary one.
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
        const bill = rec.billingAddress;
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
              last_name = ${rec.lastName},
              billing_name = ${bill.name}, billing_line1 = ${bill.line1}, billing_line2 = ${bill.line2},
              billing_city = ${bill.city}, billing_state = ${bill.state}, billing_zip = ${bill.zip},
              billing_country = ${bill.country},
              phone = ${rec.phone}, point_of_contact = ${rec.pointOfContact}, sales_rep_id = ${rec.salesRepId},
              subscribed = ${rec.subscribed}, notes = ${rec.notes}, updated_at = now()
            where id = ${id}`;
          updated++;
        } else {
          const [row] = await tx`
            insert into customers (
              kind, company_name, first_name, last_name,
              billing_name, billing_line1, billing_line2, billing_city, billing_state, billing_zip, billing_country,
              phone, point_of_contact, sales_rep_id, subscribed, notes
            ) values (
              ${rec.kind}, ${rec.companyName}, ${rec.firstName}, ${rec.lastName},
              ${bill.name}, ${bill.line1}, ${bill.line2}, ${bill.city}, ${bill.state}, ${bill.zip}, ${bill.country},
              ${rec.phone}, ${rec.pointOfContact}, ${rec.salesRepId}, ${rec.subscribed}, ${rec.notes}
            ) returning id`;
          id = Number(row.id);
          created++;
        }
        await savePrimaryShippingAddress(tx, id, rec.shippingAddress);
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

export async function listShippingAddresses(customerId: number): Promise<ShippingAddress[]> {
  const sql = await db();
  const rows = await sql`
    select * from customer_shipping_addresses where customer_id = ${customerId}
    order by is_primary desc, created_at asc`;
  return rows.map(toShippingAddress);
}

export async function addShippingAddress(customerId: number, address: Address): Promise<number> {
  const sql = await db();
  try {
    const [row] = await sql`
      insert into customer_shipping_addresses (customer_id, name, line1, line2, city, state, zip, country, is_primary)
      values (${customerId}, ${address.name}, ${address.line1}, ${address.line2}, ${address.city}, ${address.state}, ${address.zip}, ${address.country}, false)
      returning id`;
    return Number(row.id);
  } catch (error) {
    if ((error as { code?: string }).code === "23503") throw new PortalError("That customer no longer exists.", 404);
    throw error;
  }
}

export async function updateShippingAddress(customerId: number, addressId: number, address: Address) {
  const sql = await db();
  const rows = await sql`
    update customer_shipping_addresses set
      name = ${address.name}, line1 = ${address.line1}, line2 = ${address.line2}, city = ${address.city},
      state = ${address.state}, zip = ${address.zip}, country = ${address.country}, updated_at = now()
    where id = ${addressId} and customer_id = ${customerId} returning id`;
  if (!rows.length) throw new PortalError("That address no longer exists.", 404);
}

export async function makeShippingAddressPrimary(customerId: number, addressId: number) {
  const sql = await db();
  await sql.begin(async (tx) => {
    const rows = await tx`select id from customer_shipping_addresses where id = ${addressId} and customer_id = ${customerId}`;
    if (!rows.length) throw new PortalError("That address no longer exists.", 404);
    await tx`update customer_shipping_addresses set is_primary = false where customer_id = ${customerId} and is_primary`;
    await tx`update customer_shipping_addresses set is_primary = true, updated_at = now() where id = ${addressId}`;
  });
}

/** Removes an address; if it was primary, promotes the next-oldest one. Always keeps at least one. */
export async function deleteShippingAddress(customerId: number, addressId: number) {
  const sql = await db();
  await sql.begin(async (tx) => {
    const rows = await tx`
      select is_primary from customer_shipping_addresses where id = ${addressId} and customer_id = ${customerId} for update`;
    if (!rows.length) return;
    const [{ n }] = await tx`select count(*)::int as n from customer_shipping_addresses where customer_id = ${customerId}`;
    if (n <= 1) throw new PortalError("Keep at least one shipping address.");
    await tx`delete from customer_shipping_addresses where id = ${addressId}`;
    if (rows[0].is_primary) {
      const [next] = await tx`
        select id from customer_shipping_addresses where customer_id = ${customerId} order by created_at asc limit 1`;
      if (next) await tx`update customer_shipping_addresses set is_primary = true where id = ${next.id}`;
    }
  });
}
