import type { CatalogItemInput } from "@/lib/portal/catalog-items";
import { parseDelimited } from "./sheet";

export const CATALOG_ITEM_TEMPLATE_HEADERS = ["Item Name/Number", "Display Name", "Item Type", "Primary Vendor"];

/** Sample rows shipped in the downloadable template. */
export const CATALOG_ITEM_TEMPLATE_EXAMPLE_ROWS = [
  ["PL100", "Classic Polo", "Apparel", "SanMar"],
  ["MUG-12OZ", "Ceramic Mug, 12oz", "Drinkware", "Hit Promotional"],
];

/**
 * Reads Item name/number, Display name, Item type and Primary vendor
 * columns; a header row may reorder them. A row whose item number matches
 * an existing item updates it instead of adding a duplicate.
 */
export function parseCatalogItemSheet(text: string): { rows: CatalogItemInput[]; errors: string[] } {
  const grid = parseDelimited(text);
  if (!grid.length) return { rows: [], errors: ["Nothing to import yet. Paste rows or choose a file."] };
  let cols = { number: 0, name: 1, type: 2, vendor: 3 };
  const h = grid[0].map((c) => c.toLowerCase());
  const header = h.some((c) => /item\s*(name|number|#)|display\s*name|item\s*type|vendor|^sku$/.test(c));
  if (header) {
    const find = (re: RegExp, fallback: number) => {
      const i = h.findIndex((c) => re.test(c));
      return i >= 0 ? i : fallback;
    };
    cols = {
      number: find(/item\s*(name\s*\/?\s*number|number|#)|^sku$/, 0),
      name: find(/display\s*name/, 1),
      type: find(/item\s*type|^type$/, 2),
      vendor: find(/vendor/, 3),
    };
    grid.shift();
  }
  const rows: CatalogItemInput[] = [];
  const errors: string[] = [];
  grid.forEach((cells, i) => {
    const n = i + 1 + (header ? 1 : 0);
    const itemNumber = cells[cols.number] || "";
    if (!itemNumber.trim()) {
      errors.push(`Row ${n}: needs an item name/number.`);
      return;
    }
    rows.push({
      itemNumber,
      displayName: cells[cols.name] || "",
      itemType: cells[cols.type] || "",
      primaryVendor: cells[cols.vendor] || "",
    });
  });
  return { rows, errors };
}
