import {
  countCatalogItems,
  createCatalogItem,
  importCatalogItems,
  listCatalogItemFilters,
  listCatalogItems,
} from "@/lib/portal/catalog-items";
import { handle, PortalError, readJson } from "@/lib/portal/http";
import { toCatalogItemInput } from "@/lib/portal/inputs";

/** Matching items (bounded -- this is a search endpoint, not a full list) plus filter options and a total count. */
export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => {
    const params = new URL(request.url).searchParams;
    const [items, filters, total] = await Promise.all([
      listCatalogItems({
        q: params.get("q") || "",
        itemType: params.get("type") || "",
        vendor: params.get("vendor") || "",
        limit: params.get("limit") ? Number(params.get("limit")) : undefined,
      }),
      listCatalogItemFilters(),
      countCatalogItems(),
    ]);
    return { items, ...filters, total };
  });
}

/** Adds one item, or upserts many (matched by item number) when the body carries `rows`. */
export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    if (Array.isArray(body.rows)) {
      const rows = body.rows.map((r, i) => {
        if (!r || typeof r !== "object") throw new PortalError(`Row ${i + 1} could not be read.`);
        return toCatalogItemInput(r as Record<string, unknown>);
      });
      return await importCatalogItems(rows);
    }
    const id = await createCatalogItem(toCatalogItemInput(body));
    return { id };
  });
}
