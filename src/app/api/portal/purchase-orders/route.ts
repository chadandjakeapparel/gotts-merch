import { createPurchaseOrder, listPurchaseOrders } from "@/lib/portal/purchase-orders";
import { handle, readJson } from "@/lib/portal/http";
import { toPurchaseOrderInput } from "@/lib/portal/inputs";

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => {
    const purchaseOrders = await listPurchaseOrders();
    return { purchaseOrders };
  });
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    const id = await createPurchaseOrder(toPurchaseOrderInput(body));
    return { id };
  });
}
