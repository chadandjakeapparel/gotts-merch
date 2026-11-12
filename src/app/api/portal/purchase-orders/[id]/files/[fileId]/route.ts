import { deletePurchaseOrderFile } from "@/lib/portal/purchase-orders";
import { handle, int } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  return handle(request, { staff: true, area: "purchase-orders" }, async () => {
    const { id, fileId } = await params;
    await deletePurchaseOrderFile(int(id), int(fileId));
    return {};
  });
}
