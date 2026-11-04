import { deletePurchaseOrder, updatePurchaseOrder } from "@/lib/portal/purchase-orders";
import { handle, int, readJson } from "@/lib/portal/http";
import { toPurchaseOrderInput } from "@/lib/portal/inputs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    const id = int((await params).id);
    const body = await readJson(request);
    await updatePurchaseOrder(id, toPurchaseOrderInput(body));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true }, async () => {
    await deletePurchaseOrder(int((await params).id));
    return {};
  });
}
