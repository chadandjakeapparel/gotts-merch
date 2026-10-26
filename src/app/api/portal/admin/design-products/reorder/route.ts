import { reorderDesignProducts } from "@/lib/design-products";
import { handle, PortalError, readJson } from "@/lib/portal/http";

export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id)) : [];
    if (!ids.length) throw new PortalError("Nothing to reorder");
    await reorderDesignProducts(ids);
    return {};
  });
}
