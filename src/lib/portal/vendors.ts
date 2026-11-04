import { db } from "./db";
import { PortalError } from "./http";
import type { Address, Vendor } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const str = (v: unknown) => (v == null ? "" : String(v));

function toAddress(r: Row): Address {
  return {
    name: str(r.address_name),
    line1: str(r.address_line1),
    line2: str(r.address_line2),
    city: str(r.address_city),
    state: str(r.address_state),
    zip: str(r.address_zip),
    country: str(r.address_country) || "US",
  };
}

function toVendor(r: Row): Vendor {
  return {
    id: Number(r.id),
    name: str(r.name),
    contactName: str(r.contact_name),
    email: str(r.email),
    phone: str(r.phone),
    address: toAddress(r),
    notes: str(r.notes),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

export async function listVendors(): Promise<Vendor[]> {
  const sql = await db();
  const rows = await sql`select * from vendors order by lower(name)`;
  return rows.map(toVendor);
}

export async function getVendor(id: number): Promise<Vendor | null> {
  const sql = await db();
  const [row] = await sql`select * from vendors where id = ${id}`;
  return row ? toVendor(row) : null;
}

export type VendorInput = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: Address;
  notes: string;
};

function requireVendor(input: VendorInput) {
  if (!input.name.trim()) throw new PortalError("Give the vendor a name.");
}

export async function createVendor(input: VendorInput): Promise<number> {
  requireVendor(input);
  const sql = await db();
  const a = input.address;
  const [row] = await sql`
    insert into vendors (
      name, contact_name, email, phone,
      address_name, address_line1, address_line2, address_city, address_state, address_zip, address_country, notes
    ) values (
      ${input.name}, ${input.contactName}, ${input.email}, ${input.phone},
      ${a.name}, ${a.line1}, ${a.line2}, ${a.city}, ${a.state}, ${a.zip}, ${a.country}, ${input.notes}
    ) returning id`;
  return Number(row.id);
}

export async function updateVendor(id: number, input: VendorInput): Promise<void> {
  requireVendor(input);
  const sql = await db();
  const a = input.address;
  const rows = await sql`
    update vendors set
      name = ${input.name}, contact_name = ${input.contactName}, email = ${input.email}, phone = ${input.phone},
      address_name = ${a.name}, address_line1 = ${a.line1}, address_line2 = ${a.line2}, address_city = ${a.city},
      address_state = ${a.state}, address_zip = ${a.zip}, address_country = ${a.country},
      notes = ${input.notes}, updated_at = now()
    where id = ${id} returning id`;
  if (!rows.length) throw new PortalError("That vendor no longer exists.", 404);
}

export async function deleteVendor(id: number): Promise<void> {
  const sql = await db();
  await sql`delete from vendors where id = ${id}`;
}
