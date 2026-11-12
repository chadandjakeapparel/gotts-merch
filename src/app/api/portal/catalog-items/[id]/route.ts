import { deleteCatalogItem, updateCatalogItem } from "@/lib/portal/catalog-items";
import { handle, int, readJson } from "@/lib/portal/http";
import { toCatalogItemInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true, area: "items" }, async () => {
    const id = int((await params).id);
    const body = await readJson(request);
    await updateCatalogItem(id, toCatalogItemInput(body));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true, area: "items" }, async () => {
    await deleteCatalogItem(int((await params).id));
    return {};
  });
}
