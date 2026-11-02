import { db } from "./db";
import { PortalError } from "./http";
import type { CatalogItem } from "./types";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const str = (v: unknown) => (v == null ? "" : String(v));

function toCatalogItem(r: Row): CatalogItem {
  return {
    id: Number(r.id),
    itemNumber: str(r.item_number),
    displayName: str(r.display_name),
    itemType: str(r.item_type),
    primaryVendor: str(r.primary_vendor),
    createdAt: iso(r.created_at) || "",
    updatedAt: iso(r.updated_at) || "",
  };
}

export type CatalogItemFilters = {
  q?: string;
  itemType?: string;
  vendor?: string;
  limit?: number;
};

/**
 * Matching catalog items, newest-touched first -- bounded (default 100, max
 * 500) since the catalog is expected to hold many thousands of rows and
 * this is meant to back a search box, not a "load everything" list.
 */
export async function listCatalogItems(filters: CatalogItemFilters = {}): Promise<CatalogItem[]> {
  const sql = await db();
  const q = (filters.q || "").trim();
  const itemType = (filters.itemType || "").trim();
  const vendor = (filters.vendor || "").trim();
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  const rows = await sql`
    select * from catalog_items
    where
      (${q} = '' or item_number ilike ${"%" + q + "%"} or display_name ilike ${"%" + q + "%"})
      and (${itemType} = '' or item_type = ${itemType})
      and (${vendor} = '' or primary_vendor = ${vendor})
    order by updated_at desc
    limit ${limit}`;
  return rows.map(toCatalogItem);
}

export async function countCatalogItems(): Promise<number> {
  const sql = await db();
  const [{ n }] = await sql`select count(*)::int as n from catalog_items`;
  return Number(n);
}

/** Every distinct Item Type and Primary Vendor already in use, for the list page's filter dropdowns. */
export async function listCatalogItemFilters(): Promise<{ itemTypes: string[]; vendors: string[] }> {
  const sql = await db();
  const [types, vendors] = await Promise.all([
    sql`select distinct item_type from catalog_items where item_type != '' order by item_type`,
    sql`select distinct primary_vendor from catalog_items where primary_vendor != '' order by primary_vendor`,
  ]);
  return {
    itemTypes: types.map((r) => str(r.item_type)),
    vendors: vendors.map((r) => str(r.primary_vendor)),
  };
}

export type CatalogItemInput = {
  itemNumber: string;
  displayName: string;
  itemType: string;
  primaryVendor: string;
};

function requireCatalogItem(input: CatalogItemInput) {
  if (!input.itemNumber.trim()) throw new PortalError("Give the item a name/number.");
}

function asUniqueError(error: unknown) {
  return (error as { code?: string }).code === "23505"
    ? new PortalError("An item with that name/number already exists.", 409)
    : error;
}

export async function createCatalogItem(input: CatalogItemInput): Promise<number> {
  requireCatalogItem(input);
  const sql = await db();
  try {
    const [row] = await sql`
      insert into catalog_items (item_number, display_name, item_type, primary_vendor)
      values (${input.itemNumber}, ${input.displayName}, ${input.itemType}, ${input.primaryVendor})
      returning id`;
    return Number(row.id);
  } catch (error) {
    throw asUniqueError(error);
  }
}

export async function updateCatalogItem(id: number, input: CatalogItemInput): Promise<void> {
  requireCatalogItem(input);
  const sql = await db();
  try {
    const rows = await sql`
      update catalog_items set
        item_number = ${input.itemNumber}, display_name = ${input.displayName},
        item_type = ${input.itemType}, primary_vendor = ${input.primaryVendor}, updated_at = now()
      where id = ${id} returning id`;
    if (!rows.length) throw new PortalError("That item no longer exists.", 404);
  } catch (error) {
    throw asUniqueError(error);
  }
}

export async function deleteCatalogItem(id: number): Promise<void> {
  const sql = await db();
  await sql`delete from catalog_items where id = ${id}`;
}

const IMPORT_BATCH_SIZE = 2000;

/**
 * Upserts many rows at once (matched by item number) -- batched so a
 * many-thousand-row spreadsheet lands in a handful of round trips instead
 * of one query per row. Batch size keeps each statement well under
 * Postgres' bound-parameter limit.
 */
export async function importCatalogItems(rows: CatalogItemInput[]): Promise<{ imported: number }> {
  if (!rows.length) throw new PortalError("There are no rows to import.");
  if (rows.length > 50_000) throw new PortalError("Import up to 50,000 rows at a time.");
  rows.forEach(requireCatalogItem);

  // Last occurrence wins when the sheet itself repeats an item number --
  // otherwise a single insert hitting the same conflict target twice errors.
  const byNumber = new Map<string, { item_number: string; display_name: string; item_type: string; primary_vendor: string }>();
  for (const r of rows) {
    byNumber.set(r.itemNumber.trim(), {
      item_number: r.itemNumber.trim(),
      display_name: r.displayName.trim(),
      item_type: r.itemType.trim(),
      primary_vendor: r.primaryVendor.trim(),
    });
  }
  const payload = [...byNumber.values()];

  const sql = await db();
  try {
    await sql.begin(async (tx) => {
      for (let i = 0; i < payload.length; i += IMPORT_BATCH_SIZE) {
        const batch = payload.slice(i, i + IMPORT_BATCH_SIZE);
        await tx`
          insert into catalog_items ${tx(batch, "item_number", "display_name", "item_type", "primary_vendor")}
          on conflict (item_number) do update set
            display_name = excluded.display_name,
            item_type = excluded.item_type,
            primary_vendor = excluded.primary_vendor,
            updated_at = now()`;
      }
    });
  } catch (error) {
    throw asUniqueError(error);
  }
  return { imported: payload.length };
}
