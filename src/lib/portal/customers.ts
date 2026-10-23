import { db } from "./db";
import { PortalError } from "./http";
import type { Customer } from "./types";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const str = (v: unknown) => (v == null ? "" : String(v));

function toCustomer(r: Row): Customer {
  return {
    id: Number(r.id) || 0,
    name: str(r.name),
    company: str(r.company),
    email: str(r.email),
    phone: str(r.phone),
    notes: str(r.notes),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const sql = await db();
  const rows = await sql`select * from customers order by lower(coalesce(company, '')), lower(name)`;
  return rows.map(toCustomer);
}

export type CustomerInput = { name: string; company: string; email: string; phone: string; notes: string };

/**
 * Bulk-imports a customer list. Rows with an email already on file update
 * that customer; everything else (no email, or a new one) is added fresh,
 * since without an email there's no reliable key to match on.
 */
export async function importCustomers(rows: CustomerInput[]): Promise<{ created: number; updated: number }> {
  const clean = rows.filter((r) => r.name.trim() || r.company.trim());
  if (!clean.length) throw new PortalError("There are no rows to import.");
  if (clean.length > 5000) throw new PortalError("Import up to 5,000 rows at a time.");
  const sql = await db();
  let created = 0;
  let updated = 0;
  await sql.begin(async (tx) => {
    for (const rec of clean) {
      if (rec.email) {
        const [row] = await tx`
          insert into customers (name, company, email, phone, notes)
          values (${rec.name}, ${rec.company}, ${rec.email}, ${rec.phone}, ${rec.notes})
          on conflict (lower(email)) where email <> '' do update set
            name = case when ${rec.name} <> '' then ${rec.name} else customers.name end,
            company = case when ${rec.company} <> '' then ${rec.company} else customers.company end,
            phone = case when ${rec.phone} <> '' then ${rec.phone} else customers.phone end,
            notes = case when ${rec.notes} <> '' then ${rec.notes} else customers.notes end,
            updated_at = now()
          returning (xmax = 0) as inserted`;
        if (row.inserted) created++;
        else updated++;
      } else {
        await tx`insert into customers (name, company, email, phone, notes) values (${rec.name}, ${rec.company}, ${rec.email}, ${rec.phone}, ${rec.notes})`;
        created++;
      }
    }
  });
  return { created, updated };
}

export async function deleteCustomer(id: number) {
  const sql = await db();
  await sql`delete from customers where id = ${id}`;
}
